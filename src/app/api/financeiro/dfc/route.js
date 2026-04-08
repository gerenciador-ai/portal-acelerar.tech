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

// --- Função de busca na API (sem alterações) ---
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
        // --- 1. Busca de Dados "Realizados" a partir do endpoint /entries ---
        const resultRealizadoBruto = await fetchNiboData(apiKey, '/entries');
        const realizados = (resultRealizadoBruto.items || [])
            .filter(item => 
                item.isReconciled === true && // Filtra por conciliados
                item.paymentDate && new Date(item.paymentDate).getFullYear() === ano // Filtra pelo ano
            )
            .map(item => ({
                data: item.paymentDate,
                valor: item.value,
                tipo: item.type === 'in' ? 'entrada' : 'saida',
                status: 'realizado',
                categoriaDFC: mapearCategoriaParaDFC(item.category?.name),
                descricao: item.description,
            }));

        // --- 2. Busca de Dados "Projetados" a partir do endpoint /schedules ---
        const hoje = new Date().toISOString().slice(0, 10);
        const filtroProjetado = `$filter=isPaid eq false and dueDate ge ${hoje} and year(dueDate) eq ${ano}`;
        const resultProjetado = await fetchNiboData(apiKey, `/schedules?${filtroProjetado}`);
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
