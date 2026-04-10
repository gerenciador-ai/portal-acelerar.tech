import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Usando os nomes EXATOS que você confirmou na Vercel
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Inicializa o cliente Supabase (com verificação para não quebrar o build)
const supabase = (supabaseUrl && supabaseServiceKey) 
  ? createClient(supabaseUrl, supabaseServiceKey) 
  : null;

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

  if (!supabase) {
    return NextResponse.json({ error: 'Configuração do Supabase ausente no servidor.' }, { status: 500 });
  }

  const apiKey = empresa === 'Victec' ? process.env.NIBO_API_KEY_VICTEC : process.env.NIBO_API_KEY_VMCTECH;

  try {
    const [resCredit, resDebit, { data: planoContas, error: errorSupabase }] = await Promise.all([
      fetchNiboData(apiKey, '/schedules/credit'),
      fetchNiboData(apiKey, '/schedules/debit'),
      supabase.from('plano_contas_dfc').select('codigo_9_digitos, categoria_nibo, grupo_dfc')
    ]);

    if (errorSupabase) throw new Error(`Erro no Supabase: ${errorSupabase.message}`);

    const creditos = resCredit.items || [];
    const debitos = resDebit.items || [];

    const fluxoProcessado = [...creditos, ...debitos].map(item => {
      const categoriaOriginal = item.category || "";
      const codigo9 = categoriaOriginal.substring(0, 9);
      
      const mapeamento = planoContas.find(p => 
        (p.codigo_9_digitos && p.codigo_9_digitos === codigo9) || 
        (p.categoria_nibo && p.categoria_nibo === categoriaOriginal)
      );

      return {
        data: item.dueDate || item.paymentDate,
        valor: parseFloat(item.value),
        categoria: categoriaOriginal,
        grupo_dfc: mapeamento ? mapeamento.grupo_dfc : "OUTROS / NÃO CLASSIFICADOS",
        isPaid: !!item.paymentDate
      };
    });

    return NextResponse.json({ empresa, fluxo: fluxoProcessado });

  } catch (error) {
    console.error('Erro na API DFC:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
