import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ─── MAPA CANÔNICO DE EMPRESAS ────────────────────────────────────────────────
// Garante que o nome salvo no banco seja sempre o nome oficial de exibição,
// independente do id interno usado pelo frontend.
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

// Prefixos de empresa para a nomenclatura semi-automática
const EMPRESA_PREFIXO = {
  'victec':   'VICTEC',
  'vmctech':  'VMCTECH',
  'grt':      'GRT',
  'bllog':    'BLLOG',
  'm3':       'M3',
  'acelerar': 'ACELERAR',
  'blive':    'BLIVE',
  'condway':  'CONDWAY',
  'isket':    'ISKET'
};

function resolverNomeCanônico(empresaId) {
  const id = (empresaId || '').toLowerCase().trim();
  return EMPRESAS_CANONICAS[id] || empresaId;
}

function montarNomeVersao(empresaId, ano, tipo, sufixo) {
  const prefixo = EMPRESA_PREFIXO[(empresaId || '').toLowerCase().trim()] || empresaId.toUpperCase();
  const tipoStr = (tipo || 'BUDGET').toUpperCase();
  const sufixoStr = (sufixo || '').trim().toUpperCase().replace(/\s+/g, '_');
  return `${prefixo}_${ano}_${tipoStr}_${sufixoStr}`;
}
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(request) {
  try {
    const body = await request.json();
    const { empresa, ano, tipo, sufixoVersao, dados } = body;

    if (!empresa || !ano || !tipo || !sufixoVersao) {
      return NextResponse.json({ error: "Campos obrigatórios: empresa, ano, tipo, sufixoVersao" }, { status: 400 });
    }

    const nomeCanônico = resolverNomeCanônico(empresa);
    const nomeVersao = montarNomeVersao(empresa, ano, tipo, sufixoVersao);

    // ── TRAVA DE DUPLICIDADE ──────────────────────────────────────────────────
    const { data: existente, error: checkError } = await supabase
      .from("fpa_versoes")
      .select("id")
      .eq("empresa_nome", nomeCanônico)
      .eq("ano", ano)
      .eq("nome_identificador", nomeVersao)
      .maybeSingle();

    if (checkError) throw checkError;
    if (existente) {
      return NextResponse.json(
        { error: `Já existe uma versão com o nome "${nomeVersao}". Escolha um sufixo diferente.` },
        { status: 409 }
      );
    }
    // ─────────────────────────────────────────────────────────────────────────

    // 1. Cria a versão do orçamento
    const { data: versao, error: vError } = await supabase
      .from("fpa_versoes")
      .insert([{
        empresa_nome: nomeCanônico,
        ano: ano,
        tipo: tipo,
        nome_identificador: nomeVersao,
        versao_numero: Math.floor(Date.now() / 1000)
      }])
      .select()
      .single();

    if (vError) throw vError;
    const versaoId = versao.id;

    // 2. Carrega o plano de contas para mapear grupo_dre
    const { data: plano, error: pError } = await supabase
      .from("plano_contas_dre")
      .select("codigo_9_digitos, categoria_nibo, grupo_dre");
    if (pError) throw pError;

    const planoMap = {};
    plano.forEach(p => {
      const key = p.codigo_9_digitos || p.categoria_nibo;
      planoMap[key] = p.grupo_dre;
    });

    // 3. Monta os registros de orçamento linha a linha
    const registrosParaSalvar = [];
    const chaves = Object.keys(dados);

    for (let mes = 1; mes <= 12; mes++) {
      for (const key of chaves) {
        const grupo = planoMap[key] || "OUTROS";
        const valorBase = parseFloat(dados[key][mes - 1] || 0);
        if (valorBase === 0) continue;

        registrosParaSalvar.push({
          versao_id: versaoId,
          empresa_nome: nomeCanônico,
          grupo_dre: grupo,
          codigo_9_digitos: key.length === 9 && /^\d+$/.test(key) ? key : null,
          categoria_nibo: key.length !== 9 || !/^\d+$/.test(key) ? key : null,
          mes: mes,
          valor_base: valorBase,
          valor_projetado: valorBase
        });
      }
    }

    // 4. Salva em lotes de 500 registros
    for (let i = 0; i < registrosParaSalvar.length; i += 500) {
      const batch = registrosParaSalvar.slice(i, i + 500);
      const { error: dError } = await supabase.from("fpa_orcamento_base").insert(batch);
      if (dError) throw dError;
    }

    return NextResponse.json({ success: true, versaoId, nomeVersao });

  } catch (error) {
    console.error("Erro na API de Orçamento:", error);
    return NextResponse.json({ error: error.message || "Erro interno ao salvar orçamento" }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("mode");

    if (mode === "plano") {
      const { data, error } = await supabase
        .from("plano_contas_dre")
        .select("*")
        .not("descricao_orcamento", "is", null)
        .order("grupo_dre", { ascending: true });
      if (error) throw error;
      return NextResponse.json(data);
    }

    const empresa = searchParams.get("empresa");
    const ano = searchParams.get("ano");
    const nomeCanônico = resolverNomeCanônico(empresa);

    const { data, error } = await supabase
      .from("fpa_versoes")
      .select(`*, fpa_orcamento_base (*)`)
      .eq("empresa_nome", nomeCanônico)
      .eq("ano", ano)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
