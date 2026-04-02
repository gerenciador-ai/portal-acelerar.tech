"use client";

import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import ClientOnlyWrapper from '@/components/ClientOnlyWrapper';
// import { processAndFilterData } from '@/lib/dataProcessor'; // CORREÇÃO: Linha removida para evitar o erro de build.

// --- Componentes ---
import RankingCards from './RankingCards';
// import FunilSdr from './FunilSdr';
// import AuditoriaTable from './AuditoriaTable';

// Componente de Carregamento
const LoadingComponent = () => (
    <div className="text-center text-white/50 p-10">
        <div className="spinner-border animate-spin inline-block w-8 h-8 border-4 rounded-full" role="status">
            <span className="visually-hidden">.</span>
        </div>
        <p className="mt-2">Calculando dados de desempenho...</p>
    </div>
);

// Componente de Erro
const ErrorComponent = ({ message }) => (
    <div className="text-center text-red-400 bg-red-900/20 p-10 rounded-lg">
        <p className="font-bold">Erro ao carregar dados de desempenho.</p>
        <p className="text-xs mt-1">{message}</p>
    </div>
);

// Componente Principal da Página
export default function DesempenhoPage() {
    const searchParams = useSearchParams();
    const empresa = searchParams.get('empresa') || 'VMC Tech';

    const fetcher = (url) => fetch(url).then((res) => res.json());
    const { data: apiData, error } = useSWR(`/api/ploomes/deals?empresa=${empresa}`, fetcher, {
        revalidateOnFocus: false,
    });

    const filteredData = useMemo(() => {
        if (!apiData || !apiData.value) return null;
        
        // A lógica de filtro agora vive aqui.
        // Por enquanto, apenas filtra por 'Venda', como planejado para a Etapa 1.
        const vendas = apiData.value.filter(d => d.status === 'Venda');
        return vendas; 
        
    }, [apiData, searchParams]);

    if (error) return <ErrorComponent message={error.message} />;
    if (!filteredData) return <LoadingComponent />;
    if (filteredData.length === 0) {
        return <div className="text-center text-white/50 p-10">Sem dados de vendas para o período selecionado.</div>;
    }

    return (
        <ClientOnlyWrapper>
            <div className="space-y-6">
                
                <RankingCards data={filteredData} />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* ETAPA 2: Será preenchido com <FunilSdr data={filteredData} /> */}
                    <div className="p-4 bg-gray-800/20 rounded-lg border border-dashed border-gray-600">
                        <p className="text-center text-gray-400 text-sm">Área reservada para o Funil de SDRs.</p>
                    </div>
                    
                    <div className="p-4 bg-gray-800/20 rounded-lg border border-dashed border-gray-600 hidden lg:block">
                         <p className="text-center text-gray-400 text-sm">Área reservada.</p>
                    </div>
                </div>

                {/* ETAPA 3: Será preenchido com <AuditoriaTable data={filteredData} /> */}
                <div className="p-4 bg-gray-800/20 rounded-lg border border-dashed border-gray-600">
                    <p className="text-center text-gray-400 text-sm">Área reservada para a Tabela de Auditoria de Negócios Convertidos.</p>
                </div>

            </div>
        </ClientOnlyWrapper>
    );
}
