// Arquivo: src/app/financeiro/dfc/page.js
"use client";
import { useState } from 'react';
import Image from 'next/image';

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

// --- Página Principal do DFC ---
export default function DFCPage() {
    const [empresaAtiva, setEmpresaAtiva] = useState(null);

    const renderContent = () => {
        if (!empresaAtiva) {
            return (
                <div className="flex items-center justify-center h-96 bg-black/20 rounded-lg border border-dashed border-white/20">
                    <p className="text-white/60">Selecione uma empresa na aba acima para visualizar o DFC.</p>
                </div>
            );
        }
        return (
             <div className="flex items-center justify-center h-96 bg-black/20 rounded-lg">
                <p className="text-white">Carregando DFC para: <span className="font-bold text-acelerar-gold-light">{empresaAtiva}</span>...</p>
            </div>
        );
    };

    return (
        <div className="w-full">
            {/* Barra de Abas das Empresas */}
            <div className="flex items-center border-b border-white/10 mb-6">
                <EmpresaTab 
                    nome="Consolidado" 
                    // --- CORREÇÃO FINAL E DEFINITIVA: Caminho da imagem corrigido com o underscore. ---
                    logo="/logo_acelerar_login.png"
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

            {/* Área de Conteúdo do DFC */}
            {renderContent()}
        </div>
    );
}
