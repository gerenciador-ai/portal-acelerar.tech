import { NextResponse } from 'next/server';

const PLOOMES_API_URL = 'https://api2.ploomes.com';
const API_KEY = process.env.PLOOMES_API_KEY;

const PIPELINES = {
    'VMC Tech': { vendas: 110064393, churn: 110065017, churnStageCancelado: 110065019 },
    'Victec':   { vendas: 110023047, churn: 110042202, churnStageCancelado: 110042204 }
};

async function fetchPloomesRaw(endpoint ) {
    const url = `${PLOOMES_API_URL}${endpoint}`;
    const response = await fetch(url, {
        method: 'GET',
        headers: { 'User-Key': API_KEY, 'Content-Type': 'application/json' },
        cache: 'no-store',
    });
    if (!response.ok) {
        return { error: `Ploomes API error: ${response.statusText}`, status: response.status };
    }
    return await response.json();
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
        // =================== MODO DE DIAGNÓSTICO ===================
        // Vamos focar APENAS na busca de Churn e retornar o dado bruto.
        
        const endpointChurn = `/Deals?$filter=PipelineId eq ${config.churn} and StageId eq ${config.churnStageCancelado}&$expand=OtherProperties,Contact`;
        
        const churnDataRaw = await fetchPloomesRaw(endpointChurn);

        // Retorna o resultado bruto da API do Ploomes para inspecionarmos.
        return NextResponse.json({
            diagnostico: `Buscando Churn para ${empresa}`,
            endpoint_usado: endpointChurn,
            resposta_bruta_ploomes: churnDataRaw
        });
        // =========================================================

    } catch (error) {
        return NextResponse.json({ error: 'Erro no modo de diagnóstico.', details: error.message }, { status: 500 });
    }
}
