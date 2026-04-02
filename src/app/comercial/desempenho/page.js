"use client";
import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { useComercial } from '../layout';
import MvpCards from './MvpCards';
import RankingCharts from './RankingCharts';
import SdrFunnelChart from './SdrFunnelChart';
import AuditTable from './AuditTable';
import StackedAuditChart from './StackedAuditChart';

export default function DesempenhoPage() {
    const [allDeals, setAllDeals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // CORREÇÃO: Pegando os setters do contexto
    const { 
        selectedEmpresa, logoEmpresa, 
        setAnos, setSelectedAno, selectedAno,
        setMeses, setSelectedMeses, selectedMeses,
        setProdutos, selectedProduto,
        setVendedores, selectedVendedor,
        setSdrs, selectedSdr,
        MESES_ORDEM
    } = useComercial();

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

    // CORREÇÃO: Adicionando a lógica para popular os filtros
    useEffect(() => {
        if (allDeals.length === 0) return;
        const anosUnicos = [...new Set(allDeals.map(d => d.data.getFullYear()))].sort((a, b) => b - a);
        setAnos(anosUnicos);
        if (!anosUnicos.includes(selectedAno)) setSelectedAno(anosUnicos[0] || new Date().getFullYear());
        
        const getUniqueAndSorted = (key) => ['Todos', ...[...new Set(allDeals.map(d => d[key]).filter(Boolean).filter(v => v !== 'N/A'))].sort()];
        setProdutos(getUniqueAndSorted('produto'));
        setVendedores(getUniqueAndSorted('vendedor'));
        setSdrs(getUniqueAndSorted('sdr'));
    }, [allDeals, setAnos, setSelectedAno, setProdutos, setVendedores, setSdrs]);

    useEffect(() => {
        if (allDeals.length === 0 || !selectedAno) return;
        const mesesDoAno = [...new Set(allDeals.filter(d => d.data.getFullYear() === selectedAno).map(d => d.data.getMonth()))];
        const mesesNomes = mesesDoAno.map(m => new Date(0, m).toLocaleString('pt-BR', { month: 'short' }).replace('.', '')).sort((a, b) => MESES_ORDEM.indexOf(a) - MESES_ORDEM.indexOf(b));
        setMeses(mesesNomes);
        setSelectedMeses(mesesNomes);
    }, [selectedAno, allDeals, setMeses, setSelectedMeses, MESES_ORDEM]);

    const filteredDeals = useMemo(() => {
        if (loading || allDeals.length === 0 || selectedMeses.length === 0) return []; // Adicionado selectedMeses.length === 0
        return allDeals.filter(d =>
            d.data.getFullYear() === selectedAno &&
            selectedMeses.includes(new Date(0, d.data.getMonth()).toLocaleString('pt-BR', { month: 'short' }).replace('.', '')) &&
            (selectedProduto === 'Todos' || d.produto === selectedProduto) &&
            (selectedVendedor === 'Todos' || d.vendedor === selectedVendedor) &&
            (selectedSdr === 'Todos' || d.sdr === selectedSdr)
        );
    }, [loading, allDeals, selectedAno, selectedMeses, selectedProduto, selectedVendedor, selectedSdr]);

    const vendas = useMemo(() => filteredDeals.filter(deal => deal.status === 'Venda'), [filteredDeals]);

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
