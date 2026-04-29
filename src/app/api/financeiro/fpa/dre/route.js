import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ─── MAPA CANÔNICO DE EMPRESAS ────────────────────────────────────────────────
// Converte o id interno do frontend (ex: 'victec') para o nome oficial salvo no banco (ex: 'Victec')
const EMPRESAS_CANONICAS = {
  'victec':   'Victec',
  'vmctech':  'VMC Tech',
  'grt':      'GRT',
  'bllog':    'Bllog',
  'm3':       'M3',
  'acelerar': 'Acelerar',
  'blive':    'bLive',
  'condway':  'Condway',
  'isket':    'Isket'
};

function resolverNomeCanônico(empresaId) {
  const id = (empresaId || '').toLowerCase().trim();
  return EMPRESAS_CANONICAS[id] || empresaId;
}
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const empresa = searchParams.get("empresa"); // 'consolidado' ou id da empresa (ex: 'victec')
    const ano = parseInt(searchParams.get("ano"));
    const versaoId = searchParams.get("versaoId");
    const mode = searchParams.get("mode");

    // ── MODE: VERSOES — retorna as versões disponíveis para o seletor ──────────
    if (mode === "versoes") {
      const { data, error } = await supabase
        .from("fpa_versoes")
        .select("id, empresa_nome, tipo, nome_identificador, is_final, created_at")
        .eq("ano", ano)
        .order("is_final", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return NextResponse.json(data || []);
    }

    // ── MODE: PLANO — retorna o plano de contas DRE para o drill-down ─────────
    if (mode === "plano") {
      const { data, error } = await supabase
        .from("plano_contas_dre")
        .select("codigo_9_digitos, categoria_nibo, grupo_dre, descricao_orcamento")
        .not("descricao_orcamento", "is", null)
        .order("grupo_dre", { ascending: true });
      if (error) throw error;
      return NextResponse.json(data || []);
    }

    // ── MODE: DRE — retorna orçamento + premissas para o cálculo ──────────────
    const isConsolidado = empresa === 'consolidado';

    // 1. Busca premissas do ano (todas as empresas no consolidado, só a empresa selecionada no individual)
    let premissasQuery = supabase.from("fpa_premissas").select("*").eq("ano", ano);
    if (!isConsolidado) premissasQuery = premissasQuery.eq("empresa", empresa);
    const { data: premissas, error: preError } = await premissasQuery;
    if (preError) throw preError;

    // 2. Determina quais versões usar
    let idsVersao = [];

    if (versaoId && versaoId !== 'null' && versaoId !== 'undefined') {
      // Versão específica selecionada pelo usuário
      idsVersao = [parseInt(versaoId)];
    } else {
      // Busca a versão mais recente (priorizando is_final) para cada empresa
      const { data: versoes, error: vError } = await supabase
        .from("fpa_versoes")
        .select("id, empresa_nome, is_final, created_at")
        .eq("ano", ano)
        .order("is_final", { ascending: false })
        .order("created_at", { ascending: false });

      if (vError) throw vError;

      if (versoes && versoes.length > 0) {
        if (isConsolidado) {
          // Para o consolidado: pega a melhor versão de cada empresa
          const melhorPorEmpresa = {};
          versoes.forEach(v => {
            if (!melhorPorEmpresa[v.empresa_nome]) {
              melhorPorEmpresa[v.empresa_nome] = v.id;
            }
          });
          idsVersao = Object.values(melhorPorEmpresa);
        } else {
          // Para empresa individual: normaliza o nome e busca a versão correspondente
          const nomeCanônico = resolverNomeCanônico(empresa);
          const versaoEmpresa = versoes.find(v =>
            v.empresa_nome === nomeCanônico ||
            v.empresa_nome.toLowerCase() === empresa.toLowerCase()
          );
          if (versaoEmpresa) idsVersao = [versaoEmpresa.id];
        }
      }
    }

    // 3. Busca os dados de orçamento
    let orcamento = [];
    if (idsVersao.length > 0) {
      const { data: orcData, error: orcError } = await supabase
        .from("fpa_orcamento_base")
        .select("versao_id, empresa_nome, grupo_dre, codigo_9_digitos, categoria_nibo, mes, valor_base")
        .in("versao_id", idsVersao);
      if (orcError) throw orcError;
      orcamento = orcData || [];
    }

    return NextResponse.json({
      orcamento,
      premissas: premissas || []
    });

  } catch (error) {
    console.error("Erro na API de DRE:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ── PATCH: Oficializar uma versão de orçamento ────────────────────────────────
export async function PATCH(request) {
  try {
    const { versaoId, isFinal } = await request.json();

    // Busca dados da versão para saber empresa e ano
    const { data: v, error: vErr } = await supabase
      .from("fpa_versoes")
      .select("empresa_nome, ano")
      .eq("id", versaoId)
      .single();
    if (vErr) throw vErr;

    // Se está oficializando, desmarca qualquer outra versão final da mesma empresa/ano
    if (isFinal) {
      await supabase
        .from("fpa_versoes")
        .update({ is_final: false })
        .eq("empresa_nome", v.empresa_nome)
        .eq("ano", v.ano);
    }

    const { error } = await supabase
      .from("fpa_versoes")
      .update({ is_final: isFinal })
      .eq("id", versaoId);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
