import { NextResponse } from 'next/server';
import axios from 'axios';

// FUNÇÃO DE AUTENTICAÇÃO COMPLETA E FUNCIONAL
// Substitua 'URL_DA_SUA_AUTH' pela URL de autenticação real do Ploomes se for diferente.
// As credenciais são puxadas das variáveis de ambiente.
async function getAuthToken() {
    const response = await axios.post('https://api2.ploomes.com/Auth', {
        Login: process.env.PLOOMES_LOGIN,
        Password: process.env.PLOOMES_PASSWORD
    } );
    // A API do Ploomes retorna o token dentro de um objeto { value: { token: "..." } }
    // Se a estrutura for diferente, precisamos ajustar aqui.
    if (response.data && response.data.value && response.data.value.token) {
        return response.data.value.token;
    }
    // Se não encontrar o token, lança um erro claro.
    throw new Error('Token de autenticação não encontrado na resposta da API Ploomes.');
}

export async function GET(request) {
    try {
        const token = await getAuthToken();
        const { searchParams } = new URL(request.url);
        const empresa = searchParams.get('empresa');

        const funis = {
            'VMC Tech': 11000768,
            'Victec': 11000769,
        };
        const funnelId = funis[empresa];
        if (!funnelId) {
            return NextResponse.json({ error: 'Empresa inválida' }, { status: 400 });
        }

        // A chamada à API do Ploomes, expandindo todos os dados relevantes
        const ploomesResponse = await axios.get(`https://api2.ploomes.com/Deals?&$filter=FunnelId+eq+${funnelId}&$expand=Contact($select=Id,Name,CNPJ ),Owner,Stage,OtherProperties`, {
            headers: { 'User-Key': token }
        });

        // Retorna os dados brutos, sem processamento
        const rawDeals = ploomesResponse.data.value;

        return NextResponse.json({ value: rawDeals });

    } catch (error) {
        // Log detalhado do erro no servidor (visível nos logs da Vercel)
        console.error('ERRO DETALHADO NO BACKEND /api/ploomes/deals:', {
            message: error.message,
            url: error.config ? error.config.url : 'N/A',
            status: error.response ? error.response.status : 'N/A',
            data: error.response ? error.response.data : 'N/A',
        });
        
        // Resposta genérica para o cliente
        return NextResponse.json({ error: 'Erro interno ao buscar dados do Ploomes' }, { status: 500 });
    }
}
