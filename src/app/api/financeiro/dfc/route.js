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

// --- Função de busca na API v1 (sem alterações) ---
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

// --- Função principal da rota (Focada no REALIZADO a partir de 2026) ---
export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const empresa = searchParams.get('empresa');
    // O parâmetro 'ano' não é mais usado aqui, pois a data de início está fixa.
    
    if (!empresa) {
        return NextResponse.json({ error: 'O parâmetro "empresa" é obrigatório.' }, { status: 400 });
    }

    const apiKey = empresa === 'Victec' ? process.env.NIBO_API_KEY_VICTEC : process.env.NIBO_API_KEY_VMCTECH;

    try {
        // 1. Buscar TODOS os lançamentos pagos (créditos e débitos)
        const endpoints = {
            realizadoCredit: `/schedules/credit?$filter=isPaid eq true&$expand=stakeholder,category`,
            realizadoDebit: `/schedules/debit?$filter=isPaid eq true&$expand=stakeholder,category`,
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

        // 2. Aplicar os filtros de data e validade no nosso código
        const dataInicio = new Date('2026-01-01T00:00:00Z');

        const dadosDFC = todosOsItensPagos
            .filter(item => {
                // Garante que o item tem uma data de pagamento
                if (!item.paymentDate) return false;

                // Filtro de Data: Apenas a partir de 01/01/2026
                const filtroData = new Date(item.paymentDate) >= dataInicio;
                
                // Filtros de Validade
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
