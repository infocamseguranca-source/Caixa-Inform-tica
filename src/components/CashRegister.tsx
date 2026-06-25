import React, { useState } from 'react';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  Edit, 
  Trash2, 
  Download, 
  Tag, 
  CreditCard,
  X,
  PlusCircle,
  FileSpreadsheet
} from 'lucide-react';
import { Transaction } from '../types';
import { formatCurrency, formatDate } from '../utils';
import { motion, AnimatePresence } from 'motion/react';

interface CashRegisterProps {
  transactions: Transaction[];
  onAddTransaction: (transaction: Omit<Transaction, 'id'>) => Promise<void>;
  onEditTransaction: (id: string, transaction: Partial<Transaction>) => Promise<void>;
  onDeleteTransaction: (id: string) => Promise<void>;
  categories?: string[];
  onExportExcel?: (data: any[], title: string) => void;
  onNavigateToCompras?: () => void;
}

const DEFAULT_CATEGORIES = [
  'Serviço de Assistência',
  'Venda de Equipamento',
  'Venda de Acessórios',
  'Compra de Peças',
  'Retirada Pro-labore',
  'Aluguel / Condomínio',
  'Luz / Internet / Telefone',
  'Ferramentas / Suprimentos',
  'Outros'
];

const PAYMENT_METHODS = [
  { value: 'pix', label: 'PIX' },
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'debito', label: 'Cartão de Débito' },
  { value: 'credito', label: 'Cartão de Crédito' }
];

export default function CashRegister({
  transactions,
  onAddTransaction,
  onEditTransaction,
  onDeleteTransaction,
  categories = DEFAULT_CATEGORIES,
  onExportExcel,
  onNavigateToCompras
}: CashRegisterProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'todos' | 'entrada' | 'saida'>('todos');
  const [filterCategory, setFilterCategory] = useState('todas');
  const [filterPayment, setFilterPayment] = useState('todos');
  const [filterPeriod, setFilterPeriod] = useState<'hoje' | '7dias' | 'mes' | 'todos'>('todos');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Form states
  const [description, setDescription] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [type, setType] = useState<'entrada' | 'saida'>('entrada');
  const [category, setCategory] = useState(categories[0] || DEFAULT_CATEGORIES[0]);
  const [paymentMethod, setPaymentMethod] = useState<'dinheiro' | 'pix' | 'debito' | 'credito'>('pix');
  const [date, setDate] = useState(new Date().toISOString().substring(0, 16));

  const openAddModal = (initialType?: 'entrada' | 'saida') => {
    setEditingTransaction(null);
    setDescription('');
    setAmountStr('');
    setType(initialType || 'entrada');
    setCategory(initialType === 'saida' ? 'Compra de Peças' : (categories[0] || DEFAULT_CATEGORIES[0]));
    setPaymentMethod('pix');
    setDate(new Date().toISOString().substring(0, 16));
    setIsModalOpen(true);
  };


  const openEditModal = (t: Transaction) => {
    setEditingTransaction(t);
    setDescription(t.description);
    setAmountStr(t.amount.toString());
    setType(t.type);
    setCategory(t.category);
    setPaymentMethod(t.paymentMethod);
    setDate(new Date(t.date).toISOString().substring(0, 16));
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(amountStr.replace(',', '.'));
    if (isNaN(amount) || amount <= 0) {
      alert('Por favor, insira um valor válido maior que zero.');
      return;
    }

    try {
      if (editingTransaction) {
        await onEditTransaction(editingTransaction.id, {
          description,
          amount,
          type,
          category,
          paymentMethod,
          date: new Date(date).toISOString()
        });
      } else {
        await onAddTransaction({
          description,
          amount,
          type,
          category,
          paymentMethod,
          date: new Date(date).toISOString()
        });
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar lançamento.');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza de que deseja excluir este lançamento? Esta operação não pode ser desfeita.')) {
      try {
        await onDeleteTransaction(id);
      } catch (err) {
        console.error(err);
        alert('Erro ao excluir lançamento.');
      }
    }
  };

  // Filter transactions
  const filteredTransactions = transactions.filter(t => {
    // Search term
    const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
      t.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Type
    const matchesType = filterType === 'todos' || t.type === filterType;

    // Category
    const matchesCategory = filterCategory === 'todas' || t.category === filterCategory;

    // Payment Method
    const matchesPayment = filterPayment === 'todos' || t.paymentMethod === filterPayment;

    // Period
    let matchesPeriod = true;
    const tDate = new Date(t.date);
    const now = new Date();
    
    if (filterPeriod === 'hoje') {
      matchesPeriod = tDate.toDateString() === now.toDateString();
    } else if (filterPeriod === '7dias') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(now.getDate() - 7);
      matchesPeriod = tDate >= sevenDaysAgo;
    } else if (filterPeriod === 'mes') {
      matchesPeriod = tDate.getMonth() === now.getMonth() && tDate.getFullYear() === now.getFullYear();
    }

    return matchesSearch && matchesType && matchesCategory && matchesPayment && matchesPeriod;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Inflow/Outflow calculations on filtered transactions
  const filteredInflow = filteredTransactions
    .filter(t => t.type === 'entrada')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const filteredOutflow = filteredTransactions
    .filter(t => t.type === 'saida')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const filteredBalance = filteredInflow - filteredOutflow;

  // CSV export
  const exportToCSV = () => {
    const headers = ['Descrição', 'Valor', 'Tipo', 'Categoria', 'Forma de Pagamento', 'Data'];
    const rows = filteredTransactions.map(t => [
      t.description,
      t.amount,
      t.type === 'entrada' ? 'Entrada' : 'Saída',
      t.category,
      t.paymentMethod.toUpperCase(),
      formatDate(t.date)
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(';'), ...rows.map(e => e.join(';'))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `caixa_fluxo_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportExcelLocal = () => {
    if (onExportExcel) {
      onExportExcel(filteredTransactions, 'Fluxo_de_Caixa');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Add button */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-950 font-sans">Fluxo de Caixa</h2>
          <p className="text-xs text-zinc-400">Controle total de entradas, saídas e movimentações financeiras</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          {onExportExcel && (
            <button
              onClick={exportExcelLocal}
              className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-sm font-semibold transition-all cursor-pointer"
            >
              <FileSpreadsheet size={18} />
              Exportar Excel
            </button>
          )}
          <button
            onClick={exportToCSV}
            className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 rounded-xl text-sm font-semibold transition-all cursor-pointer"
          >
            <Download size={18} />
            Exportar CSV
          </button>
          <button
            onClick={() => openAddModal()}
            className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-sm font-semibold transition-all cursor-pointer"
          >
            <Plus size={18} />
            Novo Lançamento
          </button>
        </div>
      </div>

      {/* Filter Stats bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-zinc-50 p-4 rounded-xl border border-zinc-200/60">
        <div className="text-center md:text-left border-b md:border-b-0 md:border-r border-zinc-200 pb-3 md:pb-0 md:pr-4">
          <span className="text-[11px] uppercase tracking-wider font-bold text-zinc-400">Saldo Filtrado</span>
          <h4 className={`text-xl font-extrabold ${filteredBalance >= 0 ? 'text-zinc-950' : 'text-rose-600'} mt-1`}>
            {formatCurrency(filteredBalance)}
          </h4>
        </div>
        <div className="text-center md:text-left border-b md:border-b-0 md:border-r border-zinc-200 pb-3 md:pb-0 md:px-4">
          <span className="text-[11px] uppercase tracking-wider font-bold text-zinc-400">Entradas Filtradas</span>
          <h4 className="text-xl font-extrabold text-emerald-600 mt-1">
            + {formatCurrency(filteredInflow)}
          </h4>
        </div>
        <div className="text-center md:text-left md:pl-4">
          <span className="text-[11px] uppercase tracking-wider font-bold text-zinc-400">Saídas Filtradas</span>
          <h4 className="text-xl font-extrabold text-rose-600 mt-1">
            - {formatCurrency(filteredOutflow)}
          </h4>
        </div>
      </div>

      {/* Filter and Search controls */}
      <div className="bg-white p-5 rounded-2xl border border-zinc-100 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input
              type="text"
              placeholder="Buscar por descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 bg-zinc-50/50"
            />
          </div>

          {/* Type Filter */}
          <div className="relative">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="w-full pl-3 pr-8 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-zinc-900 bg-zinc-50/50 appearance-none"
            >
              <option value="todos">Tipo: Todos</option>
              <option value="entrada">Apenas Entradas</option>
              <option value="saida">Apenas Saídas</option>
            </select>
            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" size={16} />
          </div>

          {/* Category Filter */}
          <div className="relative">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full pl-3 pr-8 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-zinc-900 bg-zinc-50/50 appearance-none"
            >
              <option value="todas">Categoria: Todas</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <Tag className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" size={16} />
          </div>

          {/* Payment Filter */}
          <div className="relative">
            <select
              value={filterPayment}
              onChange={(e) => setFilterPayment(e.target.value)}
              className="w-full pl-3 pr-8 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-zinc-900 bg-zinc-50/50 appearance-none"
            >
              <option value="todos">Pagamento: Todos</option>
              {PAYMENT_METHODS.map(method => (
                <option key={method.value} value={method.value}>{method.label}</option>
              ))}
            </select>
            <CreditCard className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" size={16} />
          </div>

          {/* Period Filter */}
          <div className="relative">
            <select
              value={filterPeriod}
              onChange={(e) => setFilterPeriod(e.target.value as any)}
              className="w-full pl-3 pr-8 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-zinc-900 bg-zinc-50/50 appearance-none"
            >
              <option value="todos">Período: Sempre</option>
              <option value="hoje">Hoje</option>
              <option value="7dias">Últimos 7 dias</option>
              <option value="mes">Este Mês</option>
            </select>
            <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" size={16} />
          </div>
        </div>
      </div>

      {/* Transactions Table/List */}
      <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-100 text-xs font-bold text-zinc-400 uppercase tracking-wider">
                <th className="py-4 px-6">Lançamento</th>
                <th className="py-4 px-4">Categoria</th>
                <th className="py-4 px-4">Método</th>
                <th className="py-4 px-4">Data e Hora</th>
                <th className="py-4 px-4 text-right">Valor</th>
                <th className="py-4 px-6 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-sm text-zinc-400">
                    Nenhum lançamento encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((t) => (
                  <tr key={t.id} className="hover:bg-zinc-50/40 transition-colors">
                    {/* Title & Desc */}
                    <td className="py-4 px-6 flex items-center gap-3">
                      <div className={`p-2 rounded-lg shrink-0 ${t.type === 'entrada' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                        {t.type === 'entrada' ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-zinc-900 truncate max-w-xs">{t.description}</p>
                        {t.osId && (
                          <span className="inline-block bg-blue-50 text-blue-600 text-[10px] font-bold px-1.5 py-0.5 rounded mt-0.5">
                            Integrado à OS
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-4 px-4 text-sm text-zinc-500 font-medium">
                      {t.category}
                    </td>

                    {/* Method */}
                    <td className="py-4 px-4 text-sm text-zinc-500 uppercase font-bold text-xs">
                      {PAYMENT_METHODS.find(p => p.value === t.paymentMethod)?.label || t.paymentMethod}
                    </td>

                    {/* Date */}
                    <td className="py-4 px-4 text-sm text-zinc-400">
                      {formatDate(t.date)}
                    </td>

                    {/* Amount */}
                    <td className="py-4 px-4 text-right">
                      <span className={`text-sm font-bold ${t.type === 'entrada' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {t.type === 'entrada' ? '+' : '-'} {formatCurrency(t.amount)}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-6 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openEditModal(t)}
                          className="p-1.5 hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900 rounded-lg transition-colors cursor-pointer"
                          title="Editar lançamento"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(t.id)}
                          className="p-1.5 hover:bg-rose-50 text-zinc-500 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                          title="Excluir lançamento"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transaction Entry/Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-lg rounded-2xl border border-zinc-100 shadow-xl overflow-hidden"
            >
              {/* Header */}
              <div className="flex justify-between items-center bg-zinc-50 p-5 border-b border-zinc-100">
                <h3 className="text-base font-bold text-zinc-950 font-sans">
                  {editingTransaction ? 'Editar Lançamento' : 'Novo Lançamento'}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 hover:bg-zinc-200 text-zinc-400 hover:text-zinc-600 rounded-lg transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {/* Type toggle */}
                <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setType('entrada')}
                    className={`py-2 px-4 rounded-lg font-bold text-sm transition-all cursor-pointer ${type === 'entrada' ? 'bg-white text-emerald-600 shadow-xs' : 'text-zinc-500'}`}
                  >
                    Entrada (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('saida')}
                    className={`py-2 px-4 rounded-lg font-bold text-sm transition-all cursor-pointer ${type === 'saida' ? 'bg-white text-rose-600 shadow-xs' : 'text-zinc-500'}`}
                  >
                    Saída (-)
                  </button>
                </div>

                {/* Description */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider">Descrição</label>
                    {type === 'saida' && onNavigateToCompras && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsModalOpen(false);
                          onNavigateToCompras();
                        }}
                        className="text-[10px] font-black text-emerald-600 hover:text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer transition-colors"
                        title="Registrar Compra com Contrato de Proteção Legal Completo"
                      >
                        🏷️ É Compra de Aparelho? Registrar Completo ➡️
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Formatação de Notebook Dell"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3.5 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  />
                </div>

                {/* Value & Payment Method */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Valor (R$)</label>
                    <input
                      type="text"
                      required
                      placeholder="0.00"
                      value={amountStr}
                      onChange={(e) => setAmountStr(e.target.value)}
                      className="w-full px-3.5 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-zinc-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Forma de Pagamento</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as any)}
                      className="w-full px-3.5 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-zinc-900 bg-white"
                    >
                      {PAYMENT_METHODS.map(m => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Category & Date */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Categoria</label>
                    <select
                       value={category}
                       onChange={(e) => setCategory(e.target.value)}
                       className="w-full px-3.5 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-zinc-900 bg-white"
                    >
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Data e Hora</label>
                    <input
                      type="datetime-local"
                      required
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full px-3.5 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-zinc-900"
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-4 border-t border-zinc-100 mt-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-2.5 px-4 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 rounded-xl text-sm font-semibold transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 px-4 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-sm font-semibold transition-all cursor-pointer"
                  >
                    {editingTransaction ? 'Salvar Alterações' : 'Confirmar Lançamento'}
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
