"use client";
import Image from 'next/image';
import { useComercial } from '../layout';
import MvpCards from './MvpCards';
import RankingCharts from './RankingCharts';
import SdrFunnelChart from './SdrFunnelChart';
import AuditTable from './AuditTable';
import StackedAuditChart from './StackedAuditChart'; // 1. IMPORTA o novo componente (Opção 2)

export default function DesempenhoPage() {
    const { filteredDeals, loading, error, selectedEmpresa, logoEmpresa } = useComercial();

    if (loading) return <p className="text-center p-10">Carregando dados do Ploomes...</p>;
    if (error) return <p className="text-center p-10 text-red-400">Erro: {error.message}</p>;

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
                <SdrFunnelChart deals={vendas} />

                {/* 2. RENDERIZA A OPÇÃO 1 (Tabela Aprimorada) */}
                <AuditTable deals={vendas} />

                {/* 3. RENDERIZA A OPÇÃO 2 (Barras Empilhadas) logo abaixo */}
                <StackedAuditChart deals={vendas} />
            </div>
        </>
    );
}
