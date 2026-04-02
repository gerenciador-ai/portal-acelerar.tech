import { NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(request) {
    try {
        const apiKey = process.env.PLOOMES_API_KEY;
        if (!apiKey) {
            throw new Error('PLOOMES_API_KEY não está configurada.');
        }

        const { searchParams } = new URL(request.url);
        const empresa = searchParams.get('empresa');
        const funis = { 'VMC Tech': 11000768, 'Victec': 11000769 };
        const funnelId = funis[empresa];

        if (!funnelId) {
            return NextResponse.json({ error: 'Empresa não fornecida ou inválida' }, { status: 400 });
        }

        const filterQuery = `$filter=FunnelId eq ${funnelId}`;
        const expandQuery = `$expand=Contact($select=Id,Name,CNPJ),Owner,Stage,OtherProperties`;
        const apiUrl = `https://api2.ploomes.com/Deals?${filterQuery}&${expandQuery}`;

        const ploomesResponse = await axios.get(apiUrl, {
            headers: { 'User-Key': apiKey }
        } );

        return NextResponse.json({ value: ploomesResponse.data.value });

    } catch (error) {
        console.error('ERRO NO BACKEND /api/ploomes/deals:', { message: error.message });
        return NextResponse.json({ error: 'Erro interno ao buscar dados do Ploomes' }, { status: 500 });
    }
}
