// Arquivo: src/app/api/financeiro/dfc/route.js
import { NextResponse } from 'next/server';

const NIBO_API_URL = 'https://api.nibo.com.br/empresas/v1';

// --- Função de busca na API v1 do Nibo ---
async function fetchNiboData(apiKey, endpoint ) {
    if (!apiKey) throw new Error(`Chave de API do NIBO (v1) não fornecida.`);
    const separator = endpoint.includes('?') ? '&' : '?';
    // Expandimos stakeholder e category para ter os nomes reais das contas e clientes
    const url = `${NIBO_API_URL}${endpoint}${separator}apitoken=${apiKey}&$expand=stakeholder,category`;
    
    const response = await fetch(url, { 
        method: 'GET', 
        headers: { 'Content-Type': 'application/json' }, 
        cache: 'no-store' 
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Erro na API NIBO (${response.status}) em ${endpoint}: ${errorBody}`);
    }
    return response.json();
}

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const empresa = searchParams.get('empresa');
    
    if (!empresa) {
        return NextResponse.json({ error: 'O parâmetro "empresa" é obrigatório.' }, { status: 400 });
    }

    // Seleção da Chave de API baseada na Holding
    const apiKey = empresa === 'Victec' ? process.env.NIBO_API_KEY_VICTEC : process.env.NIBO_API_KEY_VMCTECH;

    try {
        // Busca simultânea de Créditos e Débitos (Realizado + Previsto)
        const [resCredit, resDebit] = await Promise.all([
            fetchNiboData(apiKey, '/schedules/credit'),
            fetchNiboData(apiKey, '/schedules/debit')
        ]);

        const todosOsItens = [
            ...(resCredit.items || []).map(i => ({ ...i, tipo: 'entrada' })),
            ...(resDebit.items || []).map(i => ({ ...i, tipo: 'saida' }))
        ];

        let ultimaConciliacao = null;

        // --- Processamento e Filtragem de Integridade ---
        const dadosProcessados = todosOsItens
            .filter(item => {
                // 1. Filtro Temporal Rígido: Apenas 2026 em diante
                const dataReferencia = item.paymentDate || item.dueDate;
                if (!dataReferencia || dataReferencia < '2026-01-01') return false;

                // 2. Filtro de Lixo: Ignorar Stakeholders deletados
                if (item.stakeholder?.isDeleted) return false;

                // 3. Filtro de Baixas: Ignorar títulos que sofreram baixa (write-off)
                if (item.writeOffDate) return false;

                return true;
            })
            .map(item => {
                // Captura a data da última conciliação real
                if (item.isReconciled && (!ultimaConciliacao || item.paymentDate > ultimaConciliacao)) {
                    ultimaConciliacao = item.paymentDate.split('T')[0];
                }

                return {
                    data: (item.paymentDate || item.dueDate).split('T')[0],
                    valor: item.isPaid ? (item.paidValue || item.value) : item.value,
                    tipo: item.tipo,
                    status: item.isPaid ? 'realizado' : 'previsto',
                    categoria: item.category?.name || 'Categoria indefinida',
                    descricao: item.description || '',
                    clienteFornecedor: item.stakeholder?.name || 'N/A',
                    conciliado: item.isReconciled || false
                };
            });

        // Ordenação por data para facilitar o DFC
        dadosProcessados.sort((a, b) => a.data.localeCompare(b.data));

        return NextResponse.json({
            conciliadoAte: ultimaConciliacao,
            empresa: empresa,
            fluxo: dadosProcessados
        });

    } catch (error) {
        console.error('Erro na API do DFC:', error);
        return NextResponse.json({ 
            error: 'Falha ao processar dados do DFC.', 
            details: error.message 
        }, { status: 500 });
    }
}
