"use client";

import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { TrendingUp, ShieldCheck, Users } from 'lucide-react';

// Componente para um Card individual
function EnvironmentCard({ title, description, href, icon: Icon, backgroundImage }) {
  const router = useRouter();
  return (
    <div
      onClick={() => router.push(href)}
      className="relative group cursor-pointer overflow-hidden rounded-xl shadow-2xl transition-all duration-300 hover:shadow-2xl hover:scale-105"
    >
      <div
        className="absolute inset-0 bg-cover bg-center opacity-30 group-hover:opacity-40 transition-opacity duration-300"
        style={{
          backgroundImage: backgroundImage ? `url('${backgroundImage}')` : 'none',
          backgroundColor: 'rgba(15, 23, 42, 0.8)'
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-acelerar-dark-blue/60 via-acelerar-dark-blue/80 to-black/90" />
      <div className="absolute inset-0 border-2 border-transparent group-hover:border-acelerar-light-blue/50 transition-colors duration-300 rounded-xl" />
      <div className="relative p-8 flex flex-col justify-between h-full min-h-64 backdrop-blur-sm">
        <div className="flex items-center justify-center mb-6">
          <div className="p-4 bg-acelerar-light-blue/10 rounded-full group-hover:bg-acelerar-light-blue/20 transition-colors duration-300">
            <Icon className="w-10 h-10 text-acelerar-light-blue group-hover:text-white transition-colors duration-300" strokeWidth={2} />
          </div>
        </div>
        <div className="flex-1">
          <h3 className="text-2xl font-bold text-acelerar-white mb-3 tracking-wider uppercase">
            {title}
          </h3>
          <p className="text-acelerar-white/75 text-sm leading-relaxed group-hover:text-acelerar-white/90 transition-colors duration-300">
            {description}
          </p>
        </div>
        <div className="flex items-center justify-end mt-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <span className="text-acelerar-light-blue text-sm font-semibold tracking-widest">
            ACESSAR →
          </span>
        </div>
      </div>
    </div>
  );
}

const ALL_ENVIRONMENTS = {
  COMERCIAL: {
    title: "Comercial",
    description: "Análise de vendas, funis e performance da equipe.",
    href: "/comercial",
    icon: TrendingUp,
    backgroundImage: "/comercial-bg.webp"
  },
  FINANCEIRO: {
    title: "Financeiro",
    description: "Visão consolidada das finanças e fluxo de caixa.",
    href: "/financeiro",
    icon: ShieldCheck,
    backgroundImage: "/financeiro-bg.webp"
  },
  GENTE_E_GESTAO: {
    title: "Gente & Gestão",
    description: "Painel de indicadores e gestão de colaboradores.",
    href: "/gente-e-gestao",
    icon: Users,
    backgroundImage: "/gente-gestao-bg.webp"
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
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('permissions')
          .select('environment')
          .eq('user_id', user.id);
        if (error) {
          console.error("Erro ao buscar permissões:", error);
        } else {
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
    <div className="min-h-screen w-full text-white relative overflow-hidden bg-[#0f172a]">
      {/* Marca d'água com a logo oficial extraída do PDF */}
      <div 
        className="fixed inset-0 pointer-events-none z-0 flex items-center justify-center opacity-100"
        style={{
          backgroundImage: "url('/marca-dagua-acelerar.webp')",
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          backgroundSize: '40%', // Ajuste o tamanho conforme preferir
        }}
      />

      <header className="relative z-10 bg-black/30 backdrop-blur-md px-6 py-4 flex justify-between items-center shadow-lg border-b border-acelerar-light-blue/10">
        <div className="flex items-center gap-4">
          <Image src="/logo_acelerar_sidebar.png" alt="Logo Acelerar" width={50} height={50} />
          <h1 className="text-2xl font-bold text-acelerar-light-blue tracking-wider">Portal Acelerar</h1>
        </div>
        <button
          onClick={handleLogout}
          className="bg-red-500/80 hover:bg-red-600 text-white font-bold py-2 px-6 rounded-lg transition-all duration-300 hover:shadow-lg"
        >
          Sair
        </button>
      </header>

      <main className="relative z-10 p-8 md:p-12">
        <div className="max-w-7xl mx-auto">
          <div className="mb-12">
            <h2 className="text-4xl md:text-5xl font-light mb-2 text-acelerar-white">
              Seja bem-vindo(a) ao seu painel de controle.
            </h2>
            <div className="h-1 w-24 bg-gradient-to-r from-acelerar-light-blue to-transparent rounded-full" />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-acelerar-light-blue mb-4" />
                <p className="text-acelerar-white/70">Carregando permissões...</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {userPermissions.map(permissionKey => {
                const env = ALL_ENVIRONMENTS[permissionKey];
                if (!env) return null;
                return (
                  <EnvironmentCard
                    key={env.title}
                    title={env.title}
                    description={env.description}
                    href={env.href}
                    icon={env.icon}
                    backgroundImage={env.backgroundImage}
                  />
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
