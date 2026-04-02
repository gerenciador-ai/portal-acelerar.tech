"use client";
import { useMemo } from 'react';
import { FaQuestionCircle } from 'react-icons/fa'; // Importa um ícone de interrogação

// Componente principal da nova tabela de auditoria
export default function AuditTable({ dealsGanhos, dealsGerados }) {
    const { 
        matrixGerados, matrixGanhos, 
        sdrList, vendedorList, 
        sdrTotals, vendedorTotals, 
        grandTotal 
    } = useMemo(() => {
        const processDeals = (deals, filterByVendedor = false) => {
            const matrix = {};
            const sdrTotals = {};
            const vendedorTotals = {};
            let grandTotal = 0;
            const sdrSet = new Set();
            const vendedorSet = new Set();

            deals.forEach(deal => {
                // A regra de ouro: só processa se tiver SDR e Vendedor definidos
                if (deal.sdr && deal.vendedor && deal.sdr !== 'N/A' && deal.vendedor !== 'N/A') {
                    sdrSet.add(deal.sdr);
                    vendedorSet.add(deal.vendedor);

                    const key = `${deal.sdr}|${deal.vendedor}`;
                    matrix[key] = (matrix[key] || 0) + 1;

                    sdrTotals[deal.sdr] = (sdrTotals[deal.sdr] || 0) + 1;
                    vendedorTotals[deal.vendedor] = (vendedorTotals[deal.vendedor] || 0) + 1;
                    grandTotal++;
                } else if (!filterByVendedor && deal.sdr && deal.sdr !== 'N/A') {
                    // Adiciona SDRs à lista mesmo que não tenham handoff, para garantir que todos apareçam
                    sdrSet.add(deal.sdr);
                }
            });
            return { matrix, sdrTotals, vendedorTotals, grandTotal, sdrSet, vendedorSet };
        };

        const ganhos = processDeals(dealsGanhos, true);
        const gerados = processDeals(dealsGerados, false);

        // Combina as listas de SDRs e Vendedores de ambos os datasets para garantir que ninguém falte
        const combinedSdrSet = new Set([...gerados.sdrSet, ...ganhos.sdrSet]);
        const combinedVendedorSet = new Set([...gerados.vendedorSet, ...ganhos.vendedorSet]);

        const sdrList = Array.from(combinedSdrSet).sort();
        const vendedorList = Array.from(combinedVendedorSet).sort();

        return {
            matrixGanhos: ganhos.matrix,
            matrixGerados: gerados.matrix,
            sdrList,
            vendedorList,
            sdrTotals: { ganhos: ganhos.sdrTotals, gerados: gerados.sdrTotals },
            vendedorTotals: { ganhos: ganhos.vendedorTotals, gerados: gerados.vendedorTotals },
            grandTotal: { ganhos: ganhos.grandTotal, gerados: gerados.grandTotal }
        };
    }, [dealsGanhos, dealsGerados]);

    if (sdrList.length === 0 || vendedorList.length === 0) {
        return (
             <div className="bg-white/10 p-4 rounded-lg">
                <h3 className="text-sm font-bold text-acelerar-gold-light uppercase tracking-wider mb-2 flex items-center gap-2">
                    📋 Auditoria de Negócios (Geração vs. Conversão)
                </h3>
                <p className="text-center text-sm text-white/40 pt-8">Sem dados de interação SDR/Vendedor para exibir.</p>
            </div>
        )
    }

    return (
        <div className="bg-white/10 p-4 rounded-lg overflow-x-auto">
            <h3 className="text-sm font-bold text-acelerar-gold-light uppercase tracking-wider mb-4 flex items-center gap-2">
                📋 Auditoria de Negócios (Geração vs. Conversão)
                <span title="Nossa 'Matriz de Geração' só contabiliza os negócios que de fato representam um handoff (uma passagem de bastão) do SDR para um Vendedor específico." className="cursor-help">
                    ❓
                </span>
            </h3>
            <table className="w-full border-collapse text-sm" style={{ minWidth: '800px' }}>
                <thead>
                    <tr>
                        <th rowSpan="2" className="p-2 text-left font-bold text-white/80 border-b-2 border-white/20 align-bottom">SDR / Vendedor</th>
                        {vendedorList.map(vendedor => (
                            <th key={vendedor} colSpan="2" className="p-2 font-bold text-white/80 border-b border-l border-white/10 text-center">{vendedor}</th>
                        ))}
                        <th colSpan="3" className="p-2 font-bold text-acelerar-gold-light border-b border-l border-white/10 text-center">TOTAL</th>
                    </tr>
                    <tr className="bg-white/5">
                        {vendedorList.map(vendedor => (
                            <>
                                <th key={`${vendedor}-ger`} className="p-1.5 font-semibold text-white/60 border-b-2 border-l border-white/10">Ger.</th>
                                <th key={`${vendedor}-conv`} className="p-1.5 font-semibold text-white/60 border-b-2 border-l border-white/10 bg-acelerar-dark-blue/20">Conv.</th>
                            </>
                        ))}
                        <th className="p-1.5 font-semibold text-acelerar-gold-light/80 border-b-2 border-l border-white/10">Ger.</th>
                        <th className="p-1.5 font-semibold text-acelerar-gold-light/80 border-b-2 border-l border-white/10 bg-acelerar-dark-blue/20">Conv.</th>
                        <th className="p-1.5 font-semibold text-acelerar-gold-light/80 border-b-2 border-l border-white/10">Tx. %</th>
                    </tr>
                </thead>
                <tbody>
                    {sdrList.map(sdr => {
                        const totalGerado = sdrTotals.gerados[sdr] || 0;
                        const totalGanho = sdrTotals.ganhos[sdr] || 0;
                        const txConversao = totalGerado > 0 ? ((totalGanho / totalGerado) * 100).toFixed(1) : '0.0';
                        
                        return (
                            <tr key={sdr} className="border-b border-white/10 h-10 hover:bg-white/5">
                                <td className="p-2 font-bold text-white">{sdr}</td>
                                {vendedorList.map(vendedor => (
                                    <>
                                        <td key={`${sdr}-${vendedor}-ger`} className="text-center font-medium text-white/80 border-l border-white/10">{matrixGerados[`${sdr}|${vendedor}`] || 0}</td>
                                        <td key={`${sdr}-${vendedor}-conv`} className="text-center font-bold text-white border-l border-white/10 bg-acelerar-dark-blue/20">{matrixGanhos[`${sdr}|${vendedor}`] || 0}</td>
                                    </>
                                ))}
                                <td className="text-center font-medium text-acelerar-gold-light/80 border-l border-white/10">{totalGerado}</td>
                                <td className="text-center font-bold text-acelerar-gold-light border-l border-white/10 bg-acelerar-dark-blue/20">{totalGanho}</td>
                                <td className={`text-center font-bold border-l border-white/10 ${parseFloat(txConversao) > 50 ? 'text-green-400' : 'text-amber-400'}`}>{txConversao}%</td>
                            </tr>
                        );
                    })}
                </tbody>
                <tfoot>
                    <tr className="bg-white/10 h-10">
                        <td className="p-2 font-bold text-acelerar-gold-light">TOTAL</td>
                        {vendedorList.map(vendedor => (
                            <>
                                <td key={`${vendedor}-total-ger`} className="text-center font-bold text-acelerar-gold-light/80 border-l border-white/10">{vendedorTotals.gerados[vendedor] || 0}</td>
                                <td key={`${vendedor}-total-conv`} className="text-center font-bold text-acelerar-gold-light border-l border-white/10 bg-acelerar-dark-blue/20">{vendedorTotals.ganhos[vendedor] || 0}</td>
                            </>
                        ))}
                        <td className="text-center font-bold text-acelerar-gold-light/80 border-l border-white/10">{grandTotal.gerados}</td>
                        <td className="text-center font-bold text-acelerar-gold-light border-l border-white/10 bg-acelerar-dark-blue/20">{grandTotal.ganhos}</td>
                        <td className={`text-center font-extrabold border-l border-white/10 ${((grandTotal.ganhos / grandTotal.gerados) * 100) > 50 ? 'text-green-400' : 'text-amber-400'}`}>
                            {grandTotal.gerados > 0 ? `${((grandTotal.ganhos / grandTotal.gerados) * 100).toFixed(1)}%` : '0.0%'}
                        </td>
                    </tr>
                </tfoot>
            </table>
        </div>
    );
}
