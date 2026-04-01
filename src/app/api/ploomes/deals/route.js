import { NextResponse } from 'next/server';

const PLOOMES_API_URL = 'https://api2.ploomes.com';
const API_KEY = process.env.PLOOMES_API_KEY;

// IDs dos funis e campos, como mapeamos anteriormente
const PIPELINES = {
    'VMC Tech': { vendas: 110064393, churn: 110065017 },
    'Victec': { vendas: 110023047, churn: 110042202 }
};
const FIELDS = {
    VENDEDOR: 110777788, SDR: 110777789, MRR: 110778108,
    PRODUTO: 111431860, UPSELL: 111433407, ADESAO_S: 110778105,
    ADESAO_R: 111431861, DATA_ATIVACAO: 110778114, DATA_CANCELAMENTO: 111417137
};

// Função auxiliar para buscar dados do Ploomes
async function fetchPloomes(endpoint ) {
    const url = `${PLOOMES_API_URL}${endpoint}`;
    const response = await fetch(url, {
        method: 'GET',
        headers: { 'User-Key': API_KEY, 'Content-Type': 'application/json' },
        cache: 'no-store',
    });
    if (!response.ok) throw new Error(`Ploomes API error: ${response.statusText}`);
    const data = await response.json();
    return data.value;
}

// Função para "limpar" e "traduzir" um negócio do Ploomes
function processDeal(deal, type) {
    const props = deal.OtherProperties || [];
    const getProp = (id) => props.find(p => p.FieldId === id);

    const mrr = getProp(FIELDS.MRR)?.DecimalValue || 0;
    const adesao = (getProp(FIELDS.ADESAO_S)?.DecimalValue || 0) + (getProp(FIELDS.ADESAO_R)?.DecimalValue || 0);
    
    let date;
    if (type === 'Venda') {
        date = getProp(FIELDS.DATA_ATIVACAO)?.DateTimeValue || deal.FinishDate || deal.CreateDate;
    } else { // Churn
        date = getProp(FIELDS.DATA_CANCELAMENTO)?.DateTimeValue || deal.FinishDate || deal.CreateDate;
    }

    return {
        id: deal.Id,
        cliente: deal.Title,
        cnpj: deal.Contact?.CNPJ || deal.Contact?.CPF || 'N/A',
        data: new Date(date),
        vendedor: getProp(FIELDS.VENDEDOR)?.UserValueName || 'N/A',
        sdr: getProp(FIELDS.SDR)?.UserValueName || 'N/A',
        produto: getProp(FIELDS.PRODUTO)?.ObjectValueName || getProp(FIELDS.PRODUTO)?.ValueName || 'Sittax Simples',
        mrr: mrr,
        adesao: adesao,
        upsell: getProp(FIELDS.UPSELL)?.DecimalValue || 0,
        status: type,
        // Adicionamos o StageId para identificar cancelados no funil de churn
        stageId: deal.StageId,
    };
}

export async function GET(request) {
    if (!API_KEY) {
        return NextResponse.json({ error: 'Chave da API do Ploomes não configurada.' }, { status: 500 });
    }

    // Pega a empresa selecionada da URL (ex: /api/ploomes/deals?empresa=VMC%20Tech)
    const { searchParams } = new URL(request.url);
    const empresa = searchParams.get('empresa') || 'VMC Tech'; // Padrão para VMC Tech

    const config = PIPELINES[empresa];
    if (!config) {
        return NextResponse.json({ error: 'Empresa não encontrada.' }, { status: 400 });
    }

    try {
        // Busca os negócios de Vendas e Churn em paralelo para mais performance
        const [vendasData, churnData] = await Promise.all([
            fetchPloomes(`/Deals?$filter=PipelineId eq ${config.vendas}&$expand=OtherProperties,Contact`),
            fetchPloomes(`/Deals?$filter=PipelineId eq ${config.churn}&$expand=OtherProperties,Contact`)
        ]);

        // Processa e "limpa" os dados de cada lista
        const processedVendas = vendasData.map(deal => processDeal(deal, 'Venda'));
        const processedChurn = churnData.map(deal => processDeal(deal, 'Churn'));

        // Combina tudo em uma única lista de dados limpos
        const allDeals = [...processedVendas, ...processedChurn];

        return NextResponse.json({ value: allDeals });

    } catch (error) {
        return NextResponse.json({ error: 'Erro ao processar dados do Ploomes.', details: error.message }, { status: 500 });
    }
}
