// Arquivo: src/app/api/ploomes/onboarding/route.js
import { NextResponse } from 'next/server';

// --- Constantes de Configuração ---
const PLOOMES_API_URL = 'https://api2.ploomes.com';
const API_KEY = process.env.PLOOMES_API_KEY;

// IDs dos funis e campos. Centralizados para fácil manutenção.
const PIPELINES = {
    'VMC Tech': { vendas: 110064393, onboarding: 110065015 },
    'Victec':   { vendas: 110023047, onboarding: 110023069 }
};
const FIELDS = {
    MRR: 110778108,
    DATA_ATIVACAO: 110778114,
};

// --- Funções de Apoio ---

/**
 * Busca todos os dados de um endpoint do Ploomes, paginando automaticamente.
 * @param {string} endpoint - O endpoint da API a ser chamado (ex: /Deals?$filter=... )
 * @returns {Promise<Array>} - Uma promessa que resolve para um array com todos os dados.
 */
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
            throw new Error(`Ploomes API request failed for endpoint ${endpoint}: ${response.statusText}`);
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

/**
 * Processa um único negócio (deal) do Ploomes para um formato padronizado.
 * @param {object} deal - O objeto do negócio vindo da API.
 * @returns {object|null} - Um objeto padronizado ou null se não for válido.
 */
function processDeal(deal) {
    const props = deal.OtherProperties || [];
    const getProp = (id) => props.find(p => p.FieldId === id);

    // Usa a data de finalização para Onboardings concluídos, ou a data de criação para os abertos.
    const finishDate = deal.StatusId === 2 ? deal.FinishDate : null;
    const createDate = deal.CreateDate;
    
    if (!createDate) return null; // Um negócio sem data de criação é inválido.

    return {
        id: deal.Id,
        contactId: deal.ContactId,
        status: deal.StatusId === 2 ? 'Venda' : (deal.StatusId === 3 ? 'Perdido' : 'Aberto'),
        etapa: deal.StageName,
        etapaId: deal.StageId,
        dataCriacao: new Date(createDate),
        dataFinalizacao: finishDate ? new Date(finishDate) : null,
        diasNoFunil: deal.DaysInPipeline || 0,
        mrr: getProp(FIELDS.MRR)?.DecimalValue || 0, // MRR inicial (pode ser 0)
    };
}

// --- Função Principal da Rota (GET) ---
export async function GET(request) {
    if (!API_KEY) {
        return NextResponse.json({ error: 'Chave da API do Ploomes não configurada.' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const empresa = searchParams.get('empresa') || 'VMC Tech';
    const config = PIPELINES[empresa];

    if (!config) {
        return NextResponse.json({ error: 'Configuração de funil não encontrada para a empresa.' }, { status: 400 });
    }

    try {
        // 1. Busca dados de Vendas e Onboarding em paralelo.
        const [vendasData, onboardingData] = await Promise.all([
            fetchAllPages(`/Deals?$filter=PipelineId eq ${config.vendas} and StatusId eq 2&$expand=OtherProperties`),
            fetchAllPages(`/Deals?$filter=PipelineId eq ${config.onboarding}&$expand=OtherProperties`)
        ]);

        // 2. Cria um mapa de MRR a partir das vendas originais.
        const mrrMap = new Map();
        for (const venda of vendasData) {
            const props = venda.OtherProperties || [];
            const mrr = props.find(p => p.FieldId === FIELDS.MRR)?.DecimalValue || 0;
            if (venda.ContactId && mrr > 0) {
                // Armazena o MRR usando o ID do contato como chave.
                mrrMap.set(venda.ContactId, mrr);
            }
        }

        // 3. Processa e enriquece os dados de Onboarding.
        const processedOnboarding = onboardingData
            .map(processDeal)
            .filter(Boolean) // Remove nulos
            .map(deal => {
                // Se o negócio de onboarding não tem MRR, tenta buscar no mapa de vendas.
                if (deal.mrr === 0 && deal.contactId && mrrMap.has(deal.contactId)) {
                    return { ...deal, mrr: mrrMap.get(deal.contactId) };
                }
                return deal;
            });

        return NextResponse.json({ value: processedOnboarding });

    } catch (error) {
        console.error("Error in /api/ploomes/onboarding:", error);
        return NextResponse.json({ error: 'Erro ao processar dados de onboarding.', details: error.message }, { status: 500 });
    }
}
