// Arquivo: src/app/api/financeiro/dfc/route.js
import { NextResponse } from 'next/server';

const NIBO_API_URL = 'https://api.nibo.com.br/empresas/v1';

// --- Função para buscar TODOS os dados (com paginação ) ---
async function fetchAllNiboData(apiKey, endpoint) {
    let allItems = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
        const url = `${NIBO_API_URL}${endpoint}?apitoken=${apiKey}&$expand=stakeholder,category&$page=${page}`;
        const response = await fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json' }, cache: 'no-store' });
        
        if (!response.ok) throw new Error(`Erro na API NIBO: ${response.status}`);
        
        const data = await response.json();
        const items = data.items || [];
        
        allItems = [...allItems, ...items];
        
        // Se vieram menos de 50 itens (padrão do Nibo), chegamos ao fim
        if (items.length < 50) {
            hasMore = false;
        } else {
            page++;
        }
        
        // Trava de segurança para não entrar em loop infinito
        if (page > 20) hasMore = false; 
    }
    return allItems;
}

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const empresa = searchParams.get('empresa');
    if (!empresa) return NextResponse.json({ error: 'Empresa obrigatória' }, { status: 400 });

    const apiKey = empresa === 'Victec' ? process.env.NIBO_API_KEY_VICTEC : process.env.NIBO_API_KEY_VMCTECH;

    try {
        // Busca exaustiva de Créditos e Débitos
        const [resCredit, resDebit] = await Promise.all([
            fetchAllNiboData(apiKey, '/schedules/credit'),
            fetchAllNiboData(apiKey, '/schedules/debit')
        ]);

        const todosOsItens = [
            ...resCredit.map(i => ({ ...i, tipo: 'entrada' })),
            ...resDebit.map(i => ({ ...i, tipo: 'saida' }))
        ];

        const dadosProcessados = todosOsItens
            .filter(item => {
                const dataRef = item.paymentDate || item.dueDate;
                // Filtro rigoroso: Apenas 2026 e que NÃO sejam deletados ou baixados
                return dataRef && dataRef >= '2026-01-01' && !item.stakeholder?.isDeleted && !item.writeOffDate;
            })
            .map(item => ({
                data: (item.paymentDate || item.dueDate).split('T')[0],
                valor: item.paidValue || item.value,
                tipo: item.tipo,
                status: item.isPaid ? 'realizado' : 'previsto',
                categoria: item.category?.name || 'Categoria indefinida',
                isPaid: item.isPaid
            }));

        return NextResponse.json({
            empresa,
            totalCapturado: dadosProcessados.length,
            fluxo: dadosProcessados
        });

    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
