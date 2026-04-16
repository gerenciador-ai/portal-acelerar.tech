import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const NIBO_BASE = "https://api.nibo.com.br/empresas/v1";

async function fetchMonth(apiKey, endpoint, mes, ano, extra = "") {
  const start = `${ano}-${String(mes).padStart(2, "0")}-01`;
  const daysInMonth = new Date(ano, mes, 0).getDate();
  const end = `${ano}-${String(mes).padStart(2, "0")}-${daysInMonth}`;
  // Usando apitoken conforme o seu route.js original (pasted_content_56.txt)
  const url = `${NIBO_BASE}/${endpoint}?apitoken=${apiKey}&$filter=date ge ${start} and date le ${end}&$top=50${extra}`;
  const res = await fetch(url);
  if (!res.ok) return { status: res.status, error: "Erro na chamada NIBO" };
  const data = await res.json();
  return data.items || [];
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

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const empresaNome = searchParams.get("empresa") || "Victec";
  const apiKey = empresaNome === 'Victec' ? process.env.NIBO_API_KEY_VICTEC : process.env.NIBO_API_KEY_VMCTECH;

  // Carregar plano de contas
  const { data: planoContas } = await supabase
    .from("plano_contas_dfc")
    .select("codigo_9_digitos, categoria_nibo, grupo_dfc");

  // Buscar apenas os pagamentos de Fevereiro para diagnóstico
  const payments = await fetchMonth(apiKey, "payments", 2, 2026, "&$expand=category");

  if (payments.error) {
    return NextResponse.json({ error: payments.error, status: payments.status });
  }

  // Analisar os primeiros 10 pagamentos para ver como estão sendo mapeados
  const amostra = payments.slice(0, 10).map(p => ({
    data: p.date,
    descricao: p.description,
    categoria_nibo_recebida: p.category?.name || "SEM CATEGORIA",
    grupo_mapeado: mapearCategoria(p.category?.name, planoContas),
    valor: p.value
  }));

  return NextResponse.json({
    diagnostico: "Amostra de dados brutos - FEV/2026",
    total_pagamentos_no_mes: payments.length,
    amostra_mapeamento: amostra
  });
}
