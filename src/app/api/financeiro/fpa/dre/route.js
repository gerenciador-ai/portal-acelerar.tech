import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const empresa = searchParams.get("empresa"); // 'consolidado' ou ID da empresa
    const ano = parseInt(searchParams.get("ano"));
    const versaoId = searchParams.get("versaoId"); // Opcional: para carregar uma versão específica

    // 1. Busca Premissas (sempre necessárias para cálculos de IR/CSLL e Crescimento)
    let premissasQuery = supabase.from("fpa_premissas").select("*").eq("ano", ano);
    if (empresa !== 'consolidado') {
      premissasQuery = premissasQuery.eq("empresa", empresa);
    }
    const { data: premissas, error: preError } = await premissasQuery;
    if (preError) throw preError;

    // 2. Busca Orçamento Base
    let orcamentoQuery = supabase.from("fpa_orcamento_base").select("*");
    
    // Se for uma versão específica, filtra por ela
    if (versaoId && versaoId !== 'null' && versaoId !== 'undefined') {
      orcamentoQuery = orcamentoQuery.eq("versao_id", versaoId);
    } else {
      // Caso contrário, busca a versão mais recente (is_final prioritária)
      const { data: versoes } = await supabase
        .from("fpa_versoes")
        .select("id, empresa_nome")
        .eq("ano", ano)
        .order("is_final", { ascending: false })
        .order("created_at", { ascending: false });

      if (versoes && versoes.length > 0) {
        const ids = empresa === 'consolidado' 
          ? versoes.map(v => v.id) 
          : versoes.filter(v => v.empresa_nome.toLowerCase() === empresa.toLowerCase()).map(v => v.id);
        
        if (ids.length > 0) {
          orcamentoQuery = orcamentoQuery.in("versao_id", ids);
        } else {
          return NextResponse.json({ data: [], premissas: premissas || [] });
        }
      } else {
        return NextResponse.json({ data: [], premissas: premissas || [] });
      }
    }

    const { data: orcamento, error: orcError } = await orcamentoQuery;
    if (orcError) throw orcError;

    // 3. Formata os dados para o frontend
    // Retornamos os dados brutos e as premissas; o frontend fará a agregação final 
    // para garantir que o Drill-down por empresa (no consolidado) seja instantâneo.
    return NextResponse.json({
      orcamento: orcamento || [],
      premissas: premissas || []
    });

  } catch (error) {
    console.error("Erro na API de DRE:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Endpoint para oficializar (travar) uma versão
export async function PATCH(request) {
  try {
    const { versaoId, isFinal } = await request.json();
    
    // Primeiro, desmarca qualquer outra versão final para aquela empresa/ano
    const { data: v } = await supabase.from("fpa_versoes").select("empresa_nome, ano").eq("id", versaoId).single();
    
    if (isFinal) {
      await supabase.from("fpa_versoes")
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
