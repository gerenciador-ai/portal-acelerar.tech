import Image from 'next/image';

// O Layout é um arquivo que o Next.js precisa, vamos criá-lo aqui de forma simples.
export function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}

export default function LoginPage() {
  return (
    <RootLayout>
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

          <form className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-acelerar-white">
                E-mail Profissional
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
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
                className="w-full px-3 py-2 mt-1 text-white bg-white/20 border border-white/30 rounded-md shadow-sm focus:outline-none focus:ring-acelerar-light-blue focus:border-acelerar-light-blue"
                placeholder="********"
              />
            </div>
            <div>
              <button
                type="submit"
                className="w-full px-4 py-2 font-bold text-acelerar-dark-blue bg-acelerar-light-blue rounded-md hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-acelerar-dark-blue focus:ring-acelerar-white"
              >
                Entrar
              </button>
            </div>
          </form>
        </div>
      </main>
    </RootLayout>
  );
}

export const metadata = {
    title: "Portal Acelerar",
    description: "Portal de gestão integrada do Grupo Acelerar",
};
