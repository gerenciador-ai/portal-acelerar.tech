// Arquivo: src/app/comercial/inadimplencia/page.js
"use client";

import { useState, useEffect, useContext } from 'react';
import { ComercialContext } from '../layout'; // Usamos o contexto do Comercial para pegar os filtros

export default function InadimplenciaPage() {
    // Estado local para os dados de inadimplência
    const [inadimplenciaData, setInadimplenciaData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Pegamos a empresa selecionada do contexto que já existe no módulo Comercial
    const { empresa } = useContext(ComercialContext);

    // Efeito para buscar os dados de inadimplência do NIBO
    useEffect(() => {
        // Se a empresa ainda não foi carregada no contexto, não faz nada
        if (!empresa) return;

        async function fetchInadimplencia() {
            setLoading(true);
            setError(null);
            try {
                const response = await fetch(`/api/nibo/inadimplencia?empresa=${empresa.value}`);
                if (!response.ok) {
                    const errData = await response.json();
                    throw new Error(errData.details || 'Falha ao buscar dados da API de inadimplência.');
                }
                const data = await response.json();
                setInadimplenciaData(data);
            } catch (err) {
                setError(err.message);
                setInadimplenciaData([]);
            } finally {
                setLoading(false);
            }
        }

        fetchInadimplencia();
    }, [empresa]); // A busca é refeita sempre que a empresa no filtro mudar

    if (loading) {
        return <div className="text-center p-10">Carregando dados de inadimplência do NIBO...</div>;
    }

    if (error) {
        return <div className="text-center p-10 text-red-600">Erro ao carregar dados: {error}</div>;
    }

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-800">Painel de Inadimplência - {empresa.label}</h2>
            
            {/* Seção para os Cards de KPI */}
            <div className="bg-white p-4 rounded-lg shadow">
                <p className="font-bold">KPI Cards (Placeholder)</p>
                <p>Total de parcelas em aberto: {inadimplenciaData.length}</p>
            </div>

            {/* Seção para o Gráfico e Tabela Resumo */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 bg-white p-4 rounded-lg shadow">
                    <p className="font-bold">Gráfico de Rosca (Placeholder)</p>
                </div>
                <div className="lg:col-span-2 bg-white p-4 rounded-lg shadow">
                    <p className="font-bold">Tabela Resumo por Cliente (Placeholder)</p>
                </div>
            </div>

            {/* Seção para a Tabela Detalhada */}
            <div className="bg-white p-4 rounded-lg shadow">
                <p className="font-bold">Tabela Detalhada de Parcelas (Placeholder)</p>
            </div>
        </div>
    );
}
