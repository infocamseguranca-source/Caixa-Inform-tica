import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Wrench, 
  Plus, 
  ArrowUpRight, 
  ArrowDownRight,
  Clock,
  User,
  Activity
} from 'lucide-react';
import { Transaction, ServiceOrder } from '../types';
import { formatCurrency, formatDate } from '../utils';
import { motion } from 'motion/react';

interface DashboardProps {
  transactions: Transaction[];
  serviceOrders: ServiceOrder[];
  onNavigate: (tab: 'dashboard' | 'caixa' | 'os' | 'backup') => void;
  onQuickTransaction: (type: 'entrada' | 'saida') => void;
  onQuickOS: () => void;
}

export default function Dashboard({ 
  transactions, 
  serviceOrders, 
  onNavigate,
  onQuickTransaction,
  onQuickOS 
}: DashboardProps) {
  
  // Calculate stats
  const totalInflow = transactions
    .filter(t => t.type === 'entrada' || t.type === 'abertura_caixa')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalOutflow = transactions
    .filter(t => t.type === 'saida')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const currentBalance = totalInflow - totalOutflow;

  const activeOS = serviceOrders.filter(os => 
    os.status !== 'entregue' && os.status !== 'cancelado'
  );

  const pendingRevenue = activeOS.reduce((acc, curr) => acc + curr.totalAmount, 0);

  // Get recent transactions (last 5)
  const recentTransactions = [...transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  // Get active OS list (last 5 updated)
  const recentOS = [...activeOS]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  // Calculate Monthly Pieces Profit
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  let monthlyPiecesProfit = 0;
  
  transactions.forEach(t => {
    const d = new Date(t.date);
    if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
      if (t.items && t.items.length > 0) {
        t.items.forEach(item => {
          if (item.product && item.product.costPrice) {
            const salePrice = item.product.promotionPrice || item.product.price || 0;
            const profitPerItem = salePrice - item.product.costPrice;
            monthlyPiecesProfit += profitPerItem * item.qty;
          }
        });
      }
    }
  });

  // Daily flow data for the last 7 days chart
  const getLast7DaysData = () => {
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      
      const dayInflows = transactions
        .filter(t => (t.type === 'entrada' || t.type === 'abertura_caixa') && t.date.startsWith(dateStr))
        .reduce((sum, t) => sum + t.amount, 0);
        
      const dayOutflows = transactions
        .filter(t => t.type === 'saida' && t.date.startsWith(dateStr))
        .reduce((sum, t) => sum + t.amount, 0);

      result.push({
        label: d.toLocaleDateString('pt-BR', { weekday: 'short' }),
        inflow: dayInflows,
        outflow: dayOutflows,
        net: dayInflows - dayOutflows,
        dateStr
      });
    }
    return result;
  };

  const chartData = getLast7DaysData();
  const maxVal = Math.max(...chartData.map(d => Math.max(d.inflow, d.outflow, 100)));

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {/* Card Saldo Atual */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white p-6 rounded-2xl shadow-xs border border-zinc-100 flex flex-col justify-between"
          id="card-saldo"
        >
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-zinc-500">Saldo Atual em Caixa</span>
            <div className={`p-2 rounded-xl ${currentBalance >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
              <DollarSign size={20} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className={`text-2xl font-bold tracking-tight ${currentBalance >= 0 ? 'text-zinc-950' : 'text-rose-600'}`}>
              {formatCurrency(currentBalance)}
            </h3>
            <p className="text-xs text-zinc-400 mt-1">Saldo real de todas as operações</p>
          </div>
        </motion.div>

        {/* Card Lucro de Peças (Mês Atual) */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="bg-indigo-50/50 p-6 rounded-2xl shadow-xs border border-indigo-100 flex flex-col justify-between"
          id="card-lucro-pecas"
        >
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-indigo-900">Lucro de Peças (Mês)</span>
            <div className="p-2 rounded-xl bg-indigo-100 text-indigo-600">
              <Activity size={20} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold tracking-tight text-indigo-700">
              {formatCurrency(monthlyPiecesProfit)}
            </h3>
            <p className="text-xs text-indigo-400 mt-1">Apenas produtos com custo</p>
          </div>
        </motion.div>

        {/* Card Total Entradas */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="bg-white p-6 rounded-2xl shadow-xs border border-zinc-100 flex flex-col justify-between"
          id="card-entradas"
        >
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-zinc-500">Total de Entradas</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold tracking-tight text-emerald-600">
              {formatCurrency(totalInflow)}
            </h3>
            <p className="text-xs text-zinc-400 mt-1">Soma de recebimentos e vendas</p>
          </div>
        </motion.div>

        {/* Card Total Saídas */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          className="bg-white p-6 rounded-2xl shadow-xs border border-zinc-100 flex flex-col justify-between"
          id="card-saidas"
        >
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-zinc-500">Total de Saídas</span>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
              <TrendingDown size={20} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold tracking-tight text-rose-600">
              {formatCurrency(totalOutflow)}
            </h3>
            <p className="text-xs text-zinc-400 mt-1">Despesas, pagamentos e compras</p>
          </div>
        </motion.div>

        {/* Card OS Ativas */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.20 }}
          className="bg-white p-6 rounded-2xl shadow-xs border border-zinc-100 flex flex-col justify-between"
          id="card-os"
        >
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-zinc-500">Ordens de Serviço</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Wrench size={20} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold tracking-tight text-blue-600">
              {activeOS.length} Ativas
            </h3>
            <p className="text-xs text-zinc-400 mt-1">{formatCurrency(pendingRevenue)} a receber</p>
          </div>
        </motion.div>
      </div>

      {/* Quick Actions & Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Chart Flow */}
        <div className="bg-white p-6 rounded-2xl border border-zinc-100 lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-zinc-950">Fluxo de Caixa (Últimos 7 dias)</h3>
              <p className="text-xs text-zinc-400">Entradas e saídas diárias</p>
            </div>
            <div className="flex gap-4 text-xs font-medium">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></span>Entradas</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-rose-500 rounded-full"></span>Saídas</span>
            </div>
          </div>

          {/* SVG Custom Chart */}
          <div className="h-64 flex flex-col justify-between pt-4">
            <div className="flex-1 flex items-end justify-between px-2 gap-4">
              {chartData.map((day, idx) => {
                const inflowHeight = `${(day.inflow / maxVal) * 80}%`;
                const outflowHeight = `${(day.outflow / maxVal) * 80}%`;

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center group h-full justify-end relative">
                    <div className="flex gap-1.5 items-end justify-center w-full h-full pb-2">
                      {/* Inflow bar */}
                      <div 
                        style={{ height: inflowHeight }} 
                        className="w-4 bg-emerald-500 hover:bg-emerald-600 transition-all rounded-t-sm relative group"
                      >
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 bg-zinc-900 text-white text-[10px] px-1.5 py-0.5 rounded shadow opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap mb-1 z-10">
                          {formatCurrency(day.inflow)}
                        </div>
                      </div>
                      {/* Outflow bar */}
                      <div 
                        style={{ height: outflowHeight }} 
                        className="w-4 bg-rose-500 hover:bg-rose-600 transition-all rounded-t-sm relative group"
                      >
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 bg-zinc-900 text-white text-[10px] px-1.5 py-0.5 rounded shadow opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap mb-1 z-10">
                          {formatCurrency(day.outflow)}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-zinc-500 uppercase mt-1">{day.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Quick actions panel */}
        <div className="bg-white p-6 rounded-2xl border border-zinc-100 space-y-6">
          <div>
            <h3 className="text-lg font-bold text-zinc-950 font-sans">Ações Rápidas</h3>
            <p className="text-xs text-zinc-400">Lançamentos expressos</p>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <button
              onClick={() => onQuickTransaction('entrada')}
              className="flex items-center gap-3 p-3.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold rounded-xl transition-all cursor-pointer text-sm w-full"
            >
              <div className="p-1.5 bg-white text-emerald-600 rounded-lg shadow-xs">
                <Plus size={18} />
              </div>
              Lançar Entrada (+)
            </button>

            <button
              onClick={() => onQuickTransaction('saida')}
              className="flex items-center gap-3 p-3.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold rounded-xl transition-all cursor-pointer text-sm w-full"
            >
              <div className="p-1.5 bg-white text-rose-600 rounded-lg shadow-xs">
                <Plus size={18} />
              </div>
              Lançar Saída (-)
            </button>

            <button
              onClick={onQuickOS}
              className="flex items-center gap-3 p-3.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold rounded-xl transition-all cursor-pointer text-sm w-full"
            >
              <div className="p-1.5 bg-white text-blue-600 rounded-lg shadow-xs">
                <Wrench size={18} />
              </div>
              Nova Ordem de Serviço
            </button>
          </div>

          <div className="border-t border-zinc-100 pt-4 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Atalhos</h4>
            <div className="flex gap-2">
              <button 
                onClick={() => onNavigate('caixa')}
                className="flex-1 py-2 px-3 text-xs bg-zinc-50 hover:bg-zinc-100 text-zinc-600 border border-zinc-200 rounded-lg font-medium cursor-pointer"
              >
                Ver Fluxo Caixa
              </button>
              <button 
                onClick={() => onNavigate('backup')}
                className="flex-1 py-2 px-3 text-xs bg-zinc-50 hover:bg-zinc-100 text-zinc-600 border border-zinc-200 rounded-lg font-medium cursor-pointer"
              >
                Drive & Backup
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Ultimos Lancamentos */}
        <div className="bg-white p-6 rounded-2xl border border-zinc-100 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-base font-bold text-zinc-950">Últimos Lançamentos</h3>
              <p className="text-xs text-zinc-400">Histórico recente de caixa</p>
            </div>
            <button 
              onClick={() => onNavigate('caixa')}
              className="text-xs font-semibold text-zinc-600 hover:text-zinc-950 flex items-center gap-0.5"
            >
              Ver todos <ArrowUpRight size={14} />
            </button>
          </div>

          <div className="divide-y divide-zinc-100">
            {recentTransactions.length === 0 ? (
              <div className="py-8 text-center text-sm text-zinc-400">
                Nenhum lançamento no caixa ainda.
              </div>
            ) : (
              recentTransactions.map((t) => (
                <div key={t.id} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      t.type === 'entrada' || t.type === 'abertura_caixa' 
                        ? 'bg-emerald-50 text-emerald-600' 
                        : t.type === 'fechamento_caixa'
                          ? 'bg-amber-50 text-amber-600'
                          : 'bg-rose-50 text-rose-600'
                    }`}>
                      {(t.type === 'entrada' || t.type === 'abertura_caixa') ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-zinc-950">{t.description}</p>
                      <div className="flex items-center gap-1.5 text-xs text-zinc-400 mt-0.5">
                        <span className="capitalize">{t.paymentMethod}</span>
                        <span>•</span>
                        <span>{t.category}</span>
                        {(t.type === 'abertura_caixa' || t.type === 'fechamento_caixa') && (
                          <>
                            <span>•</span>
                            <span className="bg-zinc-100 px-1 py-0.5 rounded text-[9px] font-bold">CAIXA</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-sm font-bold ${
                      t.type === 'entrada' || t.type === 'abertura_caixa' 
                        ? 'text-emerald-600' 
                        : t.type === 'fechamento_caixa'
                          ? 'text-amber-600'
                          : 'text-rose-600'
                    }`}>
                      {t.type === 'entrada' || t.type === 'abertura_caixa' ? '+' : t.type === 'fechamento_caixa' ? '=' : '-'} {formatCurrency(t.amount)}
                    </span>
                    <p className="text-[10px] text-zinc-400 mt-0.5">{formatDate(t.date)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Ordens de Servicos Ativas */}
        <div className="bg-white p-6 rounded-2xl border border-zinc-100 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-base font-bold text-zinc-950">Ordens de Serviço em Aberto</h3>
              <p className="text-xs text-zinc-400">Serviços técnicos ativos</p>
            </div>
            <button 
              onClick={() => onNavigate('os')}
              className="text-xs font-semibold text-zinc-600 hover:text-zinc-950 flex items-center gap-0.5"
            >
              Ver todas <ArrowUpRight size={14} />
            </button>
          </div>

          <div className="divide-y divide-zinc-100">
            {recentOS.length === 0 ? (
              <div className="py-8 text-center text-sm text-zinc-400">
                Nenhuma ordem de serviço ativa.
              </div>
            ) : (
              recentOS.map((os) => (
                <div key={os.id} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                      <Wrench size={16} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-zinc-950">{os.osNumber}</p>
                        <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                          {os.status === 'aguardando' ? 'Aguardando Orçamento' : 
                           os.status === 'aprovado' ? 'Aprovado' :
                           os.status === 'em_reparo' ? 'Em Reparo' :
                           os.status === 'pronto' ? 'Pronto para Entrega' : os.status}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 mt-0.5">{os.customerName} - {os.deviceName}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-zinc-900">
                      {formatCurrency(os.totalAmount)}
                    </span>
                    <p className="text-[10px] text-zinc-400 mt-0.5">{formatDate(os.createdAt)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
