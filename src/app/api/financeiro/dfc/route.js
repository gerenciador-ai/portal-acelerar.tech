// Arquivo: src/app/api/financeiro/dfc/route.js
import { NextResponse } from 'next/server';

const NIBO_API_URL = 'https://api.nibo.com.br/empresas/v1';

// --- Função de Mapeamento de Categorias (sem alterações ) ---
function mapearCategoriaParaDFC(categoryName) {
    if (!categoryName) return 'Não Classificado';
    const name = categoryName.toLowerCase();
    if (name.includes('serviços') || name.includes('salários') || name.includes('impostos') || name.includes('fornecedores') || name.includes('aluguel')) return 'FCO';
    if (name.includes('imobilizado') || name.includes('investimentos')) return 'FCI';
    if (name.includes('empréstimos') || name.includes('financiamentos') || name.includes('juros pagos') || name.includes('dividendos')) return 'FCF';
    return 'Não Classificado';
}

// --- Função de busca na API v1 (sem alterações) ---
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

// --- Função principal da rota (CORREÇÃO NO FILTRO DE ANO) ---
export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const empresa = searchParams.get('empresa');
    const ano = searchParams.get('ano'); // Mantém como string para comparação direta

    if (!empresa || !ano) {
        return NextResponse.json({ error: 'Os parâmetros "empresa" e "ano" são obrigatórios.' }, { status: 400 });
    }

    const apiKey = empresa === 'Victec' ? process.env.NIBO_API_KEY_VICTEC : process.env.NIBO_API_KEY_VMCTECH;

    try {
        const endpoints = {
            realizadoCredit: `/schedules/credit?$filter=isPaid eq true&$expand=stakeholder,category`,
            realizadoDebit: `/schedules/debit?$filter=isPaid eq true&$expand=stakeholder,category`,
        };

        const [
            resRealizadoCredit,
            resRealizadoDebit,
        ] = await Promise.all([
            fetchNiboData(apiKey, endpoints.realizadoCredit),
            fetchNiboData(apiKey, endpoints.realizadoDebit),
        ]);

        const todosOsItensPagos = [
            ...(resRealizadoCredit.items || []).map(item => ({ ...item, tipo: 'entrada' })),
            ...(resRealizadoDebit.items || []).map(item => ({ ...item, tipo: 'saida' })),
        ];

        const dadosDFC = todosOsItensPagos
            .filter(item => {
                // --- CORREÇÃO APLICADA AQUI ---
                // Compara o ano como string para evitar erros de fuso horário.
                const filtroAno = item.paymentDate && item.paymentDate.substring(0, 4) === ano;
                
                const filtroBaixa = !item.writeOffDate;
                const filtroClienteExcluido = !item.stakeholder?.isDeleted;

                return filtroAno && filtroBaixa && filtroClienteExcluido;
            })
            .map(item => ({
                data: item.paymentDate,
                valor: item.paidValue,
                tipo: item.tipo,
                status: 'realizado',
                categoriaDFC: mapearCategoriaParaDFC(item.category?.name),
                descricao: item.description,
                isReconciled: item.isReconciled || false
            }));

        return NextResponse.json(dadosDFC);

    } catch (error) {
        console.error('Erro detalhado na API do DFC:', error);
        return NextResponse.json({ 
            error: 'Falha ao buscar dados do DFC do NIBO.', 
            details: error.message 
        }, { status: 500 });
    }
}
