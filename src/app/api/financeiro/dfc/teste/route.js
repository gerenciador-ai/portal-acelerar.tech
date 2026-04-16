import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const NIBO_BASE = "https://api.nibo.com.br/empresas/v1";

// ── Busca paginada mensal (Cópia exata da linha 18 do seu original) ───────────
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

// ── Mapa de schedules (Cópia exata da linha 42 do seu original) ───────────────
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

// ── Mapeamento de categoria (Cópia exata da linha 68 do seu original) ─────────
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

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const empresaNome = searchParams.get("empresa") || "Victec"; // Padrão Victec para o teste
  const ano = 2026;
  const mes = 2; // Fevereiro
  const grupoAlvo = "DESPESAS ADMINISTRATIVAS";

  const apiKey = empresaNome === 'Victec' ? process.env.NIBO_API_KEY_VICTEC : process.env.NIBO_API_KEY_VMCTECH;

  // Carregar plano de contas (Cópia exata da linha 183 do seu original)
  const { data: planoContas } = await supabase
    .from("plano_contas_dfc")
    .select("codigo_9_digitos, categoria_nibo, grupo_dfc");

  // Buscar dados (Cópia exata da linha 90 do seu original)
  const [receipts, payments, creditSch, debitSch] = await Promise.all([
    fetchMonth(apiKey, "receipts", mes, ano, "&$expand=category"),
    fetchMonth(apiKey, "payments", mes, ano, "&$expand=category"),
    fetchSchedules(apiKey, "credit", mes, ano),
    fetchSchedules(apiKey, "debit", mes, ano),
  ]);

  const creditMap = buildScheduleMap(creditSch);
  const debitMap = buildScheduleMap(debitSch);
  
  const detalhamento = [];

  // Lógica de extração fiel (baseada nas linhas 106-142 do seu original)
  payments.forEach(item => {
    if (item.isTransfer) return;
    const catNome = item.category?.name || "";
    const sid = item.scheduleId;
    const sch = sid ? debitMap[sid] : null;

    if (sch) {
      sch.forEach(entry => {
        if (mapearCategoria(entry.nome, planoContas) === grupoAlvo) {
          detalhamento.push({
            data: item.date,
            nome: item.description || "Lançamento NIBO",
            categoria_nibo: entry.nome,
            valor: entry.valor * -1
          });
        }
      });
    } else {
      if (mapearCategoria(catNome, planoContas) === grupoAlvo) {
        detalhamento.push({
          data: item.date,
          nome: item.description || "Lançamento NIBO",
          categoria_nibo: catNome,
          valor: parseFloat(item.value || 0) * -1
        });
      }
    }
  });

  return NextResponse.json({
    teste: "Extração DESPESAS ADMINISTRATIVAS - FEV/2026",
    total_encontrado: detalhamento.length,
    soma_total: detalhamento.reduce((acc, i) => acc + i.valor, 0),
    itens: detalhamento
  });
}
