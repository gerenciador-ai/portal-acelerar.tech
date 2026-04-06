// Arquivo: src/app/comercial/inadimplencia/components/InadimplenciaDonutChart.js
"use client";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const COLORS = { '0-30 dias': '#a0aec0', '31-60 dias': '#f6e05e', '61-90 dias': '#f56565', '> 90 dias': '#c53030' };

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
                        outerRadius={100} // Aumentado para melhor visualização do label
                        innerRadius={50}  // Cria o efeito "Donut"
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="name"
                        // CORREÇÃO: Label agora mostra apenas o percentual
                        label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                    >
                        {data.map((entry) => ( <Cell key={`cell-${entry.name}`} fill={COLORS[entry.name]} /> ))}
                    </Pie>
                    <Tooltip
                        contentStyle={{ backgroundColor: '#1a202c', borderColor: '#4a5568', color: '#fff' }}
                        // CORREÇÃO: Tooltip agora mostra o nome da faixa e o número de clientes
                        formatter={(value, name) => [`${value} cliente(s)`, name]}
                        labelFormatter={() => ''} // Oculta o label principal do tooltip
                    />
                    {/* CORREÇÃO: Legenda removida */}
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}
