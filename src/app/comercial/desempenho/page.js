// Este é um Componente de Servidor por padrão no Next.js 14.
// Ele apenas desenha a estrutura estática da página.
// A lógica de busca e exibição de dados será adicionada depois.

export default function DesempenhoPage() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      
      {/* Seção 1: Cards de MVP */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Placeholder para MVP Vendedor */}
        <div className="bg-white/5 p-4 rounded-lg border border-dashed border-white/20 min-h-[100px] flex flex-col justify-center items-center">
          <p className="text-sm font-bold text-white/50">🏆 MVP Vendedor do Mês</p>
          <p className="text-xs text-white/30 mt-1">(Área Reservada)</p>
        </div>
        {/* Placeholder para MVP SDR */}
        <div className="bg-white/5 p-4 rounded-lg border border-dashed border-white/20 min-h-[100px] flex flex-col justify-center items-center">
          <p className="text-sm font-bold text-white/50">🏆 MVP SDR do Mês</p>
          <p className="text-xs text-white/30 mt-1">(Área Reservada)</p>
        </div>
      </div>

      {/* Seção 2: Gráficos de Ranking */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Placeholder para Ranking de Vendedores */}
        <div className="bg-white/5 p-4 rounded-lg border border-dashed border-white/20 min-h-[200px] flex flex-col justify-center items-center">
          <p className="text-sm font-bold text-white/50">📊 Ranking de Vendedores (MRR)</p>
          <p className="text-xs text-white/30 mt-1">(Área Reservada)</p>
        </div>
        {/* Placeholder para Ranking de SDRs */}
        <div className="bg-white/5 p-4 rounded-lg border border-dashed border-white/20 min-h-[200px] flex flex-col justify-center items-center">
          <p className="text-sm font-bold text-white/50">📊 Ranking de SDRs (MRR - Top 5)</p>
          <p className="text-xs text-white/30 mt-1">(Área Reservada)</p>
        </div>
      </div>

      {/* Seção 3: Funil de SDRs */}
      <div className="bg-white/5 p-4 rounded-lg border border-dashed border-white/20 min-h-[250px] flex flex-col justify-center items-center">
        <p className="text-sm font-bold text-white/50">🚀 Funil de SDRs (Novos Negócios)</p>
        <p className="text-xs text-white/30 mt-1">(Área Reservada)</p>
      </div>

      {/* Seção 4: Tabela de Auditoria */}
      <div className="bg-white/5 p-4 rounded-lg border border-dashed border-white/20 min-h-[300px] flex flex-col justify-center items-center">
        <p className="text-sm font-bold text-white/50">📋 Auditoria de Negócios Convertidos (Ganhos)</p>
        <p className="text-xs text-white/30 mt-1">(Área Reservada)</p>
      </div>

    </div>
  );
}
