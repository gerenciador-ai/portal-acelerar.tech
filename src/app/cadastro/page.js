"use client";

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

export default function CadastroPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    nome: '',
    cpf: '',
    email: '',
    senha: '',
    confirmarSenha: ''
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCadastro = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (formData.senha !== formData.confirmarSenha) {
      setError("As senhas não coincidem.");
      setLoading(false);
      return;
    }

    // 1. Criar o usuário no Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.senha,
      options: {
        data: {
          display_name: formData.nome,
        }
      }
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    // 2. Criar o perfil na nossa nova tabela perfis_usuario
    // Nota: O perfil nasce como 'AGUARDANDO' e 'ativo = false' por padrão no banco
    const { error: perfilError } = await supabase
      .from('perfis_usuario')
      .insert([
        {
          id: authData.user.id,
          nome: formData.nome,
          cpf: formData.cpf,
          email: formData.email,
          perfil: 'AGUARDANDO',
          ativo: false
        }
      ]);

    if (perfilError) {
      setError("Erro ao criar perfil. Por favor, contate o administrador.");
      setLoading(false);
      return;
    }

    // Sucesso! Redireciona para a tela de aguardando
    router.push('/aguardando');
  };

  return (
    <main className="flex items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-white/10 backdrop-blur-md rounded-xl shadow-lg border border-white/20">
        
        <div className="text-center">
          <Image
            src="/logo_acelerar_login.png"
            alt="Logo Acelerar.tech"
            width={120}
            height={120}
            className="mx-auto mb-4"
          />
          <h2 className="text-2xl font-bold text-acelerar-white">Primeiro Acesso</h2>
          <p className="text-sm text-white/60">Preencha seus dados para solicitar acesso ao portal.</p>
        </div>

        <form onSubmit={handleCadastro} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-acelerar-white">Nome Completo</label>
            <input
              name="nome"
              type="text"
              required
              value={formData.nome}
              onChange={handleChange}
              className="w-full px-3 py-2 mt-1 text-white bg-white/10 border border-white/20 rounded-md focus:ring-acelerar-light-blue focus:border-acelerar-light-blue"
              placeholder="Digite seu nome"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-acelerar-white">CPF</label>
            <input
              name="cpf"
              type="text"
              required
              value={formData.cpf}
              onChange={handleChange}
              className="w-full px-3 py-2 mt-1 text-white bg-white/10 border border-white/20 rounded-md focus:ring-acelerar-light-blue focus:border-acelerar-light-blue"
              placeholder="000.000.000-00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-acelerar-white">E-mail Profissional</label>
            <input
              name="email"
              type="email"
              required
              value={formData.email}
              onChange={handleChange}
              className="w-full px-3 py-2 mt-1 text-white bg-white/10 border border-white/20 rounded-md focus:ring-acelerar-light-blue focus:border-acelerar-light-blue"
              placeholder="seu@email.com"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-acelerar-white">Senha</label>
              <input
                name="senha"
                type="password"
                required
                value={formData.senha}
                onChange={handleChange}
                className="w-full px-3 py-2 mt-1 text-white bg-white/10 border border-white/20 rounded-md focus:ring-acelerar-light-blue focus:border-acelerar-light-blue"
                placeholder="********"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-acelerar-white">Confirmar Senha</label>
              <input
                name="confirmarSenha"
                type="password"
                required
                value={formData.confirmarSenha}
                onChange={handleChange}
                className="w-full px-3 py-2 mt-1 text-white bg-white/10 border border-white/20 rounded-md focus:ring-acelerar-light-blue focus:border-acelerar-light-blue"
                placeholder="********"
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-center text-red-400 bg-red-400/10 py-2 rounded border border-red-400/20">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 font-bold text-acelerar-dark-blue bg-acelerar-light-blue rounded-md hover:bg-opacity-90 transition-all disabled:opacity-50"
          >
            {loading ? "Processando..." : "Solicitar Cadastro"}
          </button>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => router.push('/')}
              className="text-sm text-white/60 hover:text-white transition-colors"
            >
              &larr; Voltar para o Login
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
