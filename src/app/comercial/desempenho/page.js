"use client";
import Image from 'next/image';
import { useComercial } from '../layout';
import MvpCards from './MvpCards'; // 1. IMPORTA o novo componente

export default function DesempenhoPage() {
    // 2. RECEBE os dados filtrados do layout pai
    const { filteredDeals, loading, error, selectedEmpresa, logoEmpresa } = useComercial();

    if (loading) return <p className="text-center p-10">Carregando dados do Ploomes...</p>;
    if (error) return <p className="text-center p-10 text-red-400">Erro: {error.message}</p>;

    // Filtra apenas os deals de 'Venda' para os cálculos de desempenho
    const vendas = filteredDeals.filter(deal => deal.status === 'Venda');

    return (
        <>
            <div className="flex items-center gap-4 mb-6">
                <Image src={logoEmpresa} alt={`Logo ${selectedEmpresa}`} width={180} height={60} style={{ objectFit: 'contain' }} />
                <h1 className="text-3xl font-bold text-white">Desempenho do Time</h1>
            </div>

            <div className="space-y-6">
                {/* 3. SUBSTITUI o placeholder pelo componente real, passando os dados de vendas */}
                <MvpCards deals={vendas} />

                {/* Seção 2: Gráficos de Ranking (ainda como placeholder) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white/5 p-4 rounded-lg border border-dashed border-white/20 min-h-[200px] flex flex-col justify-center items-center">
                        <p className="text-sm font-bold text-white/50">📊 Ranking de Vendedores (MRR)</p>
                        <p className="text-xs text-white/30 mt-1">(Área Reservada)</p>
                    </div>
                    <div className="bg-white/5 p-4 rounded-lg border border-dashed border-white/20 min-h-[200px] flex flex-col justify-center items-center">
                        <p className="text-sm font-bold text-white/50">📊 Ranking de SDRs (MRR - Top 5)</p>
                        <p className="text-xs text-white/30 mt-1">(Área Reservada)</p>
                    </div>
                </div>

                {/* Seção 3: Funil de SDRs (ainda como placeholder) */}
                <div className="bg-white/5 p-4 rounded-lg border border-dashed border-white/20 min-h-[250px] flex flex-col justify-center items-center">
                    <p className="text-sm font-bold text-white/50">🚀 Funil de SDRs (Novos Negócios)</p>
                    <p className="text-xs text-white/30 mt-1">(Área Reservada)</p>
                </div>

                {/* Seção 4: Tabela de Auditoria (ainda como placeholder) */}
                <div className="bg-white/5 p-4 rounded-lg border border-dashed border-white/20 min-h-[300px] flex flex-col justify-center items-center">
                    <p className="text-sm font-bold text-white/50">📋 Auditoria de Negócios Convertidos (Ganhos)</p>
                    <p className="text-xs text-white/30 mt-1">(Área Reservada)</p>
                </div>
            </div>
        </>
    );
}
