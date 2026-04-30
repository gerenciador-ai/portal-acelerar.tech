import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// GET /api/financeiro/fpa/premissas?empresa=vmctech&ano=2026
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const empresa = searchParams.get('empresa');
  const ano = searchParams.get('ano');

  if (!empresa || !ano) {
    return NextResponse.json({ error: 'Parâmetros empresa e ano são obrigatórios.' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('fpa_premissas')
    .select('*')
    .eq('empresa', empresa)
    .eq('ano', parseInt(ano))
    .maybeSingle();
    if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || null);
}

// POST /api/financeiro/fpa/premissas
// Body: { empresa, ano, ...todos os campos de premissas }
export async function POST(request) {
  const body = await request.json();
  const { empresa, ano } = body;

  if (!empresa || !ano) {
    return NextResponse.json({ error: 'Parâmetros empresa e ano são obrigatórios.' }, { status: 400 });
  }

  const payload = {
    empresa,
    ano: parseInt(ano),
    inflacao_percentual:                          parseFloat(body.inflacao_percentual) || 0,
    inflacao_mes_inicio:                          parseInt(body.inflacao_mes_inicio) || 1,
    pis_percentual:                               parseFloat(body.pis_percentual) || 0,
    pis_mes_inicio:                               parseInt(body.pis_mes_inicio) || 1,
    cofins_percentual:                            parseFloat(body.cofins_percentual) || 0,
    cofins_mes_inicio:                            parseInt(body.cofins_mes_inicio) || 1,
    iss_percentual:                               parseFloat(body.iss_percentual) || 0,
    iss_mes_inicio:                               parseInt(body.iss_mes_inicio) || 1,
    ir_retido_percentual:                         parseFloat(body.ir_retido_percentual) || 0,
    ir_retido_mes_inicio:                         parseInt(body.ir_retido_mes_inicio) || 1,
    imposto_medio_percentual:                     parseFloat(body.imposto_medio_percentual) || 0,
    imposto_medio_mes_inicio:                     parseInt(body.imposto_medio_mes_inicio) || 1,
    crescimento_tipo:                             body.crescimento_tipo || 'PERCENTUAL',
    crescimento_valor:                            parseFloat(body.crescimento_valor) || 0,
    crescimento_mes_inicio:                       parseInt(body.crescimento_mes_inicio) || 1,
    dissidio_pessoal_comercial_percentual:        parseFloat(body.dissidio_pessoal_comercial_percentual) || 0,
    dissidio_pessoal_comercial_mes_inicio:        parseInt(body.dissidio_pessoal_comercial_mes_inicio) || 1,
    dissidio_pessoal_operacional_percentual:      parseFloat(body.dissidio_pessoal_operacional_percentual) || 0,
    dissidio_pessoal_operacional_mes_inicio:      parseInt(body.dissidio_pessoal_operacional_mes_inicio) || 1,
    dissidio_pessoal_administrativo_percentual:   parseFloat(body.dissidio_pessoal_administrativo_percentual) || 0,
    dissidio_pessoal_administrativo_mes_inicio:   parseInt(body.dissidio_pessoal_administrativo_mes_inicio) || 1,
    dissidio_investimento_produto_percentual:     parseFloat(body.dissidio_investimento_produto_percentual) || 0,
    dissidio_investimento_produto_mes_inicio:     parseInt(body.dissidio_investimento_produto_mes_inicio) || 1,
    headcount:                                    body.headcount || [],
    updated_at:                                   new Date().toISOString()
  };

  // UPSERT: atualiza se já existir (empresa + ano), insere se não existir
  const { data, error } = await supabase
    .from('fpa_premissas')
    .upsert(payload, { onConflict: 'empresa,ano' })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, data });
}
