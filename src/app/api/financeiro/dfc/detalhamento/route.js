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
  const mesSolicitado = parseInt(searchParams.get('mes'));
  const grupoSolicitado = searchParams.get('grupo');

  if (!empresa || !mesSolicitado || !grupoSolicitado) {
    return NextResponse.json({ error: 'Parâmetros ausentes' }, { status: 400 });
  }

  const apiKey = empresa === 'Victec' ? process.env.NIBO_API_KEY_VICTEC : process.env.NIBO_API_KEY_VMCTECH;
  if (!apiKey) return NextResponse.json({ error: 'API Key não configurada' }, { status: 500 });

  // 1. Buscar Plano de Contas do Supabase (Igual ao route.js principal)
  const { data: planoContas } = await supabase.from('plano_contas_dfc').select('*');
  const mapaCodigo = new Map();
  const mapaNome = new Map();
  planoContas?.forEach(item => {
    if (item.codigo_9_digitos) mapaCodigo.set(item.codigo_9_digitos, item.grupo_dfc);
    if (item.categoria_nibo) mapaNome.set(item.categoria_nibo, item.grupo_dfc);
  });

  // 2. Janela de busca (Igual ao route.js principal)
  const startDate = `${ano}-${mesSolicitado.toString().padStart(2, '0')}-01`;
  const lastDay = new Date(parseInt(ano), mesSolicitado, 0).getDate();
  const endDate = `${ano}-${mesSolicitado.toString().padStart(2, '0')}-${lastDay}`;

  // 3. Buscar dados (Igual ao route.js principal)
  const [receipts, payments, creditSchedules, debitSchedules] = await Promise.all([
    fetchNiboData(apiKey, `/receipts?$filter=date ge ${startDate} and date le ${endDate} and isTransfer eq false&$expand=category`),
    fetchNiboData(apiKey, `/payments?$filter=date ge ${startDate} and date le ${endDate} and isTransfer eq false&$expand=category`),
    fetchNiboData(apiKey, `/schedules/credit?$filter=isPaid eq true and dueDate ge ${startDate} and dueDate le ${endDate}&$expand=category,categories`),
    fetchNiboData(apiKey, `/schedules/debit?$filter=isPaid eq true and dueDate ge ${startDate} and dueDate le ${endDate}&$expand=category,categories`)
  ]);

  const schedulesMap = new Map();
  [...(creditSchedules.data || []), ...(debitSchedules.data || [])].forEach(s => {
    schedulesMap.set(s.scheduleId, s);
  });

  const detalhamento = [];

  // Lógica de mapeamento idêntica ao route.js principal
  const getGrupo = (cat) => {
    if (!cat) return 'OUTROS / NÃO CLASSIFICADOS';
    const codigo = cat.name?.substring(0, 9);
    if (/^\d{9}$/.test(codigo)) return mapaCodigo.get(codigo) || 'OUTROS / NÃO CLASSIFICADOS';
    return mapaNome.get(cat.name) || 'OUTROS / NÃO CLASSIFICADOS';
  };

  // Processar Recebimentos
  receipts.data?.forEach(r => {
    const sch = schedulesMap.get(r.scheduleId);
    if (sch && sch.categories?.length > 0) {
      sch.categories.forEach(sub => {
        const grupo = getGrupo(sub);
        if (grupo === grupoSolicitado) {
          const sinal = sub.tipo === 'out' ? -1 : 1;
          detalhamento.push({
            data: r.date,
            nome: r.description || sch.description || 'NIBO Receipt',
            descricao: sub.name || 'Sub-categoria',
            categoria: sub.name || 'Sem categoria',
            centro_costo: sub.costCenter?.name || '-',
            valor: sub.value * sinal
          });
        }
      });
    } else {
      const grupo = getGrupo(r.category);
      if (grupo === grupoSolicitado) {
        detalhamento.push({
          data: r.date,
          nome: r.description || 'NIBO Receipt',
          descricao: 'Lançamento direto',
          categoria: r.category?.name || 'Sem categoria',
          centro_costo: r.costCenter?.name || '-',
          valor: r.value
        });
      }
    }
  });

  // Processar Pagamentos
  payments.data?.forEach(p => {
    const sch = schedulesMap.get(p.scheduleId);
    if (sch && sch.categories?.length > 0) {
      sch.categories.forEach(sub => {
        const grupo = getGrupo(sub);
        if (grupo === grupoSolicitado) {
          detalhamento.push({
            data: p.date,
            nome: p.description || sch.description || 'NIBO Payment',
            descricao: sub.name || 'Sub-categoria',
            categoria: sub.name || 'Sem categoria',
            centro_costo: sub.costCenter?.name || '-',
            valor: sub.value * -1
          });
        }
      });
    } else {
      const grupo = getGrupo(p.category);
      if (grupo === grupoSolicitado) {
        detalhamento.push({
          data: p.date,
          nome: p.description || 'NIBO Payment',
          descricao: 'Lançamento direto',
          categoria: p.category?.name || 'Sem categoria',
          centro_costo: p.costCenter?.name || '-',
          valor: p.value * -1
        });
      }
    }
  });

  detalhamento.sort((a, b) => new Date(a.data) - new Date(b.data));
  return NextResponse.json(detalhamento);
}
