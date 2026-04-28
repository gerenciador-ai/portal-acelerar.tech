import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const NIBO_BASE = "https://api.nibo.com.br/empresas/v1";

const EMPRESAS = [
  { nome: "Victec",   apiKeyEnv: "NIBO_API_KEY_VICTEC" },
  { nome: "VMC Tech", apiKeyEnv: "NIBO_API_KEY_VMCTECH" },
  { nome: "GRT",      apiKeyEnv: "NIBO_API_KEY_GRT" },
  { nome: "Bllog",    apiKeyEnv: "NIBO_API_KEY_BLLOG" },
  { nome: "M3",       apiKeyEnv: "NIBO_API_KEY_M3" },
  { nome: "Acelerar", apiKeyEnv: "NIBO_API_KEY_ACELERAR" },
  { nome: "bLive",    apiKeyEnv: "NIBO_API_KEY_BLIVE" },
  { nome: "Condway",  apiKeyEnv: "NIBO_API_KEY_CONDWAY" },
  { nome: "Isket",    apiKeyEnv: "NIBO_API_KEY_ISKET" }
];

// Grupo do plano de contas que representa Fluxo de Financiamento (FCF)
const GRUPO_FCF = "(+/-) FLUXO DE FINANCIAMENTO (FCF)";

async function buscarSaldoInicial(empresaNome) {
  try {
    const { data, error } = await supabase
      .from("saldos_iniciais_dfc")
      .select("saldo_inicial_2026")
      .eq("empresa_nome", empresaNome)
      .single();
    return error || !data ? 0 : parseFloat(data.saldo_inicial_2026) || 0;
  } catch { return 0; }
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

async function fetchDiario(apiKey, endpoint, start, end) {
  const url = `${NIBO_BASE}/${endpoint}?apitoken=${apiKey}&$filter=date ge ${start} and date le ${end}&$top=500&$expand=category,stakeholder`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return data.items || [];
}

async function fetchSchedulesDiario(apiKey, tipo, start, end) {
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
        .filter(c => c.categoryName && parseFloat(c.value || 0) > 0)
        .map(c => ({
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

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const empresaNome = searchParams.get("empresa");
    const ano = parseInt(searchParams.get("ano") || new Date().getFullYear());
    const mes = parseInt(searchParams.get("mes") || (new Date().getMonth() + 1));

    const empresa = EMPRESAS.find(e => e.nome.toLowerCase() === (empresaNome || "").toLowerCase());
    if (!empresa) return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });

    const apiKey = process.env[empresa.apiKeyEnv];
    if (!apiKey) return NextResponse.json({ error: "API key não configurada" }, { status: 500 });

    const daysInMonth = new Date(ano, mes, 0).getDate();
    const start = `${ano}-${String(mes).padStart(2, "0")}-01`;
    const end   = `${ano}-${String(mes).padStart(2, "0")}-${daysInMonth}`;

    const hoje = new Date();
    const mesAtual = hoje.getMonth() + 1;
    const anoAtual = hoje.getFullYear();
    const isPassado = (ano < anoAtual) || (ano === anoAtual && mes < mesAtual);

    const { data: planoContas } = await supabase
      .from("plano_contas_dfc")
      .select("codigo_9_digitos, categoria_nibo, grupo_dfc");

    const plano = planoContas || [];

    // Buscar saldo inicial do mês (saldo_inicial_2026 é o saldo de 01/01/2026)
    // Para meses subsequentes, precisamos acumular — mas a API mensal já faz isso.
    // Aqui buscamos o saldo base e informamos ao frontend para calcular em cascata.
    const saldoInicialAno = await buscarSaldoInicial(empresa.nome);

    let receipts = [];
    let payments = [];
    let creditMap = {};
    let debitMap = {};

    if (isPassado) {
      const [r, p, cs, ds] = await Promise.all([
        fetchDiario(apiKey, "receipts", start, end),
        fetchDiario(apiKey, "payments", start, end),
        fetchSchedulesDiario(apiKey, "credit", start, end),
        fetchSchedulesDiario(apiKey, "debit", start, end),
      ]);
      receipts = r;
      payments = p;
      creditMap = buildScheduleMap(cs);
      debitMap  = buildScheduleMap(ds);
    } else {
      // Mês futuro: busca schedules a vencer
      const url_c = `${NIBO_BASE}/schedules/credit?apitoken=${apiKey}&$filter=dueDate ge ${start} and dueDate le ${end}&$top=500&$expand=category,categories,stakeholder`;
      const url_d = `${NIBO_BASE}/schedules/debit?apitoken=${apiKey}&$filter=dueDate ge ${start} and dueDate le ${end}&$top=500&$expand=category,categories,stakeholder`;
      const [rc, rd] = await Promise.all([fetch(url_c), fetch(url_d)]);
      const [dc, dd] = await Promise.all([rc.json(), rd.json()]);
      receipts = (dc.items || []).map(s => ({ ...s, date: s.dueDate, isProjetado: true }));
      payments = (dd.items || []).map(s => ({ ...s, date: s.dueDate, isProjetado: true }));
    }

    // Estrutura por dia: { "2026-01-05": { aReceber, aPagar, recRecursos, envioRecurso } }
    const porDia = {};

    const garantirDia = (dia) => {
      if (!porDia[dia]) {
        porDia[dia] = { aReceber: 0, aPagar: 0, recRecursos: 0, envioRecurso: 0 };
      }
    };

    const processarReceipt = (item, catNome, valor) => {
      const dia = (item.date || "").substring(0, 10);
      if (!dia) return;
      garantirDia(dia);
      const grupo = mapearCategoria(catNome, plano);
      if (grupo === GRUPO_FCF) {
        porDia[dia].recRecursos += valor;
      } else {
        porDia[dia].aReceber += valor;
      }
    };

    const processarPayment = (item, catNome, valor) => {
      const dia = (item.date || "").substring(0, 10);
      if (!dia) return;
      garantirDia(dia);
      const grupo = mapearCategoria(catNome, plano);
      if (grupo === GRUPO_FCF) {
        porDia[dia].envioRecurso += Math.abs(valor);
      } else {
        porDia[dia].aPagar += Math.abs(valor);
      }
    };

    for (const item of receipts) {
      if (item.isTransfer) continue;
      if (item.isProjetado) {
        processarReceipt(item, item.category?.name || "", parseFloat(item.value || 0));
      } else {
        const sid = item.scheduleId;
        const sch = sid ? creditMap[sid] : null;
        if (sch) {
          for (const entry of sch) {
            processarReceipt(item, entry.nome, entry.valor * (entry.tipo === "out" ? -1 : 1));
          }
        } else {
          processarReceipt(item, item.category?.name || "", parseFloat(item.value || 0));
        }
      }
    }

    for (const item of payments) {
      if (item.isTransfer) continue;
      if (item.isProjetado) {
        processarPayment(item, item.category?.name || "", parseFloat(item.value || 0));
      } else {
        const sid = item.scheduleId;
        const sch = sid ? debitMap[sid] : null;
        if (sch) {
          for (const entry of sch) {
            processarPayment(item, entry.nome, entry.valor);
          }
        } else {
          processarPayment(item, item.category?.name || "", parseFloat(item.value || 0));
        }
      }
    }

    // Montar array de dias ordenados
    const dias = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const diaStr = `${ano}-${String(mes).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const mov = porDia[diaStr] || { aReceber: 0, aPagar: 0, recRecursos: 0, envioRecurso: 0 };
      dias.push({
        dia: diaStr,
        aReceber:     mov.aReceber,
        aPagar:       mov.aPagar,
        recRecursos:  mov.recRecursos,
        envioRecurso: mov.envioRecurso,
        captacao:     0, // campo manual — preenchido pelo frontend
      });
    }

    return NextResponse.json({
      empresa: empresa.nome,
      ano,
      mes,
      isPassado,
      saldoInicialAno,
      dias,
    });

  } catch (error) {
    console.error("Erro fatal na API DFC Diário:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
