// Arquivo: src/app/api/nibo/discovery/route.js
import { NextResponse } from 'next/server';

// A URL base CORRETA, conforme a documentação.
const NIBO_API_URL = 'https://api.nibo.com.br';

async function fetchNiboData(empresa, endpoint ) {
    const apiKey = empresa === 'Victec' 
        ? process.env.NIBO_API_KEY_VICTEC 
        : process.env.NIBO_API_KEY_VMCTECH;

    if (!apiKey) {
        throw new Error(`Chave de API do NIBO não encontrada para a empresa: ${empresa}`);
    }

    // A URL final será, por exemplo: https://api.nibo.com.br/v2/accounting/receivables
    const url = `${NIBO_API_URL}${endpoint}`;
    
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'access_token': apiKey,
            'Content-Type': 'application/json'
        },
        cache: 'no-store',
    } );

    if (!response.ok) {
        const errorBody = await response.text();
        // Adicionei a URL na mensagem de erro para facilitar a depuração futura
        throw new Error(`Erro na API do NIBO (${response.status}) ao acessar ${url}: ${errorBody}`);
    }

    return response.json();
}

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const empresa = searchParams.get('empresa') || 'VMC Tech';

    try {
        // --- Endpoints CORRETOS e COMPLETOS ---
        const [contasAReceber, lancamentosContabeis] = await Promise.all([
            fetchNiboData(empresa, '/v2/accounting/receivables'), // Para Inadimplência
            fetchNiboData(empresa, '/v2/accounting/entries')      // Para DRE/DFC
        ]);

        return NextResponse.json({
            empresa,
            status: "SUCESSO",
            validacao: "Conexão com a API do NIBO estabelecida. Dados brutos obtidos.",
            amostra_contas_a_receber: contasAReceber.items || contasAReceber,
            amostra_lancamentos_contabeis: lancamentosContabeis.items || lancamentosContabeis,
        });

    } catch (error) {
        return NextResponse.json({ 
            error: 'Falha ao conectar com a API do NIBO.', 
            details: error.message 
        }, { status: 500 });
    }
}
