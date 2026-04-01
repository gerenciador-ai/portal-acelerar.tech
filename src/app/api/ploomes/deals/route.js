import { NextResponse } from 'next/server';

const PLOOMES_API_URL = 'https://api2.ploomes.com';
const API_KEY = process.env.PLOOMES_API_KEY;

const PIPELINES = {
    'VMC Tech': { vendas: 110064393, churn: 110065017 },
    'Victec':   { vendas: 110023047, churn: 110042202 }
};
const FIELDS = {
    VENDEDOR: 110777788, SDR: 110777789, MRR: 110778108,
    PRODUTO: 111431860, UPSELL: 111433407, ADESAO_S: 110778105,
    ADESAO_R: 111431861, DATA_ATIVACAO: 110778114, DATA_CANCELAMENTO: 111417137
};

async function fetchPloomes(endpoint ) {
    const url = `${PLOOMES_API_URL}${endpoint}`;
    const response = await fetch(url, {
        method: 'GET',
        headers: { 'User-Key': API_KEY, 'Content-Type': 'application/json' },
        cache: 'no-store',
    });
    if (!response.ok) {
        console.error(`Ploomes API error for ${url}: ${response.statusText}`);
        return [];
    }
    const data = await response.json();
    return data.value;
}

function processDeal(deal, type) {
    const props = deal.OtherProperties || [];
    const getProp = (id) => props.find(p => p.FieldId === id);

    let date;
    if (type === 'Venda') {
        date = getProp(FIELDS.DATA_ATIVACAO)?.DateTimeValue || deal.FinishDate;
    } else { // Churn
        date = getProp(FIELDS.DATA_CANCELAMENTO)?.DateTimeValue || deal.FinishDate;
    }
    
    if (!date) return null;

    return {
        id: deal.Id,
        cliente: deal.Title,
        cnpj: deal.Contact?.CNPJ || deal.Contact?.CPF || 'N/A',
        data: new Date(date),
        vendedor: getProp(FIELDS.VENDEDOR)?.UserValueName || 'N/A',
        sdr: getProp(FIELDS.SDR)?.UserValueName || 'N/A',
        produto: getProp(FIELDS.PRODUTO)?.ObjectValueName || getProp(FIELDS.PRODUTO)?.ValueName || 'Sittax Simples',
        mrr: getProp(FIELDS.MRR)?.DecimalValue || 0,
        adesao: (getProp(FIELDS.ADESAO_S)?.DecimalValue || 0) + (getProp(FIELDS.ADESAO_R)?.DecimalValue || 0),
        upsell: getProp(FIELDS.UPSELL)?.DecimalValue || 0,
        status: type,
    };
}

export async function GET(request) {
    if (!API_KEY) {
        return NextResponse.json({ error: 'Chave da API do Ploomes não configurada.' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const empresa = searchParams.get('empresa') || 'VMC Tech';
    const config = PIPELINES[empresa];

    if (!config) {
        return NextResponse.json({ error: 'Empresa não encontrada.' }, { status: 400 });
    }

    try {
        const endpointVendas = `/Deals?$filter=PipelineId eq ${config.vendas} and StatusId eq 2&$expand=OtherProperties,Contact`;
        
        // **LÓGICA CORRIGIDA - IGUAL AO CÓDIGO ANTIGO**
        // Busca todos os negócios do funil de Churn, sem filtrar por estágio.
        const endpointChurn = `/Deals?$filter=PipelineId eq ${config.churn}&$expand=OtherProperties,Contact`;

        const [vendasData, churnData] = await Promise.all([
            fetchPloomes(endpointVendas),
            fetchPloomes(endpointChurn)
        ]);

        const processedVendas = vendasData.map(deal => processDeal(deal, 'Venda'));
        const processedChurn = churnData.map(deal => processDeal(deal, 'Churn'));

        const allDeals = [...processedVendas, ...processedChurn].filter(Boolean);

        return NextResponse.json({ value: allDeals });

    } catch (error) {
        return NextResponse.json({ error: 'Erro ao processar dados do Ploomes.', details: error.message }, { status: 500 });
    }
}
