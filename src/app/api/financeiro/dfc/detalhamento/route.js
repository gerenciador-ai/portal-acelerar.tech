import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const NIBO_BASE = "https://api.nibo.com.br/empresas/v1";

// ── Empresas configuradas (Linha 12 do original) ─────────────────────────────
const EMPRESAS = [
  { nome: "Victec", apiKeyEnv: "NIBO_API_KEY_VICTEC" },
  { nome: "VMC Tech", apiKeyEnv: "NIBO_API_KEY_VMCTECH" },
];

// ── Busca paginada mensal (Linha 18 do original) ─────────────────────────────
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

// ── Mapa de schedules (Linha 42 do original) ─────────────────────────────────
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

// ── Mapeamento de categoria (Linha 68 do original) ───────────────────────────
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

// ── Handler de Detalhamento ───────────────────────────────────────────────────
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const empresaNome = searchParams.get("empresa");
  const ano = parseInt(searchParams.get("ano") || new Date().getFullYear());
  const mesSolicitado = parseInt(searchParams.get("mes"));
  const grupoSolicitado = searchParams.get("grupo"); // Ex: "(-) DESPESAS ADMINISTRATIVAS"

  if (!empresaNome || !mesSolicitado || !grupoSolicitado) {
    return NextResponse.json({ error: "Parâmetros ausentes" }, { status: 400 });
  }

  const empresa = EMPRESAS.find(
    (e) => e.nome.toLowerCase() === (empresaNome || "").toLowerCase()
  );
  if (!empresa) return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });

  const apiKey = process.env[empresa.apiKeyEnv];
  if (!apiKey) return NextResponse.json({ error: "API key não configurada" }, { status: 500 });

  const { data: planoContas, error: planoError } = await supabase
    .from("plano_contas_dfc")
    .select("codigo_9_digitos, categoria_nibo, grupo_dfc");

  if (planoError) return NextResponse.json({ error: "Erro Supabase" }, { status: 500 });

  const [receipts, payments, creditSch, debitSch] = await Promise.all([
    fetchMonth(apiKey, "receipts", mesSolicitado, ano, "&$expand=category"),
    fetchMonth(apiKey, "payments", mesSolicitado, ano, "&$expand=category"),
    fetchSchedules(apiKey, "credit", mesSolicitado, ano),
    fetchSchedules(apiKey, "debit", mesSolicitado, ano),
  ]);

  const creditMap = buildScheduleMap(creditSch);
  const debitMap = buildScheduleMap(debitSch);
  
  const detalhamento = [];

  // Processamento fiel à lógica das linhas 106-142 do original
  // Receipts
  for (const item of receipts) {
    if (item.isTransfer) continue;
    const catNome = item.category?.name || "";
    const sid = item.scheduleId;
    const sch = sid ? creditMap[sid] : null;

    if (sch) {
      for (const entry of sch) {
        if (mapearCategoria(entry.nome, planoContas) === grupoSolicitado) {
          const sinal = entry.tipo === "out" ? -1 : 1;
          detalhamento.push({
            data: item.date,
            nome: item.description || "Lançamento NIBO",
            descricao: entry.nome,
            categoria: entry.nome,
            centro_costo: item.costCenter?.name || "-",
            valor: entry.valor * sinal
          });
        }
      }
    } else {
      if (mapearCategoria(catNome, planoContas) === grupoSolicitado) {
        detalhamento.push({
          data: item.date,
          nome: item.description || "Lançamento NIBO",
          descricao: "Lançamento direto",
          categoria: catNome,
          centro_costo: item.costCenter?.name || "-",
          valor: parseFloat(item.value || 0)
        });
      }
    }
  }

  // Payments
  for (const item of payments) {
    if (item.isTransfer) continue;
    const catNome = item.category?.name || "";
    const sid = item.scheduleId;
    const sch = sid ? debitMap[sid] : null;

    if (sch) {
      for (const entry of sch) {
        if (mapearCategoria(entry.nome, planoContas) === grupoSolicitado) {
          detalhamento.push({
            data: item.date,
            nome: item.description || "Lançamento NIBO",
            descricao: entry.nome,
            categoria: entry.nome,
            centro_costo: item.costCenter?.name || "-",
            valor: entry.valor * -1
          });
        }
      }
    } else {
      if (mapearCategoria(catNome, planoContas) === grupoSolicitado) {
        detalhamento.push({
          data: item.date,
          nome: item.description || "Lançamento NIBO",
          descricao: "Lançamento direto",
          categoria: catNome,
          centro_costo: item.costCenter?.name || "-",
          valor: parseFloat(item.value || 0) * -1
        });
      }
    }
  }

  detalhamento.sort((a, b) => new Date(a.data) - new Date(b.data));
  return NextResponse.json(detalhamento);
}
