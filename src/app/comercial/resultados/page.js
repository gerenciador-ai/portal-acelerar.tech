// Arquivo: src/app/comercial/resultados/page.js
"use client";
import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { useComercial } from '../layout';

// ... (Componentes KpiCard, GraficosResultados, TabelasResumo sem alterações)

export default function ResultadosPage() {
    const [allDeals, setAllDeals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const { 
        selectedEmpresa, logoEmpresa, 
        setAnos, setSelectedAno, selectedAno,
        setMeses, setSelectedMeses, selectedMeses,
        setProdutos, selectedProduto,
        setVendedores, selectedVendedor,
        setSdrs, selectedSdr,
        MESES_ORDEM
    } = useComercial();

    // LÓGICA DE BUSCA SIMPLIFICADA: UMA ÚNICA CHAMADA
    useEffect(() => {
        if (!selectedEmpresa) return;
        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);
                // Chama a nova rota de API específica para resultados
                const response = await fetch(`/api/ploomes/results?empresa=${encodeURIComponent(selectedEmpresa)}`);
                if (!response.ok) throw new Error('Falha ao buscar dados de resultados');
                const data = await response.json();
                const dealsComData = data.value.map(d => ({ ...d, data: new Date(d.data) }));
                setAllDeals(dealsComData);
            } catch (err) {
                setError(err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [selectedEmpresa]);

    // ... (Lógica de popular filtros e de filtragem, sem alterações)

    // LÓGICA DE CÁLCULO DOS KPIs (AGORA CORRETA)
    const { kpis, chartData, tableData } = useMemo(() => {
        // ... (código do useMemo exatamente como na sua última versão, ele agora deve funcionar corretamente)
    }, [filteredDeals, allDeals, selectedEmpresa, MESES_ORDEM, loading]);

    // ... (código de renderização, sem alterações)
}
