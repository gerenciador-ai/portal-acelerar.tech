// Arquivo: src/app/comercial/inadimplencia/components/InadimplenciaDonutChart.js
"use client";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Cores para as fatias do gráfico, alinhadas com a paleta do projeto
const COLORS = {
    '0-30 dias': '#a0aec0',      // cinza
    '31-60 dias': '#f6e05e',     // amarelo (gold-light)
    '61-90 dias': '#f56565',     // vermelho claro
    '> 90 dias': '#c53030',      // vermelho escuro
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
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[entry.name]} />
                        ))}
                    </Pie>
                    <Tooltip
                        contentStyle={{
                            backgroundColor: '#1a202c',
                            borderColor: '#4a5568',
                            color: '#fff'
                        }}
                        formatter={(value) => [value, 'Clientes']}
                    />
                    <Legend />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}
