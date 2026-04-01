"use client";
import { useState } from 'react';

const formatCurrency = (value) => (value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const exportToCSV = (data, headers, filename) => {
    const csvRows = [];
    csvRows.push(headers.map(h => h.label).join(';'));

    for (const row of data) {
        const values = headers.map(header => {
            // Usa a chave correta para o valor
            const value = row[header.key] || '';
            // Formata a data se for o caso
            if ((header.key === 'data' || header.key === 'data_churn') && value) {
                return new Date(value).toLocaleDateString('pt-BR');
            }
            const cleanedValue = String(value).replace(/;/g, ',').replace(/\n/g, ' ');
            return cleanedValue;
        });
        csvRows.push(values.join(';'));
    }

    const csvString = csvRows.join('\n');
    const blob = new Blob([`\uFEFF${csvString}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

const ResumoTable = ({ title, deals, headers, filename, isVenda }) => (
    <div className="bg-white/5 p-4 rounded-lg flex-grow flex flex-col">
        <div className="flex justify-between items-center mb-3">
            <h3 className="text-white font-bold">{title}</h3>
            <button
                onClick={() => exportToCSV(deals, headers, filename)}
                className="bg-acelerar-light-blue/80 text-white text-xs font-bold py-1 px-3 rounded hover:bg-acelerar-light-blue transition-colors"
            >
                Exportar CSV
            </button>
        </div>
        <div className="overflow-y-auto flex-grow">
            <table className="w-full text-left text-white/80">
                <thead className="sticky top-0 bg-acelerar-dark-blue/80 backdrop-blur-sm">
                    <tr className="border-b border-white/20">
                        {headers.map(h => (
                            <th key={h.key} className={`p-2 text-xs font-bold uppercase ${h.hidden || ''}`}>{h.label}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {deals && deals.length > 0 ? (
                        deals.map((deal, index) => (
                            <tr key={deal.id || index} className="border-b border-white/10 hover:bg-white/5">
                                {headers.map(h => (
                                    <td key={`${h.key}-${deal.id || index}`} className={`p-2 text-sm ${h.hidden || ''} ${h.isCurrency ? (isVenda ? 'text-green-400' : 'text-red-400') : ''} ${h.isCurrency ? 'font-bold' : ''}`}>
                                        {h.isCurrency ? formatCurrency(deal[h.key]) : (h.isDate ? new Date(deal[h.key] || deal['data']).toLocaleDateString('pt-BR') : (deal[h.key] || 'N/A'))}
                                    </td>
                                ))}
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan={headers.length} className="text-center p-4 text-sm text-white/50">Nenhum registro no período.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    </div>
);

export default function TabelasResumo({ tableData }) {
    if (!tableData) {
        return <div className="text-center text-white/50 col-span-full p-10">Aguardando dados para as tabelas...</div>;
    }

    const { vendas, cancelados } = tableData;

    const headersVendas = [
        { key: 'data', label: 'Data', isDate: true },
        { key: 'CNPJ_Cliente', label: 'CNPJ', hidden: 'hidden lg:table-cell' }, // CORREÇÃO FINAL AQUI
        { key: 'cliente', label: 'Cliente' },
        { key: 'vendedor', label: 'Vendedor', hidden: 'hidden md:table-cell' },
        { key: 'sdr', label: 'SDR', hidden: 'hidden lg:table-cell' },
        { key: 'produto', label: 'Produto', hidden: 'hidden md:table-cell' },
        { key: 'mrr', label: 'MRR', isCurrency: true },
        { key: 'adesao', label: 'Adesão', isCurrency: true, hidden: 'hidden lg:table-cell' },
        { key: 'upsell', label: 'Upsell', isCurrency: true, hidden: 'hidden lg:table-cell' },
    ];

    const headersCancelamentos = [
        { key: 'data_churn', label: 'Data Churn', isDate: true },
        { key: 'CNPJ_Cliente', label: 'CNPJ', hidden: 'hidden lg:table-cell' }, // CORREÇÃO FINAL AQUI
        { key: 'cliente', label: 'Cliente' },
        { key: 'vendedor', label: 'Vendedor', hidden: 'hidden md:table-cell' },
        { key: 'sdr', label: 'SDR', hidden: 'hidden lg:table-cell' },
        { key: 'produto', label: 'Produto', hidden: 'hidden md:table-cell' },
        { key: 'mrr', label: 'MRR Perdido', isCurrency: true },
    ];

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6 h-[32rem]">
            <ResumoTable title="Resumo de Vendas" deals={vendas} headers={headersVendas} filename="resumo_vendas.csv" isVenda={true} />
            <ResumoTable title="Resumo de Cancelamentos (Churn)" deals={cancelados} headers={headersCancelamentos} filename="resumo_cancelamentos.csv" isVenda={false} />
        </div>
    );
}
