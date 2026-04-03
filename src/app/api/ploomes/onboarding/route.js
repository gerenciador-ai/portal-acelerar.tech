// Arquivo: src/app/api/ploomes/onboarding/route.js
import { NextResponse } from 'next/server';

const PLOOMES_API_URL = 'https://api2.ploomes.com';
const API_KEY = process.env.PLOOMES_API_KEY;

const PIPELINES = {
    'VMC Tech': { onboarding: 110065015, vendas: 110064393 },
    'Victec':   { onboarding: 110023069, vendas: 110023047 }
};
const FIELDS = {
    VENDEDOR: 110777788, SDR: 110777789, MRR: 110778108,
    PRODUTO: 111431860, UPSELL: 111433407, ADESAO_S: 110778105,
    ADESAO_R: 111431861, DATA_ATIVACAO: 110778114
};

async function fetchAllPages(endpoint ) {
    let allData = []; let skip = 0; const top = 250; let hasMore = true;
    while (hasMore) {
        const url = `${PLOOMES_API_URL}${endpoint}&$skip=${skip}&$top=${top}`;
        const response = await fetch(url, { headers: { 'User-Key': API_KEY }, cache: 'no-store' });
        if (!response.ok) { console.error(`Ploomes API error for ${url}: ${response.statusText}`); hasMore = false; continue; }
        const data = await response.json();
        if (data.value && data.value.length > 0) { allData = allData.concat(data.value); skip += top; } else { hasMore = false; }
    }
    return allData;
}

function processDeal(deal, salesDataMap) {
    const props = deal.OtherProperties || [];
    const getProp = (id) => props.find(p => p.FieldId === id);
    const originalSale = salesDataMap.get(deal.ContactId);

    return {
        id: deal.Id,
        contactId: deal.ContactId,
        cliente: deal.Title,
        status: deal.StatusId === 2 ? 'Venda' : (deal.StatusId === 3 ? 'Perdido' : 'Aberto'),
        etapa: deal.StageName || 'Etapa não definida',
        dataCriacao: deal.CreationDate,
        dataFinalizacao: deal.FinishDate,
        diasNoFunil: deal.DaysInPipeline || 0,
        mrr: getProp(FIELDS.MRR)?.DecimalValue || originalSale?.mrr || 0,
        vendedor: getProp(FIELDS.VENDEDOR)?.UserValueName || originalSale?.vendedor || 'N/A',
        sdr: getProp(FIELDS.SDR)?.UserValueName || originalSale?.sdr || 'N/A',
    };
}

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const empresa = searchParams.get('empresa') || 'VMC Tech';
    const config = PIPELINES[empresa];
    if (!config) return NextResponse.json({ error: 'Empresa não encontrada.' }, { status: 400 });

    try {
        const [onboardingData, salesData] = await Promise.all([
            fetchAllPages(`/Deals?$filter=PipelineId eq ${config.onboarding}&$expand=OtherProperties,Contact($select=Id)`),
            fetchAllPages(`/Deals?$filter=PipelineId eq ${config.vendas} and StatusId eq 2&$expand=OtherProperties`)
        ]);

        const salesDataMap = new Map();
        for (const sale of salesData) {
            if (sale.ContactId && !salesDataMap.has(sale.ContactId)) {
                const props = sale.OtherProperties || [];
                salesDataMap.set(sale.ContactId, {
                    mrr: props.find(p => p.FieldId === FIELDS.MRR)?.DecimalValue || 0,
                    vendedor: props.find(p => p.FieldId === FIELDS.VENDEDOR)?.UserValueName || 'N/A',
                    sdr: props.find(p => p.FieldId === FIELDS.SDR)?.UserValueName || 'N/A',
                });
            }
        }

        const processedDeals = onboardingData.map(deal => processDeal(deal, salesDataMap)).filter(Boolean);
        return NextResponse.json({ value: processedDeals });
    } catch (error) {
        console.error("[API Onboarding] Erro fatal:", error);
        return NextResponse.json({ error: 'Erro ao processar dados de onboarding.', details: error.message }, { status: 500 });
    }
}
