// Arquivo: src/app/financeiro/page.js
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Esta página serve apenas para redirecionar para o primeiro relatório padrão (DFC).
export default function FinanceiroRootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/financeiro/dfc');
  }, [router]);

  // Renderiza uma tela de carregamento enquanto o redirecionamento acontece.
  return (
    <div className="flex items-center justify-center h-full">
      <p className="text-white/70">Carregando módulo financeiro...</p>
    </div>
  );
}
