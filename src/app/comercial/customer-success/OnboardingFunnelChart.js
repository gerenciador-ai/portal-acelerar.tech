// Arquivo: src/app/comercial/customer-success/OnboardingFunnelChart.js
"use client";
import { useMemo } from 'react';

// --- Componente para uma única barra do funil ---
function FunnelBar({ name, value, maxValue }) {
    // Define uma largura mínima de 25% para garantir que o texto seja sempre legível,
    // e uma largura máxima de 100%. A escala real acontece entre esses dois pontos.
    const minWidth = 25;
    const maxWidth = 100;
    const scale = maxWidth - minWidth;
    const percentage = minWidth + (maxValue > 0 ? (value / maxValue) * scale : 0);

    return (
        <div className="relative w-full h-8 bg-white/5 rounded-md mb-2 flex items-center justify-center">
            <div 
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-acelerar-dark-blue to-acelerar-light-blue/80 rounded-md"
                style={{ width: `${percentage}%` }}
            ></div>
            <div className="relative text-sm font-bold text-white drop-shadow-md">
                {`${name} (${value})`}
            </div>
        </div>
    );
}

// --- Componente Principal do Gráfico de Funil ---
export default function OnboardingFunnelChart({ deals }) {
    
    // 1. Define a ordem correta e os nomes das etapas do funil.
    const STAGES_ORDER = [
        '🏁 Kick-off',
        '⚙️ Setup',
        '🎓 Treinamento',
        '🚀 Go-Live',
        '📈 Acompanhamento Inicial'
    ];

    // 2. Calcula a contagem de clientes em cada etapa.
    const funnelData = useMemo(() => {
        if (!deals || deals.length === 0) {
            return [];
        }

        // Filtra apenas os clientes que estão ativamente em onboarding.
        const hoje = new Date();
        const limiteDias = 120;
        const dataLimite = new Date(new Date().setDate(hoje.getDate() - limiteDias));
        
        const activeDeals = deals.filter(d => 
            d.status === 'Aberto' && d.dataCriacao > dataLimite
        );

        // Conta quantos deals existem em cada etapa definida.
        const stageCounts = activeDeals.reduce((acc, deal) => {
            const stageName = deal.etapa;
            if (stageName) {
                acc[stageName] = (acc[stageName] || 0) + 1;
            }
            return acc;
        }, {});

        // Mapeia os resultados para o formato do gráfico, garantindo a ordem correta.
        return STAGES_ORDER.map(stageName => ({
            name: stageName,
            value: stageCounts[stageName] || 0
        }));

    }, [deals]);

    // Encontra o valor máximo para a escala do gráfico.
    const maxValue = useMemo(() => 
        funnelData.length > 0 ? Math.max(...funnelData.map(d => d.value)) : 0
    , [funnelData]);

    return (
        <div className="bg-white/10 p-4 rounded-lg">
            <h3 className="text-sm font-bold text-acelerar-gold-light uppercase tracking-wider mb-4 border-b border-white/10 pb-2">
                🔥 Funil de Etapas do Onboarding
            </h3>
            <div className="space-y-1">
                {funnelData.length > 0 && maxValue > 0 ? (
                    funnelData.map((item) => (
                        <FunnelBar 
                            key={item.name}
                            name={item.name}
                            value={item.value}
                            maxValue={maxValue}
                        />
                    ))
                ) : (
                    <p className="text-center text-sm text-white/40 pt-8">
                        Sem clientes ativos em onboarding para exibir.
                    </p>
                )}
            </div>
        </div>
    );
}
