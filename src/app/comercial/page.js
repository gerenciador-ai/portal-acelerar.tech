"use client";
import { useRouter } from 'next/navigation';

export default function ComercialPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen w-full text-white p-8">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold text-acelerar-light-blue">
          Painel Comercial
        </h1>
        <button
          onClick={() => router.push('/dashboard')}
          className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
        >
          &larr; Voltar ao Dashboard
        </button>
      </header>

      <div className="bg-white/10 p-6 rounded-xl">
        <p>Em breve, os dados de vendas e funis do Ploomes serão exibidos aqui.</p>
      </div>
    </div>
  );
}
