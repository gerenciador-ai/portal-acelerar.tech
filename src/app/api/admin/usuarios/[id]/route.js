import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ============================================================
// GET — Busca o perfil completo e as permissões de um usuário
// ============================================================
export async function GET(request, { params }) {
  try {
    const { id } = params;

    // Busca o perfil do usuário
    const { data: perfil, error: perfilError } = await supabase
      .from("perfis_usuario")
      .select(`
        id,
        nome,
        cpf,
        email,
        perfil,
        ativo,
        setor_id,
        setores!perfis_usuario_setor_id_fkey ( nome )
      `)
      .eq("id", id)
      .single();

    if (perfilError) throw perfilError;

    // Busca as permissões atuais do usuário
    const { data: permissoes, error: permissoesError } = await supabase
      .from("permissoes_usuario")
      .select(`
        id,
        modulo_id,
        empresa_id,
        modulos_disponiveis ( modulo, tela, descricao ),
        empresas_disponiveis ( nome )
      `)
      .eq("usuario_id", id);

    if (permissoesError) throw permissoesError;

    return NextResponse.json({ perfil, permissoes: permissoes || [] });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
