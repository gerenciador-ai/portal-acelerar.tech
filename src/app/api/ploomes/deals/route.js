import { NextResponse } from 'next/server';
import axios from 'axios';

// NÃO HÁ FUNÇÃO DE AUTENTICAÇÃO SEPARADA.
// A CHAVE DE API É PASSADA DIRETAMENTE NO CABEÇALHO DE CADA REQUISIÇÃO.

export async function GET(request) {
    try {
        // A chave de API é pega diretamente das variáveis de ambiente.
        const apiKey = process.env.PLOOMES_API_KEY;
        if (!apiKey) {
            throw new Error('PLOOMES_API_KEY não está configurada nas variáveis de ambiente.');
        }

        const { searchParams } = new URL(request.url);
        const dealIdsParam = searchParams.get('ids');

        let filterQuery;

        if (dealIdsParam) {
            const dealIds = dealIdsParam.split(',');
            // Sintaxe OData correta para múltiplos IDs com 'or'.
            const idFilters = dealIds.map(id => `Id eq ${id}`).join(' or ');
            filterQuery = `$filter=${idFilters}`;
        } else {
            const empresa = searchParams.get('empresa');
            const funis = { 'VMC Tech': 11000768, 'Victec': 11000769 };
            const funnelId = funis[empresa];
            if (!funnelId) {
                return NextResponse.json({ error: 'Empresa ou IDs não fornecidos' }, { status: 400 });
            }
            filterQuery = `$filter=FunnelId eq ${funnelId}`;
        }

        const apiUrl = `https://api2.ploomes.com/Deals?${filterQuery}&$expand=Contact($select=Id,Name,CNPJ ),Owner,Stage,OtherProperties`;

        // A chamada à API do Ploomes.
        const ploomesResponse = await axios.get(apiUrl, {
            headers: { 
                // CORREÇÃO CRÍTICA: Usando a chave de API correta no cabeçalho 'User-Key'.
                'User-Key': apiKey 
            }
        });

        const rawDeals = ploomesResponse.data.value;
        return NextResponse.json({ value: rawDeals });

    } catch (error) {
        console.error('ERRO DETALHADO NO BACKEND /api/ploomes/deals:', {
            message: error.message,
            url: error.config ? error.config.url : 'N/A',
            status: error.response ? error.response.status : 'N/A',
            data: error.response ? error.response.data : 'N/A',
        });
        return NextResponse.json({ error: 'Erro interno ao buscar dados do Ploomes' }, { status: 500 });
    }
}
