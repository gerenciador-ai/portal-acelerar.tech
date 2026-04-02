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

        // A chamada que busca todos os dados, incluindo os campos aninhados que precisamos.
        const filterQuery = `$filter=FunnelId eq ${funnelId}`;
        const expandQuery = `$expand=Contact($select=Id,Name,CNPJ),Owner,Stage,OtherProperties`;
        const apiUrl = `https://api2.ploomes.com/Deals?${filterQuery}&${expandQuery}`;

        const ploomesResponse = await axios.get(apiUrl, {
            headers: { 'User-Key': apiKey }
        } );

        // Este é o código que processa os dados brutos e os simplifica.
        const simplifiedDeals = ploomesResponse.data.value.map(deal => {
            const getOtherProp = (key) => {
                if (!deal.OtherProperties) return null;
                const prop = deal.OtherProperties.find(p => p.FieldKey === key);
                return prop?.StringValue || null;
            };

            return {
                id: deal.Id,
                contactId: deal.Contact?.Id,
                data: new Date(deal.CreateDate),
                data_churn: getOtherProp('deal_custom_fields_256') ? new Date(getOtherProp('deal_custom_fields_256')) : null,
                cliente: deal.Contact?.Name,
                CNPJ: deal.Contact?.CNPJ, // O CNPJ é incluído aqui.
                vendedor: deal.Owner?.Name,
                sdr: getOtherProp('deal_custom_fields_255'),
                produto: getOtherProp('deal_custom_fields_252'),
                mrr: deal.Amount || 0,
                adesao: parseFloat(getOtherProp('deal_custom_fields_253') || 0),
                upsell: parseFloat(getOtherProp('deal_custom_fields_254') || 0),
                status: deal.Stage?.Name,
            };
        });

        return NextResponse.json({ value: simplifiedDeals });

    } catch (error) {
        console.error('ERRO NO BACKEND /api/ploomes/deals:', { message: error.message });
        return NextResponse.json({ error: 'Erro interno ao buscar dados do Ploomes' }, { status: 500 });
    }
}
