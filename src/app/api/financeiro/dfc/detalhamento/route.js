import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchNiboData(apiKey, endpoint) {
  const url = `https://api.nibo.com.br/empresas/v1${endpoint}`;
  try {
    const res = await fetch(url, {
      headers: { 'apikey': apiKey },
      next: { revalidate: 0 }
    });
    if (!res.ok) return { data: [] };
    return await res.json();
  } catch (error) {
    console.error(`Erro NIBO ${endpoint}:`, error);
    return { data: [] };
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const empresa = searchParams.get('empresa');
  const ano = searchParams.get('ano') || '2026';
  const mesSolicitado = parseInt(searchParams.get('mes')); // 1-12
  const linhaSolicitada = searchParams.get('grupo'); // Rótulo visual: "(-) CUSTOS OPERACIONAIS"

  if (!empresa || !mesSolicitado || !linhaSolicitada) {
    return NextResponse.json({ error: 'Parâmetros ausentes' }, { status: 400 });
  }

  const apiKey = empresa === 'Victec' ? process.env.NIBO_API_KEY_VICTEC : process.env.NIBO_API_KEY_VMCTECH;
  if (!apiKey) return NextResponse.json({ error: 'API Key não configurada' }, { status: 500 });

  // 1. Mapeamento de Rótulos para Grupos Supabase (LÓGICA DO ROUTE.JS PRINCIPAL)
  let grupoDfcAlvo = "";
  switch (linhaSolicitada) {
    case 'RECEITAS OPERACIONAIS': grupoDfcAlvo = "RECEITAS OPERACIONAIS"; break;
    case '(-) IMPOSTOS SOBRE VENDAS': grupoDfcAlvo = "IMPOSTOS SOBRE VENDAS"; break;
    case '(-) CUSTOS OPERACIONAIS': grupoDfcAlvo = "CUSTOS OPERACIONAIS"; break;
    case '(-) DESPESAS ADMINISTRATIVAS': grupoDfcAlvo = "DESPESAS ADMINISTRATIVAS"; break;
    case '(-) DESPESAS COMERCIAIS': grupoDfcAlvo = "DESPESAS COMERCIAIS"; break;
    case '(+/-) FLUXO DE INVESTIMENTO (FCI)': grupoDfcAlvo = "FCI"; break;
    case '(+/-) FLUXO DE FINANCIAMENTO (FCF)': grupoDfcAlvo = "FCF"; break;
    case '(-) DESPESAS FINANCEIRAS': grupoDfcAlvo = "DESPESAS FINANCEIRAS"; break;
    case 'OUTROS / NÃO CLASSIFICADOS': grupoDfcAlvo = "OUTROS / NÃO CLASSIFICADOS"; break;
    default: grupoDfcAlvo = linhaSolicitada;
  }

  // 2. Buscar Plano de Contas (LÓGICA DO ROUTE.JS PRINCIPAL)
  const { data: planoContas } = await supabase.from('plano_contas_dfc').select('*');
  const mapaCodigo = new Map();
  const mapaNome = new Map();
  planoContas?.forEach(item => {
    if (item.codigo_9_digitos) mapaCodigo.set(item.codigo_9_digitos, item.grupo_dfc);
    if (item.categoria_nibo) mapaNome.set(item.categoria_nibo, item.grupo_dfc);
  });

  // 3. Janela de busca (LÓGICA DO ROUTE.JS PRINCIPAL - Busca 3 meses para garantir integridade)
  const startMonth = Math.max(1, mesSolicitado - 1);
  const endMonth = Math.min(12, mesSolicitado + 1);
  const mesesBusca = [];
  for (let m = startMonth; m <= endMonth; m++) mesesBusca.push(m);

  // 4. Buscar e processar dados (LÓGICA DO ROUTE.JS PRINCIPAL)
  const results = await Promise.all(mesesBusca.map(async (m) => {
    const startDate = `${ano}-${m.toString().padStart(2, '0')}-01`;
    const lastDay = new Date(parseInt(ano), m, 0).getDate();
    const endDate = `${ano}-${m.toString().padStart(2, '0')}-${lastDay}`;

    const [receipts, payments, creditSchedules, debitSchedules] = await Promise.all([
      fetchNiboData(apiKey, `/receipts?$filter=date ge ${startDate} and date le ${endDate} and isTransfer eq false&$expand=category`),
      fetchNiboData(apiKey, `/payments?$filter=date ge ${startDate} and date le ${endDate} and isTransfer eq false&$expand=category`),
      fetchNiboData(apiKey, `/schedules/credit?$filter=isPaid eq true and dueDate ge ${startDate} and dueDate le ${endDate}&$expand=category,categories`),
      fetchNiboData(apiKey, `/schedules/debit?$filter=isPaid eq true and dueDate ge ${startDate} and dueDate le ${endDate}&$expand=category,categories`)
    ]);

    return { m, receipts, payments, creditSchedules, debitSchedules };
  }));

  const detalhamento = [];

  // Função getGrupo (LÓGICA DO ROUTE.JS PRINCIPAL)
  const getGrupo = (cat) => {
    if (!cat) return 'OUTROS / NÃO CLASSIFICADOS';
    const codigo = cat.name?.substring(0, 9);
    if (/^\d{9}$/.test(codigo)) return mapaCodigo.get(codigo) || 'OUTROS / NÃO CLASSIFICADOS';
    return mapaNome.get(cat.name) || 'OUTROS / NÃO CLASSIFICADOS';
  };

  // 5. Processar cada mês e filtrar apenas os lançamentos que pertencem ao mês e grupo clicados
  results.forEach(({ m, receipts, payments, creditSchedules, debitSchedules }) => {
    // Só processa se for o mês que o usuário clicou
    if (m !== mesSolicitado) return;

    const schedulesMap = new Map();
    [...(creditSchedules.data || []), ...(debitSchedules.data || [])].forEach(s => {
      schedulesMap.set(s.scheduleId, s);
    });

    // Processar Recebimentos
    receipts.data?.forEach(r => {
      const sch = schedulesMap.get(r.scheduleId);
      if (sch && sch.categories?.length > 0) {
        sch.categories.forEach(sub => {
          if (getGrupo(sub) === grupoDfcAlvo) {
            const sinal = sub.tipo === 'out' ? -1 : 1;
            detalhamento.push({
              data: r.date,
              nome: r.description || sch.description || 'Lançamento NIBO',
              descricao: sub.name || 'Sub-categoria',
              categoria: sub.name || 'Sem categoria',
              centro_costo: sub.costCenter?.name || '-',
              valor: sub.value * sinal
            });
          }
        });
      } else if (getGrupo(r.category) === grupoDfcAlvo) {
        detalhamento.push({
          data: r.date,
          nome: r.description || 'Lançamento NIBO',
          descricao: 'Lançamento direto',
          categoria: r.category?.name || 'Sem categoria',
          centro_costo: r.costCenter?.name || '-',
          valor: r.value
        });
      }
    });

    // Processar Pagamentos
    payments.data?.forEach(p => {
      const sch = schedulesMap.get(p.scheduleId);
      if (sch && sch.categories?.length > 0) {
        sch.categories.forEach(sub => {
          if (getGrupo(sub) === grupoDfcAlvo) {
            detalhamento.push({
              data: p.date,
              nome: p.description || sch.description || 'Lançamento NIBO',
              descricao: sub.name || 'Sub-categoria',
              categoria: sub.name || 'Sem categoria',
              centro_costo: sub.costCenter?.name || '-',
              valor: sub.value * -1
            });
          }
        });
      } else if (getGrupo(p.category) === grupoDfcAlvo) {
        detalhamento.push({
          data: p.date,
          nome: p.description || 'Lançamento NIBO',
          descricao: 'Lançamento direto',
          categoria: p.category?.name || 'Sem categoria',
          centro_costo: p.costCenter?.name || '-',
          valor: p.value * -1
        });
      }
    });
  });

  detalhamento.sort((a, b) => new Date(a.data) - new Date(b.data));
  return NextResponse.json(detalhamento);
}
