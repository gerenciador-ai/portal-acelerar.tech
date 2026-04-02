"use client";
import Image from 'next/image';
import { useComercial } from '../layout';
import MvpCards from './MvpCards';
import RankingCharts from './RankingCharts';
import SdrFunnelChart from './SdrFunnelChart';
import AuditTable from './AuditTable';
import StackedAuditChart from './StackedAuditChart';

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
                <StackedAuditChart deals={vendas} />

                {/* Componente de Auditoria agora recebe os dois conjuntos de dados */}
                <AuditTable dealsGanhos={vendas} dealsGerados={filteredDeals} />
            </div>
        </>
    );
}
