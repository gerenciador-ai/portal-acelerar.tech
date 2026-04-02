"use client";
import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { useComercial } from '../layout'; // Importa o contexto compartilhado

// --- Componente da Página de Customer Success ---
export default function CustomerSuccessPage() {
    // Usa os filtros e o logo do layout principal
    const { selectedEmpresa, logoEmpresa, filteredDeals: filteredSalesDeals } = useComercial();

    // Estados específicos para os dados de CS
    const [onboardingDeals, setOnboardingDeals] = useState([]);
    const [ongoingDeals, setOngoingDeals] = useState([]);
    const [loadingCS, setLoadingCS] = useState(true);
    const [errorCS, setErrorCS] = useState(null);

    // Estado para controlar a aba ativa
    const [activeTab, setActiveTab] = useState('onboarding');

    // Efeito para buscar os dados de Onboarding e Ongoing quando a empresa muda
    useEffect(() => {
        const fetchCSData = async () => {
            setLoadingCS(true);
            setErrorCS(null);
            try {
                // Busca os dois conjuntos de dados em paralelo para mais eficiência
                const [onboardingRes, ongoingRes] = await Promise.all([
                    fetch(`/api/ploomes/deals?empresa=${encodeURIComponent(selectedEmpresa)}&funil=onboarding`),
                    fetch(`/api/ploomes/deals?empresa=${encodeURIComponent(selectedEmpresa)}&funil=ongoing`)
                ]);

                if (!onboardingRes.ok || !ongoingRes.ok) {
                    throw new Error('Falha ao buscar dados de Onboarding ou Ongoing.');
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

    // Filtra os dados de CS com base nos filtros do layout principal
    // (Esta lógica será expandida quando implementarmos os filtros aqui)
    const filteredOnboardingDeals = onboardingDeals; // Placeholder
    const filteredOngoingDeals = ongoingDeals; // Placeholder

    // Renderização principal
    if (loadingCS) return <p className="text-center p-10">Carregando dados de Customer Success...</p>;
    if (errorCS) return <p className="text-center p-10 text-red-400">Erro: {errorCS}</p>;

    return (
        <>
            {/* Cabeçalho da Página */}
            <div className="flex items-center gap-4 mb-6">
                <Image src={logoEmpresa} alt={`Logo ${selectedEmpresa}`} width={180} height={60} style={{ objectFit: 'contain' }} />
                <h1 className="text-3xl font-bold text-white">Customer Success</h1>
            </div>

            {/* Sistema de Abas */}
            <div className="border-b border-white/20 mb-6">
                <nav className="-mb-px flex gap-6">
                    <button
                        onClick={() => setActiveTab('onboarding')}
                        className={`py-2 px-1 border-b-2 font-semibold transition-colors text-sm ${activeTab === 'onboarding' ? 'border-acelerar-light-blue text-acelerar-light-blue' : 'border-transparent text-white/60 hover:text-white'}`}
                    >
                        🚀 Onboarding
                    </button>
                    <button
                        onClick={() => setActiveTab('ongoing')}
                        className={`py-2 px-1 border-b-2 font-semibold transition-colors text-sm ${activeTab === 'ongoing' ? 'border-acelerar-light-blue text-acelerar-light-blue' : 'border-transparent text-white/60 hover:text-white'}`}
                    >
                        ❤️ Ongoing
                    </button>
                </nav>
            </div>

            {/* Conteúdo das Abas */}
            <div>
                {/* Conteúdo da Aba Onboarding */}
                {activeTab === 'onboarding' && (
                    <div className="space-y-6 animate-fade-in">
                        {/* Seção 1: KPIs de Onboarding */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-white/5 p-4 rounded-lg border border-dashed border-white/20 min-h-[100px] flex flex-col justify-center items-center"><p className="text-sm text-white/50">(KPI: Clientes em Onboarding)</p></div>
                            <div className="bg-white/5 p-4 rounded-lg border border-dashed border-white/20 min-h-[100px] flex flex-col justify-center items-center"><p className="text-sm text-white/50">(KPI: MRR em Onboarding)</p></div>
                            <div className="bg-white/5 p-4 rounded-lg border border-dashed border-white/20 min-h-[100px] flex flex-col justify-center items-center"><p className="text-sm text-white/50">(KPI: Tempo Médio de Onboarding)</p></div>
                            <div className="bg-white/5 p-4 rounded-lg border border-dashed border-white/20 min-h-[100px] flex flex-col justify-center items-center"><p className="text-sm text-white/50">(KPI: Onboardings Concluídos)</p></div>
                        </div>
                        {/* Seção 2: Funil de Etapas */}
                        <div className="bg-white/5 p-4 rounded-lg border border-dashed border-white/20 min-h-[250px] flex flex-col justify-center items-center"><p className="text-sm text-white/50">(Gráfico: Funil de Etapas do Onboarding)</p></div>
                        {/* Seção 3: Tabela de Clientes */}
                        <div className="bg-white/5 p-4 rounded-lg border border-dashed border-white/20 min-h-[300px] flex flex-col justify-center items-center"><p className="text-sm text-white/50">(Tabela: Clientes em Onboarding)</p></div>
                    </div>
                )}

                {/* Conteúdo da Aba Ongoing */}
                {activeTab === 'ongoing' && (
                    <div className="space-y-6 animate-fade-in">
                        {/* Seção 1: KPIs de Ongoing */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-white/5 p-4 rounded-lg border border-dashed border-white/20 min-h-[100px] flex flex-col justify-center items-center"><p className="text-sm text-white/50">(KPI: Clientes Ativos)</p></div>
                            <div className="bg-white/5 p-4 rounded-lg border border-dashed border-white/20 min-h-[100px] flex flex-col justify-center items-center"><p className="text-sm text-white/50">(KPI: MRR Ativo)</p></div>
                            <div className="bg-white/5 p-4 rounded-lg border border-dashed border-white/20 min-h-[100px] flex flex-col justify-center items-center"><p className="text-sm text-white/50">(KPI: Health Score Médio)</p></div>
                            <div className="bg-white/5 p-4 rounded-lg border border-dashed border-white/20 min-h-[100px] flex flex-col justify-center items-center"><p className="text-sm text-white/50">(KPI: MRR em Risco)</p></div>
                        </div>
                        {/* Seção 2: Gráfico de Saúde */}
                        <div className="bg-white/5 p-4 rounded-lg border border-dashed border-white/20 min-h-[250px] flex flex-col justify-center items-center"><p className="text-sm text-white/50">(Gráfico: Saúde da Carteira)</p></div>
                        {/* Seção 3: Tabela de Atividades */}
                        <div className="bg-white/5 p-4 rounded-lg border border-dashed border-white/20 min-h-[300px] flex flex-col justify-center items-center"><p className="text-sm text-white/50">(Tabela: Atividades e Engajamento)</p></div>
                    </div>
                )}
            </div>
        </>
    );
}
