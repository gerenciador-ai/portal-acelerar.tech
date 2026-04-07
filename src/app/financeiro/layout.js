// Arquivo: src/app/financeiro/layout.js
"use client";
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useState, createContext, useContext } from 'react';

// --- Contexto para compartilhar filtros e estado do módulo Financeiro ---
const FinanceiroContext = createContext(null);
export const useFinanceiro = () => useContext(FinanceiroContext);

// --- Componente de Abas para Empresas ---
function EmpresaTab({ nome, logo, isActive, onClick }) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold border-b-2 transition-all ${
                isActive 
                ? 'border-acelerar-gold-light text-white' 
                : 'border-transparent text-white/60 hover:bg-white/10 hover:text-white'
            }`}
        >
            {logo && <Image src={logo} alt={`Logo ${nome}`} width={20} height={20} className="rounded-full" />}
            <span>{nome}</span>
        </button>
    );
}

// --- O Layout Principal do Módulo Financeiro ---
export default function FinanceiroLayout({ children }) {
    const router = useRouter();
    
    // Estados que serão compartilhados com todas as páginas do módulo
    const [empresaAtiva, setEmpresaAtiva] = useState('Consolidado'); // 'Consolidado', 'VMC Tech', 'Victec'
    
    const contextValue = {
        empresaAtiva,
        setEmpresaAtiva,
    };

    return (
        <FinanceiroContext.Provider value={contextValue}>
            <div className="min-h-screen w-full bg-acelerar-dark-blue text-white flex flex-col">
                {/* Cabeçalho do Módulo */}
                <header className="bg-black/20 px-4 py-2 flex justify-between items-center shadow-lg shrink-0 relative h-14">
                    <div className="flex items-center gap-4">
                        <Image src="/logo_acelerar_sidebar.png" alt="Logo Acelerar" width={120} height={120} className="drop-shadow-lg" />
                        <h1 className="text-xl font-bold text-acelerar-gold-light ml-20">Financeiro</h1>
                    </div>
                    <nav className="flex items-center gap-2">
                        {/* Links para as futuras páginas do módulo (DFC, DRE, etc.) */}
                        <a href="/financeiro/dfc" className="px-3 py-1 text-sm font-semibold rounded-md bg-acelerar-gold-light text-acelerar-dark-blue">📊 DFC</a>
                        {/* Adicionar outros links aqui no futuro */}
                    </nav>
                    <div>
                        <button onClick={() => router.push('/dashboard')} className="text-sm text-white/70 hover:text-white transition-colors mr-4">&larr; Voltar ao Hub</button>
                    </div>
                </header>

                {/* Corpo principal com Abas e Conteúdo */}
                <div className="flex flex-col flex-1 overflow-hidden">
                    {/* Barra de Abas das Empresas */}
                    <div className="flex items-center border-b border-white/10 bg-black/10">
                        <EmpresaTab 
                            nome="Consolidado" 
                            logo="/logo_acelerar_icon.png"
                            isActive={empresaAtiva === 'Consolidado'} 
                            onClick={() => setEmpresaAtiva('Consolidado')} 
                        />
                        <EmpresaTab 
                            nome="VMC Tech" 
                            logo="/logo_vmctech.png"
                            isActive={empresaAtiva === 'VMC Tech'} 
                            onClick={() => setEmpresaAtiva('VMC Tech')} 
                        />
                        <EmpresaTab 
                            nome="Victec" 
                            logo="/logo_victec.png"
                            isActive={empresaAtiva === 'Victec'} 
                            onClick={() => setEmpresaAtiva('Victec')} 
                        />
                    </div>
                    
                    {/* Conteúdo da Página Ativa */}
                    <main className="flex-1 p-6 md:p-8 overflow-y-auto">
                        {children}
                    </main>
                </div>
            </div>
        </FinanceiroContext.Provider>
    );
}
