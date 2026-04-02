"use client";
import { useMemo } from 'react';

// Componente para a célula da tabela com barra de dados
function DataCell({ value, maxValue }) {
    const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
    const bgColor = value > 0 ? 'bg-acelerar-light-blue/70' : 'bg-transparent';

    return (
        <td className="p-0 text-center border-l border-white/10">
            <div className="relative h-full w-full flex items-center justify-center">
                <div 
                    className={`absolute left-0 top-0 h-full ${bgColor}`}
                    style={{ width: `${percentage}%` }}
                ></div>
                <span className="relative font-semibold text-white">{value}</span>
            </div>
        </td>
    );
}

// Componente principal da tabela de auditoria
export default function AuditTable({ deals }) {
    const { matrix, sdrList, vendedorList, sdrTotals, vendedorTotals, grandTotal } = useMemo(() => {
        if (!deals || deals.length === 0) {
            return { matrix: {}, sdrList: [], vendedorList: [], sdrTotals: {}, vendedorTotals: {}, grandTotal: 0 };
        }

        const sdrSet = new Set();
        const vendedorSet = new Set();
        const matrix = {};
        const sdrTotals = {};
        const vendedorTotals = {};
        let grandTotal = 0;

        deals.forEach(deal => {
            if (deal.sdr && deal.vendedor && deal.sdr !== 'N/A' && deal.vendedor !== 'N/A') {
                sdrSet.add(deal.sdr);
                vendedorSet.add(deal.vendedor);

                const key = `${deal.sdr}|${deal.vendedor}`;
                matrix[key] = (matrix[key] || 0) + 1;

                sdrTotals[deal.sdr] = (sdrTotals[deal.sdr] || 0) + 1;
                vendedorTotals[deal.vendedor] = (vendedorTotals[deal.vendedor] || 0) + 1;
                grandTotal++;
            }
        });

        const sdrList = Array.from(sdrSet).sort();
        const vendedorList = Array.from(vendedorSet).sort();

        return { matrix, sdrList, vendedorList, sdrTotals, vendedorTotals, grandTotal };
    }, [deals]);

    const maxCellValue = Math.max(...Object.values(matrix), 0);

    if (sdrList.length === 0 || vendedorList.length === 0) {
        return (
             <div className="bg-white/10 p-4 rounded-lg">
                <h3 className="text-sm font-bold text-acelerar-gold-light uppercase tracking-wider mb-2">
                    📋 Auditoria de Negócios Convertidos (Ganhos)
                </h3>
                <p className="text-center text-sm text-white/40 pt-8">Sem dados de interação SDR/Vendedor para exibir.</p>
            </div>
        )
    }

    return (
        <div className="bg-white/10 p-4 rounded-lg overflow-x-auto">
            <h3 className="text-sm font-bold text-acelerar-gold-light uppercase tracking-wider mb-4">
                📋 Auditoria de Negócios Convertidos (Ganhos)
            </h3>
            <table className="w-full border-collapse text-sm">
                <thead>
                    <tr className="bg-white/10">
                        <th className="p-2 text-left font-bold text-white/80 border-b border-white/10">SDR / Vendedor</th>
                        {vendedorList.map(vendedor => (
                            <th key={vendedor} className="p-2 font-bold text-white/80 border-b border-l border-white/10">{vendedor}</th>
                        ))}
                        <th className="p-2 font-bold text-acelerar-gold-light border-b border-l border-white/10">TOTAL</th>
                    </tr>
                </thead>
                <tbody>
                    {sdrList.map(sdr => (
                        <tr key={sdr} className="border-b border-white/10 h-10">
                            <td className="p-2 font-bold text-white">{sdr}</td>
                            {vendedorList.map(vendedor => (
                                <DataCell 
                                    key={`${sdr}-${vendedor}`}
                                    value={matrix[`${sdr}|${vendedor}`] || 0}
                                    maxValue={maxCellValue}
                                />
                            ))}
                            <td className="p-2 text-center font-bold text-acelerar-gold-light bg-white/10 border-l border-white/10">{sdrTotals[sdr] || 0}</td>
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr className="bg-white/10 h-10">
                        <td className="p-2 font-bold text-acelerar-gold-light">TOTAL</td>
                        {vendedorList.map(vendedor => (
                            <td key={vendedor} className="p-2 text-center font-bold text-acelerar-gold-light border-l border-white/10">{vendedorTotals[vendedor] || 0}</td>
                        ))}
                        <td className="p-2 text-center font-extrabold text-white bg-acelerar-gold-light/80 border-l border-white/10">{grandTotal}</td>
                    </tr>
                </tfoot>
            </table>
        </div>
    );
}
