"use client";

import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useState, useEffect } from 'react'; // Importar useState e useEffect

// Componente para um Card individual
function EnvironmentCard({ title, description }) {
  return (
    <div className="bg-white/10 backdrop-blur-md p-6 rounded-xl shadow-lg hover:bg-white/20 transition-all cursor-pointer">
      <h3 className="text-xl font-bold text-acelerar-white">{title}</h3>
      <p className="mt-2 text-acelerar-white/80">{description}</p>
    </div>
  );
}

// Objeto com as informações de todos os cards possíveis
const ALL_ENVIRONMENTS = {
  COMERCIAL: {
    title: "Comercial",
    description: "Análise de vendas, funis e performance da equipe."
  },
  FINANCEIRO: {
    title: "Financeiro",
    description: "Visão consolidada das finanças e fluxo de caixa."
  },
  GENTE_E_GESTAO: {
    title: "Gente & Gestão",
    description: "Painel de indicadores e gestão de colaboradores."
  }
};

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const [userPermissions, setUserPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPermissions = async () => {
      // 1. Pega o usuário logado
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // 2. Busca as permissões para esse usuário na tabela 'permissions'
        const { data, error } = await supabase
          .from('permissions')
          .select('environment')
          .eq('user_id', user.id);

        if (error) {
          console.error("Erro ao buscar permissões:", error);
        } else {
          // 3. Armazena as permissões encontradas (ex: ['COMERCIAL'])
          setUserPermissions(data.map(p => p.environment));
        }
      }
      setLoading(false);
    };

    fetchPermissions();
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  return (
    <div className="min-h-screen w-full text-white">
      <header className="bg-black/20 px-4 py-2 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-4">
          <Image src="/logo_acelerar_sidebar.png" alt="Logo Acelerar" width={50} height={50} />
          <h1 className="text-2xl font-bold text-acelerar-light-blue">Portal Acelerar</h1>
        </div>
        <button onClick={handleLogout} className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition-colors">
          Sair
        </button>
      </header>

      <main className="p-8">
        <h2 className="text-3xl font-light mb-8">
          Seja bem-vindo(a) ao seu painel de controle.
        </h2>

        {loading ? (
          <p>Carregando permissões...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* 4. Mapeia as permissões do usuário e renderiza apenas os cards permitidos */}
            {userPermissions.map(permissionKey => {
              const env = ALL_ENVIRONMENTS[permissionKey];
              if (!env) return null;
              return <EnvironmentCard key={env.title} title={env.title} description={env.description} />;
            })}
          </div>
        )}
      </main>
    </div>
  );
}
