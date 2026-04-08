// Arquivo: src/app/api/financeiro/dfc/route.js
import { NextResponse } from 'next/server';

// ESTE É UM CÓDIGO DE CONEXÃO DIRETA PARA DIAGNÓSTICO.
// O objetivo é apenas provar que a conexão com a API do NIBO está funcionando
// e retornar os primeiros 5 resultados brutos do endpoint de contas a receber.

const NIBO_API_URL = 'https://api.nibo.com.br/empresas/v1';

export async function GET(request ) {
    
    const apiKey = process.env.NIBO_API_KEY_VMCTECH; // Chave fixada para o teste

    if (!apiKey) {
        return NextResponse.json({ error: 'Chave de API da VMC Tech não encontrada nas variáveis de ambiente.' }, { status: 500 });
    }

    // Endpoint mais simples possível: as 5 primeiras contas a receber, pagas ou não.
    const endpoint = `/schedules/credit?$top=5`;
    
    const separator = endpoint.includes('?') ? '&' : '?';
    const url = `${NIBO_API_URL}${endpoint}${separator}apitoken=${apiKey}`;

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            cache: 'no-store',
        });

        if (!response.ok) {
            const errorBody = await response.text();
            return NextResponse.json({
                error: `A conexão com a API do NIBO falhou com status ${response.status}.`,
                details: errorBody,
                url_tentada: url
            }, { status: 500 });
        }

        const data = await response.json();
        
        // Retorna os dados brutos para a tela.
        return NextResponse.json(data);

    } catch (error) {
        return NextResponse.json({ 
            error: 'Falha catastrófica ao tentar conectar com a API do NIBO.', 
            details: error.message,
            url_tentada: url
        }, { status: 500 });
    }
}
