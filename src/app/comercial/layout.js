"use client";
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';

function NavLink({ href, children }) {
    const pathname = usePathname();
    const isActive = pathname.startsWith(href);
    return (
        <a href={href} className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${isActive ? 'bg-acelerar-light-blue text-acelerar-dark-blue' : 'text-white hover:bg-white/10'}`}>
            {children}
        </a>
    );
}

export default function ComercialLayout({ children }) {
    const router = useRouter();
    return (
        <div className="min-h-screen w-full bg-acelerar-dark-blue text-white flex flex-col">
            {/* Cabeçalho Fixo no Topo */}
            <header className="bg-black/20 px-4 py-2 flex justify-between items-center shadow-lg shrink-0 relative h-14"> {/* Aumenta um pouco a altura base e torna relativo */}
                <div className="flex items-center gap-4">
                    {/* LOGO CORRIGIDO: Posicionamento absoluto para "vazar" da barra */}
                    <div className="flex items-center gap-4">
                         <Image src="/logo_acelerar_sidebar.png" alt="Logo Acelerar" width={120} height={120} className="drop-shadow-lg" />
                    </div>
                    <h1 className="text-xl font-bold text-acelerar-light-blue ml-20">Comercial</h1> {/* Adiciona margem para não ficar atrás do logo */}
                </div>
                <nav className="flex items-center gap-2">
                    <NavLink href="/comercial/resultados">📊 Resultados</NavLink>
                    <NavLink href="/comercial/desempenho">🏆 Desempenho</NavLink>
                    <NavLink href="/comercial/inadimplencia">📋 Inadimplência</NavLink>
                </nav>
                <div>
                    <button onClick={() => router.push('/dashboard')} className="text-sm text-white/70 hover:text-white transition-colors mr-4">&larr; Voltar ao Hub</button>
                </div>
            </header>

            {/* Conteúdo Principal (que será o children) */}
            <main className="flex-1 overflow-y-auto">
                {children}
            </main>
        </div>
    );
}
