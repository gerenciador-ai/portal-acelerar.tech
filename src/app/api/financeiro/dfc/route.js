// Arquivo: src/app/api/financeiro/dfc/route.js
import { NextResponse } from 'next/server';

const NIBO_API_URL = 'https://api.nibo.com.br/empresas/v1';

async function fetchNiboData(apiKey, endpoint ) {
    if (!apiKey) throw new Error(`Chave de API do NIBO não fornecida.`);
    const separator = endpoint.includes('?') ? '&' : '?';
    // Buscamos sem filtros de URL para garantir que nada seja barrado pelo servidor do Nibo
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
        const [resCredit, resDebit] = await Promise.all([
            fetchNiboData(apiKey, '/schedules/credit'),
            fetchNiboData(apiKey, '/schedules/debit')
        ]);

        const todosOsItens = [
            ...(resCredit.items || []).map(i => ({ ...i, tipo: 'entrada' })),
            ...(resDebit.items || []).map(i => ({ ...i, tipo: 'saida' }))
        ];

        const dadosProcessados = todosOsItens
            .filter(item => {
                // USAMOS VENCIMENTO OU PAGAMENTO PARA NÃO PERDER NADA
                const dataRef = item.paymentDate || item.dueDate;
                // Filtramos apenas para 2026
                return dataRef && dataRef >= '2026-01-01';
            })
            .map(item => {
                return {
                    data: (item.paymentDate || item.dueDate).split('T')[0],
                    valor: item.paidValue || item.value,
                    tipo: item.tipo,
                    status: item.isPaid ? 'realizado' : 'previsto',
                    categoria: item.category?.name || 'Categoria indefinida',
                    descricao: item.description || '',
                    clienteFornecedor: item.stakeholder?.name || 'N/A',
                    isPaid: item.isPaid
                };
            });

        return NextResponse.json({
            empresa: empresa,
            totalItensNoNibo: todosOsItens.length,
            totalItensFiltrados2026: dadosProcessados.length,
            amostra: dadosProcessados.slice(0, 10) // Enviamos uma amostra para conferência
        });

    } catch (error) {
        console.error('Erro na API de Auditoria Profunda:', error);
        return NextResponse.json({ error: 'Falha na auditoria profunda.', details: error.message }, { status: 500 });
    }
}
