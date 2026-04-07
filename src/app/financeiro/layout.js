// Arquivo: src/app/financeiro/layout.js
"use client";
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';

// --- Componente para o Link do Menu Lateral ---
function NavLink({ href, children }) {
    const pathname = usePathname();
    const isActive = pathname === href;
    return (
        <a 
            href={href} 
            className={`block w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive 
                ? 'bg-acelerar-gold-light text-acelerar-dark-blue' 
                : 'text-white hover:bg-white/10'
            }`}
        >
            {children}
        </a>
    );
}

// --- O Layout Principal do Módulo Financeiro ---
export default function FinanceiroLayout({ children }) {
    const router = useRouter();

    return (
        <div className="min-h-screen w-full bg-acelerar-dark-blue text-white flex flex-col">
            {/* Cabeçalho Fixo do Portal */}
            <header className="bg-black/20 px-4 py-2 flex justify-between items-center shadow-lg shrink-0 relative h-14">
                <div className="flex items-center gap-4">
                    <Image src="/logo_acelerar_sidebar.png" alt="Logo Acelerar" width={120} height={120} />
                </div>
                <div>
                    <button onClick={() => router.push('/dashboard')} className="text-sm text-white/70 hover:text-white transition-colors mr-4">&larr; Voltar ao Hub</button>
                </div>
            </header>

            {/* Corpo do Módulo com Menu Lateral */}
            <div className="flex flex-1 overflow-hidden">
                {/* Menu Lateral Esquerdo */}
                <aside className="w-56 bg-black/20 p-4 flex-shrink-0 flex flex-col gap-2">
                    <h2 className="text-lg font-semibold text-white/90 mb-4 px-2">Relatórios</h2>
                    <NavLink href="/financeiro/dashboard">Dashboard</NavLink>
                    <NavLink href="/financeiro/bp">Balanço Patrimonial</NavLink>
                    <NavLink href="/financeiro/dre">DRE</NavLink>
                    <NavLink href="/financeiro/dfc">DFC</NavLink>
                    {/* Outros links podem ser adicionados aqui */}
                </aside>
                
                {/* Área de Conteúdo Principal */}
                <main className="flex-1 p-6 md:p-8 overflow-y-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}
