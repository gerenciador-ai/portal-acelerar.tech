"use client";
import { useState, useEffect } from 'react';
import Image from 'next/image';

const EMPRESAS = [
  { id: 'victec', nome: "Victec", logo: "/logo_victec.png" },
  { id: 'vmctech', nome: "VMC Tech", logo: "/logo_vmctech.png" },
  { id: 'grt', nome: "GRT", logo: "/logo_GRT.png" },
  { id: 'bllog', nome: "Bllog", logo: "/logo_bllog.png" },
  { id: 'm3', nome: "M3", logo: "/logo_m3sistemas.png" },
  { id: 'acelerar', nome: "Acelerar", logo: "/logo_acelerar_sidebar.png" },
  { id: 'blive', nome: "bLive", logo: "/logo_blive.png" },
  { id: 'condway', nome: "Condway", logo: "/logo_condway.png" },
  { id: 'isket', nome: "Isket", logo: "/logo_isket.png" }
];

const GRUPOS_PESSOAL = [
  "(-) PESSOAL COMERCIAL",
  "(-) PESSOAL OPERACIONAL",
  "(-) PESSOAL ADMINISTRATIVO",
  "(-) INVESTIMENTO EM PRODUTO"
];

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

// Gera os próximos 5 anos a partir do ano atual, dinamicamente
const anoAtual = new Date().getFullYear();
const ANOS_DISPONIVEIS = [0, 1, 2, 3, 4].map(i => anoAtual + i);

// Estado inicial padrão de premissas (todos os campos zerados)
const premissasVazias = () => ({
  inflacao_percentual: 0, inflacao_mes_inicio: 1,
  pis_percentual: 0, pis_mes_inicio: 1,
  cofins_percentual: 0, cofins_mes_inicio: 1,
  iss_percentual: 0, iss_mes_inicio: 1,
  ir_retido_percentual: 0, ir_retido_mes_inicio: 1,
  imposto_medio_percentual: 0, imposto_medio_mes_inicio: 1,
  crescimento_tipo: 'PERCENTUAL', crescimento_modalidade: 'SOBRE_RECEITA', crescimento_valor: 0, crescimento_mes_inicio: 1,
  dissidio_pessoal_comercial_percentual: 0, dissidio_pessoal_comercial_mes_inicio: 1,
  dissidio_pessoal_operacional_percentual: 0, dissidio_pessoal_operacional_mes_inicio: 1,
  dissidio_pessoal_administrativo_percentual: 0, dissidio_pessoal_administrativo_mes_inicio: 1,
  dissidio_investimento_produto_percentual: 0, dissidio_investimento_produto_mes_inicio: 1,
  headcount: []
});

function EmpresaTab({ nome, logo, isActive, onClick }) {
  const isVMC = nome === 'VMC Tech';
  const containerWidth = isVMC ? 'w-40' : 'w-28';
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center justify-center h-20 ${containerWidth} transition-all duration-200 border-b-2 ${
        isActive ? 'border-acelerar-light-blue bg-white/5' : 'border-transparent hover:bg-white/5'
      }`}
    >
      {logo && (
        <div className="relative w-full h-full p-3">
          <Image
            src={logo} alt={nome} fill
            className={`transition-opacity duration-200 object-contain p-2 ${isActive ? 'opacity-100' : 'opacity-50 hover:opacity-80'}`}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            priority
          />
        </div>
      )}
    </button>
  );
}

export default function PremissasPage() {
  const [empresaAtiva, setEmpresaAtiva] = useState(null);
  const [anoAtivo, setAnoAtivo] = useState(anoAtual);
  const [loading, setLoading] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [premissas, setPremissas] = useState(premissasVazias());

  // Carrega as premissas salvas ao trocar empresa ou ano
  useEffect(() => {
    if (!empresaAtiva) return;
    const fetchPremissas = async () => {
      setCarregando(true);
      try {
        const res = await fetch(`/api/financeiro/fpa/premissas?empresa=${empresaAtiva.id}&ano=${anoAtivo}`);
        const data = await res.json();
        if (data) {
          setPremissas({ ...premissasVazias(), ...data });
        } else {
          setPremissas(premissasVazias());
        }
      } catch {
        setPremissas(premissasVazias());
      } finally {
        setCarregando(false);
      }
    };
    fetchPremissas();
  }, [empresaAtiva, anoAtivo]);

  const set = (campo, valor) => setPremissas(prev => ({ ...prev, [campo]: valor }));

  const addHeadcount = () => {
    setPremissas(prev => ({
      ...prev,
      headcount: [...(prev.headcount || []), {
        id: Date.now(),
        grupo: GRUPOS_PESSOAL[0],
        regime: 'CLT',
        salario: 0,
        fator: 1.7,
        mes_inicio: 1
      }]
    }));
  };

  const removeHeadcount = (id) => {
    setPremissas(prev => ({ ...prev, headcount: prev.headcount.filter(h => h.id !== id) }));
  };

  const updateHeadcount = (id, field, value) => {
    setPremissas(prev => ({
      ...prev,
      headcount: prev.headcount.map(h => h.id === id ? { ...h, [field]: value } : h)
    }));
  };

  const handleSalvar = async () => {
    if (!empresaAtiva) return alert("Selecione uma empresa");
    setLoading(true);
    try {
      const res = await fetch('/api/financeiro/fpa/premissas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...premissas, empresa: empresaAtiva.id, ano: anoAtivo })
      });
      if (res.ok) {
        alert(`Premissas de ${empresaAtiva.nome} (${anoAtivo}) salvas com sucesso!`);
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao salvar');
      }
    } catch (error) {
      alert("Erro ao salvar premissas: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "bg-white/5 border border-white/10 rounded-lg p-2 text-sm text-white outline-none focus:border-acelerar-light-blue w-full";
  const selectCls = "bg-[#0f1e3a] border border-white/10 rounded-lg p-2 text-sm text-white outline-none focus:border-acelerar-light-blue w-full cursor-pointer";
  const labelCls = "text-[10px] text-white/40 uppercase font-bold";

  const MesSelect = ({ campo, valor }) => (
    <select className={selectCls} value={valor} onChange={e => set(campo, parseInt(e.target.value))}>
      {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
    </select>
  );

  const PercInput = ({ campo, valor }) => (
    <input type="number" step="0.01" min="0" max="100" className={inputCls}
      value={valor} onChange={e => set(campo, parseFloat(e.target.value) || 0)} />
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Abas de Empresas */}
      <div className="flex items-center bg-black/20 rounded-xl border border-white/10 overflow-x-auto no-scrollbar">
        {EMPRESAS.map((emp) => (
          <EmpresaTab key={emp.id} nome={emp.nome} logo={emp.logo}
            isActive={empresaAtiva?.id === emp.id} onClick={() => setEmpresaAtiva(emp)} />
        ))}
      </div>

      {/* Cabeçalho de Ações */}
      <div className="flex justify-between items-center bg-black/20 p-4 rounded-xl border border-white/10">
        <h2 className="text-xl font-bold text-white/90">
          {carregando ? 'Carregando...' : empresaAtiva ? `Premissas: ${empresaAtiva.nome} — ${anoAtivo}` : 'Selecione uma Empresa'}
        </h2>
        <div className="flex items-center gap-4">
          <select value={anoAtivo} onChange={(e) => setAnoAtivo(parseInt(e.target.value))}
            className="bg-[#0f1e3a] border border-white/10 rounded-lg p-2 text-sm text-white outline-none focus:border-acelerar-light-blue cursor-pointer">
            {ANOS_DISPONIVEIS.map(ano => <option key={ano} value={ano}>{ano}</option>)}
          </select>
          <button onClick={handleSalvar} disabled={loading || !empresaAtiva || carregando}
            className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white px-8 py-2 rounded-lg text-sm font-bold transition-colors shadow-lg">
            {loading ? 'SALVANDO...' : 'SALVAR PREMISSAS'}
          </button>
        </div>
      </div>

      {!empresaAtiva ? (
        <div className="flex flex-col items-center justify-center py-32 text-white/20 bg-black/10 rounded-2xl border border-dashed border-white/10">
          <svg className="w-16 h-16 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <p className="text-xl font-medium">Selecione uma empresa acima para configurar as premissas</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

          {/* Bloco 1: Reajuste Global */}
          <div className="bg-black/20 p-6 rounded-2xl border border-white/10 flex flex-col gap-4 shadow-xl">
            <h3 className="text-lg font-semibold text-white/90 border-b border-white/10 pb-2 flex items-center gap-2">
              <span className="w-1 h-5 bg-acelerar-light-blue rounded-full"></span>
              Reajuste Global
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className={labelCls}>Inflação Anual (%)</label>
                <PercInput campo="inflacao_percentual" valor={premissas.inflacao_percentual} />
              </div>
              <div className="flex flex-col gap-2">
                <label className={labelCls}>Mês de Início</label>
                <MesSelect campo="inflacao_mes_inicio" valor={premissas.inflacao_mes_inicio} />
              </div>
            </div>
          </div>

          {/* Bloco 2: Impostos sobre Receita (Deduções) */}
          <div className="bg-black/20 p-6 rounded-2xl border border-white/10 flex flex-col gap-4 shadow-xl">
            <h3 className="text-lg font-semibold text-white/90 border-b border-white/10 pb-2 flex items-center gap-2">
              <span className="w-1 h-5 bg-yellow-400 rounded-full"></span>
              Impostos sobre Receita — Deduções
              <span className="text-[10px] text-white/30 font-normal ml-1">(PIS, COFINS, ISS, IR Retido)</span>
            </h3>
            <div className="grid grid-cols-1 gap-3">
              {[
                { label: 'PIS (%)', campo_p: 'pis_percentual', campo_m: 'pis_mes_inicio' },
                { label: 'COFINS (%)', campo_p: 'cofins_percentual', campo_m: 'cofins_mes_inicio' },
                { label: 'ISS (%)', campo_p: 'iss_percentual', campo_m: 'iss_mes_inicio' },
                { label: 'IR Retido na Fonte (%)', campo_p: 'ir_retido_percentual', campo_m: 'ir_retido_mes_inicio' },
              ].map(({ label, campo_p, campo_m }) => (
                <div key={campo_p} className="grid grid-cols-3 gap-3 items-end">
                  <div className="text-xs text-white/70 font-medium">{label}</div>
                  <div className="flex flex-col gap-1">
                    <label className={labelCls}>Percentual</label>
                    <PercInput campo={campo_p} valor={premissas[campo_p]} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className={labelCls}>Mês Início</label>
                    <MesSelect campo={campo_m} valor={premissas[campo_m]} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bloco 3: Imposto sobre Lucro */}
          <div className="bg-black/20 p-6 rounded-2xl border border-white/10 flex flex-col gap-4 shadow-xl">
            <h3 className="text-lg font-semibold text-white/90 border-b border-white/10 pb-2 flex items-center gap-2">
              <span className="w-1 h-5 bg-red-400 rounded-full"></span>
              Imposto sobre Lucro — IR / CSLL Projetado
              <span className="text-[10px] text-white/30 font-normal ml-1">(% efetivo sobre Receita Bruta)</span>
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className={labelCls}>Imposto Médio Efetivo (%)</label>
                <PercInput campo="imposto_medio_percentual" valor={premissas.imposto_medio_percentual} />
              </div>
              <div className="flex flex-col gap-2">
                <label className={labelCls}>Mês de Início</label>
                <MesSelect campo="imposto_medio_mes_inicio" valor={premissas.imposto_medio_mes_inicio} />
              </div>
            </div>
            <p className="text-[10px] text-white/25 italic">
              Calculado como: Receita Bruta Operacional × Imposto Médio (%). Ajuste o percentual conforme o regime tributário da empresa (Lucro Real ou Presumido).
            </p>
          </div>

          {/* Bloco 4: Crescimento Projetado */}
          <div className="bg-black/20 p-6 rounded-2xl border border-white/10 flex flex-col gap-4 shadow-xl">
            <h3 className="text-lg font-semibold text-white/90 border-b border-white/10 pb-2 flex items-center gap-2">
              <span className="w-1 h-5 bg-green-400 rounded-full"></span>
              Crescimento Projetado
            </h3>
            <div className="grid grid-cols-2 gap-4 mb-2">
              <div className="flex flex-col gap-2">
                <label className={labelCls}>Modalidade</label>
                <select className={selectCls} value={premissas.crescimento_modalidade || 'SOBRE_RECEITA'}
                  onChange={e => set('crescimento_modalidade', e.target.value)}>
                  <option value="SOBRE_RECEITA">Sobre a Receita</option>
                  <option value="ACUMULATIVO">Acumulativo</option>
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className={labelCls}>Tipo</label>
                <select className={selectCls} value={premissas.crescimento_tipo}
                  onChange={e => set('crescimento_tipo', e.target.value)}>
                  <option value="PERCENTUAL">Percentual (%)</option>
                  <option value="VALOR_FIXO">Valor Fixo (R$)</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className={labelCls}>
                  {premissas.crescimento_tipo === 'PERCENTUAL' ? 'Percentual (%)' : 'Valor Fixo (R$)'}
                </label>
                <input type="number" step="0.01" min="0" className={inputCls}
                  value={premissas.crescimento_valor}
                  onChange={e => set('crescimento_valor', parseFloat(e.target.value) || 0)} />
              </div>
              <div className="flex flex-col gap-2">
                <label className={labelCls}>Mês de Início</label>
                <MesSelect campo="crescimento_mes_inicio" valor={premissas.crescimento_mes_inicio} />
              </div>
            </div>
            <p className="text-[10px] text-white/25 italic mt-2">
              {premissas.crescimento_modalidade === 'ACUMULATIVO'
                ? (premissas.crescimento_tipo === 'PERCENTUAL'
                    ? 'Acumulativo %: cada mês aplica o percentual sobre o resultado do mês anterior (juros compostos). Ex: Base 100k + 5% → Jan 105k, Fev 110,25k...'
                    : 'Acumulativo Valor: soma o valor fixo de forma cumulativa a cada mês. Ex: Base 70k + R$10k → Jan 80k, Fev 90k, Mar 100k...')
                : (premissas.crescimento_tipo === 'PERCENTUAL'
                    ? 'Sobre a Receita %: aplica o percentual diretamente sobre o valor já carregado naquele mês específico do orçamento.'
                    : 'Sobre a Receita Valor: adiciona o valor fixo ao total de receitas de cada mês, sem acumulação.')}
            </p>
          </div>

          {/* Bloco 5: Dissídios */}
          <div className="bg-black/20 p-6 rounded-2xl border border-white/10 flex flex-col gap-4 shadow-xl lg:col-span-2">
            <h3 className="text-lg font-semibold text-white/90 border-b border-white/10 pb-2 flex items-center gap-2">
              <span className="w-1 h-5 bg-purple-400 rounded-full"></span>
              Dissídios e Reajustes de Pessoal
            </h3>
            <div className="grid grid-cols-1 gap-3">
              {[
                { label: '(-) Pessoal Comercial', campo_p: 'dissidio_pessoal_comercial_percentual', campo_m: 'dissidio_pessoal_comercial_mes_inicio' },
                { label: '(-) Pessoal Operacional', campo_p: 'dissidio_pessoal_operacional_percentual', campo_m: 'dissidio_pessoal_operacional_mes_inicio' },
                { label: '(-) Pessoal Administrativo', campo_p: 'dissidio_pessoal_administrativo_percentual', campo_m: 'dissidio_pessoal_administrativo_mes_inicio' },
                { label: '(-) Investimento em Produto', campo_p: 'dissidio_investimento_produto_percentual', campo_m: 'dissidio_investimento_produto_mes_inicio' },
              ].map(({ label, campo_p, campo_m }) => (
                <div key={campo_p} className="grid grid-cols-3 gap-4 items-end">
                  <div className="text-xs text-white/70 font-medium">{label}</div>
                  <div className="flex flex-col gap-1">
                    <label className={labelCls}>Reajuste %</label>
                    <PercInput campo={campo_p} valor={premissas[campo_p]} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className={labelCls}>Mês Início</label>
                    <MesSelect campo={campo_m} valor={premissas[campo_m]} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bloco 6: Headcount */}
          <div className="bg-black/20 p-6 rounded-2xl border border-white/10 flex flex-col gap-4 lg:col-span-2 shadow-xl">
            <div className="flex justify-between items-center border-b border-white/10 pb-2">
              <h3 className="text-lg font-semibold text-white/90 flex items-center gap-2">
                <span className="w-1 h-5 bg-acelerar-light-blue rounded-full"></span>
                Projeção de Headcount (Novas Contratações)
              </h3>
              <button onClick={addHeadcount}
                className="bg-acelerar-light-blue hover:bg-blue-500 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105 shadow-lg">
                + ADICIONAR CONTRATAÇÃO
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-white/40 border-b border-white/5">
                    <th className="py-3 px-2 font-bold text-xs uppercase">Grupo DRE</th>
                    <th className="py-3 px-2 font-bold text-xs uppercase">Regime</th>
                    <th className="py-3 px-2 font-bold text-xs uppercase">Salário Base</th>
                    <th className="py-3 px-2 font-bold text-xs uppercase">Fator Encargos</th>
                    <th className="py-3 px-2 font-bold text-xs uppercase">Mês Início</th>
                    <th className="py-3 px-2 font-bold text-xs uppercase">Custo Total</th>
                    <th className="py-3 px-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {(premissas.headcount || []).map(h => (
                    <tr key={h.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="py-2 px-2">
                        <select className={selectCls} value={h.grupo} onChange={e => updateHeadcount(h.id, 'grupo', e.target.value)}>
                          {GRUPOS_PESSOAL.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                      </td>
                      <td className="py-2 px-2">
                        <select className={selectCls} value={h.regime} onChange={e => updateHeadcount(h.id, 'regime', e.target.value)}>
                          <option value="CLT">CLT</option>
                          <option value="PJ">PJ</option>
                          <option value="ESTAGIO">Estágio</option>
                        </select>
                      </td>
                      <td className="py-2 px-2">
                        <input type="number" className={inputCls} value={h.salario}
                          onChange={e => updateHeadcount(h.id, 'salario', parseFloat(e.target.value) || 0)} />
                      </td>
                      <td className="py-2 px-2">
                        <input type="number" step="0.1" className={inputCls} value={h.fator}
                          onChange={e => updateHeadcount(h.id, 'fator', parseFloat(e.target.value) || 0)} />
                      </td>
                      <td className="py-2 px-2">
                        <select className={selectCls} value={h.mes_inicio}
                          onChange={e => updateHeadcount(h.id, 'mes_inicio', parseInt(e.target.value))}>
                          {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                        </select>
                      </td>
                      <td className="py-2 px-2 font-bold text-green-400">
                        R$ {((h.salario || 0) * (h.fator || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 px-2 text-right">
                        <button onClick={() => removeHeadcount(h.id)}
                          className="text-red-400 hover:text-red-300 text-xs font-bold transition-colors">
                          REMOVER
                        </button>
                      </td>
                    </tr>
                  ))}
                  {(!premissas.headcount || premissas.headcount.length === 0) && (
                    <tr>
                      <td colSpan="7" className="py-10 text-center text-white/20 italic">
                        Nenhuma nova contratação projetada.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
