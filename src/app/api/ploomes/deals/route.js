import { NextResponse } from 'next/server';
import axios from 'axios';

// Função de autenticação completa e funcional.
async function getAuthToken() {
    const response = await axios.post('https://api2.ploomes.com/Auth', {
        Login: process.env.PLOOMES_LOGIN,
        Password: process.env.PLOOMES_PASSWORD
    } );
    if (response.data && response.data.value && response.data.value.token) {
        return response.data.value.token;
    }
    throw new Error('Token de autenticação não encontrado na resposta da API Ploomes.');
}

export async function GET(request) {
    try {
        const token = await getAuthToken();
        const { searchParams } = new URL(request.url);
        const dealIdsParam = searchParams.get('ids'); // Parâmetro para receber os IDs

        let filter;

        if (dealIdsParam) {
            // Se IDs foram fornecidos, cria um filtro para buscar por esses IDs.
            const dealIds = dealIdsParam.split(',');
            const idFilters = dealIds.map(id => `Id+eq+${id}`).join('+or+');
            filter = `$filter=${idFilters}`;
        } else {
            // Lógica antiga (fallback): busca por empresa se nenhum ID for fornecido.
            const empresa = searchParams.get('empresa');
            const funis = { 'VMC Tech': 11000768, 'Victec': 11000769 };
            const funnelId = funis[empresa];
            if (!funnelId) {
                return NextResponse.json({ error: 'Empresa ou IDs não fornecidos' }, { status: 400 });
            }
            filter = `$filter=FunnelId+eq+${funnelId}`;
        }

        // A chamada à API do Ploomes, usando o filtro dinâmico.
        const ploomesResponse = await axios.get(`https://api2.ploomes.com/Deals?&${filter}&$expand=Contact($select=Id,Name,CNPJ ),Owner,Stage,OtherProperties`, {
            headers: { 'User-Key': token }
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
