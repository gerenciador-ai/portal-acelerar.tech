// Arquivo: src/app/api/ploomes/results/route.js
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

async function fetchAllPages(endpoint ) {
    let allData = [];
    let skip = 0;
    const top = 250;
    let hasMore = true;
    while (hasMore) {
        const paginatedEndpoint = `${endpoint}&$skip=${skip}&$top=${top}`;
        const url = `${PLOOMES_API_URL}${paginatedEndpoint}`;
        const response = await fetch(url, { method: 'GET', headers: { 'User-Key': API_KEY }, cache: 'no-store' });
        if (!response.ok) throw new Error(`Ploomes API request failed: ${response.statusText}`);
        const data = await response.json();
        if (data.value && data.value.length > 0) {
            allData = allData.concat(data.value);
            skip += top;
        } else {
            hasMore = false;
        }
    }
    return allData;
}

function processDeal(deal, type) {
    const props = deal.OtherProperties || [];
    const getProp = (id) => props.find(p => p.FieldId === id);
    let date;
    if (deal.StatusId === 2) {
        date = getProp(FIELDS.DATA_ATIVACAO)?.DateTimeValue || deal.FinishDate;
    } else if (type === 'Churn') {
        date = getProp(FIELDS.DATA_CANCELAMENTO)?.DateTimeValue || deal.FinishDate;
    }
    if (!date) return null;

    // Tenta extrair o produto do card atual
    let produto = getProp(FIELDS.PRODUTO)?.ObjectValueName || getProp(FIELDS.PRODUTO)?.ValueName;

    // Se for Churn e o produto for N/A, tenta buscar na última venda ganha anexada ao contato (Deep Expand)
    if (type === 'Churn' && (!produto || produto === 'N/A')) {
        const lastWonDeal = deal.Contact?.Deals?.[0];
        if (lastWonDeal) {
            const lastProps = lastWonDeal.OtherProperties || [];
            produto = lastProps.find(p => p.FieldId === FIELDS.PRODUTO)?.ObjectValueName || 
                      lastProps.find(p => p.FieldId === FIELDS.PRODUTO)?.ValueName;
        }
    }

    return {
        id: deal.Id, contactId: deal.ContactId, statusId: deal.StatusId, cliente: deal.Title,
        cnpj: deal.Contact?.CNPJ || deal.Contact?.CPF || 'N/A',
        data: new Date(date), vendedor: getProp(FIELDS.VENDEDOR)?.UserValueName || 'N/A',
        sdr: getProp(FIELDS.SDR)?.UserValueName || 'N/A', 
        produto: produto || 'N/A',
        mrr: getProp(FIELDS.MRR)?.DecimalValue || 0, adesao: (getProp(FIELDS.ADESAO_S)?.DecimalValue || 0) + (getProp(FIELDS.ADESAO_R)?.DecimalValue || 0),
        upsell: getProp(FIELDS.UPSELL)?.DecimalValue || 0, status: type,
    };
}

export async function GET(request) {
    if (!API_KEY) return NextResponse.json({ error: 'Chave da API não configurada.' }, { status: 500 });
    const { searchParams } = new URL(request.url);
    const empresa = searchParams.get('empresa') || 'VMC Tech';
    const config = PIPELINES[empresa];
    if (!config) return NextResponse.json({ error: 'Empresa não encontrada.' }, { status: 400 });

    try {
        // A mágica acontece aqui: Expandimos o contato e, dentro dele, buscamos a última venda ganha histórica (StatusId eq 2)
        const contactExpand = 'Contact($select=Id,Name,CNPJ,CPF;$expand=Deals($filter=StatusId eq 2;$orderby=FinishDate desc;$top=1;$expand=OtherProperties))';
        
        const [vendasData, churnData] = await Promise.all([
            fetchAllPages(`/Deals?$filter=PipelineId eq ${config.vendas}&$expand=OtherProperties,${contactExpand}`),
            fetchAllPages(`/Deals?$filter=PipelineId eq ${config.churn}&$expand=OtherProperties,${contactExpand}`)
        ]);

        const allVendasProcessed = vendasData.map(deal => processDeal(deal, 'Venda')).filter(Boolean);
        let processedChurn = churnData.map(deal => processDeal(deal, 'Churn')).filter(Boolean);

        // Mapa de referência para preencher MRR, Vendedor e SDR do Churn a partir das vendas do período atual
        const dataMap = new Map();
        for (const venda of allVendasProcessed) {
            if (venda.contactId && venda.statusId === 2) {
                if (!dataMap.has(venda.contactId) || new Date(venda.data) > new Date(dataMap.get(venda.contactId).data)) {
                    dataMap.set(venda.contactId, { 
                        mrr: venda.mrr, 
                        vendedor: venda.vendedor, 
                        sdr: venda.sdr, 
                        data: venda.data,
                        produto: venda.produto 
                    });
                }
            }
        }

        processedChurn = processedChurn.map(churn => {
            if (churn.contactId && dataMap.has(churn.contactId)) {
                const originalData = dataMap.get(churn.contactId);
                return { 
                    ...churn, 
                    mrr: originalData.mrr, 
                    vendedor: originalData.vendedor, 
                    sdr: originalData.sdr,
                    produto: (churn.produto === 'N/A' || !churn.produto) ? originalData.produto : churn.produto
                };
            }
            return churn;
        });

        const vendasGanha = allVendasProcessed.filter(v => v.statusId === 2);
        const allDeals = [...vendasGanha, ...processedChurn];

        return NextResponse.json({ value: allDeals });
    } catch (error) {
        return NextResponse.json({ error: 'Erro ao processar dados de resultados.', details: error.message }, { status: 500 });
    }
}
