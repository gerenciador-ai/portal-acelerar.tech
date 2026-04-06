// Arquivo: src/app/api/nibo/discovery/route.js
import { NextResponse } from 'next/server';

const NIBO_API_URL = 'https://api.nibo.com.br/v2';

// Função auxiliar para fazer chamadas à API do NIBO
async function fetchNiboData(empresa, endpoint ) {
    // Seleciona a chave de API correta com base na empresa
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
            'access_token': apiKey, // O NIBO usa 'access_token' no header
            'Content-Type': 'application/json'
        },
        cache: 'no-store', // Garante que estamos sempre buscando dados frescos
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Erro na API do NIBO (${response.status}): ${errorBody}`);
    }

    return response.json();
}

// A função principal da nossa rota de API
export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const empresa = searchParams.get('empresa') || 'VMC Tech'; // Padrão para VMC Tech

    try {
        // Vamos buscar uma amostra de dois endpoints cruciais
        // 1. Contas a Receber (para Inadimplência)
        // 2. Lançamentos Contábeis (para DRE/DFC)
        const [contasAReceber, lancamentosContabeis] = await Promise.all([
            fetchNiboData(empresa, '/receivables'),
            fetchNiboData(empresa, '/entries')
        ]);

        // Retorna um JSON com os dados brutos para nossa análise
        return NextResponse.json({
            empresa,
            documentacao: "https://nibo.readme.io/reference/getting-started-with-your-api",
            validacao: "Dados brutos da API do NIBO para análise e mapeamento.",
            amostra_contas_a_receber: contasAReceber.items || contasAReceber,
            amostra_lancamentos_contabeis: lancamentosContabeis.items || lancamentosContabeis,
        } );

    } catch (error) {
        // Se algo der errado (chave errada, etc.), veremos uma mensagem de erro clara
        return NextResponse.json({ 
            error: 'Falha ao conectar com a API do NIBO.', 
            details: error.message 
        }, { status: 500 });
    }
}
