"use client";
import { useMemo } from 'react';

// Componente para uma única barra de ranking
function RankingBar({ name, value, maxValue, index }) {
    const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
    const formatCurrency = (val) => `R$ ${Math.round(val || 0).toLocaleString('pt-BR')}`;

    return (
        <div className="relative w-full h-7 bg-white/5 rounded-md mb-2 flex items-center">
            <div 
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-acelerar-dark-blue to-acelerar-light-blue/80 rounded-md"
                style={{ width: `${percentage}%` }}
            ></div>
            <div className="relative w-full flex justify-between items-center px-3 text-sm">
                <span className="font-bold text-white truncate drop-shadow-md">{`${index + 1}. ${name}`}</span>
                {/* AQUI ESTÁ A ALTERAÇÃO */}
                <span className="font-semibold text-white drop-shadow-md">{formatCurrency(value)}</span>
            </div>
        </div>
    );
}
// Componente para um único gráfico de ranking (Vendedor ou SDR)
function RankingChart({ title, data, topN = null }) {
    // Ordena os dados por valor (MRR) e aplica o filtro topN se necessário
    const rankedData = useMemo(() => {
        const sorted = data.sort((a, b) => b.value - a.value);
        return topN ? sorted.slice(0, topN) : sorted;
    }, [data, topN]);

    const maxValue = rankedData.length > 0 ? rankedData[0].value : 0;

    return (
        <div className="bg-white/10 p-4 rounded-lg h-full">
            <h3 className="text-sm font-bold text-acelerar-gold-light uppercase tracking-wider mb-4 border-b border-white/10 pb-2">
                {title}
            </h3>
            <div className="space-y-1">
                {rankedData.length > 0 ? (
                    rankedData.map((item, index) => (
                        <RankingBar 
                            key={item.name}
                            name={item.name}
                            value={item.value}
                            maxValue={maxValue}
                            index={index}
                        />
                    ))
                ) : (
                    <p className="text-center text-sm text-white/40 pt-8">Sem dados para exibir.</p>
                )}
            </div>
        </div>
    );
}

// Componente principal que calcula e prepara os dados para os dois rankings
export default function RankingCharts({ deals }) {
    const { vendedorRanking, sdrRanking } = useMemo(() => {
        if (!deals || deals.length === 0) {
            return { vendedorRanking: [], sdrRanking: [] };
        }

        const createRanking = (key) => {
            const rankingMap = deals.reduce((acc, deal) => {
                const name = deal[key];
                if (name && name !== 'N/A') {
                    acc[name] = (acc[name] || 0) + deal.mrr;
                }
                return acc;
            }, {});

            return Object.entries(rankingMap).map(([name, value]) => ({ name, value }));
        };

        return {
            vendedorRanking: createRanking('vendedor'),
            sdrRanking: createRanking('sdr')
        };
    }, [deals]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RankingChart title="🏆 Vendedores (MRR)" data={vendedorRanking} />
            <RankingChart title="🏆 TOP 5 SDRs (MRR)" data={sdrRanking} topN={5} />
        </div>
    );
}
