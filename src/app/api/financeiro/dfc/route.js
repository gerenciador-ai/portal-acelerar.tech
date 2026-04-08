// Arquivo: src/app/api/financeiro/dfc/route.js
import { NextResponse } from 'next/server';

// --- Constantes das APIs ---
const NIBO_API_V1_URL = 'https://api.nibo.com.br/empresas/v1';
const NIBO_API_V2_URL = 'https://api.nibo.com.br/v2';

// --- Função de Mapeamento de Categorias (sem alterações ) ---
function mapearCategoriaParaDFC(categoryName) {
    if (!categoryName) return 'Não Classificado';
    const name = categoryName.toLowerCase();
    if (name.includes('serviços') || name.includes('salários') || name.includes('impostos') || name.includes('fornecedores') || name.includes('aluguel')) return 'FCO';
    if (name.includes('imobilizado') || name.includes('investimentos')) return 'FCI';
    if (name.includes('empréstimos') || name.includes('financiamentos') || name.includes('juros pagos') || name.includes('dividendos')) return 'FCF';
    return 'Não Classificado';
}

// --- Funções de Busca Específicas por Versão da API ---

// Função para buscar dados da API v1 (Projetado)
async function fetchNiboV1(apiKey, endpoint) {
    if (!apiKey) throw new Error(`Chave de API do NIBO (v1) não fornecida.`);
    const separator = endpoint.includes('?') ? '&' : '?';
    const url = `${NIBO_API_V1_URL}${endpoint}${separator}apitoken=${apiKey}`;
    const response = await fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json' }, cache: 'no-store' });
    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Erro na API v1 do NIBO (${response.status}) ao acessar ${url}: ${errorBody}`);
    }
    return response.json();
}

// Função para buscar dados da API v2 (Realizado)
async function fetchNiboV2(apiKey, endpoint) {
    if (!apiKey) throw new Error(`Chave de API do NIBO (v2) não fornecida.`);
    const url = `${NIBO_API_V2_URL}${endpoint}`;
    const response = await fetch(url, {
        method: 'GET',
        headers: { 'access_token': apiKey, 'Content-Type': 'application/json' },
        cache: 'no-store',
    });
    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Erro na API v2 do NIBO (${response.status}) ao acessar ${url}: ${errorBody}`);
    }
    return response.json();
}

// --- Função principal da rota (LÓGICA CORRIGIDA) ---
export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const empresa = searchParams.get('empresa');
    const ano = parseInt(searchParams.get('ano'), 10);

    if (!empresa || !ano) {
        return NextResponse.json({ error: 'Os parâmetros "empresa" e "ano" são obrigatórios.' }, { status: 400 });
    }

    const apiKey = empresa === 'Victec' ? process.env.NIBO_API_KEY_VICTEC : process.env.NIBO_API_KEY_VMCTECH;

    try {
        // --- 1. Busca de Dados "Realizados" (API v2) ---
        const resultRealizadoBruto = await fetchNiboV2(apiKey, '/accounting/entries');
        const realizados = (resultRealizadoBruto.items || [])
            .filter(item => 
                item.isReconciled === true &&
                item.paymentDate && new Date(item.paymentDate).getFullYear() === ano
            )
            .map(item => ({
                data: item.paymentDate,
                valor: item.value,
                tipo: item.type === 'in' ? 'entrada' : 'saida',
                status: 'realizado',
                categoriaDFC: mapearCategoriaParaDFC(item.category?.name),
                descricao: item.description,
            }));

        // --- 2. Busca de Dados "Projetados" (API v1) ---
        const hoje = new Date().toISOString().slice(0, 10);
        const filtroProjetado = `$filter=isPaid eq false and dueDate ge ${hoje} and year(dueDate) eq ${ano}`;
        const resultProjetado = await fetchNiboV1(apiKey, `/schedules?${filtroProjetado}`);
        const projetados = (resultProjetado.items || []).map(item => ({
            data: item.dueDate,
            valor: item.openValue,
            tipo: item.type === 'Credit' ? 'entrada' : 'saida',
            status: 'projetado',
            categoriaDFC: mapearCategoriaParaDFC(item.category?.name),
            descricao: item.description,
        }));

        // --- 3. Unir e Retornar ---
        const dadosDFC = [...realizados, ...projetados];

        return NextResponse.json(dadosDFC);

    } catch (error) {
        console.error('Erro detalhado na API do DFC:', error);
        return NextResponse.json({ 
            error: 'Falha ao buscar dados do DFC do NIBO.', 
            details: error.message 
        }, { status: 500 });
    }
}
