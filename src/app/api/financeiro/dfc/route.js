// Arquivo: src/app/api/financeiro/dfc/route.js
import { NextResponse } from 'next/server';

const NIBO_API_URL = 'https://api.nibo.com.br/empresas/v1';

async function fetchNiboData(apiKey, endpoint ) {
    if (!apiKey) throw new Error(`Chave de API do NIBO não fornecida.`);
    const separator = endpoint.includes('?') ? '&' : '?';
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

    const apiKey = empresa === 'Victec' ? process.env.NIBO_API_KEY_VICTEC : process.env.NIBO_API_KEY_VMCTECH;

    try {
        // FOCO TOTAL NO REALIZADO (Pagos e Recebidos)
        const [resCredit, resDebit] = await Promise.all([
            fetchNiboData(apiKey, '/schedules/credit'),
            fetchNiboData(apiKey, '/schedules/debit')
        ]);

        const todosOsItens = [
            ...(resCredit.items || []).map(i => ({ ...i, tipo: 'entrada' })),
            ...(resDebit.items || []).map(i => ({ ...i, tipo: 'saida' }))
        ];

        // LOG DE AUDITORIA (Visível no console da Vercel)
        console.log(`--- AUDITORIA DFC: ${empresa} ---`);
        
        const dadosProcessados = todosOsItens
            .filter(item => {
                // 1. Apenas 2026
                const dataPagamento = item.paymentDate;
                if (!dataPagamento || dataPagamento < '2026-01-01') return false;

                // 2. FOCO NO REALIZADO (Apenas o que já foi pago/recebido)
                if (!item.isPaid) return false;

                // 3. Filtros de Integridade
                if (item.stakeholder?.isDeleted) return false;
                if (item.writeOffDate) return false;

                return true;
            })
            .map(item => {
                // Logamos cada categoria única encontrada para conferência
                console.log(`[CATEGORIA ENCONTRADA]: "${item.category?.name}" | VALOR: ${item.value}`);

                return {
                    data: item.paymentDate.split('T')[0],
                    valor: item.paidValue || item.value,
                    tipo: item.tipo,
                    status: 'realizado',
                    categoria: item.category?.name || 'Categoria indefinida',
                    descricao: item.description || '',
                    clienteFornecedor: item.stakeholder?.name || 'N/A',
                    conciliado: item.isReconciled || false
                };
            });

        dadosProcessados.sort((a, b) => a.data.localeCompare(b.data));

        return NextResponse.json({
            empresa: empresa,
            totalItens: dadosProcessados.length,
            fluxo: dadosProcessados
        });

    } catch (error) {
        console.error('Erro na API de Diagnóstico:', error);
        return NextResponse.json({ error: 'Falha no diagnóstico.', details: error.message }, { status: 500 });
    }
}
