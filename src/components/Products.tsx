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
  FileSpreadsheet,
  Bot,
  Copy,
  Clock
} from 'lucide-react';
import { Product, ShopConfig } from '../types';
import { formatCurrency } from '../utils';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, ChevronRight, Folder } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { capitalizeFirstLetter } from '../utils';

interface ProductsProps {
  products: Product[];
  onAddProduct: (product: Omit<Product, 'id'>) => Promise<void>;
  onEditProduct: (id: string, product: Partial<Product>) => Promise<void>;
  onDeleteProduct: (id: string) => Promise<void>;
  onExportExcel?: (data: any[], title: string) => void;
  shopName?: string;
  shopPhone?: string;
  config: ShopConfig;
  onSaveConfig: (config: ShopConfig) => Promise<void>;
}

export default function Products({
  products,
  onAddProduct,
  onEditProduct,
  onDeleteProduct,
  onExportExcel,
  shopName = 'Nossa Loja',
  shopPhone = '',
  config,
  onSaveConfig
}: ProductsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isStockTimeModalOpen, setIsStockTimeModalOpen] = useState(false);
  const [stockTimeFilter, setStockTimeFilter] = useState<'1m' | '6m' | '1y' | '2y' | '3y'>('1m');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [priceStr, setPriceStr] = useState('0');
  const [costPriceStr, setCostPriceStr] = useState('');
  const [stockStr, setStockStr] = useState('0');
  const [type, setType] = useState('Acessório');
  const [condition, setCondition] = useState<'novo' | 'semi-novo'>('novo');
  const [usageTime, setUsageTime] = useState('');
  const [description, setDescription] = useState('');
  const [isPromotion, setIsPromotion] = useState(false);
  const [promotionPriceStr, setPromotionPriceStr] = useState('0');
  const [ignoreSimilarWarning, setIgnoreSimilarWarning] = useState(false);
  
  const [newProductType, setNewProductType] = useState('');
  const [draggedProductTypeIdx, setDraggedProductTypeIdx] = useState<number | null>(null);
  const [draggedFolderId, setDraggedFolderId] = useState<string | null>(null);

  // Prompt modal
  const [promptModalOpen, setPromptModalOpen] = useState(false);
  const [generatedPrompt, setGeneratedPrompt] = useState('');

  const openAddModal = () => {
    setEditingProduct(null);
    setName('');
    setPriceStr('0');
    setCostPriceStr('');
    setStockStr('0');
    setType(config.productTypes && config.productTypes.length > 0 ? config.productTypes[0] : 'Acessório');
    setCondition('novo');
    setUsageTime('');
    setDescription('');
    setIsPromotion(false);
    setPromotionPriceStr('0');
    setIsModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setPriceStr(p.price.toString());
    setCostPriceStr(p.costPrice?.toString() || '');
    setStockStr(p.stock.toString());
    setType(p.type || (config.productTypes && config.productTypes.length > 0 ? config.productTypes[0] : 'Acessório'));
    setCondition(p.condition || 'novo');
    setUsageTime(p.usageTime || '');
    setDescription(p.description || '');
    setIsPromotion(p.isPromotion || false);
    setPromotionPriceStr(p.promotionPrice?.toString() || '0');
    setIsModalOpen(true);
  };

  const findSimilarProduct = () => {
    if (!name || name.length < 3) return null;
    const normalize = (str: string) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    const inputNorm = normalize(name);
    
    return products.find(p => {
      if (editingProduct && p.id === editingProduct.id) return false;
      const pNorm = normalize(p.name);
      return (pNorm.includes(inputNorm) || inputNorm.includes(pNorm));
    });
  };

  const similarProduct = findSimilarProduct();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    if (similarProduct && !ignoreSimilarWarning && !editingProduct) {
      // Don't submit, user must click "Adicionar Novo Mesmo Assim"
      return;
    }

    const price = parseFloat(priceStr.replace(',', '.')) || 0;
    const costPrice = costPriceStr ? parseFloat(costPriceStr.replace(',', '.')) : undefined;
    const stock = parseInt(stockStr) || 0;
    const promotionPrice = isPromotion ? parseFloat(promotionPriceStr.replace(',', '.')) || 0 : undefined;

    const prodData: Omit<Product, 'id'> = {
      name,
      price,
      costPrice,
      stock,
      type,
      condition,
      usageTime: condition === 'semi-novo' ? usageTime : undefined,
      description,
      isPromotion,
      promotionPrice
    };

    try {
      if (editingProduct) {
        await onEditProduct(editingProduct.id, prodData);
      } else {
        await onAddProduct(prodData);
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

  const generateStockTimePDF = () => {
    const doc = new jsPDF();
    const primaryColor = config.colors?.primary || '#18181b';
    
    // Convert hex to rgb
    let r = 24, g = 24, b = 27; // default zinc-900
    if (primaryColor.startsWith('#')) {
      const hex = primaryColor.replace('#', '');
      r = parseInt(hex.substring(0, 2), 16);
      g = parseInt(hex.substring(2, 4), 16);
      b = parseInt(hex.substring(4, 6), 16);
    }

    const now = new Date();
    let filterDate = new Date();
    let filterLabel = '';
    
    if (stockTimeFilter === '1m') { filterDate.setMonth(now.getMonth() - 1); filterLabel = 'Mais de 1 Mês'; }
    if (stockTimeFilter === '6m') { filterDate.setMonth(now.getMonth() - 6); filterLabel = 'Mais de 6 Meses'; }
    if (stockTimeFilter === '1y') { filterDate.setFullYear(now.getFullYear() - 1); filterLabel = 'Mais de 1 Ano'; }
    if (stockTimeFilter === '2y') { filterDate.setFullYear(now.getFullYear() - 2); filterLabel = 'Mais de 2 Anos'; }
    if (stockTimeFilter === '3y') { filterDate.setFullYear(now.getFullYear() - 3); filterLabel = 'Mais de 3 Anos'; }

    const oldProducts = products.filter(p => {
      if (!p.createdAt) return false;
      return new Date(p.createdAt) < filterDate;
    });

    doc.setFillColor(r, g, b);
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text(shopName, 15, 20);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Relatório de Produtos em Estoque: ${filterLabel}`, 15, 30);
    doc.text(`Gerado em: ${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR')}`, 15, 35);

    if (oldProducts.length === 0) {
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(12);
      doc.text('Nenhum produto encontrado com este tempo de estoque.', 15, 60);
    } else {
      const tableData = oldProducts.map(p => [
        p.name,
        p.type || 'N/A',
        `${p.stock} un`,
        formatCurrency(p.price),
        new Date(p.createdAt!).toLocaleDateString('pt-BR')
      ]);

      autoTable(doc, {
        startY: 45,
        head: [['Produto', 'Pasta/Tipo', 'Estoque', 'Preço', 'Data Cadastro']],
        body: tableData,
        headStyles: { fillColor: [r, g, b] },
        styles: { fontSize: 9 },
        alternateRowStyles: { fillColor: [245, 245, 245] }
      });
    }

    doc.save(`estoque_${filterLabel.replace(/ /g, '_').toLowerCase()}.pdf`);
  };

  const handleExport = () => {
    if (onExportExcel) {
      onExportExcel(products, 'Relatorio_Estoque');
    }
  };

  const generateAIPrompt = (p: Product) => {
    const prompt = `Atue como um copywriter especialista em e-commerce e marketing digital. Crie um anúncio profissional, altamente persuasivo e focado em conversão para o seguinte produto:

**Produto**: ${p.name}
**Tipo**: ${p.type || 'Acessório'}
**Condição**: ${p.condition === 'semi-novo' ? 'Semi-novo/Usado' : 'Novo na Caixa'}
${p.condition === 'semi-novo' && p.usageTime ? `**Tempo de Uso Médio**: ${p.usageTime}\n` : ''}**Preço**: ${formatCurrency(p.price)}
**Descrição Técnica**: ${p.description || 'Produto de alta qualidade e excelente custo-benefício.'}

**INFORMAÇÕES DA LOJA PARA O ANÚNCIO:**
- **Nome da Loja**: ${shopName}
- **Contato/WhatsApp**: ${shopPhone || 'Consulte-nos pelo chat'}

**O QUE O ANÚNCIO DEVE CONTER:**
1. Um título chamativo e direto.
2. Uma breve introdução conectando com a dor/desejo do cliente.
3. Os principais benefícios do produto em bullet points curtos.
4. Se for semi-novo, reforce o estado de conservação, testes de qualidade e a economia.
5. Uma Call to Action (Chamada para ação) forte no final, direcionando para o contato da loja ou loja física.
6. Use emojis de forma estratégica, sem exagerar.

Além disso, escreva um PROMPT DE IMAGEM detalhado para gerar no Midjourney/DALL-E, com as seguintes especificações:
- Imagem hiper-realista, estilo foto de estúdio de produto premium.
- Fundo elegante (clean) que destaque o produto.
- Iluminação cinematográfica.
- Proporção: 16:9 (Ideal para Instagram Stories / Status).`;

    setGeneratedPrompt(prompt);
    setPromptModalOpen(true);
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const productsByType = filteredProducts.reduce((acc, p) => {
    const pType = p.type || 'Sem Categoria';
    if (!acc[pType]) acc[pType] = [];
    acc[pType].push(p);
    return acc;
  }, {} as Record<string, Product[]>);

  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({});

  const toggleFolder = (folder: string) => {
    setOpenFolders(prev => ({...prev, [folder]: prev[folder] === undefined ? false : !prev[folder]}));
  };

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
            onClick={() => setIsConfigModalOpen(true)}
            className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl text-xs font-bold transition-all cursor-pointer border border-zinc-200"
            title="Configurar Tipos de Produto"
          >
            <ShoppingBag size={16} />
            Tipos
          </button>
          <button
            onClick={() => setIsStockTimeModalOpen(true)}
            className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-all cursor-pointer border border-indigo-200"
            title="Tempo em Estoque"
          >
            <Clock size={16} />
            Tempo em Estoque
          </button>
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
                <th className="py-4 px-4">Preço Custo</th>
                <th className="py-4 px-4">Preço Venda</th>
                <th className="py-4 px-4 text-center">Nível em Estoque</th>
                <th className="py-4 px-6 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {Object.keys(productsByType).length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-sm text-zinc-400">
                    Nenhum produto cadastrado com os critérios buscados.
                  </td>
                </tr>
              ) : searchTerm.trim() !== '' ? (
                filteredProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="py-4 px-6 text-sm font-semibold text-zinc-900">
                      {p.name}
                      {p.type && <span className="ml-2 px-2 py-0.5 rounded bg-zinc-100 text-zinc-500 text-[10px]">{p.type}</span>}
                      {p.isPromotion && <span className="ml-2 px-1.5 py-0.5 rounded-md bg-indigo-100 text-indigo-700 text-[9px] font-black uppercase tracking-wider">Promoção</span>}
                    </td>
                    <td className="py-4 px-4 text-sm font-medium text-zinc-500">
                      {p.costPrice ? formatCurrency(p.costPrice) : '-'}
                    </td>
                    <td className="py-4 px-4 text-sm font-bold text-zinc-950">
                      {p.isPromotion && p.promotionPrice !== undefined ? (
                        <div className="flex flex-col">
                          <span className="text-indigo-600">{formatCurrency(p.promotionPrice)}</span>
                          <span className="text-[10px] text-zinc-400 line-through">{formatCurrency(p.price)}</span>
                        </div>
                      ) : (
                        formatCurrency(p.price)
                      )}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className={`inline-block text-xs font-bold px-3 py-1 rounded-full ${p.stock <= 2 ? 'bg-rose-50 text-rose-700 border border-rose-100' : 'bg-zinc-50 text-zinc-700 border border-zinc-100'}`}>
                        {p.stock} un
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => generateAIPrompt(p)}
                          className="p-1.5 hover:bg-indigo-50 text-indigo-400 hover:text-indigo-600 rounded-lg transition-colors cursor-pointer"
                          title="Gerar Anúncio IA"
                        >
                          <Bot size={14} />
                        </button>
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
              ) : (
                (() => {
                  const configuredTypes = config.productTypes || [];
                  const extraTypes = Object.keys(productsByType).filter(t => !configuredTypes.includes(t));
                  const allFolders = [...configuredTypes, ...extraTypes];
                  
                  return allFolders.map(folder => {
                    const items = (productsByType[folder] || []).sort((a, b) => a.name.localeCompare(b.name));
                    if (!items || items.length === 0) return null;
                    return (
                    <React.Fragment key={folder}>
                      {/* Folder Row */}
                      <tr 
                        draggable
                        onDragStart={(e) => {
                          e.stopPropagation();
                          setDraggedFolderId(folder);
                        }}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (!draggedFolderId || draggedFolderId === folder) return;
                          
                          const configuredTypes = config.productTypes || [];
                          const extraTypes = Object.keys(productsByType).filter(t => !configuredTypes.includes(t));
                          const currentFolders = [...configuredTypes, ...extraTypes];
                          
                          const draggedIdx = currentFolders.indexOf(draggedFolderId);
                          const targetIdx = currentFolders.indexOf(folder);
                          
                          if (draggedIdx !== -1 && targetIdx !== -1) {
                            const newFolders = [...currentFolders];
                            const item = newFolders.splice(draggedIdx, 1)[0];
                            newFolders.splice(targetIdx, 0, item);
                            await onSaveConfig({ ...config, productTypes: newFolders });
                          }
                          setDraggedFolderId(null);
                        }}
                        className={`bg-zinc-50/50 hover:bg-zinc-100 transition-colors cursor-pointer group ${draggedFolderId === folder ? 'opacity-50' : ''}`}
                        onClick={() => toggleFolder(folder)}
                      >
                      <td colSpan={5} className="py-3 px-6 text-sm font-bold text-zinc-800">
                        <div className="flex items-center gap-2">
                          <span className="text-zinc-300 mr-1 cursor-move" title="Arrastar pasta">⣿</span>
                          <Folder size={16} className="text-zinc-400 group-hover:text-zinc-600 transition-colors" />
                          <span>{folder}</span>
                          <span className="text-[10px] bg-zinc-200 text-zinc-600 px-2 py-0.5 rounded-full ml-2">
                            {items.length} itens
                          </span>
                          <div className="ml-auto">
                            {openFolders[folder] !== false ? (
                              <ChevronDown size={16} className="text-zinc-400" />
                            ) : (
                              <ChevronRight size={16} className="text-zinc-400" />
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                    
                    {/* Product Rows inside Folder */}
                    {openFolders[folder] !== false && items.map((p) => (
                      <tr key={p.id} className="hover:bg-zinc-50 transition-colors">
                        <td className="py-4 px-6 text-sm font-semibold text-zinc-900 pl-10 border-l-2 border-transparent hover:border-zinc-300">
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-zinc-300"></div>
                            {p.name}
                            {p.isPromotion && <span className="ml-2 px-1.5 py-0.5 rounded-md bg-indigo-100 text-indigo-700 text-[9px] font-black uppercase tracking-wider">Promoção</span>}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-sm font-medium text-zinc-500">
                          {p.costPrice ? formatCurrency(p.costPrice) : '-'}
                        </td>
                        <td className="py-4 px-4 text-sm font-bold text-zinc-950">
                          {p.isPromotion && p.promotionPrice !== undefined ? (
                            <div className="flex flex-col">
                              <span className="text-indigo-600">{formatCurrency(p.promotionPrice)}</span>
                              <span className="text-[10px] text-zinc-400 line-through">{formatCurrency(p.price)}</span>
                            </div>
                          ) : (
                            formatCurrency(p.price)
                          )}
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className={`inline-block text-xs font-bold px-3 py-1 rounded-full ${p.stock <= 2 ? 'bg-rose-50 text-rose-700 border border-rose-100' : 'bg-zinc-50 text-zinc-700 border border-zinc-100'}`}>
                            {p.stock} un
                          </span>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => generateAIPrompt(p)}
                              className="p-1.5 hover:bg-indigo-50 text-indigo-400 hover:text-indigo-600 rounded-lg transition-colors cursor-pointer"
                              title="Gerar Anúncio IA"
                            >
                              <Bot size={14} />
                            </button>
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
                    ))}
                  </React.Fragment>
                );
                });
                })()
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

              <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 mb-1">Nome do Produto / Peça</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => {
                      setName(capitalizeFirstLetter(e.target.value));
                      setIgnoreSimilarWarning(false);
                    }}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-zinc-900"
                    placeholder="Ex: SSD Kingston NV2 500GB NVMe"
                  />
                  {similarProduct && !editingProduct && !ignoreSimilarWarning && (
                    <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-xl flex flex-col gap-2">
                      <div className="text-amber-800 text-xs">
                        <strong>Aviso:</strong> Já existe um produto parecido cadastrado: <strong>{similarProduct.name}</strong>.
                      </div>
                      <div className="flex gap-2">
                        <button 
                          type="button" 
                          onClick={() => {
                            setEditingProduct(similarProduct);
                            setName(similarProduct.name);
                            setPriceStr(similarProduct.price.toString());
                            setStockStr(similarProduct.stock.toString());
                            setType(similarProduct.type || (config.productTypes && config.productTypes.length > 0 ? config.productTypes[0] : 'Acessório'));
                            setCondition(similarProduct.condition || 'novo');
                            setUsageTime(similarProduct.usageTime || '');
                            setDescription(similarProduct.description || '');
                            setIgnoreSimilarWarning(false);
                          }}
                          className="px-3 py-1.5 bg-amber-200 hover:bg-amber-300 text-amber-900 text-xs font-bold rounded-lg transition-colors"
                        >
                          Editar Existente
                        </button>
                        <button 
                          type="button"
                          onClick={() => setIgnoreSimilarWarning(true)}
                          className="px-3 py-1.5 bg-white border border-amber-200 hover:bg-amber-100 text-amber-800 text-xs font-bold rounded-lg transition-colors"
                        >
                          Adicionar Novo Mesmo Assim
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 mb-1">Preço de Custo (Opcional)</label>
                    <input
                      type="text"
                      value={costPriceStr}
                      onChange={(e) => setCostPriceStr(e.target.value)}
                      className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-zinc-900"
                      placeholder="0.00"
                    />
                  </div>
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

                <div className="flex flex-col gap-3 p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={isPromotion}
                      onChange={(e) => setIsPromotion(e.target.checked)}
                      className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-600"
                    />
                    <span className="text-xs font-bold text-indigo-900">Ativar Promoção para este produto</span>
                  </label>
                  {isPromotion && (
                    <div>
                      <label className="block text-xs font-bold text-indigo-700 mb-1">Preço Promocional (R$)</label>
                      <input
                        type="text"
                        required={isPromotion}
                        value={promotionPriceStr}
                        onChange={(e) => setPromotionPriceStr(e.target.value)}
                        className="w-full px-3 py-2 border border-indigo-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                        placeholder="0.00"
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 mb-1">Tipo de Produto</label>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                      className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-zinc-900"
                    >
                      {config.productTypes?.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 mb-1">Condição</label>
                    <select
                      value={condition}
                      onChange={(e) => setCondition(e.target.value as 'novo' | 'semi-novo')}
                      className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-zinc-900"
                    >
                      <option value="novo">Novo</option>
                      <option value="semi-novo">Semi-novo / Usado</option>
                    </select>
                  </div>
                </div>

                {condition === 'semi-novo' && (
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 mb-1">Tempo de Uso Médio (Opcional)</label>
                    <input
                      type="text"
                      value={usageTime}
                      onChange={(e) => setUsageTime(e.target.value)}
                      className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-zinc-900"
                      placeholder="Ex: 6 meses, 1 ano..."
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-zinc-500 mb-1">Descrição</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-zinc-900 resize-none h-20"
                    placeholder="Descrição do produto (opcional)"
                  />
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
                    disabled={!!(similarProduct && !ignoreSimilarWarning && !editingProduct)}
                    className={`flex-1 py-2 px-4 rounded-xl text-xs font-bold transition-all ${
                      similarProduct && !ignoreSimilarWarning && !editingProduct
                        ? 'bg-zinc-300 text-zinc-500 cursor-not-allowed'
                        : 'bg-zinc-900 hover:bg-zinc-800 text-white cursor-pointer'
                    }`}
                  >
                    {similarProduct && !ignoreSimilarWarning && !editingProduct ? 'Verifique o Aviso Acima' : 'Salvar Produto'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Prompt Modal */}
      <AnimatePresence>
        {promptModalOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-[60]">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-2xl rounded-2xl border border-zinc-100 shadow-xl overflow-hidden"
            >
              <div className="flex justify-between items-center bg-zinc-50 p-5 border-b border-zinc-100">
                <div className="flex items-center gap-2">
                  <Bot size={18} className="text-indigo-600" />
                  <h3 className="text-sm font-bold text-zinc-950 font-sans">
                    Prompt Gerado com IA
                  </h3>
                </div>
                <button
                  onClick={() => setPromptModalOpen(false)}
                  className="p-1 hover:bg-zinc-200 text-zinc-400 hover:text-zinc-600 rounded-lg cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-xs text-zinc-500">
                  Copie o prompt abaixo e cole no ChatGPT, Claude ou Gemini para gerar seu anúncio.
                </p>
                <div className="relative">
                  <textarea
                    readOnly
                    value={generatedPrompt}
                    className="w-full h-64 p-4 text-xs font-mono text-zinc-700 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none resize-none"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(generatedPrompt);
                      alert('Prompt copiado para a área de transferência!');
                    }}
                    className="absolute top-2 right-2 p-2 bg-white border border-zinc-200 hover:bg-zinc-100 text-zinc-700 rounded-lg transition-colors cursor-pointer flex items-center gap-2 text-xs font-bold shadow-sm"
                    title="Copiar prompt"
                  >
                    <Copy size={14} />
                    Copiar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Config Product Types Modal */}
      <AnimatePresence>
        {isConfigModalOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-[70]">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-2xl border border-zinc-100 shadow-xl overflow-hidden"
            >
              <div className="flex justify-between items-center bg-zinc-50 p-5 border-b border-zinc-100">
                <div className="flex items-center gap-2">
                  <ShoppingBag size={18} className="text-zinc-900" />
                  <h3 className="text-sm font-bold text-zinc-950 font-sans">
                    Categorias de Produtos
                  </h3>
                </div>
                <button
                  onClick={() => setIsConfigModalOpen(false)}
                  className="p-1 hover:bg-zinc-200 text-zinc-400 hover:text-zinc-600 rounded-lg cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-xs text-zinc-500">
                  Adicione e organize os tipos de produtos para agrupar o seu estoque em pastas.
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Nova categoria..."
                    value={newProductType}
                    onChange={(e) => setNewProductType(e.target.value)}
                    className="flex-1 px-3 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-zinc-900"
                    onKeyDown={async (e) => {
                      if (e.key === 'Enter' && newProductType.trim()) {
                        e.preventDefault();
                        const updatedTypes = [...(config.productTypes || []), newProductType.trim()];
                        await onSaveConfig({ ...config, productTypes: updatedTypes });
                        setNewProductType('');
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      if (newProductType.trim()) {
                        const updatedTypes = [...(config.productTypes || []), newProductType.trim()];
                        await onSaveConfig({ ...config, productTypes: updatedTypes });
                        setNewProductType('');
                      }
                    }}
                    className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Adicionar
                  </button>
                </div>
                <div className="flex flex-col gap-2 pt-2 max-h-60 overflow-y-auto pr-2">
                  {(config.productTypes || []).map((type, idx) => (
                    <div 
                      key={type} 
                      draggable
                      onDragStart={() => setDraggedProductTypeIdx(idx)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={async (e) => {
                        e.preventDefault();
                        if (draggedProductTypeIdx === null || draggedProductTypeIdx === idx) return;
                        const newTypes = [...(config.productTypes || [])];
                        const item = newTypes.splice(draggedProductTypeIdx, 1)[0];
                        newTypes.splice(idx, 0, item);
                        await onSaveConfig({ ...config, productTypes: newTypes });
                        setDraggedProductTypeIdx(null);
                      }}
                      className="flex justify-between items-center py-2 px-3 border border-zinc-150 rounded-xl text-xs font-semibold text-zinc-700 bg-zinc-50 cursor-move hover:bg-zinc-100 transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-zinc-400">⣿</span>
                        <Folder size={14} className="text-zinc-400" /> {type}
                      </span>
                      <button
                        type="button"
                        onClick={async () => {
                          const updatedTypes = (config.productTypes || []).filter(t => t !== type);
                          await onSaveConfig({ ...config, productTypes: updatedTypes });
                        }}
                        className="text-zinc-400 hover:text-rose-600 font-bold p-1 rounded-lg hover:bg-white transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Tempo em Estoque Modal */}
      <AnimatePresence>
        {isStockTimeModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-sm rounded-2xl border border-zinc-100 shadow-xl overflow-hidden"
            >
              <div className="flex justify-between items-center bg-zinc-50 p-5 border-b border-zinc-100">
                <h3 className="text-sm font-bold text-zinc-950 font-sans flex items-center gap-2">
                  <Clock size={16} className="text-indigo-600" />
                  Tempo em Estoque
                </h3>
                <button
                  onClick={() => setIsStockTimeModalOpen(false)}
                  className="p-1 hover:bg-zinc-200 text-zinc-400 hover:text-zinc-600 rounded-lg cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-6">
                <p className="text-xs text-zinc-500 mb-4">
                  Baixe um relatório PDF dos produtos que estão cadastrados no sistema há mais do que o tempo selecionado abaixo.
                </p>

                <div className="space-y-3">
                  <label className="block text-xs font-bold text-zinc-500 mb-1">Selecionar Período Mínimo</label>
                  <select
                    value={stockTimeFilter}
                    onChange={(e) => setStockTimeFilter(e.target.value as any)}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="1m">Mais de 1 Mês</option>
                    <option value="6m">Mais de 6 Meses</option>
                    <option value="1y">Mais de 1 Ano</option>
                    <option value="2y">Mais de 2 Anos</option>
                    <option value="3y">Mais de 3 Anos</option>
                  </select>
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={generateStockTimePDF}
                    className="w-full flex justify-center items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    <FileSpreadsheet size={16} />
                    Baixar Relatório (PDF)
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
