"use client";
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';

function NavLink({ href, children }) {
    const pathname = usePathname();
    const isActive = pathname === href;
    return (
        <a href={href} className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${isActive ? 'bg-acelerar-light-blue text-acelerar-dark-blue' : 'text-white hover:bg-white/10'}`}>
            {children}
        </a>
    );
}

export default function ComercialLayout({ children }) {
    const router = useRouter();
    return (
        <div className="min-h-screen w-full bg-acelerar-dark-blue text-white flex">
            {/* Sidebar (Menu Lateral) - Fixo por enquanto */}
            <aside className="w-64 bg-black/20 p-4 flex-shrink-0">
                <div className="flex items-center gap-2 mb-6">
                    <Image src="/logo_acelerar_sidebar.png" alt="Logo Acelerar" width={40} height={40} />
                    <h2 className="font-bold text-lg">Comercial</h2>
                </div>
                <nav className="flex flex-col gap-2">
                    <h3 className="text-xs uppercase text-white/50 font-bold tracking-wider">Paineis</h3>
                    <NavLink href="/comercial/resultados">📊 Resultados</NavLink>
                    <NavLink href="/comercial/desempenho">🏆 Desempenho</NavLink>
                    <NavLink href="/comercial/inadimplencia">📋 Inadimplência</NavLink>
                </nav>
                <div className="mt-auto pt-4 border-t border-white/10">
                     <button onClick={() => router.push('/dashboard')} className="w-full text-left text-sm text-white/70 hover:text-white transition-colors">&larr; Voltar ao Hub</button>
                </div>
            </aside>

            {/* Conteúdo Principal da Página */}
            <main className="flex-1 overflow-y-auto">
                {children}
            </main>
        </div>
    );
}
