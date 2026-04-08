// Arquivo: src/app/api/financeiro/dfc/route.js
import { NextResponse } from 'next/server';

const NIBO_API_URL = 'https://api.nibo.com.br/empresas/v1';

async function fetchNiboData(apiKey, endpoint ) {
    if (!apiKey) throw new Error(`Chave de API do NIBO (v1) não fornecida.`);
    const url = `${NIBO_API_URL}${endpoint}?apitoken=${apiKey}`;
    const response = await fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json' }, cache: 'no-store' });
    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Erro na API v1 do NIBO (${response.status}) ao acessar ${url}: ${errorBody}`);
    }
    return response.json();
}

// --- CÓDIGO DE FORÇA BRUTA ---
export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const empresa = searchParams.get('empresa');
    
    if (!empresa) {
        return NextResponse.json({ error: 'O parâmetro "empresa" é obrigatório.' }, { status: 400 });
    }

    const apiKey = empresa === 'Victec' ? process.env.NIBO_API_KEY_VICTEC : process.env.NIBO_API_KEY_VMCTECH;

    try {
        // BUSCA TUDO, SEM FILTRO NENHUM
        const [
            resCredit,
            resDebit,
        ] = await Promise.all([
            fetchNiboData(apiKey, '/schedules/credit'),
            fetchNiboData(apiKey, '/schedules/debit'),
        ]);

        const todosOsItens = {
            creditos: resCredit.items || [],
            debitos: resDebit.items || [],
        };

        // RETORNA OS DADOS BRUTOS PARA A TELA
        return NextResponse.json(todosOsItens);

    } catch (error) {
        console.error('Erro detalhado no teste de força bruta:', error);
        return NextResponse.json({ 
            error: 'Falha no teste de força bruta.', 
            details: error.message 
        }, { status: 500 });
    }
}
