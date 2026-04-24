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

function EmpresaTab({ nome, logo, isActive, onClick }) {
  const isVMC = nome === 'VMC Tech';
  const containerWidth = isVMC ? 'w-40' : 'w-28';

  return (
    <button 
      onClick={onClick}
      className={`relative flex items-center justify-center h-20 ${containerWidth} transition-all duration-200 border-b-2 ${
        isActive 
        ? 'border-acelerar-light-blue bg-white/5' 
        : 'border-transparent hover:bg-white/5'
      }`}
    >
      {logo && (
        <div className="relative w-full h-full p-3">
          <Image 
            src={logo} 
            alt={nome} 
            fill
            className={`transition-opacity duration-200 object-contain p-2 ${isActive ? 'opacity-100' : 'opacity-50 hover:opacity-80'}`}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            priority
          />
        </div>
      )}
    </button>
  );
}

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

export default function PremissasPage() {
  const [empresaAtiva, setEmpresaAtiva] = useState(null);
  const [anoAtivo, setAnoAtivo] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  
  const [reajustes, setReajustes] = useState({
    inflacao: { percentual: 0, mes: 1 },
    imposto: { percentual: 0, mes: 1 }
  });

  const [dissidios, setDissidios] = useState(
    GRUPOS_PESSOAL.reduce((acc, grupo) => ({ ...acc, [grupo]: { percentual: 0, mes: 1 } }), {})
  );

  const [headcounts, setHeadcounts] = useState([]);

  const addHeadcount = () => {
    setHeadcounts([...headcounts, {
      id: Date.now(),
      grupo: GRUPOS_PESSOAL[0],
      regime: 'CLT',
      salario: 0,
      fator: 1.7,
      mes_inicio: 1
    }]);
  };

  const removeHeadcount = (id) => {
    setHeadcounts(headcounts.filter(h => h.id !== id));
  };

  const updateHeadcount = (id, field, value) => {
    setHeadcounts(headcounts.map(h => h.id === id ? { ...h, [field]: value } : h));
  };

  const handleSalvar = async () => {
    if (!empresaAtiva) return alert("Selecione uma empresa");
    setLoading(true);
    try {
      alert("Premissas salvas com sucesso para " + empresaAtiva.nome);
    } catch (error) {
      alert("Erro ao salvar premissas");
    } finally {
      setLoading(false);
    }
  };

  const selectStyle = "bg-acelerar-dark-blue border border-white/10 rounded-lg p-2 text-sm text-white outline-none focus:border-acelerar-light-blue appearance-none cursor-pointer";
  const optionStyle = "bg-acelerar-dark-blue text-white";

  return (
    <div className="flex flex-col gap-6">
      {/* Abas de Empresas (Padrão DFC) */}
      <div className="flex items-center bg-black/20 rounded-xl border border-white/10 overflow-x-auto no-scrollbar">
        {EMPRESAS.map((emp) => (
          <EmpresaTab
            key={emp.id}
            nome={emp.nome}
            logo={emp.logo}
            isActive={empresaAtiva?.id === emp.id}
            onClick={() => setEmpresaAtiva(emp)}
          />
        ))}
      </div>

      {/* Cabeçalho de Ações */}
      <div className="flex justify-between items-center bg-black/20 p-4 rounded-xl border border-white/10">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-white/90">
            {empresaAtiva ? `Premissas: ${empresaAtiva.nome}` : 'Selecione uma Empresa'}
          </h2>
        </div>
        <div className="flex items-center gap-4">
          <select 
            value={anoAtivo} 
            onChange={(e) => setAnoAtivo(e.target.value)}
            className={selectStyle}
          >
            {[2024, 2025, 2026].map(ano => <option key={ano} value={ano} className={optionStyle}>{ano}</option>)}
          </select>
          <button 
            onClick={handleSalvar}
            disabled={loading || !empresaAtiva}
            className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white px-8 py-2 rounded-lg text-sm font-bold transition-colors shadow-lg"
          >
            {loading ? 'SALVANDO...' : 'SALVAR PREMISSAS'}
          </button>
        </div>
      </div>

      {!empresaAtiva ? (
        <div className="flex flex-col items-center justify-center py-32 text-white/20 bg-black/10 rounded-2xl border border-dashed border-white/10">
          <svg className="w-16 h-16 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
          <p className="text-xl font-medium">Selecione uma empresa acima para configurar as premissas</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Reajustes Globais */}
          <div className="bg-black/20 p-6 rounded-2xl border border-white/10 flex flex-col gap-4 shadow-xl">
            <h3 className="text-lg font-semibold text-white/90 border-b border-white/10 pb-2 flex items-center gap-2">
              <span className="w-1 h-5 bg-acelerar-light-blue rounded-full"></span>
              Reajustes Globais & Impostos
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-xs text-white/50 uppercase font-bold">Inflação Anual (%)</label>
                <input 
                  type="number" 
                  className="bg-white/5 border border-white/10 rounded-lg p-2 text-sm text-white outline-none focus:border-acelerar-light-blue"
                  value={reajustes.inflacao.percentual}
                  onChange={(e) => setReajustes({...reajustes, inflacao: {...reajustes.inflacao, percentual: e.target.value}})}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs text-white/50 uppercase font-bold">Mês de Início</label>
                <select className={selectStyle} value={reajustes.inflacao.mes} onChange={(e) => setReajustes({...reajustes, inflacao: {...reajustes.inflacao, mes: e.target.value}})}>
                  {MESES.map((m, i) => <option key={m} value={i+1} className={optionStyle}>{m}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs text-white/50 uppercase font-bold">Imposto Médio (%)</label>
                <input 
                  type="number" 
                  className="bg-white/5 border border-white/10 rounded-lg p-2 text-sm text-white outline-none focus:border-acelerar-light-blue"
                  value={reajustes.imposto.percentual}
                  onChange={(e) => setReajustes({...reajustes, imposto: {...reajustes.imposto, percentual: e.target.value}})}
                />
              </div>
            </div>
          </div>

          {/* Dissídios */}
          <div className="bg-black/20 p-6 rounded-2xl border border-white/10 flex flex-col gap-4 shadow-xl">
            <h3 className="text-lg font-semibold text-white/90 border-b border-white/10 pb-2 flex items-center gap-2">
              <span className="w-1 h-5 bg-acelerar-light-blue rounded-full"></span>
              Dissídios e Reajustes de Pessoal
            </h3>
            <div className="flex flex-col gap-3">
              {GRUPOS_PESSOAL.map(grupo => (
                <div key={grupo} className="grid grid-cols-3 gap-4 items-end">
                  <div className="text-xs text-white/70 font-medium truncate">{grupo}</div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-white/40 uppercase font-bold">Reajuste %</label>
                    <input 
                      type="number" 
                      className="bg-white/5 border border-white/10 rounded-lg p-2 text-sm text-white outline-none focus:border-acelerar-light-blue"
                      value={dissidios[grupo].percentual}
                      onChange={(e) => setDissidios({...dissidios, [grupo]: {...dissidios[grupo], percentual: e.target.value}})}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-white/40 uppercase font-bold">Mês</label>
                    <select className={selectStyle} value={dissidios[grupo].mes} onChange={(e) => setDissidios({...dissidios, [grupo]: {...dissidios[grupo], mes: e.target.value}})}>
                      {MESES.map((m, i) => <option key={m} value={i+1} className={optionStyle}>{m}</option>)}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Headcount */}
          <div className="bg-black/20 p-6 rounded-2xl border border-white/10 flex flex-col gap-4 lg:col-span-2 shadow-xl">
            <div className="flex justify-between items-center border-b border-white/10 pb-2">
              <h3 className="text-lg font-semibold text-white/90 flex items-center gap-2">
                <span className="w-1 h-5 bg-acelerar-light-blue rounded-full"></span>
                Projeção de Headcount (Novas Contratações)
              </h3>
              <button onClick={addHeadcount} className="bg-acelerar-light-blue hover:bg-blue-500 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105 shadow-lg">+ ADICIONAR CONTRATAÇÃO</button>
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
                  {headcounts.map(h => (
                    <tr key={h.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="py-2 px-2"><select className={selectStyle + " w-full"} value={h.grupo} onChange={(e) => updateHeadcount(h.id, 'grupo', e.target.value)}>{GRUPOS_PESSOAL.map(g => <option key={g} value={g} className={optionStyle}>{g}</option>)}</select></td>
                      <td className="py-2 px-2"><select className={selectStyle + " w-full"} value={h.regime} onChange={(e) => updateHeadcount(h.id, 'regime', e.target.value)}><option value="CLT" className={optionStyle}>CLT</option><option value="PJ" className={optionStyle}>PJ</option><option value="ESTAGIO" className={optionStyle}>Estágio</option></select></td>
                      <td className="py-2 px-2"><input type="number" className="bg-white/5 border border-white/10 rounded p-1 text-xs text-white outline-none w-full" value={h.salario} onChange={(e) => updateHeadcount(h.id, 'salario', e.target.value)} /></td>
                      <td className="py-2 px-2"><input type="number" step="0.1" className="bg-white/5 border border-white/10 rounded p-1 text-xs text-white outline-none w-full" value={h.fator} onChange={(e) => updateHeadcount(h.id, 'fator', e.target.value)} /></td>
                      <td className="py-2 px-2"><select className={selectStyle + " w-full"} value={h.mes_inicio} onChange={(e) => updateHeadcount(h.id, 'mes_inicio', e.target.value)}>{MESES.map((m, i) => <option key={m} value={i+1} className={optionStyle}>{m}</option>)}</select></td>
                      <td className="py-2 px-2 font-bold text-green-400">R$ {(h.salario * h.fator).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      <td className="py-2 px-2 text-right"><button onClick={() => removeHeadcount(h.id)} className="text-red-400 hover:text-red-300 text-xs font-bold transition-colors">REMOVER</button></td>
                    </tr>
                  ))}
                  {headcounts.length === 0 && (<tr><td colSpan="7" className="py-10 text-center text-white/20 italic">Nenhuma nova contratação projetada.</td></tr>)}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
