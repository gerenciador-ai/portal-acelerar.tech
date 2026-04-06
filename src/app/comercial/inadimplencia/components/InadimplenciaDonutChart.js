// Arquivo: src/app/comercial/inadimplencia/components/InadimplenciaDonutChart.js
"use client";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const COLORS = { '0-30 dias': '#a0aec0', '31-60 dias': '#f6e05e', '61-90 dias': '#f56565', '> 90 dias': '#c53030' };

// Componente customizado para o Tooltip, seguindo o padrão do projeto
const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-acelerar-dark-blue p-3 border border-white/20 rounded-md shadow-lg text-white">
                <p className="font-bold text-lg">{data.name}</p>
                <p className="text-sm">{`Clientes: ${data.value}`}</p>
            </div>
        );
    }
    return null;
};

export default function InadimplenciaDonutChart({ data }) {
    if (!data || data.every(item => item.value === 0)) {
        return <div className="text-center text-white/50 p-4">Sem dados para exibir no gráfico.</div>;
    }

    return (
        <div className="h-80">
            <h3 className="text-lg font-semibold text-white mb-4">Clientes por Faixa de Atraso</h3>
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        innerRadius={40}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    >
                        {data.map((entry) => ( <Cell key={`cell-${entry.name}`} fill={COLORS[entry.name]} /> ))}
                    </Pie>
                    {/* CORREÇÃO: Usando o componente de Tooltip customizado */}
                    <Tooltip content={<CustomTooltip />} />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}
