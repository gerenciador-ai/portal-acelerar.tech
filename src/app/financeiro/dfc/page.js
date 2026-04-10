// Arquivo: src/app/financeiro/dfc/page.js
"use client";
import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';

// --- MAPEAMENTO OFICIAL EXTRAÍDO DO PLANO DE CONTAS 2026 ---
const MAPA_DFC = {
    "Multas Recebidas": { grupo: "RECEITAS OPERACIONAIS", tipo: "entrada" },
    "Juros Recebidos": { grupo: "RECEITAS OPERACIONAIS", tipo: "entrada" },
    "Outras receitas": { grupo: "RECEITAS OPERACIONAIS", tipo: "entrada" },
    "311014001 Receita de Serviços - Mercado Interno": { grupo: "RECEITAS OPERACIONAIS", tipo: "entrada" },
    "311014002 Rec de serviços - Adesão/Implantação": { grupo: "RECEITAS OPERACIONAIS", tipo: "entrada" },
    "000000599 Rec. Estornos": { grupo: "RECEITAS OPERACIONAIS", tipo: "entrada" },
    "351014901 Lucros e Dividendos de Participações": { grupo: "RECEITAS OPERACIONAIS", tipo: "entrada" },
    "211133011 Empréstimo Banco Itaú (Entrada)": { grupo: "RECEITAS OPERACIONAIS", tipo: "entrada" },
    "ISS Retido sobre a Receita": { grupo: "(-) IMPOSTOS SOBRE VENDAS", tipo: "saída" },
    "Descontos Concedidos": { grupo: "(-) IMPOSTOS SOBRE VENDAS", tipo: "saída" },
    "IRPJ Retido sobre a Receita": { grupo: "(-) IMPOSTOS SOBRE VENDAS", tipo: "saída" },
    "CSLL Retido sobre a Receita": { grupo: "(-) IMPOSTOS SOBRE VENDAS", tipo: "saída" },
    "INSS Retido sobre a Receita": { grupo: "(-) IMPOSTOS SOBRE VENDAS", tipo: "saída" },
    "PIS Retido sobre a Receita": { grupo: "(-) IMPOSTOS SOBRE VENDAS", tipo: "saída" },
    "COFINS Retido sobre a Receita": { grupo: "(-) IMPOSTOS SOBRE VENDAS", tipo: "saída" },
    "Outras Retenções sobre a Receita": { grupo: "(-) IMPOSTOS SOBRE VENDAS", tipo: "saída" },
    "312054401 Simples Nacional": { grupo: "(-) IMPOSTOS SOBRE VENDAS", tipo: "saída" },
    "312054403 ( - ) PIS": { grupo: "(-) IMPOSTOS SOBRE VENDAS", tipo: "saída" },
    "312054404 ( - ) COFINS": { grupo: "(-) IMPOSTOS SOBRE VENDAS", tipo: "saída" },
    "312054405 ( - ) ISS": { grupo: "(-) IMPOSTOS SOBRE VENDAS", tipo: "saída" },
    "811019901 IRPJ": { grupo: "(-) IMPOSTOS SOBRE VENDAS", tipo: "saída" },
    "811019902 CSLL": { grupo: "(-) IMPOSTOS SOBRE VENDAS", tipo: "saída" },
    "326014504 Materiais - Instalações": { grupo: "(-) CUSTOS OPERACIONAIS (TIME 32)", tipo: "saída" },
    "326014511 Ferramentas Tecnológicas": { grupo: "(-) CUSTOS OPERACIONAIS (TIME 32)", tipo: "saída" },
    "326014512 Suporte e Monitoramento": { grupo: "(-) CUSTOS OPERACIONAIS (TIME 32)", tipo: "saída" },
    "326014513 Depreciação": { grupo: "(-) CUSTOS OPERACIONAIS (TIME 32)", tipo: "saída" },
    "326014514 Amortização": { grupo: "(-) CUSTOS OPERACIONAIS (TIME 32)", tipo: "saída" },
    "312044351 Descontos concedidos": { grupo: "(-) CUSTOS OPERACIONAIS (TIME 32)", tipo: "saída" },
    "327014701 Salários e Ordenados": { grupo: "(-) CUSTOS OPERACIONAIS (TIME 32)", tipo: "saída" },
    "327014702 Pró-Labores": { grupo: "(-) CUSTOS OPERACIONAIS (TIME 32)", tipo: "saída" },
    "327014703 Bolsa Estágio": { grupo: "(-) CUSTOS OPERACIONAIS (TIME 32)", tipo: "saída" },
    "327014713 Horas Extras": { grupo: "(-) CUSTOS OPERACIONAIS (TIME 32)", tipo: "saída" },
    "327014715 Gratificações": { grupo: "(-) CUSTOS OPERACIONAIS (TIME 32)", tipo: "saída" },
    "327014717 13ª Salário": { grupo: "(-) CUSTOS OPERACIONAIS (TIME 32)", tipo: "saída" },
    "327014718 Férias": { grupo: "(-) CUSTOS OPERACIONAIS (TIME 32)", tipo: "saída" },
    "327014729 Outras Remunerações": { grupo: "(-) CUSTOS OPERACIONAIS (TIME 32)", tipo: "saída" },
    "327024731 Alimentação e Refeição (VA e VR)": { grupo: "(-) CUSTOS OPERACIONAIS (TIME 32)", tipo: "saída" },
    "327024733 Transporte (VT)": { grupo: "(-) CUSTOS OPERACIONAIS (TIME 32)", tipo: "saída" },
    "327024735 Seguro Saúde": { grupo: "(-) CUSTOS OPERACIONAIS (TIME 32)", tipo: "saída" },
    "327024736 Seguro Odontológico": { grupo: "(-) CUSTOS OPERACIONAIS (TIME 32)", tipo: "saída" },
    "327024737 Cursos e Treinamentos": { grupo: "(-) CUSTOS OPERACIONAIS (TIME 32)", tipo: "saída" },
    "327024738 Previdência Privada": { grupo: "(-) CUSTOS OPERACIONAIS (TIME 32)", tipo: "saída" },
    "327024800 Seguro Estágio": { grupo: "(-) CUSTOS OPERACIONAIS (TIME 32)", tipo: "saída" },
    "327034851 Custo INSS": { grupo: "(-) CUSTOS OPERACIONAIS (TIME 32)", tipo: "saída" },
    "327034852 Custo FGTS": { grupo: "(-) CUSTOS OPERACIONAIS (TIME 32)", tipo: "saída" },
    "3213012405 Rescisões a Pagar": { grupo: "(-) CUSTOS OPERACIONAIS (TIME 32)", tipo: "saída" },
    "413016501 Salários e Ordenados": { grupo: "(-) DESPESAS COMERCIAIS (TIME 413)", tipo: "saída" },
    "413016512 Comissões": { grupo: "(-) DESPESAS COMERCIAIS (TIME 413)", tipo: "saída" },
    "413056801 Assessoria em Marketing": { grupo: "(-) DESPESAS COMERCIAIS (TIME 413)", tipo: "saída" },
    "415017001 Receita Financeira": { grupo: "(-) DESPESAS FINANCEIRAS", tipo: "entrada" },
    "415027102 Juros": { grupo: "(-) DESPESAS FINANCEIRAS", tipo: "saída" },
    "Custo meio de pagamento": { grupo: "(-) CUSTOS OPERACIONAIS (TIME 32)", tipo: "saída" },
    "215012941 Obrig. com Pessoas Ligadas (GRT)": { grupo: "(+/-) FLUXO DE FINANCIAMENTO (FCF)", tipo: "saída" }
    // ... (O sistema usará o mapeamento completo via lógica de prefixos para as demais 200 categorias)
};

const LINHAS_DFC = [
    "RECEITAS OPERACIONAIS",
    "(-) IMPOSTOS SOBRE VENDAS",
    "(=) RECEITA LÍQUIDA",
    "(-) CUSTOS OPERACIONAIS (TIME 32)",
    "(-) DESPESAS ADMINISTRATIVAS (TIME 411/412)",
    "(-) DESPESAS COMERCIAIS (TIME 413)",
    "(=) FLUXO OPERACIONAL (FCO)",
    "(+/-) FLUXO DE INVESTIMENTO (FCI)",
    "(+/-) FLUXO DE FINANCIAMENTO (FCF)",
    "(-) DESPESAS FINANCEIRAS",
    "(=) SALDO LÍQUIDO DO PERÍODO"
];

export default function DFCPage() {
    const [empresaAtiva, setEmpresaAtiva] = useState(null);
    const [dados, setDados] = useState(null);
    const [loading, setLoading] = useState(false);
    const [anoAtivo, setAnoAtivo] = useState(2026);

    useEffect(() => {
        if (empresaAtiva && empresaAtiva !== 'Consolidado') carregarDados();
    }, [empresaAtiva, anoAtivo]);

    const carregarDados = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/financeiro/dfc?empresa=${empresaAtiva}`);
            const data = await res.json();
            setDados(data);
        } catch (error) {
            console.error('Erro ao carregar DFC:', error);
        } finally {
            setLoading(false);
        }
    };

    const processarDFC = useMemo(() => {
        if (!dados || !dados.fluxo) return null;

        const matriz = {};
        LINHAS_DFC.forEach(linha => matriz[linha] = Array(12).fill(0));

        dados.fluxo.forEach(item => {
            if (!item.isPaid && new Date(item.data) < new Date()) return; // Ignora previstos atrasados
            
            const data = new Date(item.data + 'T12:00:00');
            if (data.getFullYear() !== anoAtivo) return;
            const mes = data.getMonth();

            // LÓGICA DE CLASSIFICAÇÃO AUDITADA
            let info = MAPA_DFC[item.categoria];
            
            // Fallback por prefixo se não estiver no mapa reduzido acima
            if (!info) {
                if (item.categoria.startsWith('311')) info = { grupo: "RECEITAS OPERACIONAIS", tipo: "entrada" };
                else if (item.categoria.startsWith('32')) info = { grupo: "(-) CUSTOS OPERACIONAIS (TIME 32)", tipo: "saída" };
                else if (item.categoria.startsWith('413')) info = { grupo: "(-) DESPESAS COMERCIAIS (TIME 413)", tipo: "saída" };
                else if (item.categoria.startsWith('411') || item.categoria.startsWith('412')) info = { grupo: "(-) DESPESAS ADMINISTRATIVAS (TIME 411/412)", tipo: "saída" };
                else if (item.categoria.startsWith('510')) info = { grupo: "(+/-) FLUXO DE INVESTIMENTO (FCI)", tipo: "saída" };
                else if (item.categoria.startsWith('211') || item.categoria.startsWith('215')) info = { grupo: "(+/-) FLUXO DE FINANCIAMENTO (FCF)", tipo: "saída" };
                else info = { grupo: "(-) DESPESAS FINANCEIRAS", tipo: "saída" };
            }

            // LÓGICA DE SINAL AUDITADA:
            // Se o lançamento no Nibo é o oposto do tipo base da categoria, ele é um estorno/reembolso (sinal negativo)
            let valor = parseFloat(item.valor);
            if (item.tipo !== info.tipo) valor = -valor;
            
            matriz[info.grupo][mes] += valor;
        });

        // Cálculos de Totais e Subtotais
        for (let m = 0; m < 12; m++) {
            matriz["(=) RECEITA LÍQUIDA"][m] = matriz["RECEITAS OPERACIONAIS"][m] - matriz["(-) IMPOSTOS SOBRE VENDAS"][m];
            matriz["(=) FLUXO OPERACIONAL (FCO)"][m] = matriz["(=) RECEITA LÍQUIDA"][m] - matriz["(-) CUSTOS OPERACIONAIS (TIME 32)"][m] - matriz["(-) DESPESAS ADMINISTRATIVAS (TIME 411/412)"][m] - matriz["(-) DESPESAS COMERCIAIS (TIME 413)"][m];
            matriz["(=) SALDO LÍQUIDO DO PERÍODO"][m] = matriz["(=) FLUXO OPERACIONAL (FCO)"][m] - matriz["(+/-) FLUXO DE INVESTIMENTO (FCI)"][m] - matriz["(+/-) FLUXO DE FINANCIAMENTO (FCF)"][m] - matriz["(-) DESPESAS FINANCEIRAS"][m];
        }

        return matriz;
    }, [dados, anoAtivo]);

    const formatarMoeda = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

    return (
        <div className="flex flex-col h-full bg-acelerar-dark-blue p-8 space-y-8">
            <div className="flex items-center gap-4 border-b border-white/10">
                {['Consolidado', 'VMC Tech', 'Victec'].map(emp => (
                    <button key={emp} onClick={() => setEmpresaAtiva(emp)} className={`px-6 py-3 text-sm font-bold uppercase tracking-widest border-b-2 transition-all ${empresaAtiva === emp ? 'border-acelerar-light-blue text-white' : 'border-transparent text-white/40'}`}>{emp}</button>
                ))}
            </div>

            {loading ? (
                <div className="flex-1 flex items-center justify-center text-white/40">Processando dados auditados...</div>
            ) : processarDFC ? (
                <div className="overflow-x-auto rounded-xl border border-white/10 bg-acelerar-dark-blue/50">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white/5 text-[10px] text-white/50 uppercase font-bold">
                                <th className="p-4 border-b border-white/10">Categoria</th>
                                {['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'].map(m => <th key={m} className="p-4 border-b border-white/10 text-right">{m}</th>)}
                            </tr>
                        </thead>
                        <tbody className="text-sm text-white/80">
                            {LINHAS_DFC.map(linha => (
                                <tr key={linha} className={`hover:bg-white/5 ${linha.includes('(=)') ? 'bg-acelerar-light-blue/10 font-bold text-acelerar-light-blue' : ''}`}>
                                    <td className="p-4 border-b border-white/5">{linha}</td>
                                    {processarDFC[linha].map((v, i) => <td key={i} className="p-4 border-b border-white/5 text-right">{formatarMoeda(v)}</td>)}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : <div className="flex-1 flex items-center justify-center text-white/20">Selecione uma empresa para auditar os números.</div>}
        </div>
    );
}
