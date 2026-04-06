// Arquivo: src/app/comercial/inadimplencia/components/InadimplenciaKpiCards.js
"use client";

// Função para formatar números como moeda brasileira
const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(value);
};

// Componente de Card individual
function KpiCard({ title, value, isCurrency = false }) {
    return (
        <div className="bg-black/20 p-4 rounded-lg border border-white/10 flex-1">
            <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider">{title}</h3>
            <p className="text-3xl font-bold text-acelerar-gold-light mt-2">
                {isCurrency ? formatCurrency(value) : value}
            </p>
        </div>
    );
}

// Componente principal que agrupa os cards
export default function InadimplenciaKpiCards({ kpis }) {
    // Medida de segurança para caso os dados não cheguem como esperado
    if (!kpis) {
        return null;
    }

    return (
        <div className="flex flex-col md:flex-row gap-4">
            <KpiCard title="Total em Aberto" value={kpis.totalAberto} isCurrency={true} />
            <KpiCard title="Clientes Inadimplentes" value={kpis.clientesInadimplentes} />
            <KpiCard title="Repasse Sittax (30%)" value={kpis.repasseSittax} isCurrency={true} />
        </div>
    );
}
