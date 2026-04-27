import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    const body = await request.json();
    const { empresa, ano, tipo, nome, dados, premissas, headcounts } = body;

    // 1. Criar nova versão
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

    // 2. Buscar Plano de Contas para mapeamento (Otimizado: uma única chamada)
    const { data: plano } = await supabase.from("plano_contas_dre").select("codigo_9_digitos, categoria_nibo, grupo_dre");
    const planoMap = {};
    plano.forEach(p => {
      const key = p.codigo_9_digitos || p.categoria_nibo;
      planoMap[key] = p.grupo_dre;
    });

    // 3. Salvar Premissas
    if (premissas && premissas.length > 0) {
      const premissasParaSalvar = premissas.map(p => ({
        versao_id: versaoId,
        tipo_premissa: p.tipo,
        grupo_dre: p.grupo,
        percentual: p.percentual,
        mes_inicio: p.mes_inicio
      }));
      await supabase.from("fpa_premissas").insert(premissasParaSalvar);
    }

    // 4. Preparar registros em lote (Bulk Insert)
    const registrosParaSalvar = [];
    const chaves = Object.keys(dados);

    for (let mes = 1; mes <= 12; mes++) {
      for (const key of chaves) {
        const grupo = planoMap[key] || "OUTROS";
        let valorBase = parseFloat(dados[key][mes - 1] || 0);
        if (valorBase === 0) continue; // Pula valores zerados para economizar espaço

        let valorFinal = valorBase;

        // Aplicação básica de premissas (Inflação/Reajuste)
        const premissaAtiva = premissas?.find(p => 
          p.grupo === grupo && mes >= p.mes_inicio && 
          ['INFLACAO', 'DISSIDIO', 'REAJUSTE_EXPONTANEO'].includes(p.tipo_premissa)
        );
        if (premissaAtiva) {
          valorFinal = valorFinal * (1 + (parseFloat(premissaAtiva.percentual) / 100));
        }

        registrosParaSalvar.push({
          versao_id: versaoId,
          empresa_nome: empresa,
          grupo_dre: grupo,
          codigo_9_digitos: key.length === 9 && /^\d+$/.test(key) ? key : null,
          categoria_nibo: key.length !== 9 || !/^\d+$/.test(key) ? key : null,
          mes: mes,
          valor_base: valorBase,
          valor_projetado: valorFinal
        });
      }
    }

    // Inserção em lotes de 500 para evitar limites do Supabase/Postgres
    for (let i = 0; i < registrosParaSalvar.length; i += 500) {
      const batch = registrosParaSalvar.slice(i, i + 500);
      const { error: dError } = await supabase.from("fpa_orcamento_base").insert(batch);
      if (dError) throw dError;
    }

    return NextResponse.json({ success: true, versaoId });

  } catch (error) {
    console.error("Erro na API de Orçamento:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
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
      .select(`*, fpa_orcamento_base (*), fpa_premissas (*)`)
      .eq("empresa_nome", empresa)
      .eq("ano", ano)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
