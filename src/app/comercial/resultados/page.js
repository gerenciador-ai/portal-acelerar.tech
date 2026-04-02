"use client";
import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { useComercial } from '../layout'; // O hook agora traz os filtros

// --- Componentes Dinâmicos (sem alterações) ---
const GraficosResultados = dynamic(() => import('./GraficosResultados'), { ssr: false, loading: () => <div className="text-center p-10 text-white/50">Carregando gráficos...</div> });
const TabelasResumo = dynamic(() => import('./TabelasResumo'), { ssr: false, loading: () => <div className="text-center p-10 text-white/50">Carregando tabelas...</div> });

// --- Componentes Visuais (sem alterações) ---
function KpiCard({ title, value, subValue, color = 'text-acelerar-light-blue' }) {
    return (
        <div className="bg-white/10 p-4 rounded-lg text-center flex flex-col justify-between">
            <div>
                <div className="text-xs uppercase text-white/60 truncate">{title}</div>
                <div className={`text-2xl font-bold mt-1 ${color}`}>{value}</div>
            </div>
            {subValue && (<div className="text-xs font-bold mt-2 text-red-400/80">{subValue}</div>)}
        </div>
    );
}

// --- Página de Resultados (Refatorada com Lógica de Dados Própria) ---
export default function ResultadosPage() {
    // 1. ESTADOS DE DADOS AGORA SÃO LOCAIS DESTA PÁGINA
    const [allDeals, setAllDeals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // 2. RECEBE APENAS OS FILTROS E SETTERS DO CONTEXTO DO LAYOUT
    const { 
        selectedEmpresa, logoEmpresa, 
        setAnos, setSelectedAno, selectedAno,
        setMeses, setSelectedMeses, selectedMeses,
        setProdutos, selectedProduto,
        setVendedores, selectedVendedor,
        setSdrs, selectedSdr,
        MESES_ORDEM
    } = useComercial();

    // 3. LÓGICA DE BUSCA DE DADOS DE VENDAS (MOVIDA DO LAYOUT PARA CÁ)
    useEffect(() => {
        if (!selectedEmpresa) return;
        const fetchData = async () => {
            try {
                setLoading(true); setError(null);
                // Busca apenas os dados de Vendas
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

    // 4. LÓGICA PARA ATUALIZAR OS FILTROS (MOVIDA DO LAYOUT PARA CÁ)
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

    // 5. LÓGICA DE FILTRAGEM (usa os estados locais e os filtros do contexto)
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

    // 6. LÓGICA DE CÁLCULO DOS KPIs (sem alterações, apenas usa os dados locais)
    const { kpis, chartData, tableData } = useMemo(() => {
        if (!filteredDeals || filteredDeals.length === 0) {
            return { kpis: {}, chartData: null, tableData: null };
        }
        
        const vendas = filteredDeals.filter(d => d.status === 'Venda');
        const cancelados = filteredDeals.filter(d => d.status === 'Churn');
        const mrrConquistado = vendas.reduce((sum, d) => sum + d.mrr, 0);
        const mrrPerdido = cancelados.reduce((sum, d) => sum + d.mrr, 0);

        const kpisCalculados = {
            mrrConquistado, mrrPerdido, mrrNet: mrrConquistado - mrrPerdido,
            totalUpsell: vendas.reduce((sum, d) => sum + (d.upsell || 0), 0),
            ticketMedio: vendas.length > 0 ? mrrConquistado / vendas.length : 0,
            adesaoTotal: vendas.reduce((sum, d) => sum + (d.adesao || 0), 0),
            clientesFechados: vendas.length, clientesCancelados: cancelados.length,
            carteiraAtiva: allDeals.filter(d => d.status === 'Venda').length - allDeals.filter(d => d.status === 'Churn').length,
            percentualMrrPerdido: mrrConquistado > 0 ? (mrrPerdido / mrrConquistado) * 100 : 0,
            percentualClientesCancelados: vendas.length > 0 ? (cancelados.length / vendas.length) * 100 : 0,
        };

        const mesesSelecionados = [...new Set(filteredDeals.map(d => new Date(0, d.data.getMonth()).toLocaleString('pt-BR', { month: 'short' }).replace('.', '')))];
        const labels = MESES_ORDEM.filter(mes => mesesSelecionados.includes(mes));
        
        const monthlyData = labels.map(mes => {
            const dealsDoMes = filteredDeals.filter(d => new Date(0, d.data.getMonth()).toLocaleString('pt-BR', { month: 'short' }).replace('.', '') === mes);
            const vendasDoMes = dealsDoMes.filter(d => d.status === 'Venda');
            const churnDoMes = dealsDoMes.filter(d => d.status === 'Churn');
            return {
                mes,
                mrr: vendasDoMes.reduce((sum, d) => sum + (d.mrr || 0), 0),
                upsell: vendasDoMes.reduce((sum, d) => sum + (d.upsell || 0), 0),
                churn: churnDoMes.reduce((sum, d) => sum + (d.mrr || 0), 0),
                contratos: vendasDoMes.length,
            };
        });

        const metas = { 'VMC Tech': { mrr: 8000, contratos: 17 }, 'Victec': { mrr: 10000, contratos: 17 } };
        const metaEmpresa = metas[selectedEmpresa];
        let mrrAcumulado = 0, contratosAcumulados = 0;
        const accumulatedData = monthlyData.map((d, i) => {
            mrrAcumulado += d.mrr;
            contratosAcumulados += d.contratos;
            return { mes: d.mes, mrr: mrrAcumulado, contratos: contratosAcumulados, metaMrr: metaEmpresa.mrr * (i + 1), metaContratos: metaEmpresa.contratos * (i + 1) };
        });

        return { 
            kpis: kpisCalculados, 
            chartData: { monthlyData, accumulatedData },
            tableData: { vendas, cancelados }
        };
    }, [filteredDeals, allDeals, selectedEmpresa, MESES_ORDEM]);

    const formatCurrency = (value) => `R$ ${Math.round(value || 0).toLocaleString('pt-BR')}`;

    // 7. RENDERIZAÇÃO (usa o estado de loading local)
    if (loading) return <p className="text-center p-10">Carregando dados de Resultados...</p>;
    if (error) return <p className="text-center p-10 text-red-400">Erro: {error.message}</p>;

    return (
        <>
            <div className="flex items-center gap-4 mb-6">
                <Image src={logoEmpresa} alt={`Logo ${selectedEmpresa}`} width={180} height={60} style={{ objectFit: 'contain' }} />
                <h1 className="text-3xl font-bold text-white">Resultados (Performance)</h1>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-9 gap-4 mb-6">
                <KpiCard title="MRR Conquistado" value={formatCurrency(kpis.mrrConquistado)} />
                <KpiCard title="MRR Perdido" value={formatCurrency(kpis.mrrPerdido)} color="text-red-400" subValue={`${kpis.percentualMrrPerdido?.toFixed(1)}% do MRR`} />
                <KpiCard title="MRR Ativo (Net)" value={formatCurrency(kpis.mrrNet)} />
                <KpiCard title="Total Upsell" value={formatCurrency(kpis.totalUpsell)} />
                <KpiCard title="Ticket Médio" value={formatCurrency(kpis.ticketMedio)} />
                <KpiCard title="Adesão Total" value={formatCurrency(kpis.adesaoTotal)} />
                <KpiCard title="Clientes Fechados" value={kpis.clientesFechados || 0} />
                <KpiCard title="Clientes Cancelados" value={kpis.clientesCancelados || 0} color="text-red-400" subValue={`${kpis.percentualClientesCancelados?.toFixed(1)}% dos Fechados`} />
                <KpiCard title="Carteira Ativa" value={kpis.carteiraAtiva || 0} />
            </div>
            
            <div className="mt-8">
                <GraficosResultados chartData={chartData} />
            </div>

            <TabelasResumo tableData={tableData} />
        </>
    );
}
