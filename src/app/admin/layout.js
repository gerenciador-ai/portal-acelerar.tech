"use client";

import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function AdminLayout({ children }) {
  const router = useRouter();

  return (
    <div className="min-h-screen w-full bg-acelerar-dark-blue text-white flex flex-col">
      {/* Cabeçalho — mesmo padrão dos outros módulos */}
      <header className="bg-black/20 px-4 py-2 flex justify-between items-center shadow-lg shrink-0 relative h-14">
        <div className="flex items-center gap-4">
          <Image src="/logo_acelerar_sidebar.png" alt="Logo Acelerar" width={120} height={120} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/50 bg-white/10 px-2 py-1 rounded">
            Painel de Administração
          </span>
          <button
            onClick={() => router.push('/dashboard')}
            className="text-sm text-white/70 hover:text-white transition-colors ml-2"
          >
            &larr; Voltar ao Hub
          </button>
        </div>
      </header>

      {/* Corpo com Sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* Menu Lateral */}
        <aside className="w-56 bg-black/20 p-4 flex-shrink-0 flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-white/90 mb-2 px-2">Administração</h2>
          <a
            href="/admin"
            className="block w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-colors text-white/70 hover:bg-white/10 hover:text-white"
          >
            Gestão de Usuários
          </a>
        </aside>

        {/* Área de Conteúdo */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
