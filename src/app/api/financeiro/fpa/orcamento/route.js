import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    const body = await request.json();
    const { empresa, ano, tipo, nome, dados } = body;

    // 1. Cria a versão do orçamento
    const { data: versao, error: vError } = await supabase
      .from("fpa_versoes")
      .insert([{
        empresa_nome: empresa,
        ano: ano,
        tipo: tipo,
        nome_identificador: nome,
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
          empresa_nome: empresa,
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

    return NextResponse.json({ success: true, versaoId });

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
    const { data, error } = await supabase
      .from("fpa_versoes")
      .select(`*, fpa_orcamento_base (*)`)
      .eq("empresa_nome", empresa)
      .eq("ano", ano)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
