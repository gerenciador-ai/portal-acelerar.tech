"use client";
import { useState, useEffect, useMemo } from 'react';

// Componente para um Card de KPI individual
function KpiCard({ title, value, color = 'text-acelerar-light-blue' }) {
    return (
        <div className="bg-white/10 p-4 rounded-lg text-center">
            <div className="text-xs uppercase text-white/60 truncate">{title}</div>
            <div className={`text-2xl font-bold mt-1 ${color}`}>{value}</div>
        </div>
    );
}

export default function ResultadosPage() {
    // Estados para dados e UI
    const [allDeals, setAllDeals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Estados para os filtros
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

    // Busca os dados da API quando a empresa selecionada muda
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);
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

    // Popula os filtros sempre que os dados brutos mudam
    useEffect(() => {
        if (allDeals.length === 0) return;

        const anosUnicos = [...new Set(allDeals.map(d => d.data.getFullYear()))].sort((a, b) => b - a);
        setAnos(anosUnicos);
        if (!anosUnicos.includes(selectedAno)) {
            setSelectedAno(anosUnicos[0] || new Date().getFullYear());
        }

        const produtosUnicos = ['Todos', ...new Set(allDeals.map(d => d.produto).filter(Boolean))].sort();
        setProdutos(produtosUnicos);

        const vendedoresUnicos = ['Todos', ...new Set(allDeals.map(d => d.vendedor).filter(v => v !== 'N/A'))].sort();
        setVendedores(vendedoresUnicos);

        const sdrsUnicos = ['Todos', ...new Set(allDeals.map(d => d.sdr).filter(s => s !== 'N/A'))].sort();
        setSdrs(sdrsUnicos);

    }, [allDeals]);

    // Atualiza os meses disponíveis quando o ano muda
    useEffect(() => {
        if (allDeals.length === 0) return;
        const mesesDoAno = [...new Set(allDeals.filter(d => d.data.getFullYear() === selectedAno).map(d => d.data.getMonth()))];
        const mesesNomes = mesesDoAno.map(m => new Date(0, m).toLocaleString('pt-BR', { month: 'short' }).replace('.', ''));
        setMeses(mesesNomes);
        setSelectedMeses(mesesNomes); // Seleciona todos por padrão
    }, [selectedAno, allDeals]);

    // Filtra os dados e calcula os KPIs
    const { kpis } = useMemo(() => {
        if (loading || allDeals.length === 0) return { kpis: {} };

        const filteredDeals = allDeals.filter(d =>
            d.data.getFullYear() === selectedAno &&
            selectedMeses.includes(new Date(0, d.data.getMonth()).toLocaleString('pt-BR', { month: 'short' }).replace('.', '')) &&
            (selectedProduto === 'Todos' || d.produto === selectedProduto) &&
            (selectedVendedor === 'Todos' || d.vendedor === selectedVendedor) &&
            (selectedSdr === 'Todos' || d.sdr === selectedSdr)
        );

        const vendas = filteredDeals.filter(d => d.status === 'Venda' && d.stageId !== 110065019); // Status Ganha
        const cancelados = filteredDeals.filter(d => d.status === 'Churn' && d.stageId === 110065019); // Estágio Cancelado

        const mrrConquistado = vendas.reduce((sum, d) => sum + d.mrr, 0);
        const mrrPerdido = cancelados.reduce((sum, d) => sum + d.mrr, 0);
        const mrrNet = mrrConquistado - mrrPerdido;
        const totalUpsell = vendas.reduce((sum, d) => sum + d.upsell, 0);
        const clientesFechados = vendas.length;
        const ticketMedio = clientesFechados > 0 ? mrrConquistado / clientesFechados : 0;
        const adesaoTotal = vendas.reduce((sum, d) => sum + d.adesao, 0);
        const clientesCancelados = cancelados.length;
        const carteiraAtiva = allDeals.filter(d => d.status === 'Venda').length - allDeals.filter(d => d.status === 'Churn' && d.stageId === 110065019).length;

        return {
            kpis: {
                mrrConquistado, mrrPerdido, mrrNet, totalUpsell, ticketMedio,
                adesaoTotal, clientesFechados, clientesCancelados, carteiraAtiva
            }
        };
    }, [loading, allDeals, selectedAno, selectedMeses, selectedProduto, selectedVendedor, selectedSdr]);

    const formatCurrency = (value) => `R$ ${Math.round(value || 0).toLocaleString('pt-BR')}`;

    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold text-white mb-6">Resultados (Performance)</h1>
            
            {/* Filtros */}
            <div className="mb-6 p-4 bg-black/20 rounded-lg flex flex-wrap items-center gap-4">
                {/* ... (código dos filtros aqui) ... */}
            </div>

            {/* KPIs */}
            {loading ? <p>Carregando KPIs...</p> : error ? <p className="text-red-400">Erro: {error}</p> : (
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
            )}

            {/* Gráficos e Tabelas - Placeholder */}
            <div className="bg-white/10 p-6 rounded-lg">
                <p className="text-white/70">Gráficos e tabelas de detalhamento aparecerão aqui.</p>
            </div>
        </div>
    );
}
