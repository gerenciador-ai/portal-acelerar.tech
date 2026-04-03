// Arquivo: src/app/comercial/customer-success/OnboardingClientsTable.js
"use client";
import { useMemo } from 'react';

// --- Componente da Tabela de Clientes em Onboarding ---
export default function OnboardingClientsTable({ activeDeals }) {

    // Ordena os clientes por "Dias no Funil", do mais antigo para o mais novo.
    const sortedDeals = useMemo(() => {
        if (!activeDeals || activeDeals.length === 0) {
            return [];
        }
        return [...activeDeals].sort((a, b) => b.diasNoFunil - a.diasNoFunil);
    }, [activeDeals]);

    const formatCurrency = (value) => `R$ ${Math.round(value || 0).toLocaleString('pt-BR')}`;

    return (
        <div className="bg-white/10 p-4 rounded-lg">
            <h3 className="text-sm font-bold text-acelerar-gold-light uppercase tracking-wider mb-4 border-b border-white/10 pb-2">
                📋 Tabela: Clientes em Onboarding
            </h3>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-white/60 uppercase">
                        <tr>
                            <th scope="col" className="px-4 py-3">Cliente</th>
                            <th scope="col" className="px-4 py-3">Etapa Atual</th>
                            <th scope="col" className="px-4 py-3 text-right">MRR</th>
                            <th scope="col" className="px-4 py-3">Vendedor</th>
                            <th scope="col" className="px-4 py-3">SDR</th>
                            <th scope="col" className="px-4 py-3 text-center">Dias no Funil</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedDeals.length > 0 ? (
                            sortedDeals.map((deal) => (
                                <tr key={deal.id} className="border-b border-white/10 hover:bg-white/5">
                                    <td className="px-4 py-3 font-medium text-white truncate max-w-xs">{deal.cliente}</td>
                                    <td className="px-4 py-3">{deal.etapa}</td>
                                    <td className="px-4 py-3 text-right">{formatCurrency(deal.mrr)}</td>
                                    <td className="px-4 py-3">{deal.vendedor}</td>
                                    <td className="px-4 py-3">{deal.sdr}</td>
                                    <td className="px-4 py-3 text-center font-bold text-acelerar-gold-light">{deal.diasNoFunil}</td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="6" className="text-center py-10 text-white/40">
                                    Nenhum cliente ativo em onboarding para exibir.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
