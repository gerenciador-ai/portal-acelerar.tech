// Arquivo: src/app/api/nibo/discovery/route.js
import { NextResponse } from 'next/server';

const NIBO_API_URL = 'https://api.nibo.com.br/empresas/v1';

async function fetchNiboData(empresa, endpoint ) {
    const apiKey = empresa === 'Victec' 
        ? process.env.NIBO_API_KEY_VICTEC 
        : process.env.NIBO_API_KEY_VMCTECH;

    if (!apiKey) {
        throw new Error(`Chave de API do NIBO (v1) não encontrada para a empresa: ${empresa}`);
    }

    const separator = endpoint.includes('?') ? '&' : '?';
    const url = `${NIBO_API_URL}${endpoint}${separator}apitoken=${apiKey}`;
    
    const response = await fetch(url, {
        method: 'GET',
        headers: {
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
        // --- AQUI ESTÁ A CORREÇÃO ---
        // A API do NIBO parece esperar a data diretamente, sem o prefixo 'datetime'.
        // Vamos manter o formato YYYY-MM-DD, que é universal.
        const today = new Date().toISOString().slice(0, 10); // Formato YYYY-MM-DD

        // Construir o filtro com a data simples.
        const filter = `$filter=isPaid eq false and dueDate lt ${today}`;
        const endpoint = `/schedules/credit?${filter}&$orderby=dueDate`;

        const contasAReceber = await fetchNiboData(empresa, endpoint);
        
        return NextResponse.json({
            empresa,
            status: "SUCESSO",
            api_version: "v1",
            validacao: "Conexão com a API v1 do NIBO estabelecida. Dados de inadimplência obtidos.",
            endpoint_utilizado: endpoint,
            amostra_contas_a_receber: contasAReceber.items || contasAReceber,
        });

    } catch (error) {
        return NextResponse.json({ 
            error: 'Falha ao conectar com a API v1 do NIBO.', 
            details: error.message 
        }, { status: 500 });
    }
}
