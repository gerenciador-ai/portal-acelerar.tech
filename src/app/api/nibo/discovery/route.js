// Arquivo: src/app/api/nibo/discovery/route.js
import { NextResponse } from 'next/server';

// URL base da API do NIBO, sem a versão
const NIBO_API_URL = 'https://api.nibo.com.br';

// Função auxiliar para fazer chamadas à API do NIBO
async function fetchNiboData(empresa, endpoint ) {
    const apiKey = empresa === 'Victec' 
        ? process.env.NIBO_API_KEY_VICTEC 
        : process.env.NIBO_API_KEY_VMCTECH;

    if (!apiKey) {
        throw new Error(`Chave de API do NIBO não encontrada para a empresa: ${empresa}`);
    }

    // A URL completa é montada aqui, incluindo a versão no endpoint
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

// A função principal da nossa rota de API
export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const empresa = searchParams.get('empresa') || 'VMC Tech';

    try {
        // --- AQUI ESTÁ A CORREÇÃO ---
        // Usando os caminhos corretos que incluem a versão /v2/
        const [contasAReceber, lancamentosContabeis] = await Promise.all([
            fetchNiboData(empresa, '/v2/receivables'),
            fetchNiboData(empresa, '/v2/entries')
        ]);

        return NextResponse.json({
            empresa,
            documentacao: "https://nibo.readme.io/reference/getting-started-with-your-api",
            validacao: "Dados brutos da API do NIBO para análise e mapeamento.",
            amostra_contas_a_receber: contasAReceber.items || contasAReceber,
            amostra_lancamentos_contabeis: lancamentosContabeis.items || lancamentosContabeis,
        } );

    } catch (error) {
        return NextResponse.json({ 
            error: 'Falha ao conectar com a API do NIBO.', 
            details: error.message 
        }, { status: 500 });
    }
}
