"use client";
import { useMemo } from 'react';

// Componente individual para o card de MVP
function MvpCard({ title, name, value }) {
    const formatCurrency = (val) => `R$ ${Math.round(val || 0).toLocaleString('pt-BR')}`;

    return (
        <div className="bg-white/10 p-4 rounded-lg text-center flex flex-col justify-center items-center min-h-[120px] border border-white/10 shadow-lg">
            <div className="text-xs uppercase text-acelerar-gold-light font-bold tracking-wider">{title}</div>
            <div className="text-2xl font-bold text-white mt-2 truncate" title={name}>{name || '-'}</div>
            <div className="text-base font-semibold text-acelerar-gold-light mt-1">{formatCurrency(value)}</div>
        </div>
    );
}

// Componente principal que calcula e renderiza os dois cards
export default function MvpCards({ deals }) {
    // A lógica de cálculo do MVP vive aqui, isolada neste componente.
    const { mvpVendedor, mvpSdr } = useMemo(() => {
        if (!deals || deals.length === 0) {
            return { mvpVendedor: null, mvpSdr: null };
        }

        const getMvp = (key) => {
            const ranking = deals.reduce((acc, deal) => {
                const name = deal[key];
                if (name && name !== 'N/A') {
                    acc[name] = (acc[name] || 0) + deal.mrr;
                }
                return acc;
            }, {});

            const topPerformer = Object.entries(ranking).sort(([, a], [, b]) => b - a)[0];
            
            return topPerformer ? { name: topPerformer[0], value: topPerformer[1] } : null;
        };

        return {
            mvpVendedor: getMvp('vendedor'),
            mvpSdr: getMvp('sdr')
        };
    }, [deals]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <MvpCard 
                title="🏆 MVP Vendedor do Mês" 
                name={mvpVendedor?.name} 
                value={mvpVendedor?.value} 
            />
            <MvpCard 
                title="🏆 MVP SDR do Mês" 
                name={mvpSdr?.name} 
                value={mvpSdr?.value} 
            />
        </div>
    );
}
