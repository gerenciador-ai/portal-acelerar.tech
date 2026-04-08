// Arquivo: src/app/api/financeiro/dfc/route.js
import { NextResponse } from 'next/server';

const NIBO_API_URL = 'https://api.nibo.com.br/empresas/v1';

// Função de busca na API v1 (sem alterações )
async function fetchNiboData(apiKey, endpoint) {
    if (!apiKey) throw new Error(`Chave de API do NIBO (v1) não fornecida.`);
    const separator = endpoint.includes('?') ? '&' : '?';
    const url = `${NIBO_API_URL}${endpoint}${separator}apitoken=${apiKey}`;
    const response = await fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json' }, cache: 'no-store' });
    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Erro na API v1 do NIBO (${response.status}) ao acessar ${url}: ${errorBody}`);
    }
    return response.json();
}

// --- CÓDIGO DE DIAGNÓSTICO ---
export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const empresa = searchParams.get('empresa');
    const ano = searchParams.get('ano');

    if (!empresa || !ano) {
        return NextResponse.json({ error: 'Os parâmetros "empresa" e "ano" são obrigatórios.' }, { status: 400 });
    }

    const apiKey = process.env.NIBO_API_KEY_VMCTECH; // Chave fixada para o teste

    try {
        // 1. Buscar TODOS os recebimentos pagos, sem filtro de data na URL
        const endpoint = `/schedules/credit?$filter=isPaid eq true&$expand=stakeholder`;
        const resultadoBruto = await fetchNiboData(apiKey, endpoint);

        const clienteAlvo = "FERNANDES E SILVA SOLUCOES EMPRESARIAIS S/S";
        const anoAlvo = "2026";

        // 2. Filtrar no nosso código, de forma explícita e segura
        const lancamentosDoCliente = (resultadoBruto.items || []).filter(item => {
            const nomeCorreto = item.stakeholder?.name === clienteAlvo;
            const anoCorreto = item.paymentDate && item.paymentDate.startsWith(anoAlvo);
            return nomeCorreto && anoCorreto;
        });

        // 3. Retornar apenas os dados brutos encontrados para análise
        return NextResponse.json(lancamentosDoCliente);

    } catch (error) {
        console.error('Erro detalhado no teste de diagnóstico:', error);
        return NextResponse.json({ 
            error: 'Falha no teste de diagnóstico.', 
            details: error.message 
        }, { status: 500 });
    }
}
