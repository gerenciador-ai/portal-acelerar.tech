import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Inicializa o cliente Supabase com as variáveis de ambiente
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const NIBO_API_URL = 'https://api.nibo.com.br/empresas/v1';

async function fetchNiboData(apiKey, endpoint ) {
  if (!apiKey) throw new Error(`Chave de API do NIBO não fornecida.`);
  const url = `${NIBO_API_URL}${endpoint}?apitoken=${apiKey}`;
  const response = await fetch(url, { 
    method: 'GET', 
    headers: { 'Content-Type': 'application/json' }, 
    cache: 'no-store' 
  });
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Erro na API do NIBO (${response.status}): ${errorBody}`);
  }
  return response.json();
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const empresa = searchParams.get('empresa');
  
  if (!empresa) {
    return NextResponse.json({ error: 'O parâmetro "empresa" é obrigatório.' }, { status: 400 });
  }

  // Define a chave da API do Nibo com base na empresa
  const apiKey = empresa === 'Victec' ? process.env.NIBO_API_KEY_VICTEC : process.env.NIBO_API_KEY_VMCTECH;

  try {
    // 1. Busca os lançamentos do Nibo (Créditos e Débitos) e o Plano de Contas do Supabase em paralelo
    const [resCredit, resDebit, { data: planoContas, error: errorSupabase }] = await Promise.all([
      fetchNiboData(apiKey, '/schedules/credit'),
      fetchNiboData(apiKey, '/schedules/debit'),
      supabase.from('plano_contas_dfc').select('codigo_9_digitos, categoria_nibo, grupo_dfc')
    ]);

    if (errorSupabase) throw new Error(`Erro ao buscar Plano de Contas no Supabase: ${errorSupabase.message}`);

    const creditos = resCredit.items || [];
    const debitos = resDebit.items || [];

    // 2. Processa e Classifica os lançamentos
    const fluxoProcessado = [...creditos, ...debitos].map(item => {
      const categoriaOriginal = item.category || "";
      const codigo9 = categoriaOriginal.substring(0, 9);
      
      // Tenta encontrar por código de 9 dígitos primeiro, depois por nome exato
      const mapeamento = planoContas.find(p => 
        (p.codigo_9_digitos && p.codigo_9_digitos === codigo9) || 
        (p.categoria_nibo && p.categoria_nibo === categoriaOriginal)
      );

      return {
        data: item.dueDate || item.paymentDate,
        valor: parseFloat(item.value), // Mantém o sinal original do Nibo (+ ou -)
        categoria: categoriaOriginal,
        grupo_dfc: mapeamento ? mapeamento.grupo_dfc : "OUTROS / NÃO CLASSIFICADOS",
        isPaid: !!item.paymentDate,
        tipo: item.type // 'credit' ou 'debit' do Nibo
      };
    });

    return NextResponse.json({
      empresa,
      totalLancamentos: fluxoProcessado.length,
      fluxo: fluxoProcessado
    });

  } catch (error) {
    console.error('Erro na API DFC:', error);
    return NextResponse.json({ 
      error: 'Falha ao processar DFC.', 
      details: error.message 
    }, { status: 500 });
  }
}
