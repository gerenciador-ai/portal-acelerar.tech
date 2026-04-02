"use client";
import { useMemo } from 'react';

// Função para determinar a cor de fundo com base na taxa de conversão
const getCellColor = (rate) => {
    if (rate > 75) return 'bg-green-500/40';
    if (rate > 50) return 'bg-green-500/20';
    if (rate > 25) return 'bg-sky-500/20';
    if (rate > 0) return 'bg-amber-500/20';
    return 'bg-white/5'; // Cor para 0%
};

// Componente principal do Mapa de Calor de Eficiência
export default function AuditTable({ dealsGanhos, dealsGerados }) {
    const { 
        matrixGerados, matrixGanhos, 
        sdrList, vendedorList,
        sdrAverages, vendedorAverages,
        grandAverage
    } = useMemo(() => {
        const processDeals = (deals) => {
            const matrix = {};
            const sdrSet = new Set();
            const vendedorSet = new Set();

            deals.forEach(deal => {
                if (deal.sdr && deal.vendedor && deal.sdr !== 'N/A' && deal.vendedor !== 'N/A') {
                    sdrSet.add(deal.sdr);
                    vendedorSet.add(deal.vendedor);
                    const key = `${deal.sdr}|${deal.vendedor}`;
                    matrix[key] = (matrix[key] || 0) + 1;
                }
            });
            return { matrix, sdrSet, vendedorSet };
        };

        const ganhosData = processDeals(dealsGanhos);
        const geradosData = processDeals(dealsGerados);

        const sdrList = Array.from(new Set([...geradosData.sdrSet, ...ganhosData.sdrSet])).sort();
        const vendedorList = Array.from(new Set([...geradosData.vendedorSet, ...ganhosData.vendedorSet])).sort();

        // Calcular médias por SDR
        const sdrAverages = sdrList.reduce((acc, sdr) => {
            let totalSdrGerado = 0;
            let totalSdrGanho = 0;
            vendedorList.forEach(vendedor => {
                totalSdrGerado += geradosData.matrix[`${sdr}|${vendedor}`] || 0;
                totalSdrGanho += ganhosData.matrix[`${sdr}|${vendedor}`] || 0;
            });
            acc[sdr] = totalSdrGerado > 0 ? (totalSdrGanho / totalSdrGerado) * 100 : 0;
            return acc;
        }, {});

        // Calcular médias por Vendedor
        const vendedorAverages = vendedorList.reduce((acc, vendedor) => {
            let totalVendedorGerado = 0;
            let totalVendedorGanho = 0;
            sdrList.forEach(sdr => {
                totalVendedorGerado += geradosData.matrix[`${sdr}|${vendedor}`] || 0;
                totalVendedorGanho += ganhosData.matrix[`${sdr}|${vendedor}`] || 0;
            });
            acc[vendedor] = totalVendedorGerado > 0 ? (totalVendedorGanho / totalVendedorGerado) * 100 : 0;
            return acc;
        }, {});
        
        // Calcular média geral
        const grandTotalGerado = Object.values(geradosData.matrix).reduce((sum, count) => sum + count, 0);
        const grandTotalGanho = Object.values(ganhosData.matrix).reduce((sum, count) => sum + count, 0);
        const grandAverage = grandTotalGerado > 0 ? (grandTotalGanho / grandTotalGerado) * 100 : 0;

        return {
            matrixGanhos: ganhosData.matrix,
            matrixGerados: geradosData.matrix,
            sdrList,
            vendedorList,
            sdrAverages,
            vendedorAverages,
            grandAverage
        };
    }, [dealsGanhos, dealsGerados]);

    if (sdrList.length === 0 || vendedorList.length === 0) {
        return (
             <div className="bg-white/10 p-4 rounded-lg">
                <h3 className="text-sm font-bold text-acelerar-gold-light uppercase tracking-wider">
                    📋 Mapa de Eficiência (Tx. Conversão SDR x Vendedor)
                </h3>
                <p className="text-center text-sm text-white/40 pt-8">Sem dados de interação SDR/Vendedor para exibir.</p>
            </div>
        )
    }

    return (
        <div className="bg-white/10 p-4 rounded-lg overflow-x-auto">
            <h3 className="text-sm font-bold text-acelerar-gold-light uppercase tracking-wider mb-4">
                📋 Mapa de Eficiência (Tx. Conversão SDR x Vendedor)
            </h3>
            <table className="w-full border-collapse text-sm" style={{ minWidth: '800px' }}>
                <thead>
                    <tr className="bg-white/5">
                        <th className="p-2 text-left font-bold text-white/80 border-b border-white/10">SDR / Vendedor</th>
                        {vendedorList.map(vendedor => (
                            <th key={vendedor} className="p-2 font-bold text-white/80 border-b border-l border-white/10">{vendedor}</th>
                        ))}
                        <th className="p-2 font-bold text-acelerar-gold-light border-b border-l border-white/10">MÉDIA SDR</th>
                    </tr>
                </thead>
                <tbody>
                    {sdrList.map(sdr => (
                        <tr key={sdr} className="border-b border-white/10 h-12 hover:bg-white/10">
                            <td className="p-2 font-bold text-white">{sdr}</td>
                            {vendedorList.map(vendedor => {
                                const gerado = matrixGerados[`${sdr}|${vendedor}`] || 0;
                                const ganho = matrixGanhos[`${sdr}|${vendedor}`] || 0;
                                const txRate = gerado > 0 ? (ganho / gerado) * 100 : 0;
                                const tooltip = `Taxa: ${txRate.toFixed(1)}% (${ganho} de ${gerado})`;
                                
                                return (
                                    <td key={`${sdr}-${vendedor}`} className={`text-center border-l border-white/10 font-bold ${getCellColor(txRate)}`} title={tooltip}>
                                        {txRate.toFixed(0)}%
                                    </td>
                                );
                            })}
                            <td className={`text-center border-l border-white/10 font-bold text-acelerar-gold-light bg-white/10`}>
                                {sdrAverages[sdr].toFixed(0)}%
                            </td>
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr className="bg-white/10 h-12">
                        <td className="p-2 font-bold text-acelerar-gold-light">MÉDIA VENDEDOR</td>
                        {vendedorList.map(vendedor => (
                            <td key={vendedor} className="text-center border-l border-white/10 font-bold text-acelerar-gold-light">
                                {vendedorAverages[vendedor].toFixed(0)}%
                            </td>
                        ))}
                        <td className="text-center border-l border-white/10 font-extrabold text-white bg-acelerar-gold-light/80">
                            {grandAverage.toFixed(0)}%
                        </td>
                    </tr>
                </tfoot>
            </table>
        </div>
    );
}
