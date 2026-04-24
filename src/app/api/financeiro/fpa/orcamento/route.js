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
        versao_numero: Math.floor(Date.now() / 1000) // Timestamp como versão simples
      }])
      .select()
      .single();

    if (vError) throw vError;

    const versaoId = versao.id;

    // 2. Salvar Premissas vinculadas a esta versão
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

    // 3. Processar e Salvar Valores (Base + Projetado)
    const registrosParaSalvar = [];

    // Itera pelos 12 meses
    for (let mes = 1; mes <= 12; mes++) {
      // Para cada grupo do DRE
      for (const grupo of Object.keys(dados)) {
        let valorBase = parseFloat(dados[grupo][mes - 1] || 0);
        let valorFinal = valorBase;

        // APLICAR PREMISSAS DE REAJUSTE (Inflação / Dissídio)
        const premissaAtiva = premissas?.find(p => 
          p.grupo === grupo && 
          mes >= p.mes_inicio && 
          (p.tipo === 'INFLACAO' || p.tipo === 'DISSIDIO' || p.tipo === 'REAJUSTE_EXPONTANEO')
        );

        if (premissaAtiva) {
          valorFinal = valorFinal * (1 + (parseFloat(premissaAtiva.percentual) / 100));
        }

        // APLICAR HEADCOUNT (Se o grupo for de PESSOAL)
        if (grupo.includes("PESSOAL") && headcounts) {
          const novasContratacoes = headcounts.filter(h => 
            h.grupo === grupo && mes >= h.mes_inicio
          );
          
          for (const h of novasContratacoes) {
            const custoTotal = parseFloat(h.salario) * parseFloat(h.fator);
            valorFinal += custoTotal;
          }
        }

        // APLICAR IMPOSTOS (Se o grupo for DEDUÇÕES E IMPOSTOS)
        if (grupo === "(-) DEDUÇÕES E IMPOSTOS") {
          const premissaImposto = premissas?.find(p => p.tipo === 'IMPOSTO');
          if (premissaImposto) {
            const receitaMes = parseFloat(dados["RECEITAS OPERACIONAIS"][mes - 1] || 0);
            valorFinal = (receitaMes * (parseFloat(premissaImposto.percentual) / 100)) * -1;
          }
        }

        registrosParaSalvar.push({
          versao_id: versaoId,
          empresa_nome: empresa,
          grupo_dre: grupo,
          mes: mes,
          valor_base: valorBase,
          valor_projetado: valorFinal
        });
      }
    }

    const { error: dError } = await supabase.from("fpa_orcamento_base").insert(registrosParaSalvar);
    if (dError) throw dError;

    return NextResponse.json({ success: true, versaoId });

  } catch (error) {
    console.error("Erro na API de Orçamento:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const empresa = searchParams.get("empresa");
  const ano = searchParams.get("ano");

  const { data, error } = await supabase
    .from("fpa_versoes")
    .select(`
      *,
      fpa_orcamento_base (*),
      fpa_premissas (*)
    `)
    .eq("empresa_nome", empresa)
    .eq("ano", ano)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
