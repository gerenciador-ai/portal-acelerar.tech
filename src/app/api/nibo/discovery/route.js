// Arquivo: src/app/api/nibo/discovery/route.js
import { NextResponse } from 'next/server';

const NIBO_API_URL = 'https://api.nibo.com.br';

async function fetchNiboData(empresa, endpoint ) {
    const apiKey = empresa === 'Victec' 
        ? process.env.NIBO_API_KEY_VICTEC 
        : process.env.NIBO_API_KEY_VMCTECH;

    if (!apiKey) {
        throw new Error(`Chave de API do NIBO não encontrada para a empresa: ${empresa}`);
    }

    const url = `${NIBO_API_URL}${endpoint}`;
    
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'access_token': apiKey,
            'Content-Type': 'application/json'
        },
        cache: 'no-store',
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Erro na API do NIBO (${response.status}) para o endpoint ${endpoint}: ${errorBody}`);
    }

    return response.json();
}

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const empresa = searchParams.get('empresa') || 'VMC Tech';

    try {
        // --- FOCO TOTAL EM APENAS UM ENDPOINT ---
        // Vamos validar o endpoint de Contas a Receber primeiro.
        const contasAReceber = await fetchNiboData(empresa, '/v2/accounting/receivables');

        return NextResponse.json({
            empresa,
            validacao: "Dados brutos de CONTAS A RECEBER para análise.",
            amostra_contas_a_receber: contasAReceber.items || contasAReceber,
        });

    } catch (error) {
        return NextResponse.json({ 
            error: 'Falha ao conectar com a API do NIBO.', 
            details: error.message 
        }, { status: 500 });
    }
}
