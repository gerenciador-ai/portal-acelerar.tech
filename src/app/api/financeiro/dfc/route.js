// Arquivo: src/app/api/financeiro/dfc/route.js
import { NextResponse } from 'next/server';

const NIBO_API_URL = 'https://api.nibo.com.br/empresas/v1';

// --- Função de Mapeamento de Categorias (sem alterações ) ---
function mapearCategoriaParaDFC(categoryName) {
    if (!categoryName) return 'Não Classificado';
    const name = categoryName.toLowerCase();
    if (name.includes('serviços') || name.includes('salários') || name.includes('impostos') || name.includes('fornecedores') || name.includes('aluguel')) return 'FCO';
    if (name.includes('imobilizado') || name.includes('investimentos')) return 'FCI';
    if (name.includes('empréstimos') || name.includes('financiamentos') || name.includes('juros pagos') || name.includes('dividendos')) return 'FCF';
    return 'Não Classificado';
}

// --- Função de busca na API v1 (sem paginação, pois o filtro inicial é suficiente) ---
async function fetchNiboData(apiKey, endpoint) {
    if (!apiKey) throw new Error(`Chave de API do NIBO (v1) não fornecida.`);
    const separator = endpoint.includes('?') ? '&' : '?';
    const url = `${NIBO_API_URL}${endpoint}${separator}apitoken=${apiKey}`;
    const response = await fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json' }, cache: 'no-store' });
    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Erro na API v1 do NIBO (${response.status}) ao acessar ${url}: ${errorBody}`);
    }
    return response.json();
}

// --- Função principal da rota (LÓGICA DE FILTRO CORRIGIDA E SIMPLIFICADA) ---
export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const empresa = searchParams.get('empresa');
    
    if (!empresa) {
        return NextResponse.json({ error: 'O parâmetro "empresa" é obrigatório.' }, { status: 400 });
    }

    const apiKey = empresa === 'Victec' ? process.env.NIBO_API_KEY_VICTEC : process.env.NIBO_API_KEY_VMCTECH;

    try {
        // 1. Filtro inteligente na URL: busca itens pagos com VENCIMENTO a partir de 2026.
        // Isso reduz drasticamente o volume de dados, eliminando a necessidade de paginação.
        const filtroURL = `$filter=isPaid eq true and dueDate ge 2026-01-01`;

        const endpoints = {
            realizadoCredit: `/schedules/credit?${filtroURL}&$expand=stakeholder,category`,
            realizadoDebit: `/schedules/debit?${filtroURL}&$expand=stakeholder,category`,
        };

        const [
            resRealizadoCredit,
            resRealizadoDebit,
        ] = await Promise.all([
            fetchNiboData(apiKey, endpoints.realizadoCredit),
            fetchNiboData(apiKey, endpoints.realizadoDebit),
        ]);

        const todosOsItensPagos = [
            ...(resRealizadoCredit.items || []).map(item => ({ ...item, tipo: 'entrada' })),
            ...(resRealizadoDebit.items || []).map(item => ({ ...item, tipo: 'saida' })),
        ];

        // 2. Aplicar os filtros finais de validade e DATA DE PAGAMENTO no nosso código
        const dadosDFC = todosOsItensPagos
            .filter(item => {
                // Garante que o item tem uma data de PAGAMENTO e que ela é de 2026 ou posterior
                if (!item.paymentDate || !item.paymentDate.startsWith('2026')) return false;
                
                const filtroBaixa = !item.writeOffDate;
                const filtroClienteExcluido = !item.stakeholder?.isDeleted;

                return filtroBaixa && filtroClienteExcluido;
            })
            .map(item => ({
                data: item.paymentDate,
                valor: item.paidValue,
                tipo: item.tipo,
                status: 'realizado',
                categoriaDFC: mapearCategoriaParaDFC(item.category?.name),
                descricao: item.description,
                isReconciled: item.isReconciled || false
            }));

        return NextResponse.json(dadosDFC);

    } catch (error) {
        console.error('Erro detalhado na API do DFC:', error);
        return NextResponse.json({ 
            error: 'Falha ao buscar dados do DFC do NIBO.', 
            details: error.message 
        }, { status: 500 });
    }
}
