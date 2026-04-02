"use client";
import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { useComercial } from '../layout';

// --- Componente de Card para os KPIs (adicionado aqui para simplicidade) ---
function KpiCard({ title, value, icon, format = (v) => v }) {
    return (
        <div className="bg-white/10 p-4 rounded-lg flex items-center gap-4">
            <div className="text-3xl">{icon}</div>
            <div>
                <div className="text-2xl font-bold text-white">{format(value)}</div>
                <div className="text-xs uppercase text-white/60">{title}</div>
            </div>
        </div>
    );
}

// --- Componente da Página de Customer Success ---
export default function CustomerSuccessPage() {
    const { selectedEmpresa, logoEmpresa } = useComercial();

    const [onboardingDeals, setOnboardingDeals] = useState([]);
    const [ongoingDeals, setOngoingDeals] = useState([]);
    const [loadingCS, setLoadingCS] = useState(true);
    const [errorCS, setErrorCS] = useState(null);
    const [activeTab, setActiveTab] = useState('onboarding');

    useEffect(() => {
        const fetchCSData = async () => {
            if (!selectedEmpresa) return;
            setLoadingCS(true);
            setErrorCS(null);
            try {
                const [onboardingRes, ongoingRes] = await Promise.all([
                    fetch(`/api/ploomes/deals?empresa=${encodeURIComponent(selectedEmpresa)}&funil=onboarding`),
                    fetch(`/api/ploomes/deals?empresa=${encodeURIComponent(selectedEmpresa)}&funil=ongoing`)
                ]);

                if (!onboardingRes.ok || !ongoingRes.ok) {
                    const errorMsg = await (onboardingRes.ok ? ongoingRes.text() : onboardingRes.text());
                    throw new Error(`Falha ao buscar dados de CS: ${errorMsg}`);
                }

                const onboardingData = await onboardingRes.json();
                const ongoingData = await ongoingRes.json();

                setOnboardingDeals(onboardingData.value || []);
                setOngoingDeals(ongoingData.value || []);

            } catch (err) {
                setErrorCS(err.message);
            } finally {
                setLoadingCS(false);
            }
        };

        fetchCSData();
    }, [selectedEmpresa]);

    // --- LÓGICA DE CÁLCULO DOS KPIs (ADICIONADA) ---
    const { onboardingKpis } = useMemo(() => {
        if (loadingCS) return { onboardingKpis: {} };

        // Filtra os deals que ainda estão em andamento (não ganhos/perdidos)
        const dealsEmAndamento = onboardingDeals.filter(d => d.status === 'Aberto');
        
        // Filtra os deals concluídos com sucesso no funil de onboarding
        const dealsConcluidos = onboardingDeals.filter(d => d.status === 'Venda');

        const kpis = {
            clientesEmOnboarding: dealsEmAndamento.length,
            mrrEmOnboarding: dealsEmAndamento.reduce((sum, d) => sum + d.mrr, 0),
            tempoMedioOnboarding: dealsConcluidos.length > 0 
                ? dealsConcluidos.reduce((sum, d) => sum + d.diasNoFunil, 0) / dealsConcluidos.length
                : 0,
            onboardingsConcluidos: dealsConcluidos.length,
        };

        return { onboardingKpis: kpis };
    }, [loadingCS, onboardingDeals]);

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
                        {/* --- SEÇÃO DE KPIs SUBSTITUÍDA --- */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <KpiCard title="Clientes em Onboarding" value={onboardingKpis.clientesEmOnboarding} icon="⏳" />
                            <KpiCard title="MRR em Onboarding" value={onboardingKpis.mrrEmOnboarding} icon="💰" format={formatCurrency} />
                            <KpiCard title="Tempo Médio (Concluídos)" value={onboardingKpis.tempoMedioOnboarding} icon="⏱️" format={formatDays} />
                            <KpiCard title="Onboardings Concluídos" value={onboardingKpis.onboardingsConcluidos} icon="✅" />
                        </div>
                        {/* Placeholders restantes */}
                        <div className="bg-white/5 p-4 rounded-lg border border-dashed border-white/20 min-h-[250px] flex flex-col justify-center items-center"><p className="text-sm text-white/50">(Gráfico: Funil de Etapas do Onboarding)</p></div>
                        <div className="bg-white/5 p-4 rounded-lg border border-dashed border-white/20 min-h-[300px] flex flex-col justify-center items-center"><p className="text-sm text-white/50">(Tabela: Clientes em Onboarding)</p></div>
                    </div>
                )}

                {activeTab === 'ongoing' && (
                    <div className="space-y-6 animate-fade-in">
                        {/* ... (placeholders de ongoing permanecem) ... */}
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
