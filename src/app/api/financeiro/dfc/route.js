import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = (supabaseUrl && supabaseServiceKey)
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

const NIBO_API_URL = 'https://api.nibo.com.br/empresas/v1';

// ─────────────────────────────────────────────────────────────
// Busca paginada genérica — suporta @odata.nextLink
// ─────────────────────────────────────────────────────────────
async function fetchAllPages(firstUrl) {
  let items = [];
  let url = firstUrl;

  while (url) {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Erro na API do NIBO (${response.status}): ${errorBody}`);
    }

    const data = await response.json();
    items = items.concat(data.items || []);
    url = data['@odata.nextLink'] || null;
  }

  return items;
}

// ─────────────────────────────────────────────────────────────
// Chamada 1: /receipts — entradas com data real de caixa
// ─────────────────────────────────────────────────────────────
async function fetchReceipts(apiKey, startDate, endDate) {
  const url = `${NIBO_API_URL}/receipts?apitoken=${apiKey}&$filter=date ge ${startDate} and date le ${endDate}&$top=500&$expand=stakeholder,category`;
  return fetchAllPages(url);
}

// ─────────────────────────────────────────────────────────────
// Chamada 2: /payments — saídas com data real de caixa
// ─────────────────────────────────────────────────────────────
async function fetchPayments(apiKey, startDate, endDate) {
  const url = `${NIBO_API_URL}/payments?apitoken=${apiKey}&$filter=date ge ${startDate} and date le ${endDate}&$top=500&$expand=stakeholder,category`;
  return fetchAllPages(url);
}

// ─────────────────────────────────────────────────────────────
// Chamada 3: /schedules/credit com categories
// Sub-categorias: impostos retidos, juros, multas, descontos
// ─────────────────────────────────────────────────────────────
async function fetchCreditSchedules(apiKey, startDate, endDate) {
  const url = `${NIBO_API_URL}/schedules/credit?apitoken=${apiKey}&$filter=isPaid eq true and dueDate ge ${startDate} and dueDate le ${endDate}&$top=500&$expand=stakeholder,category,categories`;
  return fetchAllPages(url);
}

// ─────────────────────────────────────────────────────────────
// Chamada 4: /schedules/debit com categories
// Sub-categorias: rateios por centro de custo em débitos
// ─────────────────────────────────────────────────────────────
async function fetchDebitSchedules(apiKey, startDate, endDate) {
  const url = `${NIBO_API_URL}/schedules/debit?apitoken=${apiKey}&$filter=isPaid eq true and dueDate ge ${startDate} and dueDate le ${endDate}&$top=500&$expand=stakeholder,category,categories`;
  return fetchAllPages(url);
}

// ─────────────────────────────────────────────────────────────
// Mapeamento de categoria → grupo DFC
// 1ª camada: texto exato em categoria_nibo (categorias nativas NIBO)
// 2ª camada: primeiros 9 dígitos numéricos em codigo_9_digitos
// Fallback: "OUTROS / NÃO CLASSIFICADOS"
// ─────────────────────────────────────────────────────────────
function mapearCategoria(categoriaNome, planoContas) {
  const nome = (categoriaNome || '').trim();
  if (!nome) return 'OUTROS / NÃO CLASSIFICADOS';

  // 1ª camada: nome nativo exato (categorias padrão do NIBO)
  const porNome = planoContas.find(
    p => p.categoria_nibo && p.categoria_nibo.trim() === nome
  );
  if (porNome) return porNome.grupo_dfc;

  // 2ª camada: código 9 dígitos numéricos (categorias personalizadas)
  const primeiros9 = nome.substring(0, 9);
  if (primeiros9.length === 9 && /^\d{9}$/.test(primeiros9)) {
    const porCodigo = planoContas.find(
      p => p.codigo_9_digitos && p.codigo_9_digitos.trim() === primeiros9
    );
    if (porCodigo) return porCodigo.grupo_dfc;
  }

  return 'OUTROS / NÃO CLASSIFICADOS';
}

// ─────────────────────────────────────────────────────────────
// Constrói mapa scheduleId → array de sub-categorias
// ─────────────────────────────────────────────────────────────
function buildScheduleMap(schedules) {
  const map = {};
  for (const s of schedules) {
    const sid = s.scheduleId;
    if (!sid) continue;
    const cats = s.categories || [];
    if (cats.length > 0) {
      map[sid] = cats.map(c => ({
        categoriaNome: (c.categoryName || '').trim(),
        valor: parseFloat(c.value || 0),
      }));
    }
  }
  return map;
}

// ─────────────────────────────────────────────────────────────
// Acumula valor na matriz agregada [mes][grupo]
// mes: 0-11 (Janeiro=0)
// ─────────────────────────────────────────────────────────────
function acumular(matriz, mes, grupo, valor) {
  if (mes < 0 || mes > 11) return;
  if (!matriz[grupo]) matriz[grupo] = Array(12).fill(0);
  matriz[grupo][mes] += valor;
}

// ─────────────────────────────────────────────────────────────
// Processa receipts (entradas) e acumula na matriz
// ─────────────────────────────────────────────────────────────
function processarReceipts(receipts, creditScheduleMap, planoContas, matriz) {
  for (const item of receipts) {
    if (item.isTransfer) continue;

    const mes = new Date(item.date).getUTCMonth();
    const valor = parseFloat(item.value || 0);
    const catNome = (item.category?.name || '').trim();

    // Lançamento principal
    const grupoPrincipal = mapearCategoria(catNome, planoContas);
    acumular(matriz, mes, grupoPrincipal, valor);

    // Sub-categorias do schedule (impostos retidos, descontos, juros, multas)
    if (!item.scheduleId) continue;
    const subCats = creditScheduleMap[item.scheduleId] || [];

    for (const sub of subCats) {
      // Ignorar a categoria principal já contabilizada
      const p9sub = sub.categoriaNome.substring(0, 9);
      const p9cat = catNome.substring(0, 9);
      const mesmaCat =
        sub.categoriaNome === catNome ||
        (p9sub.length === 9 && /^\d{9}$/.test(p9sub) &&
         p9cat.length === 9 && /^\d{9}$/.test(p9cat) &&
         p9sub === p9cat);
      if (mesmaCat) continue;

      const grupoSub = mapearCategoria(sub.categoriaNome, planoContas);
      if (grupoSub === 'OUTROS / NÃO CLASSIFICADOS') continue;

      // Impostos retidos e descontos são valores que saem da receita (negativos)
      acumular(matriz, mes, grupoSub, sub.valor * -1);
    }
  }
}

// ─────────────────────────────────────────────────────────────
// Processa payments (saídas) e acumula na matriz
// ─────────────────────────────────────────────────────────────
function processarPayments(payments, debitScheduleMap, planoContas, matriz) {
  for (const item of payments) {
    if (item.isTransfer) continue;

    const mes = new Date(item.date).getUTCMonth();
    const valor = parseFloat(item.value || 0) * -1; // saídas são negativas
    const catNome = (item.category?.name || '').trim();

    if (!catNome) continue;

    const grupoPrincipal = mapearCategoria(catNome, planoContas);
    acumular(matriz, mes, grupoPrincipal, valor);

    // Sub-categorias do schedule (rateios)
    if (!item.scheduleId) continue;
    const subCats = debitScheduleMap[item.scheduleId] || [];

    for (const sub of subCats) {
      const p9sub = sub.categoriaNome.substring(0, 9);
      const p9cat = catNome.substring(0, 9);
      const mesmaCat =
        sub.categoriaNome === catNome ||
        (p9sub.length === 9 && /^\d{9}$/.test(p9sub) &&
         p9cat.length === 9 && /^\d{9}$/.test(p9cat) &&
         p9sub === p9cat);
      if (mesmaCat) continue;

      const grupoSub = mapearCategoria(sub.categoriaNome, planoContas);
      if (grupoSub === 'OUTROS / NÃO CLASSIFICADOS') continue;

      acumular(matriz, mes, grupoSub, sub.valor * -1);
    }
  }
}

// ─────────────────────────────────────────────────────────────
// Handler principal GET
// ─────────────────────────────────────────────────────────────
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const empresa = searchParams.get('empresa');
  const ano = searchParams.get('ano') || new Date().getFullYear().toString();

  if (!empresa) {
    return NextResponse.json({ error: 'O parâmetro "empresa" é obrigatório.' }, { status: 400 });
  }
  if (!supabase) {
    return NextResponse.json({ error: 'Configuração do Supabase ausente.' }, { status: 500 });
  }

  const apiKey = empresa === 'Victec'
    ? process.env.NIBO_API_KEY_VICTEC
    : process.env.NIBO_API_KEY_VMCTECH;

  if (!apiKey) {
    return NextResponse.json(
      { error: `Chave de API do NIBO não encontrada para a empresa "${empresa}".` },
      { status: 500 }
    );
  }

  const startDate = `${ano}-01-01`;
  const endDate = `${ano}-12-31`;

  try {
    // Todas as chamadas em paralelo para máxima performance
    const [
      receipts,
      payments,
      creditSchedules,
      debitSchedules,
      { data: planoContas, error: errorSupabase },
    ] = await Promise.all([
      fetchReceipts(apiKey, startDate, endDate),
      fetchPayments(apiKey, startDate, endDate),
      fetchCreditSchedules(apiKey, startDate, endDate),
      fetchDebitSchedules(apiKey, startDate, endDate),
      supabase.from('plano_contas_dfc').select('codigo_9_digitos, categoria_nibo, grupo_dfc'),
    ]);

    if (errorSupabase) {
      throw new Error(`Erro no Supabase: ${errorSupabase.message}`);
    }

    // Mapas de sub-categorias por scheduleId
    const creditScheduleMap = buildScheduleMap(creditSchedules);
    const debitScheduleMap = buildScheduleMap(debitSchedules);

    // Matriz agregada: { "RECEITAS OPERACIONAIS": [jan, fev, ..., dez], ... }
    const matriz = {};

    processarReceipts(receipts, creditScheduleMap, planoContas, matriz);
    processarPayments(payments, debitScheduleMap, planoContas, matriz);

    return NextResponse.json({ empresa, ano, matriz });

  } catch (error) {
    console.error('Erro na API DFC:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
