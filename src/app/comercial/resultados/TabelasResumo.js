"use client";

// --- DADOS FICTÍCIOS PARA O TESTE ---
const FAKE_VENDAS = [
    { id: 1, data: '2026-03-15T12:00:00Z', cliente: 'Cliente Fictício A (Venda)', produto: 'Produto X', vendedor: 'Vendedor 1', mrr: 1500 },
    { id: 2, data: '2026-02-20T12:00:00Z', cliente: 'Cliente Fictício B (Venda)', produto: 'Produto Y', vendedor: 'Vendedor 2', mrr: 850 },
    { id: 3, data: '2026-01-10T12:00:00Z', cliente: 'Cliente Fictício C (Venda)', produto: 'Produto X', vendedor: 'Vendedor 1', mrr: 2200 },
];

const FAKE_CANCELAMENTOS = [
    { id: 4, data: '2026-03-05T12:00:00Z', cliente: 'Cliente Fictício D (Churn)', produto: 'Produto Z', vendedor: 'N/A', mrr: 990 },
];
// --- FIM DOS DADOS FICTÍCIOS ---


// Função para formatar valores monetários
const formatCurrency = (value) => (value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Componente para uma única linha da tabela
const TableRow = ({ deal, isVenda }) => (
    <tr className="border-b border-white/10 hover:bg-white/5">
        <td className="p-2 text-xs">{new Date(deal.data).toLocaleDateString('pt-BR')}</td>
        <td className="p-2 text-sm font-medium">{deal.cliente}</td>
        <td className="p-2 text-xs hidden md:table-cell">{deal.produto}</td>
        <td className="p-2 text-xs hidden lg:table-cell">{deal.vendedor}</td>
        <td className={`p-2 text-sm font-bold ${isVenda ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(deal.mrr)}</td>
    </tr>
);

// Componente para a tabela inteira
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
                    {deals.length > 0 ? (
                        deals.map(deal => <TableRow key={deal.id} deal={deal} isVenda={isVenda} />)
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

// O componente principal agora IGNORA as props e usa os dados FAKE
export default function TabelasResumo({ vendas, cancelamentos }) {
    // A verificação original é ignorada para o teste.
    // if (!vendas || !cancelamentos) {
    //     return <div className="text-center text-white/50 col-span-full p-10">Carregando dados das tabelas...</div>;
    // }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6 h-96">
            <ResumoTable title="Resumo de Vendas (TESTE)" deals={FAKE_VENDAS} isVenda={true} />
            <ResumoTable title="Resumo de Cancelamentos (TESTE)" deals={FAKE_CANCELAMENTOS} isVenda={false} />
        </div>
    );
}
