"use client";
import { useMemo } from 'react';

// Componente para o Card de MVP
const MvpCard = ({ title, name, value }) => (
    <div className="bg-gradient-to-br from-acelerar-dark-blue to-acelerar-blue-darker border-2 border-acelerar-light-blue rounded-xl p-4 text-center relative overflow-hidden shadow-lg">
        <div className="absolute -right-4 -bottom-4 text-5xl opacity-10 text-white">🏆</div>
        <h3 className="text-xs font-bold text-acelerar-light-blue uppercase tracking-wider mb-2">{title}</h3>
        <p className="text-lg font-extrabold text-white truncate" title={name}>{name || '-'}</p>
        <p className="text-base font-bold text-acelerar-light-blue">{value ? `R$ ${Math.round(value).toLocaleString('pt-BR')}` : 'R$ 0'}</p>
    </div>
);

// Componente para a Barra de Ranking
const RankingBar = ({ rank, name, value, maxValue }) => {
    const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
    return (
        <div className="relative w-full h-7 bg-white/5 rounded-md mb-2 flex items-center">
            <div 
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-acelerar-dark-blue to-acelerar-light-blue rounded-md" 
                style={{ width: `${percentage}%`, minWidth: '2px' }}
            ></div>
            <div className="relative z-10 flex justify-between items-center w-full px-3 text-white">
                <span className="text-xs font-bold truncate" title={name}>{rank}. {name}</span>
                <span className="text-xs font-extrabold text-acelerar-light-blue">R$ {Math.round(value).toLocaleString('pt-BR')}</span>
            </div>
        </div>
    );
};

// Componente para a Lista de Ranking
const RankingList = ({ title, data, topN = 5 }) => {
    const sortedData = useMemo(() => {
        return data.sort((a, b) => b.val - a.val).slice(0, topN);
    }, [data, topN]);

    const maxValue = sortedData.length > 0 ? sortedData[0].val : 0;

    return (
        <div className="bg-white/5 p-4 rounded-lg h-full">
            <h4 className="text-sm font-bold text-acelerar-light-blue uppercase mb-4 border-b border-white/10 pb-2">🏆 {title}</h4>
            {sortedData.length > 0 ? (
                sortedData.map((item, index) => (
                    <RankingBar 
                        key={item.name}
                        rank={index + 1}
                        name={item.name}
                        value={item.val}
                        maxValue={maxValue}
                    />
                ))
            ) : (
                <p className="text-center text-xs text-white/40 pt-8">Sem dados para exibir.</p>
            )}
        </div>
    );
};


// Componente Principal que exportamos
export default function RankingCards({ data }) {
    // useMemo para calcular os rankings apenas quando os dados mudarem
    const { vendedorData, sdrData } = useMemo(() => {
        const getRank = (key) => {
            const map = new Map();
            const vendas = data.filter(d => d.status === 'Venda');

            vendas.forEach(deal => {
                const name = deal[key];
                if (!name || name === 'N/A') return;

                if (!map.has(name)) {
                    map.set(name, { name: name, val: 0 });
                }
                map.get(name).val += deal.mrr;
            });
            return Array.from(map.values());
        };

        return {
            vendedorData: getRank('vendedor'),
            sdrData: getRank('sdr')
        };
    }, [data]);

    const topVendedor = vendedorData.length > 0 ? vendedorData.sort((a, b) => b.val - a.val)[0] : null;
    const topSdr = sdrData.length > 0 ? sdrData.sort((a, b) => b.val - a.val)[0] : null;

    return (
        <>
            {/* Seção dos MVPs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <MvpCard title="MVP Vendedor do Mês" name={topVendedor?.name} value={topVendedor?.val} />
                <MvpCard title="MVP SDR do Mês" name={topSdr?.name} value={topSdr?.val} />
            </div>

            {/* Seção dos Rankings */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <RankingList title="Vendedores (MRR)" data={vendedorData} />
                <RankingList title="SDRs (MRR)" data={sdrData} />
            </div>
        </>
    );
}
