import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Função auxiliar para buscar dados do NIBO com tratamento de erros
async function fetchNiboData(apiKey, endpoint) {
  // CORREÇÃO 1: URL base correta conforme o route.js principal do DFC
  const url = `https://api.nibo.com.br/empresas/v1${endpoint}`;
  try {
    const res = await fetch(url, {
      headers: { 'apikey': apiKey },
      next: { revalidate: 0 } // Desabilitar cache para dados financeiros
    } );
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
  const mes = searchParams.get('mes');
  const grupoSolicitado = searchParams.get('grupo');

  if (!empresa || !mes || !grupoSolicitado) {
    return NextResponse.json({ error: 'Parâmetros ausentes' }, { status: 400 });
  }

  // Chave da API baseada na empresa
  const apiKey = empresa === 'Victec' ? process.env.NIBO_API_KEY_VICTEC : process.env.NIBO_API_KEY_VMCTECH;

  if (!apiKey) {
    return NextResponse.json({ error: 'API Key não configurada' }, { status: 500 });
  }

  // 1. Buscar Plano de Contas do Supabase
  const { data: planoContas } = await supabase
    .from('plano_contas_dfc')
    .select('*');

  // Criar mapas para busca rápida
  const mapaCodigo = new Map();
  const mapaNome = new Map();
  planoContas?.forEach(item => {
    if (item.codigo_9_digitos) mapaCodigo.set(item.codigo_9_digitos, item.grupo_dfc);
    if (item.categoria_nibo) mapaNome.set(item.categoria_nibo, item.grupo_dfc);
  });

  // 2. Definir datas do mês solicitado
  const startDate = `${ano}-${mes.padStart(2, '0')}-01`;
  const lastDay = new Date(parseInt(ano), parseInt(mes), 0).getDate();
  const endDate = `${ano}-${mes.padStart(2, '0')}-${lastDay}`;

  // 3. Buscar dados do NIBO em paralelo (Apenas do mês solicitado)
  // CORREÇÃO 2: Adicionado $expand=category e isPaid eq true nos schedules
  const [receipts, payments, creditSchedules, debitSchedules] = await Promise.all([
    fetchNiboData(apiKey, `/receipts?$filter=date ge ${startDate} and date le ${endDate} and isTransfer eq false&$expand=category`),
    fetchNiboData(apiKey, `/payments?$filter=date ge ${startDate} and date le ${endDate} and isTransfer eq false&$expand=category`),
    fetchNiboData(apiKey, `/schedules/credit?$filter=isPaid eq true and dueDate ge ${startDate} and dueDate le ${endDate}&$expand=category,categories`),
    fetchNiboData(apiKey, `/schedules/debit?$filter=isPaid eq true and dueDate ge ${startDate} and dueDate le ${endDate}&$expand=category,categories`)
  ]);

  // Criar mapa de schedules para buscar sub-categorias (impostos, descontos, etc)
  const schedulesMap = new Map();
  [...(creditSchedules.data || []), ...(debitSchedules.data || [])].forEach(s => {
    schedulesMap.set(s.scheduleId, s);
  });

  const detalhamento = [];

  // Função para mapear grupo
  const getGrupo = (cat) => {
    if (!cat) return 'OUTROS / NÃO CLASSIFICADOS';
    const codigo = cat.name?.substring(0, 9);
    if (/^\d{9}$/.test(codigo)) return mapaCodigo.get(codigo) || 'OUTROS / NÃO CLASSIFICADOS';
    return mapaNome.get(cat.name) || 'OUTROS / NÃO CLASSIFICADOS';
  };

  // 4. Processar Recebimentos (Entradas)
  receipts.data?.forEach(r => {
    const sch = schedulesMap.get(r.scheduleId);
    
    // Se tem schedule, processamos as sub-categorias (impostos, descontos, juros)
    if (sch && sch.categories?.length > 0) {
      sch.categories.forEach(sub => {
        const grupo = getGrupo(sub);
        if (grupo === grupoSolicitado) {
          const sinal = sub.tipo === 'out' ? -1 : 1;
          detalhamento.push({
            data: r.date,
            nome: r.description || sch.description,
            descricao: sub.name || 'Lançamento principal',
            categoria: sub.name,
            centro_costo: sub.costCenter?.name || '-',
            valor: sub.value * sinal
          });
        }
      });
    } else {
      // Se não tem schedule ou sub-categorias, usa a categoria do receipt
      const grupo = getGrupo(r.category);
      if (grupo === grupoSolicitado) {
        detalhamento.push({
          data: r.date,
          nome: r.description || '-',
          descricao: 'Lançamento direto',
          categoria: r.category?.name || 'Sem categoria',
          centro_costo: r.costCenter?.name || '-',
          valor: r.value
        });
      }
    }
  });

  // 5. Processar Pagamentos (Saídas)
  payments.data?.forEach(p => {
    const sch = schedulesMap.get(p.scheduleId);
    
    if (sch && sch.categories?.length > 0) {
      sch.categories.forEach(sub => {
        const grupo = getGrupo(sub);
        if (grupo === grupoSolicitado) {
          // Em pagamentos, o valor da sub-categoria é positivo no NIBO, mas no DFC é saída
          detalhamento.push({
            data: p.date,
            nome: p.description || sch.description,
            descricao: sub.name || 'Lançamento principal',
            categoria: sub.name,
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
          nome: p.description || '-',
          descricao: 'Lançamento direto',
          categoria: p.category?.name || 'Sem categoria',
          centro_costo: p.costCenter?.name || '-',
          valor: p.value * -1
        });
      }
    }
  });

  // Ordenar por data
  detalhamento.sort((a, b) => new Date(a.data) - new Date(b.data));

  return NextResponse.json(detalhamento);
}
