"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const EMPRESAS = [
  { id: 'victec', nome: 'Victec', logo: '/logos/victec.png' },
  { id: 'vmctech', nome: 'VMC Tech', logo: '/logos/vmctech.png' },
  { id: 'grt', nome: 'GRT', logo: '/logos/grt.png' },
  { id: 'bllog', nome: 'Bllog', logo: '/logos/bllog.png' },
  { id: 'm3', nome: 'M3', logo: '/logos/m3.png' },
  { id: 'acelerar', nome: 'Acelerar', logo: '/logos/acelerar.png' },
  { id: 'blive', nome: 'bLive', logo: '/logos/blive.png' },
  { id: 'condway', nome: 'Condway', logo: '/logos/condway.png' },
  { id: 'isket', nome: 'Isket', logo: '/logos/isket.png' },
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

export default function PremissasPage() {
  const [empresaAtiva, setEmpresaAtiva] = useState(null);
  const [anoAtivo, setAnoAtivo] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  
  // Estados das Premissas
  const [reajustes, setReajustes] = useState({
    inflacao: { percentual: 0, mes: 1 },
    imposto: { percentual: 0, mes: 1 }
  });

  const [dissidios, setDissidios] = useState(
    GRUPOS_PESSOAL.reduce((acc, grupo) => ({ ...acc, [grupo]: { percentual: 0, mes: 1 } }), {})
  );

  const [headcounts, setHeadcounts] = useState([]);

  // Adicionar nova linha de headcount
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
      // Aqui chamaremos a API para salvar as premissas no Supabase
      // Por enquanto, simulamos o sucesso
      console.log("Salvando premissas:", { empresaAtiva, anoAtivo, reajustes, dissidios, headcounts });
      alert("Premissas salvas com sucesso para " + empresaAtiva.nome);
    } catch (error) {
      alert("Erro ao salvar premissas");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Seleção de Empresa */}
      <div className="flex flex-wrap gap-4 items-center bg-black/20 p-4 rounded-xl border border-white/10">
        {EMPRESAS.map((emp) => (
          <button
            key={emp.id}
            onClick={() => setEmpresaAtiva(emp)}
            className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
              empresaAtiva?.id === emp.id ? 'bg-acelerar-light-blue text-white shadow-lg scale-105' : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            <span className="text-sm font-medium">{emp.nome}</span>
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <select 
            value={anoAtivo} 
            onChange={(e) => setAnoAtivo(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-acelerar-light-blue"
          >
            {[2024, 2025, 2026].map(ano => <option key={ano} value={ano}>{ano}</option>)}
          </select>
          <button 
            onClick={handleSalvar}
            disabled={loading || !empresaAtiva}
            className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white px-6 py-2 rounded-lg text-sm font-bold transition-colors"
          >
            {loading ? 'Salvando...' : 'SALVAR PREMISSAS'}
          </button>
        </div>
      </div>

      {!empresaAtiva ? (
        <div className="flex flex-col items-center justify-center py-20 text-white/40 bg-black/10 rounded-2xl border border-dashed border-white/10">
          <p className="text-lg">Selecione uma empresa para configurar as premissas</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Card: Reajustes Globais */}
          <div className="bg-black/20 p-6 rounded-2xl border border-white/10 flex flex-col gap-4">
            <h3 className="text-lg font-semibold text-white/90 border-b border-white/10 pb-2">Reajustes Globais & Impostos</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-xs text-white/50 uppercase font-bold">Inflação Anual (%)</label>
                <input 
                  type="number" 
                  className="bg-white/5 border border-white/10 rounded-lg p-2 text-sm outline-none focus:border-acelerar-light-blue"
                  value={reajustes.inflacao.percentual}
                  onChange={(e) => setReajustes({...reajustes, inflacao: {...reajustes.inflacao, percentual: e.target.value}})}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs text-white/50 uppercase font-bold">Mês de Início</label>
                <select 
                  className="bg-white/5 border border-white/10 rounded-lg p-2 text-sm outline-none"
                  value={reajustes.inflacao.mes}
                  onChange={(e) => setReajustes({...reajustes, inflacao: {...reajustes.inflacao, mes: e.target.value}})}
                >
                  {MESES.map((m, i) => <option key={m} value={i+1}>{m}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs text-white/50 uppercase font-bold">Imposto Médio (%)</label>
                <input 
                  type="number" 
                  className="bg-white/5 border border-white/10 rounded-lg p-2 text-sm outline-none focus:border-acelerar-light-blue"
                  value={reajustes.imposto.percentual}
                  onChange={(e) => setReajustes({...reajustes, imposto: {...reajustes.imposto, percentual: e.target.value}})}
                />
              </div>
            </div>
          </div>

          {/* Card: Dissídios de Pessoal */}
          <div className="bg-black/20 p-6 rounded-2xl border border-white/10 flex flex-col gap-4">
            <h3 className="text-lg font-semibold text-white/90 border-b border-white/10 pb-2">Dissídios e Reajustes de Pessoal</h3>
            <div className="flex flex-col gap-3">
              {GRUPOS_PESSOAL.map(grupo => (
                <div key={grupo} className="grid grid-cols-3 gap-4 items-end">
                  <div className="text-xs text-white/70 font-medium truncate">{grupo}</div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-white/40 uppercase font-bold">Reajuste %</label>
                    <input 
                      type="number" 
                      className="bg-white/5 border border-white/10 rounded-lg p-2 text-sm outline-none focus:border-acelerar-light-blue"
                      value={dissidios[grupo].percentual}
                      onChange={(e) => setDissidios({...dissidios, [grupo]: {...dissidios[grupo], percentual: e.target.value}})}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-white/40 uppercase font-bold">Mês</label>
                    <select 
                      className="bg-white/5 border border-white/10 rounded-lg p-2 text-sm outline-none"
                      value={dissidios[grupo].mes}
                      onChange={(e) => setDissidios({...dissidios, [grupo]: {...dissidios[grupo], mes: e.target.value}})}
                    >
                      {MESES.map((m, i) => <option key={m} value={i+1}>{m}</option>)}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Card: Headcount (Novas Contratações) */}
          <div className="bg-black/20 p-6 rounded-2xl border border-white/10 flex flex-col gap-4 lg:col-span-2">
            <div className="flex justify-between items-center border-b border-white/10 pb-2">
              <h3 className="text-lg font-semibold text-white/90">Projeção de Headcount (Novas Contratações)</h3>
              <button 
                onClick={addHeadcount}
                className="bg-acelerar-light-blue hover:bg-blue-500 text-white px-4 py-1 rounded-lg text-xs font-bold transition-colors"
              >
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
                  {headcounts.map(h => (
                    <tr key={h.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="py-2 px-2">
                        <select 
                          className="bg-white/5 border border-white/10 rounded p-1 text-xs outline-none w-full"
                          value={h.grupo}
                          onChange={(e) => updateHeadcount(h.id, 'grupo', e.target.value)}
                        >
                          {GRUPOS_PESSOAL.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                      </td>
                      <td className="py-2 px-2">
                        <select 
                          className="bg-white/5 border border-white/10 rounded p-1 text-xs outline-none w-full"
                          value={h.regime}
                          onChange={(e) => updateHeadcount(h.id, 'regime', e.target.value)}
                        >
                          <option value="CLT">CLT</option>
                          <option value="PJ">PJ</option>
                          <option value="ESTAGIO">Estágio</option>
                        </select>
                      </td>
                      <td className="py-2 px-2">
                        <input 
                          type="number" 
                          className="bg-white/5 border border-white/10 rounded p-1 text-xs outline-none w-full"
                          value={h.salario}
                          onChange={(e) => updateHeadcount(h.id, 'salario', e.target.value)}
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input 
                          type="number" 
                          step="0.1"
                          className="bg-white/5 border border-white/10 rounded p-1 text-xs outline-none w-full"
                          value={h.fator}
                          onChange={(e) => updateHeadcount(h.id, 'fator', e.target.value)}
                        />
                      </td>
                      <td className="py-2 px-2">
                        <select 
                          className="bg-white/5 border border-white/10 rounded p-1 text-xs outline-none w-full"
                          value={h.mes_inicio}
                          onChange={(e) => updateHeadcount(h.id, 'mes_inicio', e.target.value)}
                        >
                          {MESES.map((m, i) => <option key={m} value={i+1}>{m}</option>)}
                        </select>
                      </td>
                      <td className="py-2 px-2 font-bold text-green-400">
                        R$ {(h.salario * h.fator).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 px-2 text-right">
                        <button onClick={() => removeHeadcount(h.id)} className="text-red-400 hover:text-red-300 text-xs font-bold">REMOVER</button>
                      </td>
                    </tr>
                  ))}
                  {headcounts.length === 0 && (
                    <tr>
                      <td colSpan="7" className="py-10 text-center text-white/20 italic">Nenhuma nova contratação projetada.</td>
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
