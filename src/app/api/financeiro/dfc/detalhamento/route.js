
import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  
  // Captura exatamente o que o servidor está recebendo
  const debugData = {
    url: request.url,
    params: {
      empresa: searchParams.get('empresa'),
      ano: searchParams.get('ano'),
      mes: searchParams.get('mes'),
      grupo: searchParams.get('grupo'),
    },
    raw_query: request.url.split('?')[1] || ''
  };

  console.log('DEBUG DETALHAMENTO:', debugData);

  // Retorna um único item na lista com os dados do debug para aparecer na sua tabela
  return NextResponse.json([{
    data: new Date().toISOString().split('T')[0],
    nome: "DEBUG ATIVO",
    descricao: `URL: ${debugData.raw_query}`,
    categoria: `GRUPO RECEBIDO: "${debugData.params.grupo}"`,
    centro_costo: `MES: ${debugData.params.mes}`,
    valor: 0
  }]);
}
