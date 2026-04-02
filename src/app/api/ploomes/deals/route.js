import { NextResponse } from 'next/server';
import axios from 'axios';

// Função para obter o token de autenticação (deve permanecer como está)
async function getAuthToken() {
    // ... seu código de autenticação existente ...
    // Exemplo:
    const response = await axios.post('URL_DA_SUA_AUTH', {
        Login: process.env.PLOOMES_LOGIN,
        Password: process.env.PLOOMES_PASSWORD
    });
    return response.data.value.token;
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

        // A CHAMADA ORIGINAL À API DO PLOOMES
        // O $expand é crucial para trazer os dados do Contato, Dono e Estágio
        const ploomesResponse = await axios.get(`https://api2.ploomes.com/Deals?&$filter=FunnelId+eq+${funnelId}&$expand=Contact($select=Id,Name,CNPJ ),Owner,Stage,OtherProperties`, {
            headers: { 'User-Key': token }
        });

        // =================================================================
        // MUDANÇA CRÍTICA: NÃO VAMOS MAIS SELECIONAR CAMPOS.
        // VAMOS RETORNAR O OBJETO COMPLETO COMO ELE VEM DO PLOOMES.
        // O código antigo que selecionava e renomeava campos foi removido.
        // Adicionei OtherProperties ao $expand para garantir que campos customizados venham.
        // =================================================================
        const rawDeals = ploomesResponse.data.value;

        return NextResponse.json({ value: rawDeals });

    } catch (error) {
        console.error('Erro no backend da API Ploomes:', error.response ? error.response.data : error.message);
        return NextResponse.json({ error: 'Erro interno ao buscar dados do Ploomes' }, { status: 500 });
    }
}
