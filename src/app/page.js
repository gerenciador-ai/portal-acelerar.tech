"use client";

import { useState } from 'react';
import Image from 'next/image';
import { createBrowserClient } from '@supabase/ssr';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  // Usando o mesmo pacote @supabase/ssr já existente no projeto
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError("Credenciais inválidas. Verifique seu e-mail e senha.");
    } else {
      window.location.href = '/dashboard';
    }
  };

  return (
    <main className="flex items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-sm p-8 space-y-6 bg-white/10 backdrop-blur-md rounded-xl shadow-lg">

        <Image
          src="/logo_acelerar_login.png"
          alt="Logo Acelerar.tech"
          width={150}
          height={150}
          className="mx-auto"
          priority
        />

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-acelerar-white">
              E-mail Profissional
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 mt-1 text-white bg-white/20 border border-white/30 rounded-md shadow-sm focus:outline-none focus:ring-acelerar-light-blue focus:border-acelerar-light-blue"
              placeholder="seu@email.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-acelerar-white">
              Senha
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 mt-1 text-white bg-white/20 border border-white/30 rounded-md shadow-sm focus:outline-none focus:ring-acelerar-light-blue focus:border-acelerar-light-blue"
              placeholder="********"
            />
          </div>

          {error && (
            <p className="text-sm text-center text-red-400">{error}</p>
          )}

          <div>
            <button
              type="submit"
              className="w-full px-4 py-2 font-bold text-acelerar-dark-blue bg-acelerar-light-blue rounded-md hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-acelerar-dark-blue focus:ring-acelerar-white"
            >
              Entrar
            </button>
          </div>
        </form>

        {/* Novos botões de acesso — adicionados abaixo do formulário existente */}
        <div className="flex flex-col gap-3 pt-2 border-t border-white/20">
          <a
            href="/esqueci-senha"
            className="w-full px-4 py-2 text-sm font-semibold text-center text-acelerar-white border border-white/30 rounded-md hover:bg-white/10 transition-colors"
          >
            Esqueci a Senha
          </a>
          <a
            href="/cadastro"
            className="w-full px-4 py-2 text-sm font-semibold text-center text-acelerar-light-blue border border-acelerar-light-blue/50 rounded-md hover:bg-acelerar-light-blue/10 transition-colors"
          >
            Primeiro Acesso
          </a>
        </div>

      </div>
    </main>
  );
}
