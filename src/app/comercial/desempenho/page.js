"use client";
import Image from 'next/image';
import { useComercial } from '../layout';
import MvpCards from './MvpCards';
import RankingCharts from './RankingCharts';
import SdrFunnelChart from './SdrFunnelChart'; // 1. IMPORTA o novo componente de funil

export default function DesempenhoPage() {
    const { filteredDeals, loading, error, selectedEmpresa, logoEmpresa } = useComercial();

    if (loading) return <p className="text-center p-10">Carregando dados do Ploomes...</p>;
    if (error) return <p className="text-center p-10 text-red-400">Erro: {error.message}</p>;

    // 'vendas' é usado para MVPs e Rankings de MRR
    const vendas = filteredDeals.filter(deal => deal.status === 'Venda');

    return (
        <>
            <div className="flex items-center gap-4 mb-6">
                <Image src={logoEmpresa} alt={`Logo ${selectedEmpresa}`} width={180} height={60} style={{ objectFit: 'contain' }} />
                <h1 className="text-3xl font-bold text-white">Desempenho do Time</h1>
            </div>

            <div className="space-y-6">
                <MvpCards deals={vendas} />
                
                <RankingCharts deals={vendas} />

                {/* 2. SUBSTITUI o placeholder pelo componente real, passando TODOS os deals filtrados */}
                <SdrFunnelChart deals={filteredDeals} />

                {/* Seção 4: Tabela de Auditoria (ainda como placeholder) */}
                <div className="bg-white/5 p-4 rounded-lg border border-dashed border-white/20 min-h-[300px] flex flex-col justify-center items-center">
                    <p className="text-sm font-bold text-white/50">📋 Auditoria de Negócios Convertidos (Ganhos)</p>
                    <p className="text-xs text-white/30 mt-1">(Área Reservada)</p>
                </div>
            </div>
        </>
    );
}
