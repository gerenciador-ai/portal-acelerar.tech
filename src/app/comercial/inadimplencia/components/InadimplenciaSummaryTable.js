// Arquivo: src/app/comercial/inadimplencia/components/InadimplenciaSummaryTable.js
"use client";

const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export default function InadimplenciaSummaryTable({ data }) {
    if (!data || data.length === 0) {
        return <div className="text-center text-white/50 p-4">Nenhum cliente inadimplente encontrado.</div>;
    }

    return (
        <div>
            <h3 className="text-lg font-semibold text-white mb-4">Resumo por Cliente</h3>
            <div className="overflow-y-auto max-h-80">
                <table className="w-full text-sm text-left text-white/90">
                    <thead className="text-xs text-acelerar-gold-light uppercase bg-black/30 sticky top-0">
                        <tr>
                            <th scope="col" className="px-4 py-2">Cliente</th>
                            <th scope="col" className="px-4 py-2 text-right">Valor Total</th>
                            <th scope="col" className="px-4 py-2 text-center">Parcelas</th>
                            <th scope="col" className="px-4 py-2">Faixa de Atraso</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((item, index) => (
                            <tr key={index} className="border-b border-white/10 hover:bg-white/5">
                                <td className="px-4 py-2 font-medium">{item.cliente}</td>
                                <td className="px-4 py-2 text-right">{formatCurrency(item.valorTotal)}</td>
                                <td className="px-4 py-2 text-center">{item.mensalidadesAtraso}</td>
                                <td className="px-4 py-2">{item.faixaAtraso}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
