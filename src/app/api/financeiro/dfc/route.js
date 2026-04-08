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

// --- Função principal da rota (SIMPLIFICADA E CORRIGIDA) ---
export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const empresa = searchParams.get('empresa');
    const ano = parseInt(searchParams.get('ano'), 10);

    if (!empresa || !ano) {
        return NextResponse.json({ error: 'Os parâmetros "empresa" e "ano" são obrigatórios.' }, { status: 400 });
    }

    const apiKey = empresa === 'Victec' ? process.env.NIBO_API_KEY_VICTEC : process.env.NIBO_API_KEY_VMCTECH;

    try {
        // --- 1. Definir os endpoints para buscar TUDO que foi pago ---
        // A filtragem por ano será feita no nosso código, pois a API não suporta na URL.
        const endpoints = {
            realizadoCredit: `/schedules/credit?$filter=isPaid eq true&$expand=stakeholder,category`,
            realizadoDebit: `/schedules/debit?$filter=isPaid eq true&$expand=stakeholder,category`,
        };

        // --- 2. Executar as chamadas em paralelo ---
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

        // --- 3. Aplicar TODOS os filtros no nosso código ---
        const dadosDFC = todosOsItensPagos
            .filter(item => {
                // Filtro de Ano (aqui funciona!)
                const filtroAno = item.paymentDate && new Date(item.paymentDate).getFullYear() === ano;
                // Filtros de Validade
                const filtroBaixa = !item.writeOffDate;
                const filtroClienteExcluido = !item.stakeholder?.isDeleted;

                return filtroAno && filtroBaixa && filtroClienteExcluido;
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
