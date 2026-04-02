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

async function fetchAllPages(endpoint   ) {
    let allData = [];
    let skip = 0;
    const top = 250; // Número de itens por página
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
            hasMore = false;
            continue;
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

function processDeal(deal, type) {
    const props = deal.OtherProperties || [];
    const getProp = (id) => props.find(p => p.FieldId === id);

    let date;
    if (deal.StatusId === 2) { // Venda Ganha
        date = getProp(FIELDS.DATA_ATIVACAO)?.DateTimeValue || deal.FinishDate;
    } else if (type === 'Churn') { // Negócio do funil de Churn
        date = getProp(FIELDS.DATA_CANCELAMENTO)?.DateTimeValue || deal.FinishDate;
    }
    
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
        mrr: getProp(FIELDS.MRR)?.DecimalValue || 0,
        adesao: (getProp(FIELDS.ADESAO_S)?.DecimalValue || 0) + (getProp(FIELDS.ADESAO_R)?.DecimalValue || 0),
        upsell: getProp(FIELDS.UPSELL)?.DecimalValue || 0,
        status: type,
    };
}

export async function GET(request) {
    if (!API_KEY) return NextResponse.json({ error: 'Chave da API do Ploomes não configurada.' }, { status: 500 });

    const { searchParams } = new URL(request.url);
    const empresa = searchParams.get('empresa') || 'VMC Tech';
    const config = PIPELINES[empresa];

    if (!config) return NextResponse.json({ error: 'Empresa não encontrada.' }, { status: 400 });

    try {
        const endpointVendasFull = `/Deals?$filter=PipelineId eq ${config.vendas}&$expand=OtherProperties,Contact($select=Id,Name,CNPJ,CPF)`;
        const endpointChurn = `/Deals?$filter=PipelineId eq ${config.churn}&$expand=OtherProperties,Contact($select=Id,Name,CNPJ,CPF)`;

        const [vendasFullData, churnData] = await Promise.all([
            fetchAllPages(endpointVendasFull),
            fetchAllPages(endpointChurn)
        ]);

        const allVendasProcessed = vendasFullData.map(deal => processDeal(deal, 'Venda')).filter(Boolean);
        let processedChurn = churnData.map(deal => processDeal(deal, 'Churn')).filter(Boolean);

        // **CORREÇÃO APLICADA: Criação de mapas para MRR, Vendedor e SDR**
        const dataMap = new Map();
        for (const venda of allVendasProcessed) {
            // Considera apenas vendas ganhas (statusId 2) para pegar os dados corretos
            if (venda.contactId && venda.statusId === 2) {
                // Armazena a venda mais recente para cada cliente, caso haja múltiplas
                if (!dataMap.has(venda.contactId) || new Date(venda.data) > new Date(dataMap.get(venda.contactId).data)) {
                    dataMap.set(venda.contactId, {
                        mrr: venda.mrr,
                        vendedor: venda.vendedor,
                        sdr: venda.sdr
                    });
                }
            }
        }

        // **CORREÇÃO APLICADA: Enriquecimento dos dados de Churn**
        processedChurn = processedChurn.map(churn => {
            if (churn.contactId && dataMap.has(churn.contactId)) {
                const originalData = dataMap.get(churn.contactId);
                return { 
                    ...churn, 
                    mrr: originalData.mrr, // Sobrescreve o MRR com o da venda original
                    vendedor: originalData.vendedor, // Sobrescreve o Vendedor com o da venda original
                    sdr: originalData.sdr // Sobrescreve o SDR com o da venda original
                };
            }
            return churn;
        });

        const vendasGanha = allVendasProcessed.filter(v => v.statusId === 2);
        
        const allDeals = [...vendasGanha, ...processedChurn];

        return NextResponse.json({ value: allDeals });

    } catch (error) {
        return NextResponse.json({ error: 'Erro ao processar dados do Ploomes.', details: error.message }, { status: 500 });
    }
}
