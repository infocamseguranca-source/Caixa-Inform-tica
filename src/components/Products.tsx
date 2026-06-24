import React, { useState } from 'react';
import { 
  Package, 
  Search, 
  Plus, 
  Trash2, 
  Edit, 
  Check, 
  X, 
  Layers,
  ShoppingBag,
  TrendingDown,
  FileSpreadsheet
} from 'lucide-react';
import { Product } from '../types';
import { formatCurrency } from '../utils';
import { motion, AnimatePresence } from 'motion/react';

interface ProductsProps {
  products: Product[];
  onAddProduct: (product: Omit<Product, 'id'>) => Promise<void>;
  onEditProduct: (id: string, product: Partial<Product>) => Promise<void>;
  onDeleteProduct: (id: string) => Promise<void>;
  onExportExcel?: (data: any[], title: string) => void;
}

export default function Products({
  products,
  onAddProduct,
  onEditProduct,
  onDeleteProduct,
  onExportExcel
}: ProductsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [priceStr, setPriceStr] = useState('0');
  const [stockStr, setStockStr] = useState('0');

  const openAddModal = () => {
    setEditingProduct(null);
    setName('');
    setPriceStr('0');
    setStockStr('0');
    setIsModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setPriceStr(p.price.toString());
    setStockStr(p.stock.toString());
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    const price = parseFloat(priceStr.replace(',', '.')) || 0;
    const stock = parseInt(stockStr) || 0;

    try {
      if (editingProduct) {
        await onEditProduct(editingProduct.id, { name, price, stock });
      } else {
        await onAddProduct({ name, price, stock });
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar produto.');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Excluir este produto permanentemente do catálogo?')) {
      try {
        await onDeleteProduct(id);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleExport = () => {
    if (onExportExcel) {
      onExportExcel(products, 'Relatorio_Estoque');
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-950 font-sans">Controle de Estoque & Catálogo</h2>
          <p className="text-xs text-zinc-400">Gerencie peças de reposição, acessórios e equipamentos disponíveis para venda</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          {onExportExcel && products.length > 0 && (
            <button
              onClick={handleExport}
              className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl text-xs font-bold transition-all cursor-pointer border border-zinc-200"
            >
              <FileSpreadsheet size={16} />
              Exportar Estoque
            </button>
          )}
          <button
            onClick={openAddModal}
            className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            <Plus size={16} />
            Cadastrar Produto
          </button>
        </div>
      </div>

      {/* Grid Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-zinc-150 p-5 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Itens Únicos</span>
            <p className="text-2xl font-black text-zinc-950 mt-1">{products.length}</p>
          </div>
          <Package className="text-zinc-300" size={32} />
        </div>
        <div className="bg-white border border-zinc-150 p-5 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Total em Estoque (Unidades)</span>
            <p className="text-2xl font-black text-zinc-950 mt-1">
              {products.reduce((acc, curr) => acc + curr.stock, 0)}
            </p>
          </div>
          <ShoppingBag className="text-zinc-300" size={32} />
        </div>
        <div className="bg-white border border-zinc-150 p-5 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Alerta de Estoque Baixo</span>
            <p className="text-2xl font-black text-rose-600 mt-1">
              {products.filter(p => p.stock <= 2).length}
            </p>
          </div>
          <TrendingDown className="text-rose-300" size={32} />
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-zinc-100 flex items-center relative">
        <Search className="absolute left-7 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
        <input
          type="text"
          placeholder="Buscar produtos por nome..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-zinc-900 bg-zinc-50/50"
        />
      </div>

      {/* Products list */}
      <div className="bg-white border border-zinc-150 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-100 text-xs font-bold text-zinc-400 uppercase tracking-wider">
                <th className="py-4 px-6">Nome do Produto</th>
                <th className="py-4 px-4">Preço Venda</th>
                <th className="py-4 px-4 text-center">Nível em Estoque</th>
                <th className="py-4 px-6 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-sm text-zinc-400">
                    Nenhum produto cadastrado com os critérios buscados.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-zinc-50/40 transition-colors">
                    <td className="py-4 px-6 text-sm font-semibold text-zinc-900">{p.name}</td>
                    <td className="py-4 px-4 text-sm font-bold text-zinc-950">{formatCurrency(p.price)}</td>
                    <td className="py-4 px-4 text-center">
                      <span className={`inline-block text-xs font-bold px-3 py-1 rounded-full ${p.stock <= 2 ? 'bg-rose-50 text-rose-700 border border-rose-100' : 'bg-zinc-50 text-zinc-700 border border-zinc-100'}`}>
                        {p.stock} un
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => openEditModal(p)}
                          className="p-1.5 hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900 rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="p-1.5 hover:bg-rose-50 text-zinc-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 size={14} />
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

      {/* Add/Edit modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-2xl border border-zinc-100 shadow-xl overflow-hidden"
            >
              <div className="flex justify-between items-center bg-zinc-50 p-5 border-b border-zinc-100">
                <h3 className="text-sm font-bold text-zinc-950 font-sans">
                  {editingProduct ? 'Editar Produto' : 'Cadastrar Novo Produto'}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 hover:bg-zinc-200 text-zinc-400 hover:text-zinc-600 rounded-lg cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 mb-1">Nome do Produto / Peça</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-zinc-900"
                    placeholder="Ex: SSD Kingston NV2 500GB NVMe"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 mb-1">Preço de Venda (R$)</label>
                    <input
                      type="text"
                      required
                      value={priceStr}
                      onChange={(e) => setPriceStr(e.target.value)}
                      className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-zinc-900"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 mb-1">Qtd em Estoque</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={stockStr}
                      onChange={(e) => setStockStr(e.target.value)}
                      className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-zinc-900"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-4 border-t border-zinc-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-2 px-4 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 rounded-xl text-xs font-bold cursor-pointer transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 px-4 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold cursor-pointer transition-all"
                  >
                    Salvar Produto
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
