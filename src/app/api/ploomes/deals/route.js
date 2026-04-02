import { NextResponse } from 'next/server';

const PLOOMES_API_URL = 'https://api2.ploomes.com';
const API_KEY = process.env.PLOOMES_API_KEY;

// 1. MAPEAMENTO DE FUNIS EXPANDIDO
const PIPELINES = {
    'VMC Tech': { 
        vendas: 110064393, 
        churn: 110065017,
        onboarding: 110065015,
        ongoing: 110065016
    },
    'Victec':   { 
        vendas: 110023047, 
        churn: 110042202,
        onboarding: 110023069,
        ongoing: 110023249
    }
};

// Mapeamento de campos (sem alterações )
const FIELDS = {
    VENDEDOR: 110777788, SDR: 110777789, MRR: 110778108,
    PRODUTO: 111431860, UPSELL: 111433407, ADESAO_S: 110778105,
    ADESAO_R: 111431861, DATA_ATIVACAO: 110778114, DATA_CANCELAMENTO: 111417137
};

// Função de paginação (sem alterações)
async function fetchAllPages(endpoint) {
    let allData = [];
    let skip = 0;
    const top = 250;
    let hasMore = true;

    while (hasMore) {
        const paginatedEndpoint = `${endpoint}&$skip=${skip}&$top=${top}`;
        const url = `${PLOOMES_API_URL}${paginatedEndpoint}`;
        const response = await fetch(url, {
            method: 'GET',
            headers: { 'User-Key': API_KEY, 'Content-Type': 'application/json' },
            cache: 'no-store',
        });

        if (!response.ok) {
            console.error(`Ploomes API error for ${url}: ${response.statusText}`);
            throw new Error(`Ploomes API request failed with status ${response.status}`);
        }

        const data = await response.json();
        const values = data.value;
        
        if (values && values.length > 0) {
            allData = allData.concat(values);
            skip += top;
        } else {
            hasMore = false;
        }
    }
    return allData;
}

// 2. FUNÇÃO DE PROCESSAMENTO AJUSTADA
function processDeal(deal, funilType) {
    const props = deal.OtherProperties || [];
    const getProp = (id) => props.find(p => p.FieldId === id);

    // Usa a data de finalização como padrão, que é mais universal
    const date = deal.FinishDate || deal.CreateDate;
    
    if (!date) return null;

    return {
        id: deal.Id,
        contactId: deal.ContactId,
        statusId: deal.StatusId,
        cliente: deal.Title,
        cnpj: deal.Contact?.CNPJ || deal.Contact?.CPF || 'N/A',
        data: new Date(date),
        vendedor: getProp(FIELDS.VENDEDOR)?.UserValueName || 'N/A',
        sdr: getProp(FIELDS.SDR)?.UserValueName || 'N/A',
        produto: getProp(FIELDS.PRODUTO)?.ObjectValueName || getProp(FIELDS.PRODUTO)?.ValueName || 'Sittax Simples',
        mrr: getProp(FIELDS.MRR)?.DecimalValue || deal.Amount || 0, // Usa o Amount do deal como fallback
        adesao: (getProp(FIELDS.ADESAO_S)?.DecimalValue || 0) + (getProp(FIELDS.ADESAO_R)?.DecimalValue || 0),
        upsell: getProp(FIELDS.UPSELL)?.DecimalValue || 0,
        status: deal.StatusId === 2 ? 'Venda' : (deal.StatusId === 3 ? 'Perdido' : 'Aberto'), // Status mais genérico
        // Adiciona campos úteis para CS
        etapa: deal.StageName,
        responsavel: deal.Owner?.Name || 'N/A',
        diasNoFunil: deal.DaysInPipeline,
        diasNaEtapa: deal.DaysInStage,
    };
}

// 3. FUNÇÃO GET REESTRUTURADA
export async function GET(request) {
    if (!API_KEY) return NextResponse.json({ error: 'Chave da API do Ploomes não configurada.' }, { status: 500 });

    const { searchParams } = new URL(request.url);
    const empresa = searchParams.get('empresa') || 'VMC Tech';
    // Lê o parâmetro 'funil', com 'vendas' como padrão
    const funil = searchParams.get('funil') || 'vendas'; 

    const empresaConfig = PIPELINES[empresa];
    if (!empresaConfig) return NextResponse.json({ error: 'Empresa não encontrada.' }, { status: 400 });

    const pipelineId = empresaConfig[funil];
    if (!pipelineId) return NextResponse.json({ error: `Funil '${funil}' não encontrado para a empresa '${empresa}'.` }, { status: 400 });

    try {
        // A API agora busca apenas no funil especificado
        const endpoint = `/Deals?$filter=PipelineId eq ${pipelineId}&$expand=OtherProperties,Contact($select=Id,Name,CNPJ,CPF),Owner`;
        
        const dealsData = await fetchAllPages(endpoint);

        const processedDeals = dealsData.map(deal => processDeal(deal, funil)).filter(Boolean);

        return NextResponse.json({ value: processedDeals });

    } catch (error) {
        console.error('Erro na rota da API Ploomes:', error);
        return NextResponse.json({ error: 'Erro ao processar dados do Ploomes.', details: error.message }, { status: 500 });
    }
}
