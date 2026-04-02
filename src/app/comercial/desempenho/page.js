"use client";
import Image from 'next/image';
import { useComercial } from '../layout';
import MvpCards from './MvpCards';
import RankingCharts from './RankingCharts';
import SdrFunnelChart from './SdrFunnelChart';
import AuditTable from './AuditTable'; // 1. IMPORTA o novo componente de auditoria

export default function DesempenhoPage() {
    const { filteredDeals, loading, error, selectedEmpresa, logoEmpresa } = useComercial();

    if (loading) return <p className="text-center p-10">Carregando dados do Ploomes...</p>;
    if (error) return <p className="text-center p-10 text-red-400">Erro: {error.message}</p>;

    // 'vendas' contém apenas negócios com status 'Venda'
    const vendas = filteredDeals.filter(deal => deal.status === 'Venda');

    return (
        <>
            <div className="flex items-center gap-4 mb-6">
                <Image src={logoEmpresa} alt={`Logo ${selectedEmpresa}`} width={180} height={60} style={{ objectFit: 'contain' }} />
                <h1 className="text-3xl font-bold text-white">Desempenho do Time</h1>
            </div>

            <div className="space-y-6">
                {/* MvpCards recebe apenas VENDAS para calcular o MVP de MRR */}
                <MvpCards deals={vendas} />
                
                {/* RankingCharts recebe apenas VENDAS para calcular o ranking de MRR */}
                <RankingCharts deals={vendas} />

                {/* SdrFunnelChart recebe VENDAS para contar a quantidade de negócios ganhos */}
                <SdrFunnelChart deals={vendas} />

                {/* 2. SUBSTITUI o placeholder pelo componente real, passando os dados de vendas */}
                <AuditTable deals={vendas} />
            </div>
        </>
    );
}
