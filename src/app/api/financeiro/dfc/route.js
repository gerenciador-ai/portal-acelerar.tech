import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const NIBO_BASE = "https://api.nibo.com.br/empresas/v1";

const EMPRESAS = [
  { nome: "Victec", apiKeyEnv: "NIBO_API_KEY_VICTEC" },
  { nome: "VMC Tech", apiKeyEnv: "NIBO_API_KEY_VMCTECH" },
  { nome: "GRT", apiKeyEnv: "NIBO_API_KEY_GRT" },
  { nome: "Bllog", apiKeyEnv: "NIBO_API_KEY_BLLOG" },
  { nome: "M3", apiKeyEnv: "NIBO_API_KEY_M3" },
  { nome: "Acelerar", apiKeyEnv: "NIBO_API_KEY_ACELERAR" },
  { nome: "bLive", apiKeyEnv: "NIBO_API_KEY_BLIVE" },
  { nome: "Condway", apiKeyEnv: "NIBO_API_KEY_CONDWAY" },
  { nome: "Isket", apiKeyEnv: "NIBO_API_KEY_ISKET" }
];

async function fetchMonth(apiKey, endpoint, mes, ano, extra = "") {
  const start = `${ano}-${String(mes).padStart(2, "0")}-01`;
  const daysInMonth = new Date(ano, mes, 0).getDate();
  const end = `${ano}-${String(mes).padStart(2, "0")}-${daysInMonth}`;
  const url = `${NIBO_BASE}/${endpoint}?apitoken=${apiKey}&$filter=date ge ${start} and date le ${end}&$top=500${extra}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return data.items || [];
}

async function fetchSchedules(apiKey, tipo, mes, ano) {
  const start = `${ano}-${String(mes).padStart(2, "0")}-01`;
  const daysInMonth = new Date(ano, mes, 0).getDate();
  const end = `${ano}-${String(mes).padStart(2, "0")}-${daysInMonth}`;
  const url = `${NIBO_BASE}/schedules/${tipo}?apitoken=${apiKey}&$filter=isPaid eq true and dueDate ge ${start} and dueDate le ${end}&$top=500&$expand=category,categories`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return data.items || [];
}

function buildScheduleMap(schedules) {
  const map = {};
  for (const s of schedules) {
    const sid = s.scheduleId;
    if (!sid) continue;
    const mainCat = s.category?.name || "";
    const paidValue = parseFloat(s.paidValue || s.value || 0);
    const cats = s.categories || [];
    if (cats.length > 0) {
      const entries = cats
      .filter((c) => c.categoryName && parseFloat(c.value || 0) > 0)
      .map((c) => ({
        nome: (c.categoryName || "").trim(),
        valor: parseFloat(c.value || 0),
        tipo: (c.type || "in").toLowerCase(),
      }));
      map[sid] = entries.length > 0 ? entries : [{ nome: mainCat, valor: paidValue, tipo: "in" }];
    } else {
      map[sid] = [{ nome: mainCat, valor: paidValue, tipo: "in" }];
    }
  }
  return map;
}

function mapearCategoria(nome, planoContas) {
  nome = (nome || "").trim();
  if (!nome) return "OUTROS / NÃO CLASSIFICADOS";
  for (const p of planoContas) {
    if (p.categoria_nibo && p.categoria_nibo === nome) return p.grupo_dfc;
  }
  const p9 = nome.substring(0, 9);
  if (p9.length === 9 && /^\d{9}$/.test(p9)) {
    for (const p of planoContas) {
      if (p.codigo_9_digitos && p.codigo_9_digitos === p9) return p.grupo_dfc;
    }
  }
  return "OUTROS / NÃO CLASSIFICADOS";
}

async function processarMes(apiKey, mes, ano, planoContas, regrasRateio, empresaNome) {
  const [receipts, payments, creditSch, debitSch] = await Promise.all([
    fetchMonth(apiKey, "receipts", mes, ano, "&$expand=category,stakeholder"),
    fetchMonth(apiKey, "payments", mes, ano, "&$expand=category,stakeholder"),
    fetchSchedules(apiKey, "credit", mes, ano),
    fetchSchedules(apiKey, "debit", mes, ano),
  ]);

  const creditMap = buildScheduleMap(creditSch);
  const debitMap = buildScheduleMap(debitSch);

  const acumulado = {};
  const intercompany = { 
    recuperacao: 0, 
    rateioRecebido: 0,
    // NOVO: Mapeamento detalhado para o frontend cruzar os dados
    detalheRecuperacao: {} // { "VMC Tech": [0,0,0...12 meses] }
  };
  
  const acumular = (grupo, valor) => {
    acumulado[grupo] = (acumulado[grupo] || 0) + valor;
  };

  const processarItem = (item, valorOriginal, isEntrada) => {
    const catNome = item.category?.name || "";
    const favorecido = (item.stakeholder?.name || item.name || "").trim();
    const p9 = catNome.substring(0, 9);
    const grupo = mapearCategoria(catNome, planoContas);
    const dataRef = new Date(ano, mes - 1, 1);
    
    // 1. RECUPERAÇÃO: O que eu paguei e outros me devem
    const regrasOrigem = regrasRateio.filter(r => {
      const dInicio = new Date(r.data_inicio);
      const dFim = r.data_fim ? new Date(r.data_fim) : null;
      const matchPeriodo = dataRef >= dInicio && (!dFim || dataRef <= dFim);
      const matchCategoria = (r.categoria_nibo || '').trim().toLowerCase() === (p9 || '').trim().toLowerCase() || (r.categoria_nibo || '').trim().toLowerCase() === (catNome || '').trim().toLowerCase();
      const matchFavorecido = (r.favorecido_nome || '').trim().toLowerCase() === (favorecido || '').trim().toLowerCase();
      const matchEmpresaOrigem = (r.empresa_origem || '').trim().toLowerCase() === empresaNome.trim().toLowerCase();
      return matchPeriodo && matchCategoria && matchFavorecido && matchEmpresaOrigem;
    });

    regrasOrigem.forEach(r => {
      const valorRateado = Math.abs(valorOriginal) * (parseFloat(r.percentual || 0) / 100);
      intercompany.recuperacao += valorRateado;
      
      // Guarda quem é o destino para o frontend poder "avisar" a outra empresa
      const dest = (r.empresa_destino || "").trim();
      if (dest) {
        intercompany.detalheRecuperacao[dest] = (intercompany.detalheRecuperacao[dest] || 0) + valorRateado;
      }
    });

    // 2. RATEIO RECEBIDO: O que outros pagaram e eu devo (Funciona se as outras empresas forem carregadas)
    const regrasDestino = regrasRateio.filter(r => {
      const dInicio = new Date(r.data_inicio);
      const dFim = r.data_fim ? new Date(r.data_fim) : null;
      const matchPeriodo = dataRef >= dInicio && (!dFim || dataRef <= dFim);
      const matchCategoria = (r.categoria_nibo || '').trim().toLowerCase() === (p9 || '').trim().toLowerCase() || (r.categoria_nibo || '').trim().toLowerCase() === (catNome || '').trim().toLowerCase();
      const matchFavorecido = (r.favorecido_nome || '').trim().toLowerCase() === (favorecido || '').trim().toLowerCase();
      const matchEmpresaDestino = (r.empresa_destino || '').trim().toLowerCase() === empresaNome.trim().toLowerCase();
      return matchPeriodo && matchCategoria && matchFavorecido && matchEmpresaDestino;
    });

    regrasDestino.forEach(r => {
      const valorRateado = Math.abs(valorOriginal) * (parseFloat(r.percentual || 0) / 100);
      intercompany.rateioRecebido += valorRateado;
    });

    acumular(grupo, valorOriginal);
  };

  for (const item of receipts) {
    if (item.isTransfer) continue;
    const sid = item.scheduleId;
    const sch = sid ? creditMap[sid] : null;
    if (sch) {
      for (const entry of sch) {
        processarItem({ ...item, category: { name: entry.nome } }, entry.valor * (entry.tipo === "out" ? -1 : 1), true);
      }
    } else {
      processarItem(item, parseFloat(item.value || 0), true);
    }
  }

  for (const item of payments) {
    if (item.isTransfer) continue;
    const sid = item.scheduleId;
    const sch = sid ? debitMap[sid] : null;
    if (sch) {
      for (const entry of sch) {
        processarItem({ ...item, category: { name: entry.nome } }, entry.valor * -1, false);
      }
    } else {
      processarItem(item, parseFloat(item.value || 0) * -1, false);
    }
  }
  
  return { acumulado, intercompany };
}

const LINHAS_DFC = [
  { key: "RECEITAS OPERACIONAIS", label: "RECEITAS OPERACIONAIS", tipo: "linha" },
  { key: "(-) IMPOSTOS SOBRE VENDAS", label: "(-) IMPOSTOS SOBRE VENDAS", tipo: "linha" },
  { key: "(=) RECEITA LÍQUIDA", label: "(=) RECEITA LÍQUIDA", tipo: "calculado" },
  { key: "(-) CUSTOS OPERACIONAIS", label: "(-) CUSTOS OPERACIONAIS", tipo: "linha" },
  { key: "(-) DESPESAS ADMINISTRATIVAS", label: "(-) DESPESAS ADMINISTRATIVAS", tipo: "linha" },
  { key: "(-) DESPESAS COMERCIAIS", label: "(-) DESPESAS COMERCIAIS", tipo: "linha" },
  { key: "(=) FLUXO OPERACIONAL (FCO)", label: "(=) FLUXO OPERACIONAL (FCO)", tipo: "calculado" },
  { key: "(+/-) FLUXO DE INVESTIMENTO (FCI)", label: "(+/-) FLUXO DE INVESTIMENTO (FCI)", tipo: "linha" },
  { key: "(+/-) FLUXO DE FINANCIAMENTO (FCF)", label: "(+/-) FLUXO DE FINANCIAMENTO (FCF)", tipo: "linha" },
  { key: "(-) DESPESAS FINANCEIRAS", label: "(-) DESPESAS FINANCEIRAS", tipo: "linha" },
  { key: "OUTROS / NÃO CLASSIFICADOS", label: "OUTROS / NÃO CLASSIFICADOS", tipo: "linha" },
  { key: "(=) SALDO LÍQUIDO DO PERÍODO", label: "(=) SALDO LÍQUIDO DO PERÍODO", tipo: "calculado" },
];

async function buscarSaldoInicial(empresaNome) {
  try {
    const { data, error } = await supabase.from("saldos_iniciais_dfc").select("saldo_inicial_2026").eq("empresa_nome", empresaNome).single();
    return error || !data ? 0 : parseFloat(data.saldo_inicial_2026) || 0;
  } catch (error) { return 0; }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const empresaNome = searchParams.get("empresa");
  const ano = parseInt(searchParams.get("ano") || new Date().getFullYear());
  const empresa = EMPRESAS.find(e => e.nome.toLowerCase() === (empresaNome || "").toLowerCase());
  if (!empresa) return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });
  const apiKey = process.env[empresa.apiKeyEnv];
  if (!apiKey) return NextResponse.json({ error: "API key não configurada" }, { status: 500 });

  const [planoRes, regrasRes] = await Promise.all([
    supabase.from("plano_contas_dfc").select("codigo_9_digitos, categoria_nibo, grupo_dfc"),
    supabase.from("regras_rateio_dfc").select("*")
  ]);

  const planoContas = planoRes.data || [];
  const regrasRateio = regrasRes.data || [];
  const mesesData = [];
  for (let batch = 0; batch < 4; batch++) {
    const mesesBatch = [batch * 3 + 1, batch * 3 + 2, batch * 3 + 3];
    const results = await Promise.all(mesesBatch.map(mes => processarMes(apiKey, mes, ano, planoContas, regrasRateio, empresa.nome)));
    mesesData.push(...results);
  }

  const matriz = LINHAS_DFC.map(linha => ({
    key: linha.key,
    label: linha.label,
    tipo: linha.tipo,
    valores: mesesData.map(m => linha.tipo === "calculado" ? null : (m.acumulado[linha.key] || 0))
  }));

  const recuperacaoIntercompany = mesesData.map(m => m.intercompany.recuperacao);
  const rateioRecebidoIntercompany = mesesData.map(m => m.intercompany.rateioRecebido);
  const detalheRecuperacao = mesesData.map(m => m.intercompany.detalheRecuperacao);

  for (let m = 0; m < 12; m++) {
    const get = (k) => matriz.find(r => r.key === k).valores[m] || 0;
    const set = (k, v) => { matriz.find(r => r.key === k).valores[m] = v; };
    const recLiq = get("RECEITAS OPERACIONAIS") + get("(-) IMPOSTOS SOBRE VENDAS");
    set("(=) RECEITA LÍQUIDA", recLiq);
    const fco = recLiq + get("(-) CUSTOS OPERACIONAIS") + get("(-) DESPESAS ADMINISTRATIVAS") + get("(-) DESPESAS COMERCIAIS");
    set("(=) FLUXO OPERACIONAL (FCO)", fco);
    const saldo = fco + get("(+/-) FLUXO DE INVESTIMENTO (FCI)") + get("(+/-) FLUXO DE FINANCIAMENTO (FCF)") + get("(-) DESPESAS FINANCEIRAS") + get("OUTROS / NÃO CLASSIFICADOS");
    set("(=) SALDO LÍQUIDO DO PERÍODO", saldo);
  }

  const saldoInicial = await buscarSaldoInicial(empresa.nome);

  return NextResponse.json({
    empresa: empresa.nome,
    ano,
    meses: ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"],
    matriz,
    saldoInicial,
    recuperacaoIntercompany,
    rateioRecebidoIntercompany,
    detalheRecuperacao // NOVO: Enviado para o frontend cruzar os dados
  });
}
