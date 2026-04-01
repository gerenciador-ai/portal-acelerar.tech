"use client";

const formatCurrency = (value) => (value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const TableRow = ({ deal, isVenda }) => {
    // BLINDAGEM: Garante que 'deal' e 'deal.data' existam antes de tentar usá-los.
    if (!deal || !deal.data) {
        return (
            <tr>
                <td colSpan="5" className="p-2 text-xs text-yellow-400">Registro com dados inválidos.</td>
            </tr>
        );
    }
    
    // Usa a data de churn se existir, senão a data principal.
    const displayDate = deal.data_churn || deal.data;

    return (
        <tr className="border-b border-white/10 hover:bg-white/5">
            <td className="p-2 text-xs">{new Date(displayDate).toLocaleDateString('pt-BR')}</td>
            <td className="p-2 text-sm font-medium">{deal.cliente || 'N/A'}</td>
            <td className="p-2 text-xs hidden md:table-cell">{deal.produto || 'N/A'}</td>
            <td className="p-2 text-xs hidden lg:table-cell">{deal.vendedor || 'N/A'}</td>
            <td className={`p-2 text-sm font-bold ${isVenda ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(deal.mrr)}</td>
        </tr>
    );
};

const ResumoTable = ({ title, deals, isVenda }) => (
    <div className="bg-white/5 p-4 rounded-lg flex-grow flex flex-col">
        <h3 className="text-white font-bold mb-3">{title}</h3>
        <div className="overflow-y-auto flex-grow">
            <table className="w-full text-left text-white/80">
                <thead className="sticky top-0 bg-acelerar-dark-blue/80 backdrop-blur-sm">
                    <tr className="border-b border-white/20">
                        <th className="p-2 text-xs font-bold uppercase">Data</th>
                        <th className="p-2 text-xs font-bold uppercase">Cliente</th>
                        <th className="p-2 text-xs font-bold uppercase hidden md:table-cell">Produto</th>
                        <th className="p-2 text-xs font-bold uppercase hidden lg:table-cell">Vendedor</th>
                        <th className="p-2 text-xs font-bold uppercase">MRR</th>
                    </tr>
                </thead>
                <tbody>
                    {deals && deals.length > 0 ? (
                        deals.map((deal, index) => <TableRow key={deal.id || index} deal={deal} isVenda={isVenda} />)
                    ) : (
                        <tr>
                            <td colSpan="5" className="text-center p-4 text-sm text-white/50">Nenhum registro no período.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    </div>
);

export default function TabelasResumo({ tableData }) {
    // A verificação crucial: esperamos o objeto tableData.
    if (!tableData) {
        return <div className="text-center text-white/50 col-span-full p-10">Aguardando dados para as tabelas...</div>;
    }

    // Desestruturamos os dados aqui dentro, com segurança.
    const { vendas, cancelados } = tableData;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6 h-96">
            <ResumoTable title="Resumo de Vendas (Dados Reais)" deals={vendas} isVenda={true} />
            <ResumoTable title="Resumo de Cancelamentos (Dados Reais)" deals={cancelados} isVenda={false} />
        </div>
    );
}
