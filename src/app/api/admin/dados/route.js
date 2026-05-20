import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ============================================================
// GET — Retorna os dados estáticos para o painel admin:
//       módulos disponíveis, empresas disponíveis e setores
// ============================================================
export async function GET() {
  try {
    const [modulosRes, empresasRes, setoresRes] = await Promise.all([
      supabase
        .from("modulos_disponiveis")
        .select("id, modulo, tela, label")
        .order("modulo")
        .order("tela"),
      supabase
        .from("empresas_disponiveis")
        .select("id, nome, slug")
        .order("nome"),
      supabase
        .from("setores")
        .select("id, nome")
        .order("nome"),
    ]);

    if (modulosRes.error) throw modulosRes.error;
    if (empresasRes.error) throw empresasRes.error;
    if (setoresRes.error) throw setoresRes.error;

    return NextResponse.json({
      modulos: modulosRes.data,
      empresas: empresasRes.data,
      setores: setoresRes.data,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
