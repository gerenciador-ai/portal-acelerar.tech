import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

// Rotas que NÃO precisam de autenticação (públicas)
const PUBLIC_ROUTES = ['/', '/cadastro', '/esqueci-senha'];

// Rotas exclusivas para ADMINISTRADOR
const ADMIN_ROUTES = ['/admin'];

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Deixa passar rotas públicas sem verificação
  if (PUBLIC_ROUTES.includes(pathname)) {
    return NextResponse.next();
  }

  // Cria a resposta base para poder manipular cookies
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  // Cria o cliente Supabase compatível com o middleware (SSR)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Verifica se há sessão ativa
  const { data: { user } } = await supabase.auth.getUser();

  // Se não há sessão, redireciona para o login
  if (!user) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Busca o perfil do usuário para verificar o nível de acesso
  const { data: perfil } = await supabase
    .from('perfis_usuario')
    .select('perfil, ativo')
    .eq('id', user.id)
    .maybeSingle();

  // Se o perfil não foi encontrado ou está aguardando aprovação, redireciona
  if (!perfil || perfil.perfil === 'AGUARDANDO' || !perfil.ativo) {
    // Evita loop de redirecionamento na própria tela de aguardando
    if (pathname === '/aguardando') return response;
    return NextResponse.redirect(new URL('/aguardando', request.url));
  }

  // Verifica acesso às rotas de administrador
  if (ADMIN_ROUTES.some(route => pathname.startsWith(route))) {
    if (perfil.perfil !== 'ADMINISTRADOR') {
      // Não é admin, redireciona para o dashboard
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // Tudo certo, deixa a requisição prosseguir
  return response;
}

// Configura em quais rotas o middleware será executado
// Exclui arquivos estáticos, imagens e rotas de API para não interferir
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|api/).*)',
  ],
};
