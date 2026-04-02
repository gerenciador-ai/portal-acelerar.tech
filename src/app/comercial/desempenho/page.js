"use client";
import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { useComercial } from '../layout'; // O hook agora traz os filtros
import MvpCards from './MvpCards';
import RankingCharts from './RankingCharts';
import SdrFunnelChart from './SdrFunnelChart';
import AuditTable from './AuditTable';
import StackedAuditChart from './StackedAuditChart';

// --- Página de Desempenho (Refatorada com Lógica de Dados Própria) ---
export default function DesempenhoPage() {
    // 1. ESTADOS DE DADOS AGORA SÃO LOCAIS DESTA PÁGINA
    const [allDeals, setAllDeals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // 2. RECEBE APENAS OS FILTROS DO CONTEXTO DO LAYOUT
    const { 
        selectedEmpresa, logoEmpresa, 
        selectedAno, selectedMeses,
        selectedProduto, selectedVendedor, selectedSdr
    } = useComercial();

    // 3. LÓGICA DE BUSCA DE DADOS DE VENDAS (MOVIDA DO LAYOUT PARA CÁ)
    // Como esta página também usa dados de Vendas, ela precisa fazer a mesma busca.
    useEffect(() => {
        if (!selectedEmpresa) return;
        const fetchData = async () => {
            try {
                setLoading(true); setError(null);
                const response = await fetch(`/api/ploomes/deals?empresa=${encodeURIComponent(selectedEmpresa)}&funil=vendas`);
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Falha ao buscar dados');
                const dealsComData = data.value.map(d => ({ ...d, data: new Date(d.data) }));
                setAllDeals(dealsComData);
            } catch (err) {
                setError(err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [selectedEmpresa]);

    // 4. LÓGICA DE FILTRAGEM (usa os estados locais e os filtros do contexto)
    const filteredDeals = useMemo(() => {
        if (loading || allDeals.length === 0) return [];
        return allDeals.filter(d =>
            d.data.getFullYear() === selectedAno &&
            selectedMeses.includes(new Date(0, d.data.getMonth()).toLocaleString('pt-BR', { month: 'short' }).replace('.', '')) &&
            (selectedProduto === 'Todos' || d.produto === selectedProduto) &&
            (selectedVendedor === 'Todos' || d.vendedor === selectedVendedor) &&
            (selectedSdr === 'Todos' || d.sdr === selectedSdr)
        );
    }, [loading, allDeals, selectedAno, selectedMeses, selectedProduto, selectedVendedor, selectedSdr]);

    // 5. LÓGICA DE CÁLCULO (sem alterações, apenas usa os dados locais)
    const vendas = useMemo(() => filteredDeals.filter(deal => deal.status === 'Venda'), [filteredDeals]);

    // 6. RENDERIZAÇÃO (usa o estado de loading local)
    if (loading) return <p className="text-center p-10">Carregando dados de Desempenho...</p>;
    if (error) return <p className="text-center p-10 text-red-400">Erro: {error.message}</p>;

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
                <AuditTable dealsGanhos={vendas} dealsGerados={filteredDeals} />
            </div>
        </>
    );
}
