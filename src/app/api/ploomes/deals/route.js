import { NextResponse } from 'next/server';

// A URL base da API do Ploomes
const PLOOMES_API_URL = 'https://api2.ploomes.com';

// A chave da API, lida de forma segura das variáveis de ambiente
const API_KEY = process.env.PLOOMES_API_KEY;

export async function GET(request ) {
  // Verifica se a chave da API foi configurada corretamente na Vercel
  if (!API_KEY) {
    return NextResponse.json(
      { error: 'A chave da API do Ploomes não está configurada no servidor.' },
      { status: 500 }
    );
  }

  try {
    // Por enquanto, vamos buscar apenas os 5 primeiros negócios do funil de vendas da VMC Tech para testar a conexão.
    const pipelineId = 110064393; // Funil de Vendas VMC Tech
    const endpoint = `/Deals?$filter=PipelineId eq ${pipelineId}&$top=5`;

    const response = await fetch(`${PLOOMES_API_URL}${endpoint}`, {
      method: 'GET',
      headers: {
        'User-Key': API_KEY,
        'Content-Type': 'application/json',
      },
      // Garante que a Vercel não faça cache desta requisição de API por enquanto
      cache: 'no-store', 
    });

    if (!response.ok) {
      // Se a resposta do Ploomes não for bem-sucedida, retorna o erro
      const errorData = await response.json();
      return NextResponse.json(
        { error: 'Erro ao buscar dados do Ploomes', details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Se tudo deu certo, retorna os dados recebidos do Ploomes
    return NextResponse.json(data);

  } catch (error) {
    // Se ocorrer um erro na nossa lógica, retorna um erro genérico
    return NextResponse.json(
      { error: 'Ocorreu um erro interno no servidor', details: error.message },
      { status: 500 }
    );
  }
}
