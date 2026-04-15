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

// ── Handler de Detalhamento ───────────────────────────────────────────────────
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const empresaNome = searchParams.get("empresa");
  const ano = parseInt(searchParams.get("ano") || new Date().getFullYear());
  const mesSolicitado = parseInt(searchParams.get("mes"));
  const grupoSolicitado = searchParams.get("grupo"); // Chave técnica (ex: "custos_operacionais")

  if (!empresaNome || !mesSolicitado || !grupoSolicitado) {
    return NextResponse.json({ error: "Parâmetros ausentes" }, { status: 400 });
  }

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

  // ── Processar estritamente o mês e o grupo solicitados ─────────────────────
  const [receipts, payments, creditSch, debitSch] = await Promise.all([
    fetchMonth(apiKey, "receipts", mesSolicitado, ano, "&$expand=category"),
    fetchMonth(apiKey, "payments", mesSolicitado, ano, "&$expand=category"),
    fetchSchedules(apiKey, "credit", mesSolicitado, ano),
    fetchSchedules(apiKey, "debit", mesSolicitado, ano),
  ]);

  const creditMap = buildScheduleMap(creditSch);
  const debitMap = buildScheduleMap(debitSch);
  
  const detalhamento = [];

  // Receipts (entradas)
  for (const item of receipts) {
    if (item.isTransfer) continue;
    const catNome = item.category?.name || "";
    const sid = item.scheduleId;
    const sch = sid ? creditMap[sid] : null;

    if (sch) {
      for (const entry of sch) {
        const grupo = mapearCategoria(entry.nome, planoContas);
        // Verificação do grupo (conforme mapeamento original)
        let match = false;
        if (grupoSolicitado === 'receitas_operacionais' && grupo === 'RECEITAS OPERACIONAIS') match = true;
        if (grupoSolicitado === 'impostos_vendas' && grupo === 'IMPOSTOS SOBRE VENDAS') match = true;
        if (grupoSolicitado === 'custos_operacionais' && grupo === 'CUSTOS OPERACIONAIS') match = true;
        if (grupoSolicitado === 'despesas_adm' && grupo === 'DESPESAS ADMINISTRATIVAS') match = true;
        if (grupoSolicitado === 'despesas_comerciais' && grupo === 'DESPESAS COMERCIAIS') match = true;
        if (grupoSolicitado === 'fci' && grupo === 'FCI') match = true;
        if (grupoSolicitado === 'fcf' && grupo === 'FCF') match = true;
        if (grupoSolicitado === 'despesas_financeiras' && grupo === 'DESPESAS FINANCEIRAS') match = true;
        if (grupoSolicitado === 'outros' && grupo === 'OUTROS / NÃO CLASSIFICADOS') match = true;

        if (match) {
          const sinal = entry.tipo === "out" ? -1 : 1;
          detalhamento.push({
            data: item.date,
            nome: item.description || "Lançamento NIBO",
            descricao: entry.nome || "Sub-categoria",
            categoria: entry.nome || "Sem categoria",
            centro_costo: item.costCenter?.name || "-",
            valor: entry.valor * sinal
          });
        }
      }
    } else {
      if (!catNome) continue;
      const grupo = mapearCategoria(catNome, planoContas);
      let match = false;
      if (grupoSolicitado === 'receitas_operacionais' && grupo === 'RECEITAS OPERACIONAIS') match = true;
      if (grupoSolicitado === 'impostos_vendas' && grupo === 'IMPOSTOS SOBRE VENDAS') match = true;
      if (grupoSolicitado === 'custos_operacionais' && grupo === 'CUSTOS OPERACIONAIS') match = true;
      if (grupoSolicitado === 'despesas_adm' && grupo === 'DESPESAS ADMINISTRATIVAS') match = true;
      if (grupoSolicitado === 'despesas_comerciais' && grupo === 'DESPESAS COMERCIAIS') match = true;
      if (grupoSolicitado === 'fci' && grupo === 'FCI') match = true;
      if (grupoSolicitado === 'fcf' && grupo === 'FCF') match = true;
      if (grupoSolicitado === 'despesas_financeiras' && grupo === 'DESPESAS FINANCEIRAS') match = true;
      if (grupoSolicitado === 'outros' && grupo === 'OUTROS / NÃO CLASSIFICADOS') match = true;

      if (match) {
        detalhamento.push({
          data: item.date,
          nome: item.description || "Lançamento NIBO",
          descricao: "Lançamento direto",
          categoria: catNome || "Sem categoria",
          centro_costo: item.costCenter?.name || "-",
          valor: parseFloat(item.value || 0)
        });
      }
    }
  }

  // Payments (saídas)
  for (const item of payments) {
    if (item.isTransfer) continue;
    const catNome = item.category?.name || "";
    const sid = item.scheduleId;
    const sch = sid ? debitMap[sid] : null;

    if (sch) {
      for (const entry of sch) {
        const grupo = mapearCategoria(entry.nome, planoContas);
        let match = false;
        if (grupoSolicitado === 'receitas_operacionais' && grupo === 'RECEITAS OPERACIONAIS') match = true;
        if (grupoSolicitado === 'impostos_vendas' && grupo === 'IMPOSTOS SOBRE VENDAS') match = true;
        if (grupoSolicitado === 'custos_operacionais' && grupo === 'CUSTOS OPERACIONAIS') match = true;
        if (grupoSolicitado === 'despesas_adm' && grupo === 'DESPESAS ADMINISTRATIVAS') match = true;
        if (grupoSolicitado === 'despesas_comerciais' && grupo === 'DESPESAS COMERCIAIS') match = true;
        if (grupoSolicitado === 'fci' && grupo === 'FCI') match = true;
        if (grupoSolicitado === 'fcf' && grupo === 'FCF') match = true;
        if (grupoSolicitado === 'despesas_financeiras' && grupo === 'DESPESAS FINANCEIRAS') match = true;
        if (grupoSolicitado === 'outros' && grupo === 'OUTROS / NÃO CLASSIFICADOS') match = true;

        if (match) {
          detalhamento.push({
            data: item.date,
            nome: item.description || "Lançamento NIBO",
            descricao: entry.nome || "Sub-categoria",
            categoria: entry.nome || "Sem categoria",
            centro_costo: item.costCenter?.name || "-",
            valor: entry.valor * -1
          });
        }
      }
    } else {
      if (!catNome) continue;
      const grupo = mapearCategoria(catNome, planoContas);
      let match = false;
      if (grupoSolicitado === 'receitas_operacionais' && grupo === 'RECEITAS OPERACIONAIS') match = true;
      if (grupoSolicitado === 'impostos_vendas' && grupo === 'IMPOSTOS SOBRE VENDAS') match = true;
      if (grupoSolicitado === 'custos_operacionais' && grupo === 'CUSTOS OPERACIONAIS') match = true;
      if (grupoSolicitado === 'despesas_adm' && grupo === 'DESPESAS ADMINISTRATIVAS') match = true;
      if (grupoSolicitado === 'despesas_comerciais' && grupo === 'DESPESAS COMERCIAIS') match = true;
      if (grupoSolicitado === 'fci' && grupo === 'FCI') match = true;
      if (grupoSolicitado === 'fcf' && grupo === 'FCF') match = true;
      if (grupoSolicitado === 'despesas_financeiras' && grupo === 'DESPESAS FINANCEIRAS') match = true;
      if (grupoSolicitado === 'outros' && grupo === 'OUTROS / NÃO CLASSIFICADOS') match = true;

      if (match) {
        detalhamento.push({
          data: item.date,
          nome: item.description || "Lançamento NIBO",
          descricao: "Lançamento direto",
          categoria: catNome || "Sem categoria",
          centro_costo: item.costCenter?.name || "-",
          valor: parseFloat(item.value || 0) * -1
        });
      }
    }
  }

  detalhamento.sort((a, b) => new Date(a.data) - new Date(b.data));
  return NextResponse.json(detalhamento);
}
