// Arquivo: src/app/comercial/inadimplencia/components/InadimplenciaDetailTable.js
"use client";

const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
const formatDate = (dateString) => new Date(dateString).toLocaleDateString('pt-BR', { timeZone: 'UTC' });

export default function InadimplenciaDetailTable({ data, empresa }) {
    
    const handleExportCSV = () => { /* ... (lógica de exportação inalterada) ... */ };

    if (!data || data.length === 0) { return null; }

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-white">Detalhamento das Parcelas</h3>
                {/* CORREÇÃO: Classes do botão atualizadas para o padrão do projeto */}
                <button
                    onClick={handleExportCSV}
                    className="px-4 py-2 text-sm font-semibold bg-acelerar-gold-light text-acelerar-dark-blue rounded-md hover:bg-yellow-300 transition-colors"
                >
                    Exportar CSV
                </button>
            </div>
            <div className="overflow-auto max-h-96">
                {/* ... (estrutura da tabela inalterada) ... */}
            </div>
        </div>
    );
}
// Nota: O código da função handleExportCSV e da tabela foi omitido por ser idêntico. Cole o código completo que eu já havia enviado.
