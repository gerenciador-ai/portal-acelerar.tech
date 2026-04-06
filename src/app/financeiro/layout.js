// Arquivo: src/app/financeiro/layout.js
"use client";

import { createContext, useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';

// 1. Criar o Contexto
export const FinanceiroContext = createContext(null);

export default function FinanceiroLayout({ children }) {
    // Hooks para gerenciar estado e parâmetros da URL
    const searchParams = useSearchParams();
    const [inadimplenciaData, setInadimplenciaData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Lendo o filtro de empresa da URL (ex: ?empresa=VMC+Tech)
    const empresaSelecionada = searchParams.get('empresa') || 'VMC Tech'; // Padrão VMC Tech

    // 2. Efeito para buscar os dados da API sempre que o filtro de empresa mudar
    useEffect(() => {
        async function fetchData() {
            if (!empresaSelecionada) return;

            setLoading(true);
            setError(null);
            try {
                const response = await fetch(`/api/nibo/inadimplencia?empresa=${empresaSelecionada}`);
                if (!response.ok) {
                    throw new Error('Falha ao buscar dados da API de inadimplência.');
                }
                const data = await response.json();
                setInadimplenciaData(data);
            } catch (err) {
                setError(err.message);
                setInadimplenciaData([]); // Limpa os dados em caso de erro
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, [empresaSelecionada]); // Dependência: refaz a busca se a empresa mudar

    // 3. Memoizar o valor do contexto para evitar re-renderizações desnecessárias
    const contextValue = useMemo(() => ({
        inadimplenciaData,
        loading,
        error,
        empresaSelecionada,
    }), [inadimplenciaData, loading, error, empresaSelecionada]);

    return (
        // 4. Prover o contexto para os componentes filhos
        <FinanceiroContext.Provider value={contextValue}>
            <main className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
                {/* Adicionar aqui futuramente: Header com filtros (Empresa, Ano, Mês) */}
                <div className="mb-4">
                    <h1 className="text-2xl font-bold text-acelerar-dark-blue">Módulo Financeiro</h1>
                    <p className="text-gray-600">Análise de inadimplência para: <strong>{empresaSelecionada}</strong></p>
                </div>
                {children}
            </main>
        </FinanceiroContext.Provider>
    );
}
