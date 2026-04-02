"use client";
import { useMemo } from 'react';

// Paleta de cores para os SDRs. Adicione mais cores se tiver mais SDRs.
const SDR_COLORS = [
    '#3498db', '#e74c3c', '#2ecc71', '#f1c40f', '#9b59b6',
    '#1abc9c', '#e67e22', '#34495e', '#d35400', '#c0392b'
];

// Componente principal do gráfico de barras empilhadas
export default function StackedAuditChart({ deals }) {
    const { dataByVendedor, sdrColorMap } = useMemo(() => {
        if (!deals || deals.length === 0) {
            return { dataByVendedor: [], sdrColorMap: {} };
        }

        const sdrSet = new Set();
        deals.forEach(deal => {
            if (deal.sdr && deal.sdr !== 'N/A') sdrSet.add(deal.sdr);
        });

        const sortedSdrs = Array.from(sdrSet).sort();
        const sdrColorMap = sortedSdrs.reduce((acc, sdr, index) => {
            acc[sdr] = SDR_COLORS[index % SDR_COLORS.length];
            return acc;
        }, {});

        const performance = deals.reduce((acc, deal) => {
            const { vendedor, sdr } = deal;
            if (vendedor && sdr && vendedor !== 'N/A' && sdr !== 'N/A') {
                if (!acc[vendedor]) {
                    acc[vendedor] = { total: 0, sdrCounts: {} };
                }
                acc[vendedor].total++;
                acc[vendedor].sdrCounts[sdr] = (acc[vendedor].sdrCounts[sdr] || 0) + 1;
            }
            return acc;
        }, {});

        const dataByVendedor = Object.entries(performance)
            .map(([vendedor, data]) => ({
                vendedor,
                total: data.total,
                segments: Object.entries(data.sdrCounts)
                    .map(([sdr, count]) => ({
                        sdr,
                        count,
                        percentage: (count / data.total) * 100,
                        color: sdrColorMap[sdr]
                    }))
                    .sort((a, b) => b.count - a.count) // Ordena segmentos do maior para o menor
            }))
            .sort((a, b) => b.total - a.total); // Ordena vendedores pelo total

        return { dataByVendedor, sdrColorMap };
    }, [deals]);

    if (dataByVendedor.length === 0) {
        return null; // Não renderiza nada se não houver dados
    }

    return (
        <div className="bg-white/10 p-4 rounded-lg">
            <h3 className="text-sm font-bold text-acelerar-gold-light uppercase tracking-wider mb-4">
                📊 Distribuição de negócios convertidos (SDR vs Vendedor)
            </h3>
            
            {/* Gráfico */}
            <div className="space-y-5">
                {dataByVendedor.map(({ vendedor, total, segments }) => (
                    <div key={vendedor}>
                        <div className="flex justify-between items-baseline mb-1">
                            <h4 className="font-bold text-white">{vendedor}</h4>
                            <span className="text-sm text-white/70">Total: {total}</span>
                        </div>
                        <div className="w-full h-8 flex rounded-md overflow-hidden bg-white/10">
                            {segments.map(segment => (
                                <div
                                    key={segment.sdr}
                                    style={{ width: `${segment.percentage}%`, backgroundColor: segment.color }}
                                    className="flex items-center justify-center text-white font-bold text-sm"
                                    title={`${segment.sdr}: ${segment.count} venda(s)`}
                                >
                                    {/* Exibe a contagem apenas se a barra for larga o suficiente */}
                                    {segment.percentage > 10 && segment.count}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Legenda */}
            <div className="mt-6 flex flex-wrap gap-x-4 gap-y-2">
                {Object.entries(sdrColorMap).map(([sdr, color]) => (
                    <div key={sdr} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }}></div>
                        <span className="text-xs text-white/80">{sdr}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
