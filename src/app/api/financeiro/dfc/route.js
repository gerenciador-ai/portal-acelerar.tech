import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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
  
  if (!empresa) return NextResponse.json({ error: 'O parâmetro "empresa" é obrigatório.' }, { status: 400 });
  if (!supabase) return NextResponse.json({ error: 'Configuração do Supabase ausente.' }, { status: 500 });

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

    const fluxoProcessado = [...creditos, ...debitos]
      .filter(item => !!item.paymentDate) // REGIME DE CAIXA: Só o que foi pago/recebido
      .map(item => {
        let categoriaOriginal = "";
        if (typeof item.category === 'object' && item.category !== null) {
          categoriaOriginal = String(item.category.name || "");
        } else {
          categoriaOriginal = String(item.category || "");
        }
        
        const catLimpa = categoriaOriginal.trim();
        const catLower = catLimpa.toLowerCase();
        
        // EXTRAÇÃO DE 9 DÍGITOS: Busca em qualquer lugar do texto
        const matchCodigo = catLimpa.match(/\d{9}/);
        const codigo9 = matchCodigo ? matchCodigo[0] : "";
        
        // CRUZAMENTO FLEXÍVEL COM O SUPABASE
        const mapeamento = planoContas.find(p => {
          const pCodigo = p.codigo_9_digitos ? String(p.codigo_9_digitos).trim() : "";
          const pNome = p.categoria_nibo ? String(p.categoria_nibo).trim().toLowerCase() : "";
          
          // Match por código OU por nome exato (ignorando maiúsculas)
          return (pCodigo && pCodigo === codigo9) || (pNome && pNome === catLower);
        });

        return {
          data: item.paymentDate, // Foco na data de pagamento
          valor: parseFloat(item.value),
          categoria: catLimpa,
          grupo_dfc: mapeamento ? mapeamento.grupo_dfc : "OUTROS / NAO CLASSIFICADOS",
          isPaid: true
        };
      });

    return NextResponse.json({ empresa, fluxo: fluxoProcessado });

  } catch (error) {
    console.error('Erro na API DFC:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
