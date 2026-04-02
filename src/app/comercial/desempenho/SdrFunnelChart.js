"use client";
import { useMemo } from 'react';

// Componente para uma única barra do funil
function FunnelBar({ name, count, maxValue }) {
    // A largura da barra é relativa ao SDR com mais negócios
    const percentage = maxValue > 0 ? (count / maxValue) * 100 : 0;

    return (
        <div className="flex justify-center items-center w-full mb-1.5">
            <div 
                className="h-8 bg-gradient-to-r from-acelerar-dark-blue to-acelerar-light-blue/80 rounded-md flex justify-center items-center px-4"
                style={{ width: `${percentage}%` }}
            >
                <span className="text-white font-bold text-sm truncate drop-shadow-md">
                    {name} ({count})
                </span>
            </div>
        </div>
    );
}

// Componente principal que calcula e renderiza o funil
export default function SdrFunnelChart({ deals }) {
    // Calcula a contagem de negócios por SDR
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

        // Transforma o mapa em um array e ordena por contagem (maior para menor)
        return Object.entries(sdrCount)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);

    }, [deals]);

    // Pega o valor máximo para calcular a proporção das barras
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
