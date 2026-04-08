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

// --- Função principal da rota (LÓGICA DE FILTRO DE DATA CORRIGIDA) ---
export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const empresa = searchParams.get('empresa');
    const ano = parseInt(searchParams.get('ano'), 10);

    if (!empresa || !ano) {
        return NextResponse.json({ error: 'Os parâmetros "empresa" e "ano" são obrigatórios.' }, { status: 400 });
    }

    const apiKey = empresa === 'Victec' ? process.env.NIBO_API_KEY_VICTEC : process.env.NIBO_API_KEY_VMCTECH;

    try {
        const hoje = new Date().toISOString().slice(0, 10);
        const inicioAno = `${ano}-01-01`;
        const fimAno = `${ano}-12-31`;

        // --- 1. Definir os endpoints com a sintaxe de filtro de data correta ---
        const endpoints = {
            realizadoCredit: `/schedules/credit?$filter=isPaid eq true and paymentDate ge ${inicioAno} and paymentDate le ${fimAno}&$expand=stakeholder,category`,
            realizadoDebit: `/schedules/debit?$filter=isPaid eq true and paymentDate ge ${inicioAno} and paymentDate le ${fimAno}&$expand=stakeholder,category`,
            projetadoCredit: `/schedules/credit?$filter=isPaid eq false and dueDate ge ${hoje} and dueDate le ${fimAno}&$expand=stakeholder,category`,
            projetadoDebit: `/schedules/debit?$filter=isPaid eq false and dueDate ge ${hoje} and dueDate le ${fimAno}&$expand=stakeholder,category`,
        };

        // --- 2. Executar todas as chamadas em paralelo ---
        const [
            resRealizadoCredit,
            resRealizadoDebit,
            resProjetadoCredit,
            resProjetadoDebit
        ] = await Promise.all([
            fetchNiboData(apiKey, endpoints.realizadoCredit),
            fetchNiboData(apiKey, endpoints.realizadoDebit),
            fetchNiboData(apiKey, endpoints.projetadoCredit),
            fetchNiboData(apiKey, endpoints.projetadoDebit)
        ]);

        const todosOsItens = [
            ...(resRealizadoCredit.items || []).map(item => ({ ...item, status: 'realizado', tipo: 'entrada' })),
            ...(resRealizadoDebit.items || []).map(item => ({ ...item, status: 'realizado', tipo: 'saida' })),
            ...(resProjetadoCredit.items || []).map(item => ({ ...item, status: 'projetado', tipo: 'entrada' })),
            ...(resProjetadoDebit.items || []).map(item => ({ ...item, status: 'projetado', tipo: 'saida' })),
        ];

        // --- 3. Aplicar filtros e mapear para o formato final ---
        const dadosDFC = todosOsItens
            .filter(item => 
                !item.writeOffDate && 
                !item.stakeholder?.isDeleted
            )
            .map(item => ({
                data: item.status === 'realizado' ? item.paymentDate : item.dueDate,
                valor: item.status === 'realizado' ? item.paidValue : item.openValue,
                tipo: item.tipo,
                status: item.status,
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
