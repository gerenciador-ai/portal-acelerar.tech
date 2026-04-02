"use client";
import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { useComercial } from '../layout';

// --- Componente KpiCard (sem alterações) ---
function KpiCard({ title, value, icon, legend, format = (v) => v }) {
    return (
        <div className="bg-white/10 p-4 rounded-lg flex flex-col justify-between h-full">
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                    <div className="text-3xl">{icon}</div>
                    <div>
                        <div className="text-2xl font-bold text-white">{format(value)}</div>
                        <div className="text-xs uppercase text-white/60">{title}</div>
                    </div>
                </div>
            </div>
            <div className="text-right text-[10px] uppercase font-bold text-white/40 mt-2">
                {legend}
            </div>
        </div>
    );
}

export default function CustomerSuccessPage() {
    // 1. OBTÉM OS FILTROS E SETTERS DO CONTEXTO GLOBAL
    const { 
        selectedEmpresa, logoEmpresa, 
        selectedAno, setSelectedAno, setAnos,
        selectedMeses, setSelectedMeses, setMeses,
        MESES_ORDEM 
    } = useComercial();

    const [onboardingDeals, setOnboardingDeals] = useState([]);
    const [loadingCS, setLoadingCS] = useState(true);
    const [errorCS, setErrorCS] = useState(null);
    const [activeTab, setActiveTab] = useState('onboarding');

    // Lógica de busca de dados (sem alterações)
    useEffect(() => {
        const fetchCSData = async () => {
            if (!selectedEmpresa) return;
            setLoadingCS(true);
            setErrorCS(null);
            try {
                const onboardingRes = await fetch(`/api/ploomes/onboarding?empresa=${encodeURIComponent(selectedEmpresa)}`);
                if (!onboardingRes.ok) {
                    const errorData = await onboardingRes.json();
                    throw new Error(errorData.error || 'Falha ao buscar dados de Onboarding.');
                }
                const onboardingData = await onboardingRes.json();
                const dealsComData = onboardingData.value.map(d => ({
                    ...d,
                    dataCriacao: new Date(d.dataCriacao),
                    dataFinalizacao: d.dataFinalizacao ? new Date(d.dataFinalizacao) : null,
                }));
                setOnboardingDeals(dealsComData);
            } catch (err) {
                setErrorCS(err.message);
            } finally {
                setLoadingCS(false);
            }
        };
        fetchCSData();
    }, [selectedEmpresa]);

    // 2. CORREÇÃO: ADICIONA A LÓGICA PARA POPULAR OS FILTROS DE DATA
    useEffect(() => {
        if (onboardingDeals.length === 0) return;
        // Usa as datas de criação e finalização para ter uma lista completa de anos
        const allDates = onboardingDeals.flatMap(d => [d.dataCriacao, d.dataFinalizacao]).filter(Boolean);
        const anosUnicos = [...new Set(allDates.map(d => d.getFullYear()))].sort((a, b) => b - a);
        setAnos(anosUnicos);
        if (!anosUnicos.includes(selectedAno)) {
            setSelectedAno(anosUnicos[0] || new Date().getFullYear());
        }
    }, [onboardingDeals, setAnos, setSelectedAno]);

    useEffect(() => {
        if (onboardingDeals.length === 0 || !selectedAno) return;
        const allDatesInYear = onboardingDeals.flatMap(d => [d.dataCriacao, d.dataFinalizacao])
            .filter(d => d && d.getFullYear() === selectedAno);
        
        const mesesDoAno = [...new Set(allDatesInYear.map(d => d.getMonth()))];
        const mesesNomes = mesesDoAno.map(m => new Date(0, m).toLocaleString('pt-BR', { month: 'short' }).replace('.', '')).sort((a, b) => MESES_ORDEM.indexOf(a) - MESES_ORDEM.indexOf(b));
        setMeses(mesesNomes);
        // Seleciona todos os meses por padrão ao carregar
        setSelectedMeses(mesesNomes);
    }, [selectedAno, onboardingDeals, setMeses, setSelectedMeses, MESES_ORDEM]);


    // Lógica de cálculo dos KPIs (sem alterações, agora receberá os filtros corretos)
    const { onboardingKpis } = useMemo(() => {
        if (loadingCS || onboardingDeals.length === 0) return { onboardingKpis: {} };

        const hoje = new Date();
        const limiteDias = 120;
        const dataLimite = new Date(new Date().setDate(hoje.getDate() - limiteDias));

        const dealsAtivosRecentes = onboardingDeals.filter(d => 
            d.status === 'Aberto' && d.dataCriacao > dataLimite
        );

        const clientesEmOnboarding = dealsAtivosRecentes.length;
        const mrrEmOnboarding = dealsAtivosRecentes.reduce((sum, d) => sum + d.mrr, 0);

        const mesesSelecionadosNumeros = selectedMeses.map(mesNome => new Date(Date.parse(mesNome +" 1, 2000")).getMonth());

        const dealsConcluidosNoPeriodo = onboardingDeals.filter(d =>
            d.status === 'Venda' &&
            d.dataFinalizacao &&
            d.dataFinalizacao.getFullYear() === selectedAno &&
            mesesSelecionadosNumeros.includes(d.dataFinalizacao.getMonth())
        );

        const onboardingsConcluidos = dealsConcluidosNoPeriodo.length;
        const tempoMedioOnboarding = onboardingsConcluidos > 0
            ? dealsConcluidosNoPeriodo.reduce((sum, d) => sum + d.diasNoFunil, 0) / onboardingsConcluidos
            : 0;

        return {
            onboardingKpis: {
                clientesEmOnboarding, mrrEmOnboarding,
                onboardingsConcluidos, tempoMedioOnboarding,
            }
        };
    }, [loadingCS, onboardingDeals, selectedAno, selectedMeses]);

    const formatCurrency = (value) => `R$ ${Math.round(value || 0).toLocaleString('pt-BR')}`;
    const formatDays = (value) => `${Math.round(value || 0)} dias`;

    if (loadingCS) return <p className="text-center p-10">Carregando dados de Customer Success...</p>;
    if (errorCS) return <p className="text-center p-10 text-red-400">Erro: {errorCS}</p>;

    return (
        <>
            <div className="flex items-center gap-4 mb-6">
                <Image src={logoEmpresa} alt={`Logo ${selectedEmpresa}`} width={180} height={60} style={{ objectFit: 'contain' }} />
                <h1 className="text-3xl font-bold text-white">Customer Success</h1>
            </div>

            <div className="border-b border-white/20 mb-6">
                <nav className="-mb-px flex gap-6">
                    <button onClick={() => setActiveTab('onboarding')} className={`py-2 px-1 border-b-2 font-semibold transition-colors text-sm ${activeTab === 'onboarding' ? 'border-acelerar-light-blue text-acelerar-light-blue' : 'border-transparent text-white/60 hover:text-white'}`}>
                        🚀 Onboarding
                    </button>
                    <button onClick={() => setActiveTab('ongoing')} className={`py-2 px-1 border-b-2 font-semibold transition-colors text-sm ${activeTab === 'ongoing' ? 'border-acelerar-light-blue text-acelerar-light-blue' : 'border-transparent text-white/60 hover:text-white'}`}>
                        ❤️ Ongoing
                    </button>
                </nav>
            </div>

            <div>
                {activeTab === 'onboarding' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <KpiCard title="Clientes em Onboarding" value={onboardingKpis.clientesEmOnboarding} icon="⏳" legend="Status Atual" />
                            <KpiCard title="MRR em Onboarding" value={onboardingKpis.mrrEmOnboarding} icon="💰" format={formatCurrency} legend="Status Atual" />
                            <KpiCard title="Onboardings Concluídos" value={onboardingKpis.onboardingsConcluidos} icon="✅" legend="Período Selecionado" />
                            <KpiCard title="Tempo Médio (Concluídos)" value={onboardingKpis.tempoMedioOnboarding} icon="⏱️" format={formatDays} legend="Período Selecionado" />
                        </div>
                        <div className="bg-white/5 p-4 rounded-lg border border-dashed border-white/20 min-h-[250px] flex flex-col justify-center items-center"><p className="text-sm text-white/50">(Gráfico: Funil de Etapas do Onboarding)</p></div>
                        <div className="bg-white/5 p-4 rounded-lg border border-dashed border-white/20 min-h-[300px] flex flex-col justify-center items-center"><p className="text-sm text-white/50">(Tabela: Clientes em Onboarding)</p></div>
                    </div>
                )}

                {/* 3. CORREÇÃO: PLACEHOLDERS DE ONGOING REINSERIDOS */}
                {activeTab === 'ongoing' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-white/5 p-4 rounded-lg border border-dashed border-white/20 min-h-[100px] flex flex-col justify-center items-center"><p className="text-sm text-white/50">(KPI: Clientes Ativos)</p></div>
                            <div className="bg-white/5 p-4 rounded-lg border border-dashed border-white/20 min-h-[100px] flex flex-col justify-center items-center"><p className="text-sm text-white/50">(KPI: MRR Ativo)</p></div>
                            <div className="bg-white/5 p-4 rounded-lg border border-dashed border-white/20 min-h-[100px] flex flex-col justify-center items-center"><p className="text-sm text-white/50">(KPI: Health Score Médio)</p></div>
                            <div className="bg-white/5 p-4 rounded-lg border border-dashed border-white/20 min-h-[100px] flex flex-col justify-center items-center"><p className="text-sm text-white/50">(KPI: MRR em Risco)</p></div>
                        </div>
                        <div className="bg-white/5 p-4 rounded-lg border border-dashed border-white/20 min-h-[250px] flex flex-col justify-center items-center"><p className="text-sm text-white/50">(Gráfico: Saúde da Carteira)</p></div>
                        <div className="bg-white/5 p-4 rounded-lg border border-dashed border-white/20 min-h-[300px] flex flex-col justify-center items-center"><p className="text-sm text-white/50">(Tabela: Atividades e Engajamento)</p></div>
                    </div>
                )}
            </div>
        </>
    );
}
