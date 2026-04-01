"use client";
import { useState, useEffect, useMemo } from 'react';

// Componentes movidos para dentro para simplicidade
function KpiCard({ title, value, color = 'text-acelerar-light-blue' }) {
    return (
        <div className="bg-white/10 p-4 rounded-lg text-center">
            <div className="text-xs uppercase text-white/60 truncate">{title}</div>
            <div className={`text-2xl font-bold mt-1 ${color}`}>{value}</div>
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
                setLoading(true);
                setError(null);
                const response = await fetch(`/api/ploomes/deals?empresa=${encodeURIComponent(selectedEmpresa)}`);
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Falha ao buscar dados');
                const dealsComData = data.value.map(d => ({ ...d, data: new Date(d.data) })).filter(d => d.data && !isNaN(d.data));
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
        
        // Lógica corrigida para fixar "Todos" no início
        const getUniqueAndSorted = (key) => ['Todos', ...[...new Set(allDeals.map(d => d[key]).filter(Boolean).filter(v => v !== 'N/A'))].sort()];
        setProdutos(getUniqueAndSorted('produto'));
        setVendedores(getUniqueAndSorted('vendedor'));
        setSdrs(getUniqueAndSorted('sdr'));
    }, [allDeals]);

    useEffect(() => {
        if (allDeals.length === 0 || !selectedAno) return;
        const mesesDoAno = [...new Set(allDeals.filter(d => d.data.getFullYear() === selectedAno).map(d => d.data.getMonth()))];
        const mesesNomes = mesesDoAno.map(m => new Date(0, m).toLocaleString('pt-BR', { month: 'short' }).replace('.', ''));
        setMeses(mesesNomes);
        setSelectedMeses(mesesNomes);
    }, [selectedAno, allDeals]);

    const handleMesChange = (mes) => {
        setSelectedMeses(prev => prev.includes(mes) ? prev.filter(m => m !== mes) : [...prev, mes]);
    };

    const { kpis } = useMemo(() => {
        if (loading || allDeals.length === 0) return { kpis: {} };
        const filteredDeals = allDeals.filter(d =>
            d.data.getFullYear() === selectedAno &&
            selectedMeses.includes(new Date(0, d.data.getMonth()).toLocaleString('pt-BR', { month: 'short' }).replace('.', '')) &&
            (selectedProduto === 'Todos' || d.produto === selectedProduto) &&
            (selectedVendedor === 'Todos' || d.vendedor === selectedVendedor) &&
            (selectedSdr === 'Todos' || d.sdr === selectedSdr)
        );
        const vendas = filteredDeals.filter(d => d.status === 'Venda');
        const cancelados = filteredDeals.filter(d => d.status === 'Churn' && d.stageId === 110065019);
        const mrrConquistado = vendas.reduce((sum, d) => sum + d.mrr, 0);
        const mrrPerdido = cancelados.reduce((sum, d) => sum + d.mrr, 0);
        const mrrNet = mrrConquistado - mrrPerdido;
        const totalUpsell = vendas.reduce((sum, d) => sum + d.upsell, 0);
        const clientesFechados = vendas.length;
        const ticketMedio = clientesFechados > 0 ? mrrConquistado / clientesFechados : 0;
        const adesaoTotal = vendas.reduce((sum, d) => sum + d.adesao, 0);
        const clientesCancelados = cancelados.length;
        const carteiraAtiva = allDeals.filter(d => d.status === 'Venda').length - allDeals.filter(d => d.status === 'Churn' && d.stageId === 110065019).length;
        return { kpis: { mrrConquistado, mrrPerdido, mrrNet, totalUpsell, ticketMedio, adesaoTotal, clientesFechados, clientesCancelados, carteiraAtiva } };
    }, [loading, allDeals, selectedAno, selectedMeses, selectedProduto, selectedVendedor, selectedSdr]);

    const formatCurrency = (value) => `R$ ${Math.round(value || 0).toLocaleString('pt-BR')}`;

    return (
        <div className="flex h-full">
            {/* Sidebar de Filtros */}
            <aside className="w-64 bg-black/20 p-4 flex-shrink-0 flex flex-col gap-4">
                <FilterSelect label="Empresa" value={selectedEmpresa} onChange={(e) => setSelectedEmpresa(e.target.value)} options={['VMC Tech', 'Victec']} disabled={loading} />
                <FilterSelect label="Ano" value={selectedAno} onChange={(e) => setSelectedAno(parseInt(e.target.value))} options={anos} disabled={loading || anos.length === 0} />
                
                {/* Novo Menu de Meses com Checkboxes */}
                <div>
                    <label className="text-xs text-white/70 block mb-1 font-bold uppercase">Meses</label>
                    <div className="bg-acelerar-dark-blue p-2 rounded-md border border-white/20 max-h-48 overflow-y-auto">
                        {meses.map(mes => (
                            <label key={mes} className="flex items-center gap-2 p-1 rounded hover:bg-white/10 cursor-pointer">
                                <input type="checkbox" checked={selectedMeses.includes(mes)} onChange={() => handleMesChange(mes)} className="form-checkbox bg-acelerar-dark-blue border-white/30 text-acelerar-light-blue focus:ring-acelerar-light-blue" />
                                <span>{mes}</span>
                            </label>
                        ))}
                    </div>
                </div>

                <FilterSelect label="Produto" value={selectedProduto} onChange={(e) => setSelectedProduto(e.target.value)} options={produtos} disabled={loading} />
                <FilterSelect label="Vendedor" value={selectedVendedor} onChange={(e) => setSelectedVendedor(e.target.value)} options={vendedores} disabled={loading} />
                <FilterSelect label="SDR" value={selectedSdr} onChange={(e) => setSelectedSdr(e.target.value)} options={sdrs} disabled={loading} />
            </aside>

            {/* Conteúdo Principal */}
            <div className="flex-1 p-8 overflow-y-auto">
                <h1 className="text-3xl font-bold text-white mb-6">Resultados (Performance)</h1>
                {loading ? <p>Carregando KPIs...</p> : error ? <p className="text-red-400">Erro: {error}</p> : (
                    <>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-9 gap-4 mb-6">
                            <KpiCard title="MRR Conquistado" value={formatCurrency(kpis.mrrConquistado)} />
                            <KpiCard title="MRR Perdido" value={formatCurrency(kpis.mrrPerdido)} color="text-red-400" />
                            <KpiCard title="MRR Ativo (Net)" value={formatCurrency(kpis.mrrNet)} />
                            <KpiCard title="Total Upsell" value={formatCurrency(kpis.totalUpsell)} />
                            <KpiCard title="Ticket Médio" value={formatCurrency(kpis.ticketMedio)} />
                            <KpiCard title="Adesão Total" value={formatCurrency(kpis.adesaoTotal)} />
                            <KpiCard title="Clientes Fechados" value={kpis.clientesFechados || 0} />
                            <KpiCard title="Clientes Cancelados" value={kpis.clientesCancelados || 0} color="text-red-400" />
                            <KpiCard title="Carteira Ativa" value={kpis.carteiraAtiva || 0} />
                        </div>
                        <div className="bg-white/10 p-6 rounded-lg">
                            <p className="text-white/70">Gráficos e tabelas de detalhamento aparecerão aqui.</p>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
