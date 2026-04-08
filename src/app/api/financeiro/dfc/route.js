// Arquivo: src/app/api/financeiro/dfc/route.js
import { NextResponse } from 'next/server';

const NIBO_API_URL = 'https://api.nibo.com.br/empresas/v1';

// --- Função de Mapeamento de Categorias ---
// Esta é a "inteligência" que traduz as categorias do NIBO para as do DFC.
// Adicione mais categorias do seu plano de contas do NIBO aqui conforme necessário.
function mapearCategoriaParaDFC(categoryName ) {
    const name = categoryName.toLowerCase();

    // Fluxo de Caixa Operacional (FCO)
    if (name.includes('serviços') || name.includes('salários') || name.includes('impostos') || name.includes('fornecedores') || name.includes('aluguel')) {
        return 'FCO';
    }
    // Fluxo de Caixa de Investimentos (FCI)
    if (name.includes('imobilizado') || name.includes('investimentos')) {
        return 'FCI';
    }
    // Fluxo de Caixa de Financiamentos (FCF)
    if (name.includes('empréstimos') || name.includes('financiamentos') || name.includes('juros pagos') || name.includes('dividendos')) {
        return 'FCF';
    }
    // Categoria padrão para o que não for mapeado
    return 'Não Classificado';
}


// --- Função reutilizável para buscar dados da API v1 do NIBO ---
async function fetchNiboData(apiKey, endpoint) {
    if (!apiKey) {
        throw new Error(`Chave de API do NIBO (v1) não fornecida.`);
    }
    const separator = endpoint.includes('?') ? '&' : '?';
    const url = `${NIBO_API_URL}${endpoint}${separator}apitoken=${apiKey}`;
    
    const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Erro na API v1 do NIBO (${response.status}) ao acessar ${url}: ${errorBody}`);
    }
    return response.json();
}

// --- Função principal da rota ---
export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const empresa = searchParams.get('empresa');
    const ano = searchParams.get('ano');

    if (!empresa || !ano) {
        return NextResponse.json({ error: 'Os parâmetros "empresa" e "ano" são obrigatórios.' }, { status: 400 });
    }

    const apiKey = empresa === 'Victec' 
        ? process.env.NIBO_API_KEY_VICTEC 
        : process.env.NIBO_API_KEY_VMCTECH;

    try {
        // --- 1. Busca de Dados "Realizados" ---
        // Pagos, Conciliados e dentro do ano fiscal.
        const filtroRealizado = `$filter=isPaid eq true and isReconciled eq true and year(paymentDate) eq ${ano}`;
        const endpointRealizado = `/schedules?${filtroRealizado}`;
        const resultRealizado = await fetchNiboData(apiKey, endpointRealizado);
        const realizados = (resultRealizado.items || []).map(item => ({
            data: item.paymentDate,
            valor: item.paidValue,
            tipo: item.type === 'Credit' ? 'entrada' : 'saida',
            status: 'realizado',
            categoriaDFC: mapearCategoriaParaDFC(item.category?.name || ''),
            descricao: item.description,
        }));

        // --- 2. Busca de Dados "Projetados" ---
        // Não pagos e com vencimento futuro dentro do ano.
        const hoje = new Date().toISOString().slice(0, 10);
        const filtroProjetado = `$filter=isPaid eq false and dueDate ge ${hoje} and year(dueDate) eq ${ano}`;
        const endpointProjetado = `/schedules?${filtroProjetado}`;
        const resultProjetado = await fetchNiboData(apiKey, endpointProjetado);
        const projetados = (resultProjetado.items || []).map(item => ({
            data: item.dueDate,
            valor: item.openValue,
            tipo: item.type === 'Credit' ? 'entrada' : 'saida',
            status: 'projetado',
            categoriaDFC: mapearCategoriaParaDFC(item.category?.name || ''),
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
