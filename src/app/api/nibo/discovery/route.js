// Arquivo: src/app/api/nibo/discovery/route.js
import { NextResponse } from 'next/server';

// URL base da API v1 do NIBO
const NIBO_API_URL = 'https://api.nibo.com.br/empresas/v1';

async function fetchNiboData(empresa, endpoint ) {
    const apiKey = empresa === 'Victec' 
        ? process.env.NIBO_API_KEY_VICTEC 
        : process.env.NIBO_API_KEY_VMCTECH;

    if (!apiKey) {
        throw new Error(`Chave de API do NIBO (v1) não encontrada para a empresa: ${empresa}`);
    }

    // A API v1 permite passar o token como parâmetro na URL.
    // O '?' ou '&' é adicionado para concatenar corretamente.
    const separator = endpoint.includes('?') ? '&' : '?';
    const url = `${NIBO_API_URL}${endpoint}${separator}apitoken=${apiKey}`;
    
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            // Embora o token esteja na URL, é boa prática manter o Content-Type.
            'Content-Type': 'application/json'
        },
        cache: 'no-store',
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Erro na API v1 do NIBO (${response.status}) ao acessar ${url}: ${errorBody}`);
    }

    return response.json();
}

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const empresa = searchParams.get('empresa') || 'VMC Tech';

    try {
        // --- Endpoint CORRETO da API v1 para Inadimplência ---
        // Este endpoint busca "recebimentos em aberto", que é o que precisamos.
        // Adicionamos $orderby, que é obrigatório para paginação na API v1.
        const contasAReceber = await fetchNiboData(empresa, '/schedules/credit?$filter=isPaid eq false and dueDate lt \'now\'&$orderby=dueDate');
        
        // NOTA: A API v1 não parece ter um endpoint simples para "lançamentos contábeis" como a v2.
        // Vamos focar em resolver a Inadimplência primeiro, que agora temos o caminho.

        return NextResponse.json({
            empresa,
            status: "SUCESSO",
            api_version: "v1",
            validacao: "Conexão com a API v1 do NIBO estabelecida. Dados de inadimplência obtidos.",
            amostra_contas_a_receber: contasAReceber.items || contasAReceber,
        });

    } catch (error) {
        return NextResponse.json({ 
            error: 'Falha ao conectar com a API v1 do NIBO.', 
            details: error.message 
        }, { status: 500 });
    }
}
