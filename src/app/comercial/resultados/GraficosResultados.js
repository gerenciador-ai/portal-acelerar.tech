"use client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, Line } from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-acelerar-dark-blue p-2 border border-acelerar-light-blue rounded-md text-sm">
                <p className="label text-white font-bold">{`${label}`}</p>
                {payload.map((p, i) => (
                    <p key={i} style={{ color: p.color }}>
                        {`${p.name}: ${p.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`}
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

const ChartCard = ({ data, title, children }) => (
    <div className="bg-white/5 p-4 rounded-lg h-full flex flex-col">
        <h3 className="text-white text-center font-bold text-sm mb-2">{title}</h3>
        <div className="flex-grow">
            <ResponsiveContainer width="100%" height="100%">
                {children}
            </ResponsiveContainer>
        </div>
    </div>
);

export default function GraficosResultados({ chartData }) {
    if (!chartData || chartData.monthlyData.length === 0) {
        return <div className="text-center text-white/50 col-span-full p-10">Sem dados para exibir nos gráficos.</div>;
    }

    const { monthlyData, accumulatedData, metaData } = chartData;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-80">
                <ChartCard data={accumulatedData} title="MRR Acumulado vs. Meta">
                    <ComposedChart data={accumulatedData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                        <XAxis dataKey="mes" stroke="#FFFFFF" fontSize={10} />
                        <YAxis stroke="#FFFFFF" fontSize={10} tickFormatter={(value) => new Intl.NumberFormat('pt-BR', { notation: 'compact', compactDisplay: 'short' }).format(value)} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ fontSize: "10px" }} />
                        <Bar dataKey="mrr" name="MRR Acumulado" fill="rgba(137, 207, 240, 0.7)" />
                        <Line type="monotone" dataKey="metaMrr" name="Meta MRR" stroke="#FFFFFF" strokeWidth={2} dot={false} />
                    </ComposedChart>
                </ChartCard>
            </div>
            <div className="h-80">
                <ChartCard data={accumulatedData} title="Contratos Acumulados vs. Meta">
                    <ComposedChart data={accumulatedData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                        <XAxis dataKey="mes" stroke="#FFFFFF" fontSize={10} />
                        <YAxis stroke="#FFFFFF" fontSize={10} allowDecimals={false} />
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: "10px" }} />
                        <Bar dataKey="contratos" name="Contratos Acumulados" fill="rgba(137, 207, 240, 0.7)" />
                        <Line type="monotone" dataKey="metaContratos" name="Meta Contratos" stroke="#FFFFFF" strokeWidth={2} dot={false} />
                    </ComposedChart>
                </ChartCard>
            </div>
            <div className="h-80 col-span-1 lg:col-span-2">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">
                    <ChartCard data={monthlyData} title="MRR Mensal">
                        <BarChart data={monthlyData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                            <XAxis dataKey="mes" stroke="#FFFFFF" fontSize={10} />
                            <YAxis stroke="#FFFFFF" fontSize={10} tickFormatter={(value) => new Intl.NumberFormat('pt-BR', { notation: 'compact', compactDisplay: 'short' }).format(value)} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="mrr" name="MRR" fill="#89CFF0" />
                        </BarChart>
                    </ChartCard>
                    <ChartCard data={monthlyData} title="Upsell Mensal">
                        <BarChart data={monthlyData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                            <XAxis dataKey="mes" stroke="#FFFFFF" fontSize={10} />
                            <YAxis stroke="#FFFFFF" fontSize={10} tickFormatter={(value) => new Intl.NumberFormat('pt-BR', { notation: 'compact', compactDisplay: 'short' }).format(value)} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="upsell" name="Upsell" fill="#2ECC71" />
                        </BarChart>
                    </ChartCard>
                    <ChartCard data={monthlyData} title="Churn Mensal">
                        <BarChart data={monthlyData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                            <XAxis dataKey="mes" stroke="#FFFFFF" fontSize={10} />
                            <YAxis stroke="#FFFFFF" fontSize={10} tickFormatter={(value) => new Intl.NumberFormat('pt-BR', { notation: 'compact', compactDisplay: 'short' }).format(value)} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="churn" name="Churn" fill="#E74C3C" />
                        </BarChart>
                    </ChartCard>
                </div>
            </div>
        </div>
    );
}
