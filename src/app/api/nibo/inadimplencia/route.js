// Arquivo: src/app/api/nibo/inadimplencia/route.js
import { NextResponse } from 'next/server';

const NIBO_API_URL = 'https://api.nibo.com.br/empresas/v1';

async function fetchNiboData(apiKey, endpoint ) {
    if (!apiKey) {
        throw new Error(`Chave de API do NIBO (v1) não fornecida.`);
    }

    const separator = endpoint.includes('?') ? '&' : '?';
    const url = `${NIBO_API_URL}${endpoint}${separator}apitoken=${apiKey}`;
    
    const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
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
    const empresa = searchParams.get('empresa');

    if (!empresa) {
        return NextResponse.json({ error: 'O parâmetro "empresa" é obrigatório.' }, { status: 400 });
    }

    const apiKey = empresa === 'Victec' 
        ? process.env.NIBO_API_KEY_VICTEC 
        : process.env.NIBO_API_KEY_VMCTECH;

    try {
        const today = new Date().toISOString().slice(0, 10);
        const filter = `$filter=isPaid eq false and dueDate lt ${today}`;
        
        // --- CORREÇÃO: Removido o parâmetro inválido '$expand=category' ---
        const endpoint = `/schedules/credit?${filter}&$orderby=dueDate`;

        const result = await fetchNiboData(apiKey, endpoint);
        const inadimplenciaBruta = result.items || [];

        const categoriaAlvo = "311014001 Receita de Serviços - Mercado Interno";
        const inadimplenciaFiltrada = inadimplenciaBruta.filter(item => 
            item.category?.name === categoriaAlvo
        );

        const dadosTratados = inadimplenciaFiltrada.map(item => ({
            clienteNome: item.stakeholder?.name || 'Cliente não identificado',
            clienteCpfCnpj: item.stakeholder?.cpfCnpj || 'N/A',
            valor: item.openValue,
            vencimento: item.dueDate,
            descricao: item.description,
            idParcela: item.scheduleId,
            categoryName: item.category?.name
        }));

        return NextResponse.json(dadosTratados);

    } catch (error) {
        console.error('Erro detalhado na API de Inadimplência:', error);
        return NextResponse.json({ 
            error: 'Falha ao buscar dados de inadimplência do NIBO.', 
            details: error.message 
        }, { status: 500 });
    }
}
