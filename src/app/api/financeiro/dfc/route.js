import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const NIBO_BASE = "https://api.nibo.com.br/empresas/v1";

// ── Empresas configuradas ─────────────────────────────────────────────────────
const EMPRESAS = [
  { nome: "Victec", apiKeyEnv: "NIBO_API_KEY_VICTEC" },
  { nome: "VMC Tech", apiKeyEnv: "NIBO_API_KEY_VMCTECH" },
];

// ── Busca paginada mensal ─────────────────────────────────────────────────────
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

// ── Mapa de schedules por scheduleId ──────────────────────────────────────────
// Retorna: { scheduleId: [ { nome, valor, tipo } ] }
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

// ── Mapeamento de categoria para grupo DFC ────────────────────────────────────
function mapearCategoria(nome, planoContas) {
  nome = (nome || "").trim();
  if (!nome) return "OUTROS / NÃO CLASSIFICADOS";

  // 1ª camada: nome nativo exato (categorias nativas do NIBO)
  for (const p of planoContas) {
    if (p.categoria_nibo && p.categoria_nibo === nome) return p.grupo_dfc;
  }

  // 2ª camada: primeiros 9 dígitos numéricos (categorias personalizadas)
  const p9 = nome.substring(0, 9);
  if (p9.length === 9 && /^\d{9}$/.test(p9)) {
    for (const p of planoContas) {
      if (p.codigo_9_digitos && p.codigo_9_digitos === p9) return p.grupo_dfc;
    }
  }

  return "OUTROS / NÃO CLASSIFICADOS";
}

// ── Processar um mês para uma empresa ────────────────────────────────────────
async function processarMes(apiKey, mes, ano, planoContas) {
  const [receipts, payments, creditSch, debitSch] = await Promise.all([
    fetchMonth(apiKey, "receipts", mes, ano, "&$expand=category"),
    fetchMonth(apiKey, "payments", mes, ano, "&$expand=category"),
    fetchSchedules(apiKey, "credit", mes, ano),
    fetchSchedules(apiKey, "debit", mes, ano),
  ]);

  const creditMap = buildScheduleMap(creditSch);
  const debitMap = buildScheduleMap(debitSch);

  const acumulado = {};
  const acumular = (grupo, valor) => {
    acumulado[grupo] = (acumulado[grupo] || 0) + valor;
  };

  // Receipts (entradas)
  for (const item of receipts) {
    if (item.isTransfer) continue;
    const catNome = item.category?.name || "";
    const sid = item.scheduleId;
    const sch = sid ? creditMap[sid] : null;

    if (sch) {
      for (const entry of sch) {
        const grupo = mapearCategoria(entry.nome, planoContas);
        const sinal = entry.tipo === "out" ? -1 : 1;
        acumular(grupo, entry.valor * sinal);
      }
    } else {
      if (!catNome) continue;
      const grupo = mapearCategoria(catNome, planoContas);
      acumular(grupo, parseFloat(item.value || 0));
    }
  }

  // Payments (saídas — sempre negativo)
  for (const item of payments) {
    if (item.isTransfer) continue;
    const catNome = item.category?.name || "";
    const sid = item.scheduleId;
    const sch = sid ? debitMap[sid] : null;

    if (sch) {
      for (const entry of sch) {
        const grupo = mapearCategoria(entry.nome, planoContas);
        acumular(grupo, entry.valor * -1);
      }
    } else {
      if (!catNome) continue;
      const grupo = mapearCategoria(catNome, planoContas);
      acumular(grupo, parseFloat(item.value || 0) * -1);
    }
  }

  return acumulado;
}

// ── Ordem e estrutura do DFC ──────────────────────────────────────────────────
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

// ── Handler principal ─────────────────────────────────────────────────────────
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const empresaNome = searchParams.get("empresa");
  const ano = parseInt(searchParams.get("ano") || new Date().getFullYear());

  // Encontrar empresa
  const empresa = EMPRESAS.find(
    (e) => e.nome.toLowerCase() === (empresaNome || "").toLowerCase()
  );
  if (!empresa) {
    return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });
  }

  const apiKey = process.env[empresa.apiKeyEnv];
  if (!apiKey) {
    return NextResponse.json({ error: "API key não configurada" }, { status: 500 });
  }

  // Carregar plano de contas do Supabase
  const { data: planoContas, error: planoError } = await supabase
    .from("plano_contas_dfc")
    .select("codigo_9_digitos, categoria_nibo, grupo_dfc");

  if (planoError) {
    return NextResponse.json({ error: "Erro ao carregar plano de contas" }, { status: 500 });
  }

  // Processar todos os 12 meses em paralelo (grupos de 3 para não sobrecarregar)
  const mesesData = new Array(12).fill(null);
  for (let batch = 0; batch < 4; batch++) {
    const mesesBatch = [batch * 3 + 1, batch * 3 + 2, batch * 3 + 3];
    const results = await Promise.all(
      mesesBatch.map((mes) => processarMes(apiKey, mes, ano, planoContas))
    );
    results.forEach((r, i) => {
      mesesData[batch * 3 + i] = r;
    });
  }

  // Montar matriz DFC
  const meses = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];

  const matriz = LINHAS_DFC.map((linha) => {
    const valores = mesesData.map((mesAcum) => {
      if (!mesAcum) return 0;
      if (linha.tipo === "calculado") return null; // calculado depois
      return mesAcum[linha.key] || 0;
    });
    return { key: linha.key, label: linha.label, tipo: linha.tipo, valores };
  });

  // Calcular linhas derivadas
  for (let m = 0; m < 12; m++) {
    const get = (key) => {
      const row = matriz.find((r) => r.key === key);
      return row ? row.valores[m] || 0 : 0;
    };
    const set = (key, val) => {
      const row = matriz.find((r) => r.key === key);
      if (row) row.valores[m] = val;
    };

    const recOp = get("RECEITAS OPERACIONAIS");
    const impVendas = get("(-) IMPOSTOS SOBRE VENDAS");
    const recLiq = recOp + impVendas;
    set("(=) RECEITA LÍQUIDA", recLiq);

    const custosOp = get("(-) CUSTOS OPERACIONAIS");
    const despAdmin = get("(-) DESPESAS ADMINISTRATIVAS");
    const despCom = get("(-) DESPESAS COMERCIAIS");
    const fco = recLiq + custosOp + despAdmin + despCom;
    set("(=) FLUXO OPERACIONAL (FCO)", fco);

    const fci = get("(+/-) FLUXO DE INVESTIMENTO (FCI)");
    const fcf = get("(+/-) FLUXO DE FINANCIAMENTO (FCF)");
    const despFin = get("(-) DESPESAS FINANCEIRAS");
    const outros = get("OUTROS / NÃO CLASSIFICADOS");
    const saldo = fco + fci + fcf + despFin + outros;
    set("(=) SALDO LÍQUIDO DO PERÍODO", saldo);
  }

  return NextResponse.json({
    empresa: empresa.nome,
    ano,
    meses,
    matriz,
  });
}
