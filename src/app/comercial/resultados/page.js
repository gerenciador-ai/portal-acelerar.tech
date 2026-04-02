"use client";
import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { useComercial } from '../layout';

const GraficosResultados = dynamic(() => import('./GraficosResultados'), { ssr: false, loading: () => <div className="text-center p-10 text-white/50">Carregando gráficos...</div> });
const TabelasResumo = dynamic(() => import('./TabelasResumo'), { ssr: false, loading: () => <div className="text-center p-10 text-white/50">Carregando tabelas...</div> });

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

export default function ResultadosPage() {
    const [allDeals, setAllDeals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

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
                setLoading(true);
                setError(null);

                const [vendasRes, churnRes] = await Promise.all([
                    fetch(`/api/ploomes/deals?empresa=${encodeURIComponent(selectedEmpresa)}&funil=vendas`),
                    fetch(`/api/ploomes/deals?empresa=${encodeURIComponent(selectedEmpresa)}&funil=churn`)
                ]);

                if (!vendasRes.ok || !churnRes.ok) throw new Error('Falha ao buscar dados de Vendas ou Churn.');

                const vendasData = await vendasRes.json();
                const churnData = await churnRes.json();

                const vendasComData = vendasData.value.map(d => ({ ...d, data: new Date(d.data) }));
                let churnComData = churnData.value.map(d => ({ ...d, data: new Date(d.data), status: 'Churn' })); // Garante o status

                const dataMap = new Map();
                for (const venda of vendasComData) {
                    if (venda.contactId && venda.status === 'Venda') {
                        if (!dataMap.has(venda.contactId) || new Date(venda.data) > new Date(dataMap.get(venda.contactId).data)) {
                            dataMap.set(venda.contactId, { mrr: venda.mrr, vendedor: venda.vendedor, sdr: venda.sdr, data: venda.data });
                        }
                    }
                }

                churnComData = churnComData.map(churn => {
                    if (churn.contactId && dataMap.has(churn.contactId)) {
                        const originalData = dataMap.get(churn.contactId);
                        return { ...churn, mrr: originalData.mrr, vendedor: originalData.vendedor, sdr: originalData.sdr };
                    }
                    return churn;
                });

                const vendasGanha = vendasComData.filter(v => v.status === 'Venda');
                setAllDeals([...vendasGanha, ...churnComData]);

            } catch (err) {
                setError(err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [selectedEmpresa]);

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
        if (loading || allDeals.length === 0 || selectedMeses.length === 0) return [];
        return allDeals.filter(d =>
            d.data.getFullYear() === selectedAno &&
            selectedMeses.includes(new Date(0, d.data.getMonth()).toLocaleString('pt-BR', { month: 'short' }).replace('.', '')) &&
            (selectedProduto === 'Todos' || d.produto === selectedProduto) &&
            (selectedVendedor === 'Todos' || d.vendedor === selectedVendedor) &&
            (selectedSdr === 'Todos' || d.sdr === selectedSdr)
        );
    }, [loading, allDeals, selectedAno, selectedMeses, selectedProduto, selectedVendedor, selectedSdr]);

    // CORREÇÃO: A lógica de cálculo foi ajustada para usar os dados corretos
    const { kpis, chartData, tableData } = useMemo(() => {
        if (loading) return { kpis: {}, chartData: null, tableData: null };
        
        // KPIs do período são calculados com base nos dados FILTRADOS
        const vendasPeriodo = filteredDeals.filter(d => d.status === 'Venda');
        const canceladosPeriodo = filteredDeals.filter(d => d.status === 'Churn');
        const mrrConquistado = vendasPeriodo.reduce((sum, d) => sum + d.mrr, 0);
        const mrrPerdido = canceladosPeriodo.reduce((sum, d) => sum + d.mrr, 0);

        // KPIs da carteira são calculados com base em TODOS os dados
        const totalVendas = allDeals.filter(d => d.status === 'Venda');
        const totalCancelados = allDeals.filter(d => d.status === 'Churn');

        const kpisCalculados = {
            mrrConquistado,
            mrrPerdido,
            mrrNet: mrrConquistado - mrrPerdido,
            totalUpsell: vendasPeriodo.reduce((sum, d) => sum + (d.upsell || 0), 0),
            ticketMedio: vendasPeriodo.length > 0 ? mrrConquistado / vendasPeriodo.length : 0,
            adesaoTotal: vendasPeriodo.reduce((sum, d) => sum + (d.adesao || 0), 0),
            clientesFechados: vendasPeriodo.length,
            clientesCancelados: canceladosPeriodo.length,
            carteiraAtiva: totalVendas.length - totalCancelados.length,
            percentualMrrPerdido: mrrConquistado > 0 ? (mrrPerdido / mrrConquistado) * 100 : 0,
            percentualClientesCancelados: vendasPeriodo.length > 0 ? (canceladosPeriodo.length / vendasPeriodo.length) * 100 : 0,
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
            tableData: { vendas: vendasPeriodo, cancelados: canceladosPeriodo }
        };
    }, [filteredDeals, allDeals, selectedEmpresa, MESES_ORDEM, loading]);

    const formatCurrency = (value) => `R$ ${Math.round(value || 0).toLocaleString('pt-BR')}`;

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
