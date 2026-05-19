import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

const PUBLIC_ROUTES = ['/', '/cadastro', '/esqueci-senha'];
const ADMIN_ROUTES = ['/admin'];

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_ROUTES.includes(pathname)) {
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // IMPORTANTE: getUser() é o método mais seguro para validar o JWT no servidor
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // Se não houver usuário, volta para o login
    return NextResponse.redirect(new URL('/', request.url));
  }

  const { data: perfil } = await supabase
    .from('perfis_usuario')
    .select('perfil, ativo')
    .eq('id', user.id)
    .maybeSingle();

  // Se o perfil for ADMINISTRADOR e estiver ATIVO, ele passa sempre
  if (perfil?.perfil === 'ADMINISTRADOR' && perfil?.ativo) {
    return response;
  }

  // Se não estiver ativo ou estiver aguardando, vai para a tela de espera
  if (!perfil || perfil.perfil === 'AGUARDANDO' || !perfil.ativo) {
    if (pathname === '/aguardando') return response;
    return NextResponse.redirect(new URL('/aguardando', request.url));
  }

  if (ADMIN_ROUTES.some(route => pathname.startsWith(route)) && perfil.perfil !== 'ADMINISTRADOR') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|api/).*)'],
};
