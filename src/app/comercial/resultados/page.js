"use client";
import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import dynamic from 'next/dynamic';

const GraficosResultados = dynamic(() => import('./GraficosResultados'), { ssr: false, loading: () => <div className="text-center p-10 text-white/50">Carregando gráficos...</div> });

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

function FilterSelect({ label, value, onChange, options, disabled }) {
    return (
        <div>
            <label className="text-xs text-white/70 block mb-1 font-bold uppercase">{label}</label>
            <select value={value} onChange={onChange} className="bg-acelerar-dark-blue p-2 rounded-md text-white w-full border border-white/20" disabled={disabled}>
                {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
        </div>
    );
}

const MESES_ORDEM = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export default function ResultadosPage() {
    const [allDeals, setAllDeals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedEmpresa, setSelectedEmpresa] = useState('VMC Tech');
    const [anos, setAnos] = useState([]);
    const [selectedAno, setSelectedAno] = useState(new Date().getFullYear());
    const [meses, setMeses] = useState([]);
    const [selectedMeses, setSelectedMeses] = useState([]);
    const [produtos, setProdutos] = useState([]);
    const [selectedProduto, setSelectedProduto] = useState('Todos');
    const [vendedores, setVendedores] = useState([]);
    const [selectedVendedor, setSelectedVendedor] = useState('Todos');
    const [sdrs, setSdrs] = useState([]);
    const [selectedSdr, setSelectedSdr] = useState('Todos');

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true); setError(null);
                const response = await fetch(`/api/ploomes/deals?empresa=${encodeURIComponent(selectedEmpresa)}`);
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Falha ao buscar dados');
                const dealsComData = data.value.map(d => ({ ...d, data: new Date(d.data) }));
                setAllDeals(dealsComData);
            } catch (err) {
                setError(err.message);
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
    }, [allDeals]);

    useEffect(() => {
        if (allDeals.length === 0 || !selectedAno) return;
        const mesesDoAno = [...new Set(allDeals.filter(d => d.data.getFullYear() === selectedAno).map(d => d.data.getMonth()))];
        const mesesNomes = mesesDoAno.map(m => new Date(0, m).toLocaleString('pt-BR', { month: 'short' }).replace('.', '')).sort((a, b) => MESES_ORDEM.indexOf(a) - MESES_ORDEM.indexOf(b));
        setMeses(mesesNomes);
        setSelectedMeses(mesesNomes);
    }, [selectedAno, allDeals]);

    const handleMesChange = (mes) => { setSelectedMeses(prev => prev.includes(mes) ? prev.filter(m => m !== mes) : [...prev, mes]); };

    const { kpis, chartData } = useMemo(() => {
        if (loading || allDeals.length === 0) return { kpis: {}, chartData: null };
        
        const deals = allDeals.filter(d =>
            d.data.getFullYear() === selectedAno &&
            selectedMeses.includes(new Date(0, d.data.getMonth()).toLocaleString('pt-BR', { month: 'short' }).replace('.', '')) &&
            (selectedProduto === 'Todos' || d.produto === selectedProduto) &&
            (selectedVendedor === 'Todos' || d.vendedor === selectedVendedor) &&
            (selectedSdr === 'Todos' || d.sdr === selectedSdr)
        );

        const vendas = deals.filter(d => d.status === 'Venda');
        const cancelados = deals.filter(d => d.status === 'Churn');
        const mrrConquistado = vendas.reduce((sum, d) => sum + d.mrr, 0);
        const mrrPerdido = cancelados.reduce((sum, d) => sum + d.mrr, 0);
        const kpisCalculados = {
            mrrConquistado, mrrPerdido, mrrNet: mrrConquistado - mrrPerdido,
            totalUpsell: vendas.reduce((sum, d) => sum + d.upsell, 0),
            ticketMedio: vendas.length > 0 ? mrrConquistado / vendas.length : 0,
            adesaoTotal: vendas.reduce((sum, d) => sum + d.adesao, 0),
            clientesFechados: vendas.length, clientesCancelados: cancelados.length,
            carteiraAtiva: allDeals.filter(d => d.status === 'Venda').length - allDeals.filter(d => d.status === 'Churn').length,
            percentualMrrPerdido: mrrConquistado > 0 ? (mrrPerdido / mrrConquistado) * 100 : 0,
            percentualClientesCancelados: vendas.length > 0 ? (cancelados.length / vendas.length) * 100 : 0,
        };

        // LÓGICA DE GRÁFICOS PARA RECHARTS
        const labels = MESES_ORDEM.filter(mes => selectedMeses.includes(mes));
        const monthlyData = labels.map(mes => {
            const dealsDoMes = deals.filter(d => new Date(0, d.data.getMonth()).toLocaleString('pt-BR', { month: 'short' }).replace('.', '') === mes);
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
        let mrrAcumulado = 0;
        let contratosAcumulados = 0;
        const accumulatedData = monthlyData.map((d, i) => {
            mrrAcumulado += d.mrr;
            contratosAcumulados += d.contratos;
            return {
                mes: d.mes,
                mrr: mrrAcumulado,
                contratos: contratosAcumulados,
                metaMrr: metaEmpresa.mrr * (i + 1),
                metaContratos: metaEmpresa.contratos * (i + 1),
            };
        });

        return { kpis: kpisCalculados, chartData: { monthlyData, accumulatedData } };
    }, [loading, allDeals, selectedAno, selectedMeses, selectedProduto, selectedVendedor, selectedSdr, selectedEmpresa]);

    const formatCurrency = (value) => `R$ ${Math.round(value || 0).toLocaleString('pt-BR')}`;
    const logoEmpresa = selectedEmpresa === 'VMC Tech' ? '/logo_vmctech.png' : '/logo_victec.png';

    return (
        <div className="flex h-full">
            <aside className="w-64 bg-black/20 p-4 flex-shrink-0 flex flex-col gap-4 overflow-y-auto">
                <FilterSelect label="Empresa" value={selectedEmpresa} onChange={(e) => setSelectedEmpresa(e.target.value)} options={['VMC Tech', 'Victec']} disabled={loading} />
                <FilterSelect label="Ano" value={selectedAno} onChange={(e) => setSelectedAno(parseInt(e.target.value))} options={anos} disabled={loading || anos.length === 0} />
                <div>
                    <label className="text-xs text-white/70 block mb-1 font-bold uppercase">Meses</label>
                    <div className="bg-acelerar-dark-blue p-2 rounded-md border border-white/20 max-h-48 overflow-y-auto">
                        {meses.map(mes => (
                            <label key={mes} className="flex items-center gap-2 p-1 rounded hover:bg-white/10 cursor-pointer">
                                <input type="checkbox" checked={selectedMeses.includes(mes)} onChange={() => handleMesChange(mes)} className="form-checkbox bg-acelerar-dark-blue border-white/30 text-acelerar-light-blue focus:ring-acelerar-light-blue" />
                                <span>{mes.charAt(0).toUpperCase() + mes.slice(1)}</span>
                            </label>
                        ))}
                    </div>
                </div>
                <FilterSelect label="Produto" value={selectedProduto} onChange={(e) => setSelectedProduto(e.target.value)} options={produtos} disabled={loading} />
                <FilterSelect label="Vendedor" value={selectedVendedor} onChange={(e) => setSelectedVendedor(e.target.value)} options={vendedores} disabled={loading} />
                <FilterSelect label="SDR" value={selectedSdr} onChange={(e) => setSelectedSdr(e.target.value)} options={sdrs} disabled={loading} />
            </aside>
            <div className="flex-1 p-8 overflow-y-auto">
                <div className="flex items-center gap-4 mb-6">
                    <Image src={logoEmpresa} alt={`Logo ${selectedEmpresa}`} width={180} height={60} style={{ objectFit: 'contain' }} />
                    <h1 className="text-3xl font-bold text-white">Resultados (Performance)</h1>
                </div>
                {loading ? <p>Carregando KPIs...</p> : error ? <p className="text-red-400">Erro: {error}</p> : (
                    <>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-9 gap-4 mb-6">
                            <KpiCard title="MRR Conquistado" value={formatCurrency(kpis.mrrConquistado)} />
                            <KpiCard title="MRR Perdido" value={formatCurrency(kpis.mrrPerdido)} color="text-red-400" subValue={`${kpis.percentualMrrPerdido.toFixed(1)}% do MRR`} />
                            <KpiCard title="MRR Ativo (Net)" value={formatCurrency(kpis.mrrNet)} />
                            <KpiCard title="Total Upsell" value={formatCurrency(kpis.totalUpsell)} />
                            <KpiCard title="Ticket Médio" value={formatCurrency(kpis.ticketMedio)} />
                            <KpiCard title="Adesão Total" value={formatCurrency(kpis.adesaoTotal)} />
                            <KpiCard title="Clientes Fechados" value={kpis.clientesFechados || 0} />
                            <KpiCard title="Clientes Cancelados" value={kpis.clientesCancelados || 0} color="text-red-400" subValue={`${kpis.percentualClientesCancelados.toFixed(1)}% dos Fechados`} />
                            <KpiCard title="Carteira Ativa" value={kpis.carteiraAtiva || 0} />
                        </div>
                        <div className="mt-8">
                            <GraficosResultados chartData={chartData} />
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
