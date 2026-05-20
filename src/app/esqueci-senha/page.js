"use client";

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

export default function EsqueciSenhaPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState(null);
  const [error, setError] = useState(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const handleEsqueciSenha = async (e) => {
    e.preventDefault();
    setError(null);
    setMensagem(null);
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    });

    if (error) {
      setError("Não foi possível enviar o e-mail. Verifique o endereço informado.");
    } else {
      setMensagem("E-mail enviado! Verifique sua caixa de entrada e siga as instruções para redefinir sua senha.");
    }

    setLoading(false);
  };

  return (
    <main className="flex items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-sm p-8 space-y-6 bg-white/10 backdrop-blur-md rounded-xl shadow-lg border border-white/20">

        <div className="text-center">
          <Image
            src="/logo_acelerar_login.png"
            alt="Logo Acelerar.tech"
            width={120}
            height={120}
            className="mx-auto mb-4"
          />
          <h2 className="text-2xl font-bold text-acelerar-white">Esqueci a Senha</h2>
          <p className="text-sm text-white/60">
            Informe seu e-mail e enviaremos um link para redefinir sua senha.
          </p>
        </div>

        {!mensagem ? (
          <form onSubmit={handleEsqueciSenha} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-acelerar-white">
                E-mail Profissional
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 mt-1 text-white bg-white/10 border border-white/20 rounded-md focus:ring-acelerar-light-blue focus:border-acelerar-light-blue"
                placeholder="seu@email.com"
              />
            </div>

            {error && (
              <p className="text-sm text-center text-red-400 bg-red-400/10 py-2 rounded border border-red-400/20">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2 font-bold text-acelerar-dark-blue bg-acelerar-light-blue rounded-md hover:bg-opacity-90 transition-all disabled:opacity-50"
            >
              {loading ? "Enviando..." : "Enviar Link de Redefinição"}
            </button>
          </form>
        ) : (
          <div className="text-center space-y-4">
            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
              <p className="text-sm text-green-400">{mensagem}</p>
            </div>
          </div>
        )}

        <div className="text-center pt-2 border-t border-white/20">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="text-sm text-white/60 hover:text-white transition-colors"
          >
            &larr; Voltar para o Login
          </button>
        </div>

      </div>
    </main>
  );
}
