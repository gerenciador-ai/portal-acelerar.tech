// Arquivo: src/app/api/financeiro/dfc/route.js
import { NextResponse } from 'next/server';

const NIBO_API_URL = 'https://api.nibo.com.br/empresas/v1';

// --- Função de busca na API v1 ---
async function fetchNiboData(apiKey, endpoint ) {
    if (!apiKey) throw new Error(`Chave de API do NIBO (v1) não fornecida.`);
    const separator = endpoint.includes('?') ? '&' : '?';
    const url = `${NIBO_API_URL}${endpoint}${separator}apitoken=${apiKey}`;
    
    const response = await fetch(url, { 
        method: 'GET', 
        headers: { 'Content-Type': 'application/json' }, 
        cache: 'no-store' 
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Erro na API v1 do NIBO (${response.status}) ao acessar ${url}: ${errorBody}`);
    }
    return response.json();
}

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const empresa = searchParams.get('empresa');
    
    if (!empresa) {
        return NextResponse.json({ error: 'O parâmetro "empresa" é obrigatório.' }, { status: 400 });
    }

    // Seleção da chave de API baseada na empresa
    const apiKey = empresa === 'Victec' ? process.env.NIBO_API_KEY_VICTEC : process.env.NIBO_API_KEY_VMCTECH;

    try {
        // 1. Filtro inteligente: Busca lançamentos com vencimento a partir de 2026
        const filtroURL = `$filter=dueDate ge 2026-01-01&$expand=stakeholder,category`;

        const [resCredit, resDebit] = await Promise.all([
            fetchNiboData(apiKey, `/schedules/credit?${filtroURL}`),
            fetchNiboData(apiKey, `/schedules/debit?${filtroURL}`),
        ]);

        const todosOsItensBrutos = [
            ...(resCredit.items || []).map(item => ({ ...item, tipo: 'entrada' })),
            ...(resDebit.items || []).map(item => ({ ...item, tipo: 'saida' })),
        ];

        let ultimaConciliacao = null;

        // 2. Processamento e Filtragem de Integridade
        const dadosProcessados = todosOsItensBrutos
            .filter(item => {
                // Filtro 1: Ignorar clientes/fornecedores excluídos (isDeleted)
                if (item.stakeholder?.isDeleted) return false;

                // Filtro 2: Ignorar lançamentos que sofreram baixa por perda (writeOffDate)
                if (item.writeOffDate) return false;

                return true;
            })
            .map(item => {
                // Identificar a data da última conciliação para o item 6.1 do plano
                if (item.isReconciled && item.paymentDate) {
                    const dataPagto = new Date(item.paymentDate);
                    if (!ultimaConciliacao || dataPagto > new Date(ultimaConciliacao)) {
                        ultimaConciliacao = item.paymentDate;
                    }
                }

                // Retornar objeto limpo e categorizado para o Frontend
                return {
                    id: item.scheduleId,
                    dataVencimento: item.dueDate,
                    dataPagamento: item.paymentDate || null,
                    valor: item.isPaid ? (item.paidValue || item.value) : item.value,
                    tipo: item.tipo,
                    status: item.isPaid ? 'realizado' : 'previsto',
                    categoria: item.category?.name || 'Não Classificado',
                    descricao: item.description || '',
                    clienteFornecedor: item.stakeholder?.name || 'N/A',
                    conciliado: item.isReconciled || false
                };
            });

        // 3. Resposta estruturada para o DFC
        return NextResponse.json({
            conciliadoAte: ultimaConciliacao,
            empresa: empresa,
            fluxo: dadosProcessados
        });

    } catch (error) {
        console.error('Erro detalhado na API do DFC:', error);
        return NextResponse.json({ 
            error: 'Falha ao processar dados do DFC.', 
            details: error.message 
        }, { status: 500 });
    }
}
