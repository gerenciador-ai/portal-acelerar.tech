// Arquivo: src/app/comercial/inadimplencia/components/InadimplenciaDetailTable.js
"use client";

const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
const formatDate = (dateString) => new Date(dateString).toLocaleDateString('pt-BR', { timeZone: 'UTC' });

export default function InadimplenciaDetailTable({ data, empresa }) {
    
    const handleExportCSV = () => {
        const headers = ['Data de Vencimento', 'CPF/CNPJ', 'Nome', 'Valor da Parcela', 'Dias em Atraso', 'Faixa de Atraso'];
        const rows = data.map(item => [
            formatDate(item.vencimento),
            item.clienteCpfCnpj,
            `"${item.clienteNome.replace(/"/g, '""')}"`,
            item.valor.toString().replace('.', ','),
            item.diasAtraso,
            item.faixaAtraso
        ].join(';'));

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(';'), ...rows].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `inadimplencia_${empresa.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (!data || data.length === 0) {
        return null;
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-white">Detalhamento das Parcelas</h3>
                {/* CORREÇÃO FINAL: Classes do botão atualizadas para o padrão EXATO da imagem. */}
                <button
                    onClick={handleExportCSV}
                    className="px-4 py-2 text-sm font-semibold bg-acelerar-light-blue text-white rounded-md hover:bg-blue-400 transition-colors"
                >
                    Exportar CSV
                </button>
            </div>
            <div className="overflow-auto max-h-96">
                <table className="w-full text-sm text-left text-white/90">
                    <thead className="text-xs text-acelerar-gold-light uppercase bg-black/30 sticky top-0">
                        <tr>
                            <th scope="col" className="px-4 py-2">Vencimento</th>
                            <th scope="col" className="px-4 py-2">CPF/CNPJ</th>
                            <th scope="col" className="px-4 py-2">Nome</th>
                            <th scope="col" className="px-4 py-2 text-right">Valor</th>
                            <th scope="col" className="px-4 py-2">Faixa de Atraso</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((item) => (
                            <tr key={item.idParcela} className="border-b border-white/10 hover:bg-white/5">
                                <td className="px-4 py-2">{formatDate(item.vencimento)}</td>
                                <td className="px-4 py-2">{item.clienteCpfCnpj}</td>
                                <td className="px-4 py-2 font-medium">{item.clienteNome}</td>
                                <td className="px-4 py-2 text-right">{formatCurrency(item.valor)}</td>
                                <td className="px-4 py-2">{item.faixaAtraso}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
