import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Usa a Service Role Key para operações administrativas (acesso total ao banco)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ============================================================
// GET — Lista todos os usuários com seus perfis
// ============================================================
export async function GET() {
  try {
    const { data, error } = await supabase
      .from("perfis_usuario")
      .select(`
        id,
        nome,
        cpf,
        email,
        perfil,
        ativo,
        created_at,
        setores!perfis_usuario_setor_id_fkey ( nome )
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ usuarios: data });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ============================================================
// PUT — Atualiza o perfil e as permissões de um usuário
// Recebe: { usuario_id, perfil, ativo, setor_id, permissoes: [{ modulo_id, empresa_id }] }
// ============================================================
export async function PUT(request) {
  try {
    const body = await request.json();
    const { usuario_id, perfil, ativo, setor_id, permissoes } = body;

    if (!usuario_id) {
      return NextResponse.json({ error: "usuario_id é obrigatório" }, { status: 400 });
    }

    // 1. Atualiza o perfil do usuário
    const { error: perfilError } = await supabase
      .from("perfis_usuario")
      .update({
        perfil,
        ativo,
        setor_id: setor_id || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", usuario_id);

    if (perfilError) throw perfilError;

    // 2. Remove todas as permissões antigas do usuário
    const { error: deleteError } = await supabase
      .from("permissoes_usuario")
      .delete()
      .eq("usuario_id", usuario_id);

    if (deleteError) throw deleteError;

    // 3. Insere as novas permissões (se houver)
    if (permissoes && permissoes.length > 0) {
      const novasPermissoes = permissoes.map((p) => ({
        usuario_id,
        modulo_id: p.modulo_id,
        empresa_id: p.empresa_id,
      }));

      const { error: insertError } = await supabase
        .from("permissoes_usuario")
        .insert(novasPermissoes);

      if (insertError) throw insertError;
    }

    return NextResponse.json({ success: true, message: "Permissões atualizadas com sucesso." });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
