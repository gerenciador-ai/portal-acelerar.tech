// Arquivo: src/app/api/nibo/inadimplencia/route.js
import { NextResponse } from 'next/server';

const NIBO_API_URL = 'https://api.nibo.com.br/empresas/v1';

// Função reutilizável para buscar dados da API v1 do NIBO
async function fetchNiboData(apiKey, endpoint ) {
    if (!apiKey) {
        throw new Error(`Chave de API do NIBO (v1) não fornecida.`);
    }

    const separator = endpoint.includes('?') ? '&' : '?';
    const url = `${NIBO_API_URL}${endpoint}${separator}apitoken=${apiKey}`;
    
    const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store', // Essencial para dados financeiros sempre atualizados
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Erro na API v1 do NIBO (${response.status}) ao acessar ${url}: ${errorBody}`);
    }

    return response.json();
}

// Função principal da rota, que busca e processa os dados de inadimplência
export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const empresa = searchParams.get('empresa'); // 'VMC Tech' ou 'Victec'

    if (!empresa) {
        return NextResponse.json({ error: 'O parâmetro "empresa" é obrigatório.' }, { status: 400 });
    }

    const apiKey = empresa === 'Victec' 
        ? process.env.NIBO_API_KEY_VICTEC 
        : process.env.NIBO_API_KEY_VMCTECH;

    try {
        // Filtro para buscar contas a receber não pagas e vencidas
        const today = new Date().toISOString().slice(0, 10); // Formato YYYY-MM-DD
        const filter = `$filter=isPaid eq false and dueDate lt ${today}`;
        // Adicionamos o $expand=category para garantir que os dados da categoria sempre venham
        const endpoint = `/schedules/credit?${filter}&$orderby=dueDate&$expand=category`;

        const result = await fetchNiboData(apiKey, endpoint);
        const inadimplenciaBruta = result.items || [];

        // --- 1. ALTERAÇÃO: Filtrar pela categoria correta ---
        const categoriaAlvo = "311014001 Receita de Serviços - Mercado Interno";
        const inadimplenciaFiltrada = inadimplenciaBruta.filter(item => 
            item.category?.name === categoriaAlvo
        );

        // --- 2. ALTERAÇÃO: Mapear a partir dos dados já filtrados ---
        const dadosTratados = inadimplenciaFiltrada.map(item => ({
            clienteNome: item.stakeholder?.name || 'Cliente não identificado',
            clienteCpfCnpj: item.stakeholder?.cpfCnpj || 'N/A',
            valor: item.openValue,
            vencimento: item.dueDate,
            descricao: item.description,
            idParcela: item.scheduleId,
            // Adicionado para validação
            categoryName: item.category?.name 
        }));

        return NextResponse.json(dadosTratados);

    } catch (error) {
