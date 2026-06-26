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
  Calendar,
  FileImage
} from 'lucide-react';
import { Product, Staff, Transaction, Customer } from '../types';
import { formatCurrency, capitalizeFirstLetter } from '../utils';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';

import CustomerAutocomplete from './CustomerAutocomplete';

export type DenominationKey = 'n200' | 'n100' | 'n50' | 'n20' | 'n10' | 'n5' | 'n2' | 'c1' | 'c50' | 'c25' | 'c10' | 'c5';

export const DENOMINATIONS: { key: DenominationKey; value: number; label: string; type: 'note' | 'coin' }[] = [
  { key: 'n200', value: 200, label: 'R$ 200', type: 'note' },
  { key: 'n100', value: 100, label: 'R$ 100', type: 'note' },
  { key: 'n50', value: 50, label: 'R$ 50', type: 'note' },
  { key: 'n20', value: 20, label: 'R$ 20', type: 'note' },
  { key: 'n10', value: 10, label: 'R$ 10', type: 'note' },
  { key: 'n5', value: 5, label: 'R$ 5', type: 'note' },
  { key: 'n2', value: 2, label: 'R$ 2', type: 'note' },
  { key: 'c1', value: 1, label: 'R$ 1,00', type: 'coin' },
  { key: 'c50', value: 0.5, label: 'R$ 0,50', type: 'coin' },
  { key: 'c25', value: 0.25, label: 'R$ 0,25', type: 'coin' },
  { key: 'c10', value: 0.10, label: 'R$ 0,10', type: 'coin' },
  { key: 'c5', value: 0.05, label: 'R$ 0,05', type: 'coin' }
];

interface PDVProps {
  products: Product[];
  staffList: Staff[];
  transactions: Transaction[];
  onAddProduct: (product: Omit<Product, 'id'>) => Promise<void>;
  onAddTransaction: (transaction: Omit<Transaction, 'id'>) => Promise<void>;
  onDeleteTransaction: (id: string) => Promise<void>;
  onRegisterSale: (saleData: {
    items: { product: Product; qty: number }[];
    sellerId?: string;
    technicianId?: string;
    paymentMethod: 'dinheiro' | 'pix' | 'debito' | 'credito';
    total: number;
    customerName?: string;
    customerCpfCnpj?: string;
    customerAddress?: string;
  }) => Promise<void>;
  shopName?: string;
  shopPhone?: string;
  shopCnpjCpf?: string;
  config?: any;
  shopLogo?: string;
  customers?: Customer[];
  onAddCustomer?: (customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  user?: any;
}

export default function PDV({
  products,
  staffList,
  transactions,
  onAddProduct,
  onAddTransaction,
  onDeleteTransaction,
  onRegisterSale,
  shopName,
  shopPhone,
  shopCnpjCpf,
  config,
  shopLogo,
  customers = [],
  onAddCustomer,
  user
}: PDVProps) {
  // PDV States
  const [pdvMode, setPdvMode] = useState<'venda' | 'saida'>('venda');
  const [cart, setCart] = useState<{ product: Product; qty: number }[]>([]);
  const [selectedSeller, setSelectedSeller] = useState('');
  const [selectedTechnician, setSelectedTechnician] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'dinheiro' | 'pix' | 'debito' | 'credito'>('pix');
  
  // Saída States
  const [saidaDescription, setSaidaDescription] = useState('');
  const [saidaAmount, setSaidaAmount] = useState('');
  const [saidaPaymentMethod, setSaidaPaymentMethod] = useState<'dinheiro' | 'pix' | 'debito' | 'credito'>('dinheiro');

  // Cash Register Session
  const [isCaixaModalOpen, setIsCaixaModalOpen] = useState(false);
  const [caixaModalType, setCaixaModalType] = useState<'abrir' | 'fechar'>('abrir');
  const [caixaInputValue, setCaixaInputValue] = useState('');
  const [hasSangria, setHasSangria] = useState(false);
  const [sangriaValue, setSangriaValue] = useState('');

  // Cash Count States
  const [cashCount, setCashCount] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('pdv_cash_count');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  
  useEffect(() => {
    localStorage.setItem('pdv_cash_count', JSON.stringify(cashCount));
  }, [cashCount]);
  
  const totalCashCount = DENOMINATIONS.reduce((sum, d) => sum + (cashCount[d.key] || 0) * d.value, 0);
  
  const [isContagemOpen, setIsContagemOpen] = useState(false);
  const [isContagemInitialMode, setIsContagemInitialMode] = useState(false);

  // Change Tracking Modal
  const [showChangeModal, setShowChangeModal] = useState(false);
  const [hasChangeGiven, setHasChangeGiven] = useState(false);
  const [changeReceived, setChangeReceived] = useState<Record<string, number>>({});
  const [changeGiven, setChangeGiven] = useState<Record<string, number>>({});

  const handleCaixaSubmit = async () => {
    if (caixaModalType === 'abrir') {
      const amount = isContagemInitialMode ? totalCashCount : (parseFloat(caixaInputValue.replace(',', '.')) || 0);
      await onAddTransaction({
        description: 'Abertura de Caixa',
        amount: amount,
        type: 'abertura_caixa',
        category: 'Abertura de Caixa',
        paymentMethod: 'dinheiro',
        date: new Date().toISOString()
      });
      alert('Caixa aberto com sucesso!');
      setIsContagemInitialMode(false);
    } else {
      // Fechar caixa
      const sangria = parseFloat(sangriaValue.replace(',', '.')) || 0;
      if (hasSangria && sangria > 0) {
        await onAddTransaction({
          description: 'Sangria de Caixa',
          amount: sangria,
          type: 'saida',
          category: 'Sangria',
          paymentMethod: 'dinheiro',
          date: new Date().toISOString()
        });
      }
      
      const newBalance = currentCashInDrawer - (hasSangria ? sangria : 0);
      
      await onAddTransaction({
        description: `Fechamento de Caixa. Restou no caixa: ${formatCurrency(newBalance)}`,
        amount: currentCashInDrawer, // Total that was in cash before sangria
        type: 'fechamento_caixa',
        category: 'Fechamento de Caixa',
        paymentMethod: 'dinheiro',
        date: new Date().toISOString()
      });
      
      // Auto-create tomorrow's opening if they want? "ja sendo adicionado a abertura do caixa do dia seguinte"
      // Wait, we can just record an 'Abertura' immediately or next day?
      // Since it says "ja sendo adicionado a abertura", we can auto-open it with the remaining balance
      await onAddTransaction({
        description: 'Abertura Automática (Saldo Anterior)',
        amount: newBalance,
        type: 'abertura_caixa',
        category: 'Abertura de Caixa',
        paymentMethod: 'dinheiro',
        date: new Date().toISOString()
      });
      
      alert('Caixa fechado com sucesso e saldo transferido para o próximo período!');
    }
    setIsCaixaModalOpen(false);
    setCaixaInputValue('');
    setHasSangria(false);
    setSangriaValue('');
  };

  const handleChangeModalSubmit = () => {
    const newCount = { ...cashCount };
    
    // Add received notes/coins
    Object.keys(changeReceived).forEach(key => {
      newCount[key] = (newCount[key] || 0) + (changeReceived[key] || 0);
    });
    
    // Subtract given notes/coins
    if (hasChangeGiven) {
      Object.keys(changeGiven).forEach(key => {
        newCount[key] = Math.max(0, (newCount[key] || 0) - (changeGiven[key] || 0));
      });
    }
    
    setCashCount(newCount);
    setShowChangeModal(false);
    setChangeReceived({});
    setChangeGiven({});
    setHasChangeGiven(false);
    
    // Open invoice next
    setIsInvoiceOpen(true);
  };

  const handleRegisterSaida = async () => {
    if (!saidaDescription.trim()) return alert('Informe o que foi comprado ou pago.');
    const amount = parseFloat(saidaAmount.replace(',', '.')) || 0;
    if (amount <= 0) return alert('Informe um valor válido.');
    
    await onAddTransaction({
      description: saidaDescription,
      amount,
      type: 'saida',
      category: 'Despesa PDV',
      paymentMethod: saidaPaymentMethod,
      date: new Date().toISOString()
    });
    
    alert('Saída registrada com sucesso!');
    setSaidaDescription('');
    setSaidaAmount('');
    setSaidaPaymentMethod('dinheiro');
    setPdvMode('venda'); // return to pdv mode
  };

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
  const [shouldDownloadPDF, setShouldDownloadPDF] = useState(false);
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

  // Customer states
  const [showCustomerFields, setShowCustomerFields] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerCpfCnpj, setCustomerCpfCnpj] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');

  // Cash Register State Computation
  const sortedTxs = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const lastAbertura = sortedTxs.find(t => t.type === 'abertura_caixa');
  const lastFechamento = sortedTxs.find(t => t.type === 'fechamento_caixa');
  
  const isCaixaOpen = lastAbertura && (!lastFechamento || new Date(lastAbertura.date) > new Date(lastFechamento.date));
  
  let currentCashInDrawer = 0;
  if (isCaixaOpen && lastAbertura) {
    const sessionTxs = transactions.filter(t => new Date(t.date) >= new Date(lastAbertura.date));
    const openingAmount = sessionTxs.find(t => t.id === lastAbertura.id)?.amount || 0;
    
    const cashSales = sessionTxs.filter(t => t.type === 'entrada' && t.paymentMethod === 'dinheiro').reduce((sum, t) => sum + t.amount, 0);
    const cashExpenses = sessionTxs.filter(t => t.type === 'saida' && t.paymentMethod === 'dinheiro').reduce((sum, t) => sum + t.amount, 0);
    
    currentCashInDrawer = openingAmount + cashSales - cashExpenses;
  }

  // Filter transactions for today
  const todayTransactions = [...transactions].filter(t => {
    const today = new Date();
    const tDate = new Date(t.date);
    return tDate.getDate() === today.getDate() &&
           tDate.getMonth() === today.getMonth() &&
           tDate.getFullYear() === today.getFullYear();
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

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

      // Helper to convert hex to rgb
      const hexToRgb = (hexStr: string) => {
        let hex = hexStr.replace('#', '');
        if (hex.length === 3) {
          hex = hex.split('').map(c => c + c).join('');
        }
        const r = parseInt(hex.substring(0, 2), 16) || 24;
        const g = parseInt(hex.substring(2, 4), 16) || 24;
        const b = parseInt(hex.substring(4, 6), 16) || 27;
        return { r, g, b };
      };

      const formatPhone = (phone: string) => {
        const cleaned = phone.replace(/\D/g, '');
        if (cleaned.length === 11) {
          return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 7)}-${cleaned.substring(7)}`;
        }
        if (cleaned.length === 10) {
          return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 6)}-${cleaned.substring(6)}`;
        }
        return phone;
      };

      const primaryHex = config?.colors?.primary || '#18181b';
      const rgb = hexToRgb(primaryHex);

      // --- PAGE BORDER & STYLE ---
      doc.setDrawColor(228, 228, 231); // Light zinc border
      doc.rect(10, 10, 190, 277); // Outer frame

      // --- HEADER ACCENT BAR (Top colored brand bar) ---
      doc.setFillColor(rgb.r, rgb.g, rgb.b);
      doc.rect(10, 10, 190, 5, 'F');

      // --- SHOP LOGO OR TYPOGRAPHY HEADER ---
      if (shopLogo && shopLogo.trim().startsWith('data:image')) {
        try {
          doc.addImage(shopLogo, 'PNG', 15, 18, 20, 20);
          doc.setFont('Helvetica', 'bold');
          doc.setFontSize(14);
          doc.setTextColor(30, 30, 30);
          doc.text(shopName || 'INFO_CAM TECNOLOGIA', 39, 23);
          
          doc.setFont('Helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(100, 100, 100);
          doc.text(`CNPJ/CPF: ${shopCnpjCpf || 'N/A'}`, 39, 28);
          doc.text(`Contato: ${formatPhone(shopPhone || '')}`, 39, 33);
        } catch (logoErr) {
          console.error("Error drawing logo on Sale PDF, defaulting to text:", logoErr);
          doc.setFont('Helvetica', 'bold');
          doc.setFontSize(16);
          doc.setTextColor(rgb.r, rgb.g, rgb.b);
          doc.text(shopName || 'INFO_CAM TECNOLOGIA', 15, 24);
          
          doc.setFont('Helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(100, 100, 100);
          doc.text(`CNPJ/CPF: ${shopCnpjCpf || 'N/A'} | Contato: ${formatPhone(shopPhone || '')}`, 15, 30);
        }
      } else {
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(16);
        doc.setTextColor(rgb.r, rgb.g, rgb.b);
        doc.text(shopName || 'INFO_CAM TECNOLOGIA', 15, 24);
        
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(`CNPJ/CPF: ${shopCnpjCpf || 'N/A'} | Contato: ${formatPhone(shopPhone || '')}`, 15, 30);
      }

      // --- DOCUMENT METADATA PANEL (Right Header) ---
      doc.setFillColor(244, 244, 245); // light grey block
      doc.rect(130, 18, 65, 22, 'F');
      doc.setDrawColor(212, 212, 216);
      doc.rect(130, 18, 65, 22);

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(30, 30, 30);
      doc.text(`COMPROVANTE DE VENDA`, 133, 23);
      doc.setFontSize(11);
      doc.setTextColor(rgb.r, rgb.g, rgb.b);
      doc.text(`Nº ${sale.invoiceNumber}`, 133, 29);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 100, 100);
      doc.text(`Data: ${new Date(sale.date).toLocaleString('pt-BR')}`, 133, 35);

      // --- SECTION BUILDER ---
      const drawSectionHeader = (title: string, yPos: number) => {
        doc.setFillColor(rgb.r, rgb.g, rgb.b);
        doc.rect(15, yPos, 180, 5.5, 'F');
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(255, 255, 255);
        doc.text(title, 18, yPos + 4);
      };

      let y = 46;
      drawSectionHeader('DETALHAMENTO DOS PRODUTOS', y);

      // Table Headers
      y += 10;
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(80, 80, 80);
      doc.text('DESCRIÇÃO DO PRODUTO', 18, y);
      doc.text('QTD', 115, y);
      doc.text('VLR UNIT.', 135, y);
      doc.text('SUBTOTAL', 165, y);

      doc.setDrawColor(200, 200, 200);
      doc.line(15, y + 2.5, 195, y + 2.5);
      y += 7;

      // Table Rows with subtle zebra background
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);
      sale.items.forEach((item: any, idx: number) => {
        if (y > 220) {
          doc.addPage();
          // Draw page borders and colored accent bar on next page too!
          doc.setDrawColor(228, 228, 231);
          doc.rect(10, 10, 190, 277);
          doc.setFillColor(rgb.r, rgb.g, rgb.b);
          doc.rect(10, 10, 190, 5, 'F');
          y = 20;
        }

        // Zebra striping
        if (idx % 2 === 0) {
          doc.setFillColor(250, 250, 250);
          doc.rect(15, y - 3.5, 180, 5.5, 'F');
        }

        doc.setTextColor(30, 30, 30);
        doc.text(item.product.name.substring(0, 50), 18, y);
        doc.text(item.qty.toString(), 115, y);
        doc.text(formatCurrency(item.product.price), 135, y);
        doc.text(formatCurrency(item.product.price * item.qty), 165, y);
        y += 5.5;
      });

      doc.line(15, y - 2, 195, y - 2);
      y += 8;

      // --- FINANCIAL SUMMARY & PAYMENT SECTION ---
      drawSectionHeader('RESUMO FINANCEIRO', y);
      
      doc.setFillColor(248, 250, 252); // soft slate background
      doc.rect(15, y + 5.5, 180, 22, 'F');
      doc.rect(15, y + 5.5, 180, 22); // border

      doc.setFontSize(10);
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(rgb.r, rgb.g, rgb.b);
      doc.text(`VALOR TOTAL REPASSADO: ${formatCurrency(sale.total)}`, 18, y + 13.5);

      doc.setFontSize(8.5);
      doc.setTextColor(80, 80, 80);
      doc.text(`Forma de Pagamento: ${sale.paymentMethod.toUpperCase()}`, 18, y + 20);

      // Draw vertical divider inside summary box
      doc.setDrawColor(200, 200, 200);
      doc.line(110, y + 7, 110, y + 20);

      // Staff details column
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(80, 80, 80);
      doc.text('Responsáveis pelo Atendimento:', 115, y + 11);
      
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);
      let staffY = y + 15.5;
      if (sale.seller) {
        doc.text(`Atendente: ${sale.seller.name}`, 115, staffY);
        staffY += 4.5;
      }
      if (sale.technician) {
        doc.text(`Técnico: ${sale.technician.name}`, 115, staffY);
      }

      // Footer
      y += 40;
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);
      doc.text('Obrigado pela preferência! Volte sempre.', 15, y);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(150, 150, 150);
      doc.text(`Este documento é um cupom não fiscal emitido eletronicamente em ${new Date(sale.date).toLocaleString('pt-BR')}.`, 15, 272);

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
      if (showCustomerFields && customerName && onAddCustomer) {
        // Simple auto-registration if customer name exists and doesn't exist yet
        const normalizedNewName = customerName.trim().toLowerCase();
        const clientExists = customers.some(c => (c.name ? String(c.name).trim().toLowerCase() : '') === normalizedNewName);
        if (!clientExists) {
          try {
            await onAddCustomer({
              name: customerName,
              phone: '',
              email: '',
              address: customerAddress,
              birthDate: '',
              cpfCnpj: customerCpfCnpj
            });
            console.log('Customer registered automatically via PDV:', customerName);
          } catch (autoErr) {
            console.error('Error auto-registering customer during Sale:', autoErr);
          }
        }
      }

      await onRegisterSale({
        items: cart,
        sellerId: selectedSeller || undefined,
        technicianId: selectedTechnician || undefined,
        paymentMethod,
        total: cartTotal,
        customerName: showCustomerFields ? customerName : undefined,
        customerCpfCnpj: showCustomerFields ? customerCpfCnpj : undefined,
        customerAddress: showCustomerFields ? customerAddress : undefined
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
      
      // Save PDF document optionally if selected
      if (shouldDownloadPDF) {
        downloadPDVReceiptPDF(saleObj);
      }

      setCart([]);
      setSelectedSeller('');
      setSelectedTechnician('');
      
      if (paymentMethod === 'dinheiro') {
        setShowChangeModal(true);
      } else {
        setIsInvoiceOpen(true);
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao registrar venda.');
    }
  };

  const handleDownloadCashFlow = (format: 'pdf' | 'jpg') => {
    if (format === 'pdf') {
      const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
      });
      
      const primaryHex = config.colors?.primary || '#18181b';
      const hexToRgb = (hex: string) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : { r: 24, g: 24, b: 27 };
      };
      const rgb = hexToRgb(primaryHex);

      doc.setDrawColor(228, 228, 231);
      doc.rect(10, 10, 190, 277);
      doc.setFillColor(rgb.r, rgb.g, rgb.b);
      doc.rect(10, 10, 190, 5, 'F');

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(15);
      doc.setTextColor(30, 30, 30);
      doc.text(config.name || 'INFO_CAM TECNOLOGIA', 15, 23);
      
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(`Data Base: ${new Date().toLocaleDateString('pt-BR')}`, 15, 28);
      
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(rgb.r, rgb.g, rgb.b);
      doc.text('Relatório Diário de Fluxo de Caixa (PDV)', 195, 23, { align: 'right' });
      
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 195, 28, { align: 'right' });

      doc.setDrawColor(240, 240, 240);
      doc.line(15, 32, 195, 32);

      let y = 38;
      
      const totais = [
        { label: 'Entradas', value: todayTransactions.filter(t => t.type === 'entrada' || t.type === 'abertura_caixa').reduce((s, t) => s + t.amount, 0) },
        { label: 'Saídas', value: todayTransactions.filter(t => t.type === 'saida').reduce((s, t) => s + t.amount, 0) },
        { label: 'Saldo Final', value: currentCashInDrawer }
      ];

      totais.forEach((t, i) => {
        doc.setFillColor(250, 250, 250);
        doc.roundedRect(15 + (i * 60), y, 55, 15, 2, 2, 'F');
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(t.label.toUpperCase(), 20 + (i * 60), y + 6);
        doc.setFontSize(10);
        doc.setTextColor(30, 30, 30);
        doc.text(formatCurrency(t.value), 20 + (i * 60), y + 12);
      });

      y += 22;
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('Histórico de Transações do Dia', 15, y);
      y += 5;

      // Table Header
      doc.setFillColor(rgb.r, rgb.g, rgb.b);
      doc.rect(15, y, 180, 7, 'F');
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(255, 255, 255);
      doc.text('HORA', 17, y + 5);
      doc.text('TIPO', 35, y + 5);
      doc.text('DESCRIÇÃO', 55, y + 5);
      doc.text('MEIO', 150, y + 5);
      doc.text('VALOR', 193, y + 5, { align: 'right' });

      y += 7;
      doc.setTextColor(50, 50, 50);
      doc.setFont('Helvetica', 'normal');

      todayTransactions.forEach((t, index) => {
        if (y > 270) {
          doc.addPage();
          doc.setDrawColor(228, 228, 231);
          doc.rect(10, 10, 190, 277);
          y = 20;
        }

        if (index % 2 === 0) {
          doc.setFillColor(250, 250, 250);
          doc.rect(15, y, 180, 6, 'F');
        }

        const time = new Date(t.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const typeStr = t.type === 'entrada' ? 'ENTRADA' : t.type === 'abertura_caixa' ? 'ABERTURA' : t.type === 'fechamento_caixa' ? 'FECHAMENTO' : 'SAÍDA';
        const methodStr = t.paymentMethod ? t.paymentMethod.toUpperCase() : '-';

        doc.setFontSize(7);
        doc.text(time, 17, y + 4);
        doc.text(typeStr, 35, y + 4);
        
        let desc = doc.splitTextToSize(t.description, 90);
        doc.text(desc[0], 55, y + 4);
        
        doc.text(methodStr, 150, y + 4);

        doc.setFont('Helvetica', 'bold');
        if (t.type === 'entrada' || t.type === 'abertura_caixa') {
          doc.setTextColor(20, 150, 60);
          doc.text(`+ ${formatCurrency(t.amount)}`, 193, y + 4, { align: 'right' });
        } else {
          doc.setTextColor(200, 40, 40);
          doc.text(`- ${formatCurrency(t.amount)}`, 193, y + 4, { align: 'right' });
        }
        
        doc.setFont('Helvetica', 'normal');
        doc.setTextColor(50, 50, 50);

        y += 6;
      });

      doc.save(`Fluxo_Caixa_${new Date().toISOString().split('T')[0]}.pdf`);
    } else if (format === 'jpg') {
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 350 + (todayTransactions.length * 30);
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const primaryHex = config.colors?.primary || '#18181b';

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = primaryHex;
      ctx.fillRect(0, 0, canvas.width, 10);

      ctx.fillStyle = '#18181b';
      ctx.font = 'bold 24px Arial';
      ctx.fillText(config.name || 'INFO_CAM TECNOLOGIA', 30, 50);

      ctx.fillStyle = '#71717a';
      ctx.font = '14px Arial';
      ctx.fillText(`Relatório Diário de Caixa • ${new Date().toLocaleDateString('pt-BR')}`, 30, 75);

      let cy = 110;
      ctx.fillStyle = '#f4f4f5';
      ctx.fillRect(30, cy, canvas.width - 60, 80);
      
      const entradas = todayTransactions.filter(t => t.type === 'entrada' || t.type === 'abertura_caixa').reduce((s, t) => s + t.amount, 0);
      const saidas = todayTransactions.filter(t => t.type === 'saida').reduce((s, t) => s + t.amount, 0);

      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 16px Arial';
      ctx.fillText('ENTRADAS', 50, cy + 30);
      ctx.font = 'bold 24px Arial';
      ctx.fillText(formatCurrency(entradas), 50, cy + 60);

      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 16px Arial';
      ctx.fillText('SAÍDAS', 250, cy + 30);
      ctx.font = 'bold 24px Arial';
      ctx.fillText(formatCurrency(saidas), 250, cy + 60);

      ctx.fillStyle = '#18181b';
      ctx.font = 'bold 16px Arial';
      ctx.fillText('SALDO DO DIA', 450, cy + 30);
      ctx.font = 'bold 24px Arial';
      ctx.fillText(formatCurrency(currentCashInDrawer), 450, cy + 60);

      cy += 110;
      ctx.fillStyle = '#18181b';
      ctx.font = 'bold 18px Arial';
      ctx.fillText('Histórico de Lançamentos', 30, cy);

      cy += 20;
      todayTransactions.forEach((t, i) => {
        if (i % 2 === 0) {
          ctx.fillStyle = '#fafafa';
          ctx.fillRect(30, cy, canvas.width - 60, 30);
        }
        
        ctx.fillStyle = '#71717a';
        ctx.font = '12px Arial';
        const time = new Date(t.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        ctx.fillText(time, 40, cy + 20);

        ctx.fillStyle = '#18181b';
        ctx.font = 'bold 12px Arial';
        let typeStr = t.type === 'entrada' ? 'ENTRADA' : t.type === 'abertura_caixa' ? 'ABERTURA' : t.type === 'fechamento_caixa' ? 'FECHAMENTO' : 'SAÍDA';
        ctx.fillText(typeStr, 120, cy + 20);

        ctx.font = '12px Arial';
        ctx.fillText(t.description.substring(0, 50), 220, cy + 20);

        ctx.fillStyle = '#71717a';
        ctx.fillText(t.paymentMethod ? t.paymentMethod.toUpperCase() : '-', 550, cy + 20);

        ctx.font = 'bold 12px Arial';
        if (t.type === 'entrada' || t.type === 'abertura_caixa') {
          ctx.fillStyle = '#10b981';
          ctx.fillText(`+ ${formatCurrency(t.amount)}`, 650, cy + 20);
        } else {
          ctx.fillStyle = '#ef4444';
          ctx.fillText(`- ${formatCurrency(t.amount)}`, 650, cy + 20);
        }

        cy += 30;
      });

      const link = document.createElement('a');
      link.download = `Fluxo_Caixa_${new Date().toISOString().split('T')[0]}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 1.0);
      link.click();
    }
  };

  return (
    <>
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Search and Catalog Column */}
      <div className={`space-y-5 transition-all ${pdvMode === 'venda' ? 'lg:col-span-7' : 'lg:col-span-12 max-w-3xl mx-auto w-full'}`}>
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div>
              <h2 className="text-xl font-bold text-zinc-950 font-sans">Terminal de Vendas / PDV</h2>
              <p className="text-xs text-zinc-400">Lance vendas rápidas ou registre saídas do caixa.</p>
            </div>
            <button
              onClick={() => setIsContagemOpen(true)}
              className="ml-2 flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-[10px] font-bold transition-colors"
              title="Acessar Contagem de Dinheiro"
            >
              <span>Contagem</span>
            </button>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex bg-zinc-100 p-1 rounded-xl">
              <button
                onClick={() => setPdvMode('venda')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${pdvMode === 'venda' ? 'bg-white shadow text-zinc-950' : 'text-zinc-500 hover:text-zinc-700'}`}
              >
                Entrada (Venda)
              </button>
              <button
                onClick={() => setPdvMode('saida')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${pdvMode === 'saida' ? 'bg-white shadow text-zinc-950' : 'text-zinc-500 hover:text-zinc-700'}`}
              >
                Saída (Despesa)
              </button>
            </div>
            
            <div className="flex gap-2">
              <span className={`text-[10px] font-bold px-2 py-1 rounded flex items-center ${isCaixaOpen ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-500'}`}>
                {isCaixaOpen ? `Caixa Aberto: ${formatCurrency(currentCashInDrawer)}` : 'Caixa Fechado'}
              </span>
              <button
                onClick={() => {
                  setCaixaModalType(isCaixaOpen ? 'fechar' : 'abrir');
                  setIsCaixaModalOpen(true);
                }}
                className={`px-3 py-1 rounded text-[10px] font-bold cursor-pointer transition-colors ${isCaixaOpen ? 'bg-rose-50 text-rose-600 hover:bg-rose-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}
              >
                {isCaixaOpen ? 'Fechar Caixa' : 'Abrir Caixa'}
              </button>
            </div>
          </div>
        </div>

        {pdvMode === 'saida' ? (
          <div className="bg-white border border-zinc-150 rounded-2xl p-6 shadow-xs space-y-4 text-left">
            <h3 className="text-sm font-bold text-zinc-900 border-b border-zinc-100 pb-2">Registrar Saída / Despesa</h3>
            
            <div>
              <label className="block text-xs font-bold text-zinc-500 mb-1">O que foi comprado ou pago?</label>
              <input
                type="text"
                value={saidaDescription}
                onChange={e => setSaidaDescription(capitalizeFirstLetter(e.target.value))}
                placeholder="Ex: Pagamento fornecedor, Material de escritório..."
                className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-zinc-900"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1">Valor</label>
                <input
                  type="number"
                  step="0.01"
                  value={saidaAmount}
                  onChange={e => setSaidaAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-zinc-900"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1">Forma de Pagamento</label>
                <select
                  value={saidaPaymentMethod}
                  onChange={(e: any) => setSaidaPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-zinc-900 bg-white"
                >
                  <option value="dinheiro">Dinheiro (Retira do Caixa)</option>
                  <option value="pix">PIX</option>
                  <option value="debito">Cartão de Débito</option>
                  <option value="credito">Cartão de Crédito</option>
                </select>
              </div>
            </div>
            
            <button
              onClick={handleRegisterSaida}
              className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
            >
              Registrar Saída
            </button>
          </div>
        ) : (
          <>
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
                onChange={(e) => setQuery(capitalizeFirstLetter(e.target.value))}
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
        </>
      )}
    </div>

    {/* Checkout and Personnel Column */}
      {pdvMode === 'venda' && (
      <>
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

          {/* Customer Selection */}
          <div className="space-y-2">
            <button
              onClick={() => setShowCustomerFields(!showCustomerFields)}
              className="w-full flex items-center justify-between p-3 border border-zinc-200 rounded-xl bg-white hover:bg-zinc-50 text-xs font-bold text-zinc-700 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-zinc-400">👤</span> 
                {showCustomerFields ? 'Ocultar Dados do Cliente' : 'Adicionar Dados do Cliente (Opcional)'}
              </div>
            </button>

            {showCustomerFields && (
              <div className="p-3 border border-zinc-200 rounded-xl bg-zinc-50 space-y-3">
                <div className="space-y-1 text-left">
                  <label className="block text-xs font-bold text-zinc-500">Nome do Cliente</label>
                  <CustomerAutocomplete
                    required={false}
                    value={customerName}
                    onChange={(val) => setCustomerName(capitalizeFirstLetter(val))}
                    onSelect={(client) => {
                      setCustomerName(capitalizeFirstLetter(client.name));
                      if (client.cpfCnpj) setCustomerCpfCnpj(client.cpfCnpj);
                      if (client.address) setCustomerAddress(client.address);
                    }}
                    placeholder="Digite o nome..."
                    customers={customers}
                    user={user}
                  />
                </div>
                <div className="space-y-1 text-left">
                  <label className="block text-xs font-bold text-zinc-500">CPF / CNPJ</label>
                  <input
                    type="text"
                    value={customerCpfCnpj}
                    onChange={(e) => setCustomerCpfCnpj(e.target.value)}
                    placeholder="000.000.000-00"
                    className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-xs focus:outline-none bg-white"
                  />
                </div>
                <div className="space-y-1 text-left">
                  <label className="block text-xs font-bold text-zinc-500">Endereço</label>
                  <input
                    type="text"
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    placeholder="Av. Exemplo, 123"
                    className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-xs focus:outline-none bg-white"
                  />
                </div>
              </div>
            )}
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
              <label className="block text-xs font-bold text-zinc-500 mb-1">Vendedor Responsável</label>
              <select
                value={selectedSeller}
                onChange={(e) => setSelectedSeller(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-xs bg-white"
              >
                <option value="">Sem vendedor</option>
                {staffList.filter(s => s.isSeller || s.role === 'vendedor' || s.role === 'ambos').map(s => (
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
                {staffList.filter(s => s.isTechnician || s.role === 'tecnico' || s.role === 'ambos').map(s => (
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
      </div>
      {/* End of Resumo Venda Box */}

      <div className="lg:col-span-12 mt-6">
        {/* Compact Cash Register Widget */}
        <div className="bg-white border border-zinc-150 rounded-2xl p-5 space-y-4 shadow-xs">
          <div className="flex justify-between items-center border-b border-zinc-100 pb-2">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Fluxo de Caixa (Lançamentos Recentes)</h3>
            <span className="text-[10px] bg-zinc-100 text-zinc-600 font-bold px-2 py-0.5 rounded-full">PDV Ativo</span>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-emerald-50/50 border border-emerald-100 p-2 rounded-xl">
              <span className="text-[9px] font-bold text-emerald-600 block uppercase">Entradas (Hoje)</span>
              <span className="text-xs font-extrabold text-emerald-700">
                {formatCurrency(todayTransactions.filter(t => t.type === 'entrada' || t.type === 'abertura_caixa').reduce((sum, t) => sum + t.amount, 0))}
              </span>
            </div>
            <div className="bg-rose-50/50 border border-rose-100 p-2 rounded-xl">
              <span className="text-[9px] font-bold text-rose-600 block uppercase">Saídas (Hoje)</span>
              <span className="text-xs font-extrabold text-rose-700">
                {formatCurrency(todayTransactions.filter(t => t.type === 'saida').reduce((sum, t) => sum + t.amount, 0))}
              </span>
            </div>
            <div className="bg-zinc-50 border border-zinc-150 p-2 rounded-xl">
              <span className="text-[9px] font-bold text-zinc-500 block uppercase">Saldo (Hoje)</span>
              <span className="text-xs font-black text-zinc-850">
                {formatCurrency(
                  todayTransactions.filter(t => t.type === 'entrada' || t.type === 'abertura_caixa').reduce((sum, t) => sum + t.amount, 0) -
                  todayTransactions.filter(t => t.type === 'saida').reduce((sum, t) => sum + t.amount, 0)
                )}
              </span>
            </div>
          </div>

          {/* Transactions list */}
          <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
            {todayTransactions.length === 0 ? (
              <p className="text-center text-[11px] text-zinc-400 py-6">Nenhum lançamento registrado no caixa hoje.</p>
            ) : (
              todayTransactions.slice(0, 15).map((t) => {
                const isPDVSale = t.description.toLowerCase().includes('venda pdv');
                return (
                  <div key={t.id} className="p-2.5 border border-zinc-100 rounded-xl hover:bg-zinc-50/50 transition-colors flex justify-between items-center gap-2 group">
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md ${
                          t.type === 'entrada' || t.type === 'abertura_caixa' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {t.type === 'entrada' ? 'Entrada' : t.type === 'abertura_caixa' ? 'Abertura' : t.type === 'fechamento_caixa' ? 'Fechamento' : 'Saída'}
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
                      <p className="text-[11px] font-semibold text-zinc-700 truncate flex items-center gap-1" title={t.description}>
                        {t.description}
                        {t.type === 'entrada' && (
                          <span className={`text-[9px] font-bold px-1 rounded ${
                            t.paymentMethod === 'dinheiro' ? 'bg-green-100 text-green-700' :
                            t.paymentMethod === 'credito' ? 'bg-orange-100 text-orange-700' :
                            t.paymentMethod === 'debito' ? 'bg-blue-100 text-blue-700' :
                            t.paymentMethod === 'pix' ? 'bg-teal-100 text-teal-700' : 'hidden'
                          }`}>
                            {t.paymentMethod === 'dinheiro' ? '$' :
                             t.paymentMethod === 'credito' ? 'CC' :
                             t.paymentMethod === 'debito' ? 'CD' :
                             t.paymentMethod === 'pix' ? 'PIX' : ''}
                          </span>
                        )}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs font-bold ${
                        t.type === 'entrada' || t.type === 'abertura_caixa' ? 'text-emerald-600' : 'text-rose-600'
                      }`}>
                        {t.type === 'entrada' || t.type === 'abertura_caixa' ? '+' : '-'}{formatCurrency(t.amount)}
                      </span>
                      
                      <div className="flex items-center gap-1 border-l border-zinc-200 pl-1.5 ml-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
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
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm('Deseja realmente excluir este lançamento?')) {
                              onDeleteTransaction(t.id);
                            }
                          }}
                          className="p-1 hover:bg-rose-50 rounded-md text-zinc-400 hover:text-rose-600 cursor-pointer transition-colors"
                          title="Excluir Lançamento"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Totais por Forma de Pagamento */}
          <div className="mt-4 pt-3 border-t border-zinc-100">
            <h4 className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Totais Hoje</h4>
            <div className="grid grid-cols-4 gap-2 text-center mb-3">
              <div className="bg-zinc-50 border border-zinc-150 p-2 rounded-xl">
                <span className="text-[8px] font-bold text-zinc-500 block uppercase">Dinheiro</span>
                <span className="text-[10px] font-black text-zinc-800">{formatCurrency(currentCashInDrawer)}</span>
              </div>
              <div className="bg-zinc-50 border border-zinc-150 p-2 rounded-xl">
                <span className="text-[8px] font-bold text-zinc-500 block uppercase">PIX</span>
                <span className="text-[10px] font-black text-zinc-800">
                  {formatCurrency(todayTransactions.filter(t => t.type === 'entrada' && t.paymentMethod === 'pix').reduce((s, t) => s + t.amount, 0))}
                </span>
              </div>
              <div className="bg-zinc-50 border border-zinc-150 p-2 rounded-xl">
                <span className="text-[8px] font-bold text-zinc-500 block uppercase">Cartão Crédito</span>
                <span className="text-[10px] font-black text-zinc-800">
                  {formatCurrency(todayTransactions.filter(t => t.type === 'entrada' && t.paymentMethod === 'credito').reduce((s, t) => s + t.amount, 0))}
                </span>
              </div>
              <div className="bg-zinc-50 border border-zinc-150 p-2 rounded-xl">
                <span className="text-[8px] font-bold text-zinc-500 block uppercase">Cartão Débito</span>
                <span className="text-[10px] font-black text-zinc-800">
                  {formatCurrency(todayTransactions.filter(t => t.type === 'entrada' && t.paymentMethod === 'debito').reduce((s, t) => s + t.amount, 0))}
                </span>
              </div>
            </div>
            
            {/* Contagem de Dinheiro vs Sistema */}
            <div className="flex items-center justify-between bg-zinc-50 p-2.5 rounded-xl border border-zinc-200">
              <div className="flex items-center gap-3">
                <button onClick={() => setIsContagemOpen(true)} className="px-3 py-1.5 bg-zinc-200 hover:bg-zinc-300 text-zinc-700 rounded-lg text-[9px] font-bold transition-colors">
                  Ver Contagem Físico
                </button>
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-zinc-500">Valor Contagem: <span className="text-zinc-800">{formatCurrency(totalCashCount)}</span></span>
                  {totalCashCount !== currentCashInDrawer && (
                    <span className={`text-[8px] font-bold ${totalCashCount > currentCashInDrawer ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {totalCashCount > currentCashInDrawer ? 'Sobrando:' : 'Faltando:'} {formatCurrency(Math.abs(totalCashCount - currentCashInDrawer))}
                    </span>
                  )}
                  {totalCashCount === currentCashInDrawer && (
                    <span className="text-[8px] font-bold text-emerald-600">Caixa Bateu Perfeitamente</span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="pt-4 flex justify-end gap-3">
              <button onClick={() => handleDownloadCashFlow('jpg')} className="px-4 py-2 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-600 hover:bg-zinc-50 flex items-center gap-2 transition-colors cursor-pointer">
                <FileImage size={14} /> Baixar JPG
              </button>
              <button onClick={() => handleDownloadCashFlow('pdf')} className="px-4 py-2 bg-zinc-900 text-white rounded-xl text-xs font-bold hover:bg-zinc-800 flex items-center gap-2 transition-colors cursor-pointer">
                <FileText size={14} /> Baixar PDF
              </button>
            </div>
          </div>
        </div>
      </div>
      </>
      )}
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
                    onChange={(e) => setQuickName(capitalizeFirstLetter(e.target.value))}
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
      {/* Change Tracking Modal */}
      <AnimatePresence>
        {showChangeModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-2xl rounded-2xl border border-zinc-100 shadow-xl overflow-hidden my-8"
            >
              <div className="flex justify-between items-center p-4 border-b border-zinc-100 bg-zinc-50">
                <div>
                  <h3 className="text-sm font-bold text-zinc-900">Detalhes do Recebimento em Dinheiro</h3>
                  <p className="text-[10px] text-zinc-500">Valor da Venda: <span className="font-bold text-zinc-900">{formatCurrency(completedSale?.total || 0)}</span></p>
                </div>
                <button
                  onClick={() => { setShowChangeModal(false); setIsInvoiceOpen(true); }}
                  className="p-1.5 hover:bg-zinc-200 text-zinc-400 hover:text-zinc-600 rounded-lg transition-colors text-[10px] font-bold"
                >
                  Pular
                </button>
              </div>

              <div className="p-6">
                <div className="space-y-6">
                  {/* Recebido */}
                  <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
                    <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-4 border-b border-emerald-200 pb-2">Notas e Moedas Recebidas</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {DENOMINATIONS.map(d => (
                        <div key={`rcv-${d.key}`} className="flex flex-col items-center p-2 bg-white rounded-lg border border-zinc-200">
                          <span className="text-[10px] font-bold text-zinc-700 mb-2">{d.label}</span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setChangeReceived(prev => ({ ...prev, [d.key]: Math.max(0, (prev[d.key] || 0) - 1) }))}
                              className="w-6 h-6 rounded-md bg-zinc-100 flex items-center justify-center text-zinc-600 hover:bg-zinc-200"
                            >-</button>
                            <span className="w-6 text-center text-xs font-bold">{changeReceived[d.key] || 0}</span>
                            <button
                              onClick={() => setChangeReceived(prev => ({ ...prev, [d.key]: (prev[d.key] || 0) + 1 }))}
                              className="w-6 h-6 rounded-md bg-zinc-100 flex items-center justify-center text-zinc-600 hover:bg-zinc-200"
                            >+</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Troco Toggle */}
                  <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
                    <div>
                      <span className="font-bold text-zinc-800 text-sm block">Houve troco?</span>
                      <span className="text-xs text-zinc-500">Marque se você devolveu troco ao cliente</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={hasChangeGiven} onChange={() => setHasChangeGiven(!hasChangeGiven)} />
                      <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                    </label>
                  </div>

                  {/* Troco */}
                  {hasChangeGiven && (
                    <div className="bg-rose-50/50 p-4 rounded-xl border border-rose-100">
                      <h4 className="text-xs font-bold text-rose-800 uppercase tracking-wider mb-4 border-b border-rose-200 pb-2">Notas e Moedas Devolvidas (Troco)</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {DENOMINATIONS.map(d => (
                          <div key={`gvn-${d.key}`} className="flex flex-col items-center p-2 bg-white rounded-lg border border-zinc-200">
                            <span className="text-[10px] font-bold text-zinc-700 mb-2">{d.label}</span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setChangeGiven(prev => ({ ...prev, [d.key]: Math.max(0, (prev[d.key] || 0) - 1) }))}
                                className="w-6 h-6 rounded-md bg-zinc-100 flex items-center justify-center text-zinc-600 hover:bg-zinc-200"
                              >-</button>
                              <span className="w-6 text-center text-xs font-bold">{changeGiven[d.key] || 0}</span>
                              <button
                                onClick={() => setChangeGiven(prev => ({ ...prev, [d.key]: (prev[d.key] || 0) + 1 }))}
                                className="w-6 h-6 rounded-md bg-zinc-100 flex items-center justify-center text-zinc-600 hover:bg-zinc-200"
                              >+</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-8 pt-4 border-t border-zinc-100 flex items-center justify-between">
                  <div className="text-xs text-zinc-500">
                    Opcional: atualiza sua contagem de caixa automaticamente.
                  </div>
                  <button onClick={handleChangeModalSubmit} className="px-6 py-3 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-sm font-bold transition-all shadow-md">
                    Confirmar e Concluir Venda
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
                <label className="flex items-center gap-2 text-zinc-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={shouldDownloadPDF}
                    onChange={(e) => setShouldDownloadPDF(e.target.checked)}
                    className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  Baixar recibo automaticamente
                </label>
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

      {/* Contagem Modal */}
      <AnimatePresence>
        {isContagemOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-2xl rounded-2xl border border-zinc-100 shadow-xl overflow-hidden my-8"
            >
              <div className="flex justify-between items-center p-4 border-b border-zinc-100 bg-zinc-50">
                <div>
                  <h3 className="text-sm font-bold text-zinc-900">Contagem de Dinheiro Físico</h3>
                  <p className="text-[10px] text-zinc-500">Atualize a quantidade de notas e moedas no caixa</p>
                </div>
                <button
                  onClick={() => setIsContagemOpen(false)}
                  className="p-1.5 hover:bg-zinc-200 text-zinc-400 hover:text-zinc-600 rounded-lg transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Notas */}
                  <div>
                    <h4 className="text-xs font-bold text-zinc-600 uppercase tracking-wider mb-4 border-b pb-2">Cédulas</h4>
                    <div className="space-y-3">
                      {DENOMINATIONS.filter(d => d.type === 'note').map(d => (
                        <div key={d.key} className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-zinc-700 w-20">{d.label}</span>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => setCashCount(prev => ({ ...prev, [d.key]: Math.max(0, (prev[d.key] || 0) - 1) }))}
                              className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-zinc-600 transition-colors"
                            >-</button>
                            <input
                              type="number"
                              min="0"
                              value={cashCount[d.key] || 0}
                              onChange={(e) => setCashCount(prev => ({ ...prev, [d.key]: parseInt(e.target.value) || 0 }))}
                              className="w-16 text-center py-1 border border-zinc-200 rounded font-bold text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                            />
                            <button
                              onClick={() => setCashCount(prev => ({ ...prev, [d.key]: (prev[d.key] || 0) + 1 }))}
                              className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-zinc-600 transition-colors"
                            >+</button>
                          </div>
                          <span className="text-sm font-bold text-emerald-700 w-20 text-right">
                            {formatCurrency((cashCount[d.key] || 0) * d.value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Moedas */}
                  <div>
                    <h4 className="text-xs font-bold text-zinc-600 uppercase tracking-wider mb-4 border-b pb-2">Moedas</h4>
                    <div className="space-y-3">
                      {DENOMINATIONS.filter(d => d.type === 'coin').map(d => (
                        <div key={d.key} className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-zinc-700 w-20">{d.label}</span>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => setCashCount(prev => ({ ...prev, [d.key]: Math.max(0, (prev[d.key] || 0) - 1) }))}
                              className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-zinc-600 transition-colors"
                            >-</button>
                            <input
                              type="number"
                              min="0"
                              value={cashCount[d.key] || 0}
                              onChange={(e) => setCashCount(prev => ({ ...prev, [d.key]: parseInt(e.target.value) || 0 }))}
                              className="w-16 text-center py-1 border border-zinc-200 rounded font-bold text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                            />
                            <button
                              onClick={() => setCashCount(prev => ({ ...prev, [d.key]: (prev[d.key] || 0) + 1 }))}
                              className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-zinc-600 transition-colors"
                            >+</button>
                          </div>
                          <span className="text-sm font-bold text-emerald-700 w-20 text-right">
                            {formatCurrency((cashCount[d.key] || 0) * d.value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-4 border-t border-zinc-100 flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider block">Total na Gaveta</span>
                    <span className="text-2xl font-black text-emerald-600 block">{formatCurrency(totalCashCount)}</span>
                    <span className="text-[10px] text-zinc-400">Salvo automaticamente</span>
                  </div>
                  <button onClick={() => setIsContagemOpen(false)} className="px-6 py-3 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-sm font-bold transition-all shadow-md">
                    Fechar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Caixa Modal (Abrir / Fechar) */}
      <AnimatePresence>
        {isCaixaModalOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-sm rounded-2xl border border-zinc-100 shadow-xl overflow-hidden p-6 space-y-4"
            >
              <div className="flex justify-between items-center pb-2 border-b border-zinc-100">
                <h3 className="text-sm font-bold text-zinc-950 font-sans tracking-tight">
                  {caixaModalType === 'abrir' ? 'Abrir Caixa' : 'Fechar Caixa'}
                </h3>
                <button onClick={() => setIsCaixaModalOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4 text-left">
                {caixaModalType === 'abrir' ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 mb-1">Qual o valor inicial do caixa?</label>
                      <input
                        type="number"
                        step="0.01"
                        value={isContagemInitialMode ? totalCashCount.toFixed(2) : caixaInputValue}
                        onChange={e => !isContagemInitialMode && setCaixaInputValue(e.target.value)}
                        disabled={isContagemInitialMode}
                        placeholder="Ex: 100.00"
                        className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-zinc-900 disabled:opacity-50"
                      />
                      <p className="text-[10px] text-zinc-400 mt-2">
                        Esse é o dinheiro físico ou troco que já está no caixa antes de iniciar as vendas do dia.
                      </p>
                    </div>
                    
                    <div className="bg-zinc-50 border border-zinc-200 p-3 rounded-xl flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-zinc-700 block">Deseja detalhar contagem de notas?</span>
                        <span className="text-[9px] text-zinc-500">Ajuda a organizar o troco</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={isContagemInitialMode} onChange={() => setIsContagemInitialMode(!isContagemInitialMode)} />
                        <div className="w-9 h-5 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                      </label>
                    </div>
                    
                    {isContagemInitialMode && (
                      <button type="button" onClick={() => setIsContagemOpen(true)} className="w-full py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold transition-all shadow-md">
                        Anotar Notas e Moedas
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-zinc-50 border border-zinc-150 p-4 rounded-xl text-center space-y-1">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Saldo Atual Estimado (Dinheiro Físico)</span>
                      <p className="text-xl font-black text-zinc-900">{formatCurrency(currentCashInDrawer)}</p>
                      <p className="text-[9px] text-zinc-500">
                        {currentCashInDrawer > 0 ? "Este é o valor em espécie que deve estar na gaveta." : "Seu caixa está zerado."}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="flex items-center justify-between cursor-pointer">
                        <span className="text-xs font-bold text-zinc-600">Realizar Sangria?</span>
                        <input
                          type="checkbox"
                          checked={hasSangria}
                          onChange={(e) => setHasSangria(e.target.checked)}
                          className="rounded border-zinc-300 text-rose-600 focus:ring-rose-500"
                        />
                      </label>
                      {hasSangria && (
                        <div>
                          <label className="block text-[10px] font-bold text-zinc-500 mb-1">Valor a retirar</label>
                          <input
                            type="number"
                            step="0.01"
                            value={sangriaValue}
                            onChange={e => setSangriaValue(e.target.value)}
                            placeholder="Ex: 500.00"
                            className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-zinc-900"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <button
                  onClick={handleCaixaSubmit}
                  className={`w-full py-3 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer ${
                    caixaModalType === 'abrir' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {caixaModalType === 'abrir' ? 'Confirmar Abertura' : 'Confirmar Fechamento'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
