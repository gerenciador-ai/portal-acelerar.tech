// Arquivo: src/app/comercial/customer-success/OnboardingFunnelChart.js
"use client";
import { useMemo } from 'react';

// --- Componente FunnelBar (sem alterações) ---
function FunnelBar({ name, value, maxValue }) {
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

// --- Componente Principal do Gráfico (AGORA SIMPLIFICADO) ---
// Ele agora recebe 'activeDeals' já filtrados.
export default function OnboardingFunnelChart({ activeDeals }) {
    
    const STAGES_ORDER = [
        '🏁 Kick-off', '⚙️ Setup', '🎓 Treinamento',
        '🚀 Go-Live', '📈 Acompanhamento Inicial'
    ];

    // A LÓGICA DE FILTRAGEM FOI REMOVIDA DAQUI.
    // O componente agora confia nos dados que recebe.
    const funnelData = useMemo(() => {
        if (!activeDeals || activeDeals.length === 0) {
            return [];
        }

        const stageCounts = activeDeals.reduce((acc, deal) => {
            const stageName = deal.etapa;
            if (stageName) {
                acc[stageName] = (acc[stageName] || 0) + 1;
            }
            return acc;
        }, {});

        return STAGES_ORDER.map(stageName => ({
            name: stageName,
            value: stageCounts[stageName] || 0
        }));

    }, [activeDeals]);

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
