"use client";

import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';

// Componente para um Card individual
function EnvironmentCard({ title, description }) {
  return (
    <div className="bg-white/10 backdrop-blur-md p-6 rounded-xl shadow-lg hover:bg-white/20 transition-all cursor-pointer">
      <h3 className="text-xl font-bold text-acelerar-white">{title}</h3>
      <p className="mt-2 text-acelerar-white/80">{description}</p>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/'); // Redireciona para a página de login
    router.refresh(); // Garante que a página seja recarregada
  };

  return (
    <div className="min-h-screen w-full text-white">
      {/* Cabeçalho */}
      <header className="bg-black/20 p-4 flex justify-between items-center shadow-lg">
        <h1 className="text-2xl font-bold text-acelerar-light-blue">
          Portal Acelerar
        </h1>
        <button
          onClick={handleLogout}
          className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
        >
          Sair
        </button>
      </header>

      {/* Conteúdo Principal */}
      <main className="p-8">
        <h2 className="text-3xl font-light mb-8">
          Seja bem-vindo(a) ao seu painel de controle.
        </h2>

        {/* Grid com os cards dos ambientes */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <EnvironmentCard
            title="Comercial"
            description="Análise de vendas, funis e performance da equipe."
          />
          <EnvironmentCard
            title="Financeiro"
            description="Visão consolidada das finanças e fluxo de caixa."
          />
          <EnvironmentCard
            title="Gente & Gestão"
            description="Painel de indicadores e gestão de colaboradores."
          />
        </div>
      </main>
    </div>
  );
}
