"use client";

import Image from 'next/image';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';

export default function AguardandoPage() {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <main className="flex items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-md p-10 text-center space-y-6 bg-white/10 backdrop-blur-md rounded-xl shadow-lg border border-white/20">

        <Image
          src="/logo_acelerar_login.png"
          alt="Logo Acelerar.tech"
          width={120}
          height={120}
          className="mx-auto"
        />

        <div className="space-y-3">
          <h2 className="text-2xl font-bold text-acelerar-white">
            Cadastro Recebido!
          </h2>
          <p className="text-white/70 text-sm leading-relaxed">
            Seu cadastro foi registrado com sucesso e está aguardando a definição de acesso pelo administrador.
          </p>
          <p className="text-white/50 text-xs">
            Você receberá uma notificação assim que seu acesso for liberado.
          </p>
        </div>

        <button
          onClick={handleLogout}
          className="w-full px-4 py-2 text-sm font-semibold text-white/70 border border-white/20 rounded-md hover:bg-white/10 transition-colors"
        >
          Sair
        </button>

      </div>
    </main>
  );
}
