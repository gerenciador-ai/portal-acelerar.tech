import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

/**
 * MIDDLEWARE — Função de Proxy de Sessão
 *
 * Responsabilidade ÚNICA: renovar o token de autenticação do Supabase
 * para que ele esteja sempre válido quando o browser e o servidor precisarem.
 *
 * A proteção de acesso (quem pode ver o quê) é feita no lado do cliente
 * (Dashboard, layouts dos módulos), onde o cookie é lido com segurança.
 *
 * Esta abordagem segue o padrão oficial do Supabase para Next.js 14 + Edge Runtime.
 */
export async function middleware(request) {
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
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Renova o token de sessão — NÃO bloqueia nem redireciona
  // A proteção de rotas é responsabilidade do Dashboard e dos layouts
  await supabase.auth.getUser();

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
