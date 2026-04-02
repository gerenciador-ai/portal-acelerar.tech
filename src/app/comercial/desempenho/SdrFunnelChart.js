"use client";
import { useMemo } from 'react';

// Componente para uma única barra do funil
function FunnelBar({ name, count, maxValue }) {
    // --- LÓGICA DE CÁLCULO DA LARGURA ALTERADA ---
    const minWidthPercentage = 25; // Garante que a menor barra tenha pelo menos 25% da largura total
    const maxWidthPercentage = 100; // A maior barra terá 100%

    let percentage;
    if (maxValue === 0) {
        percentage = minWidthPercentage;
    } else if (count === maxValue) {
        percentage = maxWidthPercentage;
    } else {
        // Aplica uma escala não-linear. A raiz quadrada suaviza a diferença.
        const scale = Math.sqrt(count) / Math.sqrt(maxValue);
        percentage = minWidthPercentage + (maxWidthPercentage - minWidthPercentage) * scale;
    }
    // --- FIM DA LÓGICA ALTERADA ---

    return (
        <div className="flex justify-center items-center w-full mb-1.5">
            <div 
                className="h-8 bg-gradient-to-r from-acelerar-dark-blue to-acelerar-light-blue/80 rounded-md flex justify-center items-center px-4 overflow-hidden" // Adicionado overflow-hidden
                style={{ width: `${percentage}%` }}
            >
                <span className="text-white font-bold text-sm whitespace-nowrap drop-shadow-md">
                    {name} ({count})
                </span>
            </div>
        </div>
    );
}

// Componente principal que calcula e renderiza o funil
export default function SdrFunnelChart({ deals }) {
    const sdrPerformance = useMemo(() => {
        if (!deals || deals.length === 0) {
            return [];
        }

        const sdrCount = deals.reduce((acc, deal) => {
            const sdrName = deal.sdr;
            if (sdrName && sdrName !== 'N/A') {
                acc[sdrName] = (acc[sdrName] || 0) + 1;
            }
            return acc;
        }, {});

        return Object.entries(sdrCount)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);

    }, [deals]);

    const maxValue = sdrPerformance.length > 0 ? sdrPerformance[0].count : 0;

    return (
        <div className="bg-white/10 p-4 rounded-lg">
            <h3 className="text-sm font-bold text-acelerar-gold-light uppercase tracking-wider mb-4 border-b border-white/10 pb-2">
                🔥 Funil de SDRs (Novos Negócios)
            </h3>
            <div className="space-y-1 pt-2">
                {sdrPerformance.length > 0 ? (
                    sdrPerformance.map(sdr => (
                        <FunnelBar 
                            key={sdr.name}
                            name={sdr.name}
                            count={sdr.count}
                            maxValue={maxValue}
                        />
                    ))
                ) : (
                    <p className="text-center text-sm text-white/40 pt-8">Sem dados para exibir.</p>
                )}
            </div>
        </div>
    );
}
