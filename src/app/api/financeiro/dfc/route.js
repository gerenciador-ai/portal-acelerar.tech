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

// --- Função de busca na API v1 (MODIFICADA PARA SUPORTAR PAGINAÇÃO) ---
async function fetchAllNiboData(apiKey, initialEndpoint) {
    let allItems = [];
    let endpoint = initialEndpoint;
    let hasNextPage = true;

    while (hasNextPage) {
        const separator = endpoint.includes('?') ? '&' : '?';
        const url = `${NIBO_API_URL}${endpoint}${separator}apitoken=${apiKey}`;
        
        const response = await fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json' }, cache: 'no-store' });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Erro na API v1 do NIBO (${response.status}) ao acessar ${url}: ${errorBody}`);
        }

        const data = await response.json();
        if (data.items && data.items.length > 0) {
            allItems = allItems.concat(data.items);
        }

        // Verifica se há uma próxima página na resposta
        const nextPageLink = data['@odata.nextLink'];
        if (nextPageLink) {
            // Extrai o endpoint da URL completa da próxima página
            endpoint = nextPageLink.substring(NIBO_API_URL.length);
        } else {
            hasNextPage = false;
        }
    }
    return allItems;
}


// --- Função principal da rota (Usando a nova função com paginação) ---
export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const empresa = searchParams.get('empresa');
    
    if (!empresa) {
        return NextResponse.json({ error: 'O parâmetro "empresa" é obrigatório.' }, { status: 400 });
    }

    const apiKey = empresa === 'Victec' ? process.env.NIBO_API_KEY_VICTEC : process.env.NIBO_API_KEY_VMCTECH;

    try {
        // 1. Definir os endpoints iniciais
        const endpoints = {
            realizadoCredit: `/schedules/credit?$filter=isPaid eq true&$expand=stakeholder,category`,
            realizadoDebit: `/schedules/debit?$filter=isPaid eq true&$expand=stakeholder,category`,
        };

        // 2. Executar as buscas com paginação em paralelo
        const [
            todosCreditosPagos,
            todosDebitosPagos,
        ] = await Promise.all([
            fetchAllNiboData(apiKey, endpoints.realizadoCredit),
            fetchAllNiboData(apiKey, endpoints.realizadoDebit),
        ]);

        const todosOsItensPagos = [
            ...todosCreditosPagos.map(item => ({ ...item, tipo: 'entrada' })),
            ...todosDebitosPagos.map(item => ({ ...item, tipo: 'saida' })),
        ];

        // 3. Aplicar os filtros de data e validade no nosso código
        const dataInicio = new Date('2026-01-01T00:00:00Z');

        const dadosDFC = todosOsItensPagos
            .filter(item => {
                if (!item.paymentDate) return false;
                const filtroData = new Date(item.paymentDate) >= dataInicio;
                const filtroBaixa = !item.writeOffDate;
                const filtroClienteExcluido = !item.stakeholder?.isDeleted;
                return filtroData && filtroBaixa && filtroClienteExcluido;
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
