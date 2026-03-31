"use client";
import { useSession, signIn, signOut } from "next-auth/react";
import Image from "next/image";

export default function Home() {
  const { data: session } = useSession();

  if (session) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-100">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">Bem-vindo, {session.user?.name}</h1>
          <p className="text-lg text-gray-600 mb-8">Você está logado como {session.user?.email}</p>
          <div className="flex flex-col items-center gap-4">
            <button className="w-64 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors">
              Acessar Comercial
            </button>
            <button className="w-64 bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition-colors">
              Acessar Financeiro
            </button>
            <button className="w-64 bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded transition-colors">
              Acessar Gente & Gestão
            </button>
          </div>
          <button onClick={() => signOut()} className="mt-12 bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-colors">
            Sair
          </button>
        </div>
      </main>
    );
  }

  return (
    <main 
      className="flex min-h-screen items-center justify-center bg-cover bg-center"
      style={{ backgroundImage: "url('/logo_acelerar_login.PNG')" }}
    >
      <div className="bg-white bg-opacity-80 p-10 rounded-lg shadow-2xl text-center">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">Portal Acelerar</h1>
        <button onClick={() => signIn("google")} className="bg-blue-600 hover:bg-blue-800 text-white font-bold py-3 px-6 rounded-lg text-lg transition-colors">
          Entrar com Google
        </button>
      </div>
    </main>
  );
}
