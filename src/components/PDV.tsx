import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, 
  Search, 
  Plus, 
  Trash2, 
  User, 
  FileText, 
  Check, 
  X, 
  Printer, 
  Percent, 
  DollarSign,
  AlertTriangle,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Calendar
} from 'lucide-react';
import { Product, Staff, Transaction } from '../types';
import { formatCurrency } from '../utils';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';

interface PDVProps {
  products: Product[];
  staffList: Staff[];
  transactions: Transaction[];
  onAddProduct: (product: Omit<Product, 'id'>) => Promise<void>;
  onRegisterSale: (saleData: {
    items: { product: Product; qty: number }[];
    sellerId?: string;
    technicianId?: string;
    paymentMethod: 'dinheiro' | 'pix' | 'debito' | 'credito';
    total: number;
  }) => Promise<void>;
  shopName?: string;
  shopPhone?: string;
  shopCnpjCpf?: string;
}

export default function PDV({
  products,
  staffList,
  transactions,
  onAddProduct,
  onRegisterSale,
  shopName,
  shopPhone,
  shopCnpjCpf
}: PDVProps) {
  // PDV States
  const [cart, setCart] = useState<{ product: Product; qty: number }[]>([]);
  const [selectedSeller, setSelectedSeller] = useState('');
  const [selectedTechnician, setSelectedTechnician] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'dinheiro' | 'pix' | 'debito' | 'credito'>('pix');
  
  // Autocomplete search
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  
  // Custom price and quantity below product name search
  const [customPrice, setCustomPrice] = useState('');
  const [customQty, setCustomQty] = useState('1');
  
  // New quick product form
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickName, setQuickName] = useState('');
  const [quickPrice, setQuickPrice] = useState('');
  const [quickStock, setQuickStock] = useState('10');

  // Print invoice modal
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [printPaperWidth, setPrintPaperWidth] = useState<'80mm' | 'A4'>('80mm');
  const [completedSale, setCompletedSale] = useState<{
    items: { product: Product; qty: number }[];
    seller?: Staff;
    technician?: Staff;
    paymentMethod: string;
    total: number;
    date: string;
    invoiceNumber: string;
  } | null>(null);

  // Filter recommendations based on search text
  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }
    const filtered = products.filter(p => 
      p.name.toLowerCase().includes(query.toLowerCase())
    );
    setSuggestions(filtered);
  }, [query, products]);

  const addToCart = (product: Product) => {
    const existing = cart.find(item => item.product.id === product.id);
    if (existing) {
      if (existing.qty >= product.stock) {
        alert('Quantidade desejada excede o estoque disponível!');
        return;
      }
      setCart(cart.map(item => 
        item.product.id === product.id ? { ...item, qty: item.qty + 1 } : item
      ));
    } else {
      if (product.stock <= 0) {
        alert('Produto sem estoque disponível!');
        return;
      }
      setCart([...cart, { product, qty: 1 }]);
    }
    setQuery('');
    setSuggestions([]);
  };

  const removeFromCart = (pId: string) => {
    setCart(cart.filter(item => item.product.id !== pId));
  };

  const updateCartQty = (pId: string, value: number) => {
    const p = products.find(prod => prod.id === pId) || cart.find(item => item.product.id === pId)?.product;
    if (!p) return;
    if (value > p.stock) {
      alert(`Quantidade máxima em estoque é ${p.stock}`);
      return;
    }
    if (value <= 0) {
      removeFromCart(pId);
      return;
    }
    setCart(cart.map(item => 
      item.product.id === pId ? { ...item, qty: value } : item
    ));
  };

  const handleAddCustomItem = () => {
    if (!query.trim()) return;
    const price = parseFloat(customPrice.replace(',', '.')) || 0;
    const qty = parseInt(customQty) || 1;
    
    const tempProduct: Product = {
      id: `temp-${Date.now()}`,
      name: query.trim(),
      price: price,
      stock: 99999
    };
    
    setCart([...cart, { product: tempProduct, qty }]);
    setQuery('');
    setCustomPrice('');
    setCustomQty('1');
    setSuggestions([]);
  };

  const cartTotal = cart.reduce((acc, curr) => acc + (curr.product.price * curr.qty), 0);

  const handleQuickAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickName.trim()) return;
    try {
      const price = parseFloat(quickPrice.replace(',', '.')) || 0;
      const stock = parseInt(quickStock) || 0;
      
      // We simulate adding product (will trigger parent callback)
      await onAddProduct({
        name: quickName,
        price,
        stock
      });

      // Find the newly registered product by name or reload suggestions
      alert(`Produto ${quickName} adicionado ao estoque!`);
      setQuery(quickName);
      setQuickAddOpen(false);
      setQuickName('');
      setQuickPrice('');
    } catch (err) {
      console.error(err);
    }
  };

  const handlePrintTransaction = (t: Transaction, autoOpen: boolean = false) => {
    // Try to parse items from description
    const items: any[] = [];
    const desc = t.description;
    
    if (desc.startsWith('Venda PDV - ')) {
      const itemsPart = desc.replace('Venda PDV - ', '');
      const parts = itemsPart.split(', ');
      parts.forEach(part => {
        const match = part.match(/^(\d+)x\s+(.+)$/);
        if (match) {
          const qty = parseInt(match[1]);
          const name = match[2];
          items.push({
            qty,
            product: {
              name,
              price: t.amount / qty // Approximate price since we only have total per line or total overall
            }
          });
        }
      });
    }

    // Fallback if no items parsed or generic description
    if (items.length === 0) {
      items.push({
        qty: 1,
        product: {
          name: t.description,
          price: t.amount
        }
      });
    }

    const sellerObj = t.sellerId ? staffList.find(s => s.id === t.sellerId) : undefined;
    const technicianObj = t.technicianId ? staffList.find(s => s.id === t.technicianId) : undefined;

    const saleObj = {
      invoiceNumber: t.id ? t.id.substring(0, 8).toUpperCase() : Math.floor(1000 + Math.random() * 9000).toString(),
      date: t.date,
      items,
      total: t.amount,
      paymentMethod: t.paymentMethod || 'dinheiro',
      seller: sellerObj,
      technician: technicianObj
    };

    downloadPDVReceiptPDF(saleObj);
    
    if (autoOpen) {
      // Direct browser window print trigger if needed
      window.print();
    }
  };

  const downloadPDVReceiptPDF = (sale: any) => {
    try {
      const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
      });

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(16);
      doc.text(shopName || 'INFO_CAM TECNOLOGIA', 14, 20);

      doc.setFontSize(9);
      doc.setFont('Helvetica', 'normal');
      doc.text(`Contato: ${shopPhone || ''} | CNPJ/CPF: ${shopCnpjCpf || ''}`, 14, 26);
      doc.text(`Data: ${new Date(sale.date).toLocaleString('pt-BR')}`, 14, 31);

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(14);
      doc.text(`CUPOM DE VENDA: ${sale.invoiceNumber}`, 120, 20);

      doc.setDrawColor(220, 220, 224);
      doc.line(14, 35, 196, 35);

      doc.setFontSize(10);
      doc.text('ITENS VENDIDOS', 14, 42);

      let y = 48;
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('PRODUTO', 14, y);
      doc.text('QTD', 110, y);
      doc.text('PRECO UNIT.', 135, y);
      doc.text('TOTAL', 170, y);
      doc.line(14, y + 2, 196, y + 2);
      y += 7;

      doc.setFont('Helvetica', 'normal');
      sale.items.forEach((item: any) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.text(item.product.name.substring(0, 45), 14, y);
        doc.text(item.qty.toString(), 110, y);
        doc.text(formatCurrency(item.product.price), 135, y);
        doc.text(formatCurrency(item.product.price * item.qty), 170, y);
        y += 6;
      });

      doc.line(14, y, 196, y);
      y += 6;

      doc.setFont('Helvetica', 'bold');
      doc.text(`VALOR TOTAL: ${formatCurrency(sale.total)}`, 14, y);
      doc.text(`FORMA DE PAGAMENTO: ${sale.paymentMethod.toUpperCase()}`, 110, y);

      if (sale.seller) {
        y += 6;
        doc.text(`Atendente: ${sale.seller.name}`, 14, y);
      }
      if (sale.technician) {
        y += 6;
        doc.text(`Tecnico: ${sale.technician.name}`, 14, y);
      }

      y += 15;
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);
      doc.text('Obrigado pela preferência! Volte sempre.', 14, y);

      doc.save(`Venda_${sale.invoiceNumber}.pdf`);
    } catch (err) {
      console.error('Erro ao gerar PDF da venda:', err);
    }
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      alert('Adicione pelo menos um produto ao carrinho!');
      return;
    }
    setShowConfirmModal(true);
  };

  const confirmRegisterSale = async () => {
    setShowConfirmModal(false);
    try {
      await onRegisterSale({
        items: cart,
        sellerId: selectedSeller || undefined,
        technicianId: selectedTechnician || undefined,
        paymentMethod,
        total: cartTotal
      });

      // Prepare state for receipt printer
      const invoiceNumber = `NF-${Math.floor(100000 + Math.random() * 900000)}`;
      const saleObj = {
        items: cart,
        seller: staffList.find(s => s.id === selectedSeller),
        technician: staffList.find(s => s.id === selectedTechnician),
        paymentMethod,
        total: cartTotal,
        date: new Date().toISOString(),
        invoiceNumber
      };

      setCompletedSale(saleObj);
      
      // Save PDF document automatically
      downloadPDVReceiptPDF(saleObj);

      setCart([]);
      setSelectedSeller('');
      setSelectedTechnician('');
      setIsInvoiceOpen(true);
    } catch (err) {
      console.error(err);
      alert('Erro ao registrar venda.');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Search and Catalog Column */}
      <div className="lg:col-span-7 space-y-5">
        <div>
          <h2 className="text-xl font-bold text-zinc-950 font-sans">Terminal de Vendas / PDV</h2>
          <p className="text-xs text-zinc-400">Lance vendas rápidas de peças e acessórios integradas ao fluxo de caixa e controle de comissões</p>
        </div>

        {/* Input Bar with Suggestions */}
        <div className="relative bg-white border border-zinc-150 rounded-2xl p-4 shadow-xs">
          <label className="block text-xs font-bold text-zinc-500 mb-1">Buscar por Nome do Produto</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
              <input
                type="text"
                placeholder="Comece a digitar o produto..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-zinc-900 bg-zinc-50/50"
              />
            </div>
            {query.trim().length > 0 && suggestions.length === 0 && (
              <button
                onClick={() => {
                  setQuickName(query);
                  setQuickAddOpen(true);
                }}
                className="px-3.5 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-200 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-all shrink-0"
                title="Cadastrar novo produto permanente"
              >
                <Plus size={16} /> Novo
              </button>
            )}
          </div>

          {/* Quick Custom Selling Fields */}
          {query.trim().length > 0 && (
            <div className="mt-3 pt-3 border-t border-zinc-100 grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 mb-1">Preço do Item (R$)</label>
                <input
                  type="text"
                  placeholder="0,00"
                  value={customPrice}
                  onChange={(e) => setCustomPrice(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-zinc-200 rounded-xl text-xs bg-zinc-50 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 mb-1">Quantidade</label>
                <input
                  type="number"
                  min="1"
                  value={customQty}
                  onChange={(e) => setCustomQty(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-zinc-200 rounded-xl text-xs bg-zinc-50 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                />
              </div>
              <button
                onClick={handleAddCustomItem}
                className="w-full px-3 py-2 bg-zinc-900 text-white font-bold rounded-xl text-xs hover:bg-zinc-800 transition-all flex items-center justify-center gap-1 cursor-pointer shadow-sm"
              >
                <Plus size={14} /> Adicionar Avulso
              </button>
            </div>
          )}

          {/* Floating Suggestion Box */}
          <AnimatePresence>
            {suggestions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                className="absolute left-4 right-4 mt-1 bg-white border border-zinc-150 rounded-xl shadow-lg z-30 max-h-60 overflow-y-auto divide-y divide-zinc-100"
              >
                {suggestions.map(p => (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    className="w-full text-left py-2.5 px-4 text-xs font-medium hover:bg-zinc-50 flex justify-between items-center transition-colors cursor-pointer"
                  >
                    <div>
                      <p className="font-bold text-zinc-900">{p.name}</p>
                      <p className="text-[10px] text-zinc-400 mt-0.5">Disponível: {p.stock} un</p>
                    </div>
                    <span className="font-extrabold text-zinc-950">{formatCurrency(p.price)}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Selected Items / Cart */}
        <div className="bg-white border border-zinc-150 rounded-2xl p-5 space-y-4">
          <div className="flex justify-between items-center border-b border-zinc-100 pb-2.5">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Itens do Carrinho</h3>
            <span className="text-[11px] text-zinc-400 font-semibold">{cart.length} itens selecionados</span>
          </div>

          {cart.length === 0 ? (
            <div className="py-12 text-center text-zinc-400 text-xs">
              <ShoppingBag className="mx-auto text-zinc-200 mb-2" size={32} />
              Carrinho vazio. Busque e selecione produtos acima para iniciar.
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 max-h-[350px] overflow-y-auto pr-1">
              {cart.map(item => (
                <div key={item.product.id} className="py-3 flex justify-between items-center bg-white">
                  <div className="space-y-0.5 max-w-[60%]">
                    <p className="text-xs font-bold text-zinc-800 truncate">{item.product.name}</p>
                    <p className="text-[10px] text-zinc-400">Preço unitário: {formatCurrency(item.product.price)}</p>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Quantity Selector */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => updateCartQty(item.product.id, item.qty - 1)}
                        className="w-6 h-6 rounded border border-zinc-200 flex items-center justify-center text-xs text-zinc-500 hover:bg-zinc-50 transition-colors"
                      >
                        -
                      </button>
                      <span className="w-8 text-center text-xs font-bold text-zinc-800">{item.qty}</span>
                      <button
                        onClick={() => updateCartQty(item.product.id, item.qty + 1)}
                        className="w-6 h-6 rounded border border-zinc-200 flex items-center justify-center text-xs text-zinc-500 hover:bg-zinc-50 transition-colors"
                      >
                        +
                      </button>
                    </div>

                    <span className="text-xs font-bold text-zinc-950 w-20 text-right">
                      {formatCurrency(item.product.price * item.qty)}
                    </span>

                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      className="p-1 hover:bg-rose-50 text-zinc-400 hover:text-rose-600 rounded transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Checkout and Personnel Column */}
      <div className="lg:col-span-5 space-y-5">
        <div className="bg-white border border-zinc-150 rounded-2xl p-5 space-y-4 shadow-xs">
          <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider border-b border-zinc-100 pb-2">Resumo da Venda</h3>

          {/* Pricing Box */}
          <div className="bg-zinc-50 border border-zinc-150 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-zinc-400">Valor Total a Pagar</span>
              <p className="text-2xl font-black text-zinc-950 mt-0.5">{formatCurrency(cartTotal)}</p>
            </div>
            <ShoppingBag className="text-zinc-300" size={28} />
          </div>

          {/* Payment Method */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-zinc-500">Meio de Recebimento</label>
            <div className="grid grid-cols-2 gap-1.5">
              {(['pix', 'dinheiro', 'debito', 'credito'] as const).map(method => (
                <button
                  key={method}
                  onClick={() => setPaymentMethod(method)}
                  className={`py-2 px-3 border rounded-xl font-bold text-xs capitalize cursor-pointer transition-all ${paymentMethod === method ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 text-zinc-500 bg-white hover:bg-zinc-50'}`}
                >
                  {method === 'debito' ? 'Débito' : method === 'credito' ? 'Crédito' : method}
                </button>
              ))}
            </div>
          </div>

          {/* Assigned Staff (Commission calculations) */}
          <div className="space-y-3 pt-2">
            <div>
              <label className="block text-xs font-bold text-zinc-500 mb-1">Vendedor Responsável (Comissão)</label>
              <select
                value={selectedSeller}
                onChange={(e) => setSelectedSeller(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-xs bg-white"
              >
                <option value="">Sem vendedor (Nenhuma comissão)</option>
                {staffList.filter(s => s.role === 'vendedor').map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-500 mb-1">Técnico Vinculado (Opcional)</label>
              <select
                value={selectedTechnician}
                onChange={(e) => setSelectedTechnician(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-xs bg-white"
              >
                <option value="">Nenhum técnico associado</option>
                {staffList.filter(s => s.role === 'tecnico').map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Checkout Button */}
          <button
            onClick={handleCheckout}
            disabled={cart.length === 0}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer disabled:opacity-40"
          >
            Finalizar e Receber Venda
          </button>
        </div>

        {/* Compact Cash Register Widget */}
        <div className="bg-white border border-zinc-150 rounded-2xl p-5 space-y-4 shadow-xs">
          <div className="flex justify-between items-center border-b border-zinc-100 pb-2">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Fluxo de Caixa (Lançamentos Recentes)</h3>
            <span className="text-[10px] bg-zinc-100 text-zinc-600 font-bold px-2 py-0.5 rounded-full">PDV Ativo</span>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-emerald-50/50 border border-emerald-100 p-2 rounded-xl">
              <span className="text-[9px] font-bold text-emerald-600 block uppercase">Entradas</span>
              <span className="text-xs font-extrabold text-emerald-700">
                {formatCurrency(transactions.filter(t => t.type === 'entrada').reduce((sum, t) => sum + t.amount, 0))}
              </span>
            </div>
            <div className="bg-rose-50/50 border border-rose-100 p-2 rounded-xl">
              <span className="text-[9px] font-bold text-rose-600 block uppercase">Saídas</span>
              <span className="text-xs font-extrabold text-rose-700">
                {formatCurrency(transactions.filter(t => t.type === 'saida').reduce((sum, t) => sum + t.amount, 0))}
              </span>
            </div>
            <div className="bg-zinc-50 border border-zinc-150 p-2 rounded-xl">
              <span className="text-[9px] font-bold text-zinc-500 block uppercase">Saldo Geral</span>
              <span className="text-xs font-black text-zinc-850">
                {formatCurrency(
                  transactions.filter(t => t.type === 'entrada').reduce((sum, t) => sum + t.amount, 0) -
                  transactions.filter(t => t.type === 'saida').reduce((sum, t) => sum + t.amount, 0)
                )}
              </span>
            </div>
          </div>

          {/* Transactions list */}
          <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
            {transactions.length === 0 ? (
              <p className="text-center text-[11px] text-zinc-400 py-6">Nenhum lançamento registrado no caixa.</p>
            ) : (
              transactions.slice(0, 8).map((t) => {
                const isPDVSale = t.description.toLowerCase().includes('venda pdv');
                return (
                  <div key={t.id} className="p-2.5 border border-zinc-100 rounded-xl hover:bg-zinc-50/50 transition-colors flex justify-between items-center gap-2">
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md ${
                          t.type === 'entrada' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {t.type === 'entrada' ? 'Entrada' : 'Saída'}
                        </span>
                        {isPDVSale && (
                          <span className="text-[8px] bg-blue-100 text-blue-800 font-extrabold px-1 rounded uppercase tracking-wide">
                            PDV
                          </span>
                        )}
                        <span className="text-[9px] text-zinc-400">
                          {new Date(t.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[11px] font-semibold text-zinc-700 truncate" title={t.description}>
                        {t.description}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs font-bold ${
                        t.type === 'entrada' ? 'text-emerald-600' : 'text-rose-600'
                      }`}>
                        {t.type === 'entrada' ? '+' : '-'}{formatCurrency(t.amount)}
                      </span>
                      
                      <div className="flex items-center gap-1 border-l border-zinc-200 pl-1.5 ml-1.5">
                        <button
                          type="button"
                          onClick={() => handlePrintTransaction(t, false)}
                          className="p-1 hover:bg-zinc-100 rounded-md text-zinc-400 hover:text-emerald-600 cursor-pointer transition-colors"
                          title="Abrir nota em PDF"
                        >
                          <FileText size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePrintTransaction(t, true)}
                          className="p-1 hover:bg-zinc-100 rounded-md text-zinc-400 hover:text-blue-600 cursor-pointer transition-colors"
                          title="Imprimir Cupom de Venda"
                        >
                          <Printer size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* QUICK ADD PRODUCT SIDE MODAL */}
      <AnimatePresence>
        {quickAddOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-sm rounded-2xl border border-zinc-100 shadow-xl overflow-hidden p-6 space-y-4"
            >
              <div className="flex justify-between items-center pb-2 border-b border-zinc-100">
                <h3 className="text-xs font-bold text-zinc-950 font-sans uppercase tracking-wider">Adicionar Produto Rápido</h3>
                <button onClick={() => setQuickAddOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleQuickAddProduct} className="space-y-4 text-left">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 mb-1">Nome do Produto</label>
                  <input
                    type="text"
                    required
                    value={quickName}
                    onChange={(e) => setQuickName(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-xs"
                    placeholder="Ex: Teclado Mecânico Redragon"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 mb-1">Preço Venda</label>
                    <input
                      type="text"
                      required
                      value={quickPrice}
                      onChange={(e) => setQuickPrice(e.target.value)}
                      className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-xs"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 mb-1">Estoque</label>
                    <input
                      type="number"
                      required
                      value={quickStock}
                      onChange={(e) => setQuickStock(e.target.value)}
                      className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-xs"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t border-zinc-100">
                  <button
                    type="button"
                    onClick={() => setQuickAddOpen(false)}
                    className="flex-1 py-2 px-3 bg-zinc-100 text-zinc-600 text-xs font-bold rounded-lg cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 px-3 bg-zinc-900 text-white text-xs font-bold rounded-lg cursor-pointer"
                  >
                    Adicionar e Selecionar
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* RECEIPTS / NON-FISCAL PRINT PREVIEW */}
      <AnimatePresence>
        {isInvoiceOpen && completedSale && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-2xl border border-zinc-100 shadow-xl overflow-hidden"
            >
              <div className="flex justify-between items-center bg-zinc-50 p-4 border-b border-zinc-100">
                <h3 className="text-xs font-bold text-zinc-950 uppercase tracking-wider">Venda Efetuada / Cupom Não Fiscal</h3>
                <button onClick={() => { setIsInvoiceOpen(false); setCompletedSale(null); }} className="p-1 hover:bg-zinc-200 rounded-lg">
                  <X size={18} />
                </button>
              </div>

              {/* Printable Area styled like thermal receipt paper */}
              <div 
                className="p-6 bg-white overflow-y-auto max-h-[60vh] text-zinc-800 font-mono text-xs text-left" 
                id="printable-thermal-invoice"
              >
                <div className="text-center border-b border-dashed border-zinc-300 pb-4 space-y-1">
                  <h4 className="text-base font-black uppercase tracking-wider">{shopName || 'ASSISTÊNCIA TÉCNICA'}</h4>
                  {shopCnpjCpf && <p className="text-[10px]">CNPJ/CPF: {shopCnpjCpf}</p>}
                  {shopPhone && <p className="text-[10px]">Contato: {shopPhone}</p>}
                  <p className="text-[9px] text-zinc-400">Cupom Não Fiscal para Simples Conferência</p>
                </div>

                <div className="py-3 border-b border-dashed border-zinc-300 space-y-1 text-[10px]">
                  <p>Documento: <span className="font-bold">{completedSale.invoiceNumber}</span></p>
                  <p>Data: {new Date(completedSale.date).toLocaleString('pt-BR')}</p>
                  {completedSale.seller && <p>Atendente: {completedSale.seller.name}</p>}
                  <p className="uppercase font-bold text-[10px] mt-1 text-zinc-400">Relação de Itens vendidos:</p>
                </div>

                {/* Items grid */}
                <div className="py-2 border-b border-dashed border-zinc-300 space-y-2 text-[11px]">
                  <div className="grid grid-cols-12 font-bold text-zinc-400 text-[10px]">
                    <span className="col-span-6">PRODUTO</span>
                    <span className="col-span-2 text-center">QTD</span>
                    <span className="col-span-4 text-right">TOTAL</span>
                  </div>
                  {completedSale.items.map(item => (
                    <div key={item.product.id} className="grid grid-cols-12 items-start py-0.5">
                      <span className="col-span-6 truncate font-medium">{item.product.name}</span>
                      <span className="col-span-2 text-center font-bold">{item.qty}</span>
                      <span className="col-span-4 text-right font-bold">{formatCurrency(item.product.price * item.qty)}</span>
                    </div>
                  ))}
                </div>

                {/* Final summary */}
                <div className="py-3 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span>Subtotal Geral:</span>
                    <span>{formatCurrency(completedSale.total)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-sm pt-1 border-t border-dashed border-zinc-200">
                    <span>VALOR RECEBIDO:</span>
                    <span>{formatCurrency(completedSale.total)}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-zinc-500 pt-1">
                    <span>Forma de Pagamento:</span>
                    <span className="font-bold uppercase">{completedSale.paymentMethod}</span>
                  </div>
                </div>

                <div className="text-center pt-4 border-t border-dashed border-zinc-300">
                  <p className="text-[10px] text-zinc-400 uppercase font-bold">Obrigado pela preferência!</p>
                  <p className="text-[9px] text-zinc-400 italic">Volte Sempre!</p>
                </div>
              </div>

              {/* Printing Controls */}
              <div className="p-4 bg-zinc-50 border-t border-zinc-100 flex gap-2">
                <button
                  onClick={() => { setIsInvoiceOpen(false); setCompletedSale(null); }}
                  className="flex-1 py-2 px-3 bg-zinc-200 hover:bg-zinc-300 text-zinc-700 text-xs font-bold rounded-lg cursor-pointer text-center"
                >
                  Fechar
                </button>
                <button
                  onClick={() => downloadPDVReceiptPDF(completedSale)}
                  className="flex-1 py-2 px-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer border border-zinc-200"
                >
                  <FileText size={14} /> Salvar PDF
                </button>
                <button
                  onClick={() => {
                    window.print();
                  }}
                  className="flex-1 py-2 px-3 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Printer size={14} /> Imprimir Cupom
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CONFIRMATION WARNING DIALOG */}
      <AnimatePresence>
        {showConfirmModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-2xl border border-zinc-150 shadow-2xl overflow-hidden p-6 space-y-4"
            >
              <div className="flex items-center gap-2.5 text-zinc-950 font-sans font-bold border-b border-zinc-100 pb-3">
                <AlertTriangle className="text-amber-500 shrink-0" size={20} />
                <span className="text-sm">Confirmar Finalização da Venda</span>
              </div>

              <div className="space-y-3">
                <p className="text-xs text-zinc-600">
                  Atenção! Você está prestes a finalizar esta venda e receber o pagamento. Certifique-se de que os dados estão corretos:
                </p>

                <div className="bg-zinc-50 border border-zinc-150 rounded-xl p-3 space-y-1.5 text-xs text-zinc-700">
                  <div className="flex justify-between font-bold text-zinc-900 pb-1 border-b border-zinc-200">
                    <span>Valor a Receber:</span>
                    <span className="text-sm text-zinc-950 font-black">{formatCurrency(cartTotal)}</span>
                  </div>
                  <div className="flex justify-between pt-1">
                    <span>Forma de Recebimento:</span>
                    <span className="font-bold capitalize text-zinc-900">{paymentMethod === 'debito' ? 'Cartão de Débito' : paymentMethod === 'credito' ? 'Cartão de Crédito' : paymentMethod}</span>
                  </div>
                  {selectedSeller && (
                    <div className="flex justify-between">
                      <span>Vendedor:</span>
                      <span className="font-semibold text-zinc-900">
                        {staffList.find(s => s.id === selectedSeller)?.name}
                      </span>
                    </div>
                  )}
                  {selectedTechnician && (
                    <div className="flex justify-between">
                      <span>Técnico:</span>
                      <span className="font-semibold text-zinc-900">
                        {staffList.find(s => s.id === selectedTechnician)?.name}
                      </span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-zinc-200">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Itens a Baixar do Estoque:</p>
                    <div className="max-h-24 overflow-y-auto space-y-0.5 text-[11px] text-zinc-600">
                      {cart.map((item, idx) => (
                        <div key={idx} className="flex justify-between">
                          <span className="truncate max-w-[80%]">{item.qty}x {item.product.name}</span>
                          <span className="font-medium shrink-0">{formatCurrency(item.product.price * item.qty)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-3 border-t border-zinc-100 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 py-2.5 px-3 bg-zinc-100 text-zinc-600 rounded-xl cursor-pointer hover:bg-zinc-200"
                >
                  Voltar / Corrigir
                </button>
                <button
                  type="button"
                  onClick={confirmRegisterSale}
                  className="flex-1 py-2.5 px-3 bg-emerald-600 text-white rounded-xl cursor-pointer hover:bg-emerald-700 flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Check size={14} /> Confirmar & Finalizar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
