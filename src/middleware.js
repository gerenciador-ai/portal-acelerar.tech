import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

// Rotas que não precisam de autenticação
const PUBLIC_ROUTES = ['/', '/cadastro', '/esqueci-senha', '/aguardando'];

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Deixa passar rotas públicas imediatamente
  if (PUBLIC_ROUTES.some(route => pathname === route || pathname.startsWith(route + '/'))) {
    return NextResponse.next();
  }

  // Padrão oficial do Supabase SSR 0.3 + Next.js 14:
  // O response precisa ser recriado dentro do setAll para que os cookies sejam propagados corretamente
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Passo 1: define os cookies no request (para que o servidor os leia)
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          // Passo 2: recria o response com os headers atualizados
          supabaseResponse = NextResponse.next({
            request,
          });
          // Passo 3: define os cookies no response (para que o browser os receba)
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANTE: getUser() valida o JWT contra as chaves públicas do Supabase
  // É o método mais seguro para verificar autenticação no servidor
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Se não houver usuário autenticado, redireciona para o login
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  // Busca o perfil do usuário na nossa tabela de controle de acesso
  const { data: perfil } = await supabase
    .from('perfis_usuario')
    .select('perfil, ativo')
    .eq('id', user.id)
    .maybeSingle();

  // ADMINISTRADOR com acesso ativo: passa sempre
  if (perfil?.perfil === 'ADMINISTRADOR' && perfil?.ativo === true) {
    return supabaseResponse;
  }

  // Usuário sem perfil, inativo ou aguardando: vai para a tela de espera
  if (!perfil || perfil.ativo === false || perfil.perfil === 'AGUARDANDO') {
    const url = request.nextUrl.clone();
    url.pathname = '/aguardando';
    return NextResponse.redirect(url);
  }

  // Protege a rota /admin para não-administradores
  if (pathname.startsWith('/admin') && perfil.perfil !== 'ADMINISTRADOR') {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  // Usuário com perfil válido e ativo: passa
  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Aplica o middleware em todas as rotas EXCETO:
     * - _next/static (arquivos estáticos do Next.js)
     * - _next/image (otimização de imagens)
     * - favicon.ico
     * - arquivos de imagem (svg, png, jpg, etc.)
     * - rotas de API (tratadas individualmente)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|api/).*)',
  ],
};
