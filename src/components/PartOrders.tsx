import React, { useState, useMemo } from 'react';
import { 
  ClipboardList, 
  Search, 
  UserPlus, 
  UserCheck, 
  Phone, 
  CreditCard, 
  MapPin, 
  Plus, 
  Trash2, 
  Check, 
  Printer, 
  Share2, 
  AlertCircle, 
  Clock, 
  ExternalLink,
  MessageSquare,
  Sparkles,
  Info
} from 'lucide-react';
import { CustomerPartOrder, Customer, ShopConfig } from '../types';
import { formatCurrency, formatDate } from '../utils';

interface PartOrdersProps {
  partOrders: CustomerPartOrder[];
  customers: Customer[];
  config?: ShopConfig;
  onAddPartOrder: (order: Omit<CustomerPartOrder, 'id' | 'orderNumber' | 'createdAt' | 'updatedAt'>) => Promise<CustomerPartOrder | null>;
  onEditPartOrder: (id: string, updatedFields: Partial<CustomerPartOrder>) => Promise<void>;
  onDeletePartOrder: (id: string) => Promise<void>;
  onAddCustomer: (customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
}

export default function PartOrders({
  partOrders,
  customers,
  config,
  onAddPartOrder,
  onEditPartOrder,
  onDeletePartOrder,
  onAddCustomer
}: PartOrdersProps) {
  // Navigation tabs for orders
  const [activeTab, setActiveTab] = useState<'pendentes' | 'finalizadas' | 'todas'>('pendentes');
  
  // Search and filter for orders
  const [searchTerm, setSearchTerm] = useState('');

  // Form State
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  
  // If customer is not found, we toggle new customer form
  const [isNewCustomerMode, setIsNewCustomerMode] = useState(false);
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustCpf, setNewCustCpf] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');

  // Part info
  const [partName, setPartName] = useState('');
  const [clientPrice, setClientPrice] = useState<number | ''>('');
  const [daysToArrive, setDaysToArrive] = useState<number | ''>('');
  const [paymentType, setPaymentType] = useState<'pago_antecipado' | 'sinal' | 'confianca'>('sinal');
  const [depositAmount, setDepositAmount] = useState<number | ''>('');
  const [formPaymentMethod, setFormPaymentMethod] = useState<'dinheiro' | 'pix' | 'debito' | 'credito'>('pix');
  
  // Custom Trusted flag
  const [isTrustedClient, setIsTrustedClient] = useState(false);

  // Internal Shop Use
  const [costPrice, setCostPrice] = useState<number | ''>('');
  const [supplierLink, setSupplierLink] = useState('');

  // Modal and printing states
  const [showShareModal, setShowShareModal] = useState(false);
  const [activeShareOrder, setActiveShareOrder] = useState<CustomerPartOrder | null>(null);
  
  // Completion Modal State
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [activeCompleteOrder, setActiveCompleteOrder] = useState<CustomerPartOrder | null>(null);

  // Customer Autocomplete selection list
  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return [];
    const lower = customerSearch.toLowerCase();
    return customers.filter(c => 
      c.name.toLowerCase().includes(lower) || 
      c.phone.includes(lower) || 
      (c.cpfCnpj && c.cpfCnpj.includes(lower))
    ).slice(0, 5);
  }, [customers, customerSearch]);

  // Handle Autocomplete selection
  const handleSelectCustomer = (cust: Customer) => {
    setSelectedCustomer(cust);
    setCustomerSearch(cust.name);
    setIsNewCustomerMode(false);
  };

  // Switch to new customer creation manually
  const handleStartNewCustomer = () => {
    setIsNewCustomerMode(true);
    setSelectedCustomer(null);
  };

  // Reset form helper
  const resetForm = () => {
    setCustomerSearch('');
    setSelectedCustomer(null);
    setIsNewCustomerMode(false);
    setNewCustPhone('');
    setNewCustCpf('');
    setNewCustAddress('');
    setPartName('');
    setClientPrice('');
    setDaysToArrive('');
    setPaymentType('sinal');
    setDepositAmount('');
    setFormPaymentMethod('pix');
    setIsTrustedClient(false);
    setCostPrice('');
    setSupplierLink('');
  };

  // Register Part Order
  const handleRegisterOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let finalCustName = '';
    let finalCustPhone = '';
    let finalCustCpf = '';
    let finalCustAddress = '';

    if (isNewCustomerMode) {
      if (!customerSearch.trim()) {
        alert('Nome do cliente é obrigatório!');
        return;
      }
      const phone = newCustPhone.trim() || 'N/A';
      // Save customer to Firestore first
      const newCustomerPayload = {
        name: customerSearch.trim(),
        phone: phone,
        cpfCnpj: newCustCpf.trim() || undefined,
        address: newCustAddress.trim() || undefined
      };
      await onAddCustomer(newCustomerPayload);
      
      finalCustName = customerSearch.trim();
      finalCustPhone = phone;
      finalCustCpf = newCustCpf.trim();
      finalCustAddress = newCustAddress.trim();
    } else {
      if (!selectedCustomer) {
        if (customerSearch.trim()) {
          const phone = newCustPhone.trim() || 'N/A';
          const newCustomerPayload = {
            name: customerSearch.trim(),
            phone: phone,
            cpfCnpj: newCustCpf.trim() || undefined,
            address: newCustAddress.trim() || undefined
          };
          await onAddCustomer(newCustomerPayload);
          
          finalCustName = customerSearch.trim();
          finalCustPhone = phone;
          finalCustCpf = newCustCpf.trim();
          finalCustAddress = newCustAddress.trim();
        } else {
          alert('Por favor, digite o nome do cliente para cadastrar ou selecione um cliente existente.');
          return;
        }
      } else {
        finalCustName = selectedCustomer.name;
        finalCustPhone = selectedCustomer.phone;
        finalCustCpf = selectedCustomer.cpfCnpj || '';
        finalCustAddress = selectedCustomer.address || '';
      }
    }

    if (!partName.trim() || clientPrice === '' || daysToArrive === '') {
      alert('Preencha os campos obrigatórios da peça (Nome, Valor do Cliente e Prazo).');
      return;
    }

    const payload: Omit<CustomerPartOrder, 'id' | 'orderNumber' | 'createdAt' | 'updatedAt'> = {
      customerName: finalCustName,
      customerPhone: finalCustPhone,
      customerCpf: finalCustCpf || undefined,
      customerAddress: finalCustAddress || undefined,
      partName: partName.trim(),
      clientPrice: Number(clientPrice),
      daysToArrive: Number(daysToArrive),
      paymentType: isTrustedClient ? 'confianca' : paymentType,
      depositAmount: (paymentType === 'sinal' && !isTrustedClient) ? Number(depositAmount) : undefined,
      paymentMethod: (paymentType === 'pago_antecipado' && !isTrustedClient) ? formPaymentMethod : undefined,
      costPrice: Number(costPrice) || 0,
      supplierLink: supplierLink.trim() || undefined,
      isTrustedClient,
      status: 'pendente'
    };

    const savedOrder = await onAddPartOrder(payload);
    if (savedOrder) {
      resetForm();
      // Prompt option to share/print immediately
      setActiveShareOrder(savedOrder);
      setShowShareModal(true);
    }
  };

  // Calculate remaining days countdown
  const getRemainingDays = (order: CustomerPartOrder) => {
    if (order.status === 'finalizado') return 0;
    
    const createdDate = new Date(order.createdAt);
    const targetDate = new Date(createdDate.getTime() + order.daysToArrive * 24 * 60 * 60 * 1000);
    const today = new Date();
    
    targetDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    
    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Orders counting arriving in <= 1 day
  const ordersArrivingSoonCount = useMemo(() => {
    return partOrders.filter(o => o.status === 'pendente' && getRemainingDays(o) <= 1).length;
  }, [partOrders]);

  // Filtering orders according to tab and search text
  const filteredOrders = useMemo(() => {
    return partOrders.filter(o => {
      // Tab filter
      if (activeTab === 'pendentes' && o.status === 'finalizado') return false;
      if (activeTab === 'finalizadas' && o.status !== 'finalizado') return false;

      // Search term
      if (!searchTerm.trim()) return true;
      const lower = searchTerm.toLowerCase();
      return (
        o.orderNumber?.toLowerCase().includes(lower) ||
        o.customerName.toLowerCase().includes(lower) ||
        o.partName.toLowerCase().includes(lower) ||
        o.customerPhone.includes(lower)
      );
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [partOrders, activeTab, searchTerm]);

  // Print Order Trigger
  const handlePrintOrder = (order: CustomerPartOrder) => {
    const printContent = document.getElementById(`printable-order-${order.id}`);
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Por favor, permita popups para imprimir o recibo.');
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Encomenda de Peça ${order.orderNumber}</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 20px; color: #18181b; }
            .ticket { max-width: 400px; margin: 0 auto; border: 1px dashed #ccc; padding: 15px; border-radius: 8px; }
            .header { text-align: center; margin-bottom: 15px; border-bottom: 2px solid #18181b; padding-bottom: 10px; }
            .header h1 { font-size: 18px; margin: 0; font-weight: bold; }
            .header p { font-size: 11px; margin: 3px 0 0; color: #666; }
            .title { text-align: center; font-size: 14px; font-weight: bold; margin: 10px 0; text-transform: uppercase; }
            .details { font-size: 12px; line-height: 1.6; margin-bottom: 15px; }
            .details table { width: 100%; border-collapse: collapse; }
            .details td { padding: 4px 0; }
            .details td.label { font-weight: bold; color: #555; width: 40%; }
            .footer { border-top: 1px dashed #ccc; padding-top: 10px; text-align: center; font-size: 10px; color: #777; margin-top: 15px; }
          </style>
        </head>
        <body>
          <div class="ticket">
            <div class="header">
              <h1>${config?.name || 'InfoCam Assistência'}</h1>
              <p>Contato: ${config?.phone || '(11) 98888-7777'}</p>
              ${config?.cnpjCpf ? `<p>CNPJ/CPF: ${config.cnpjCpf}</p>` : ''}
            </div>
            <div class="title">Comprovante de Encomenda</div>
            <div class="details">
              <table>
                <tr><td class="label">Pedido:</td><td><b>${order.orderNumber}</b></td></tr>
                <tr><td class="label">Cliente:</td><td>${order.customerName}</td></tr>
                <tr><td class="label">WhatsApp:</td><td>${order.customerPhone}</td></tr>
                ${order.customerCpf ? `<tr><td class="label">CPF:</td><td>${order.customerCpf}</td></tr>` : ''}
                <tr><td class="label">Peça Encomendada:</td><td><b>${order.partName}</b></td></tr>
                <tr><td class="label">Prazo Previsto:</td><td>${order.daysToArrive} dias</td></tr>
                <tr><td class="label">Valor Total:</td><td><b>${formatCurrency(order.clientPrice)}</b></td></tr>
                <tr><td class="label">Faturamento:</td><td>
                  ${order.paymentType === 'pago_antecipado' ? `Pago Antecipadamente ${order.paymentMethod ? `(${order.paymentMethod === 'debito' ? 'Cartão de Débito' : order.paymentMethod === 'credito' ? 'Cartão de Crédito' : order.paymentMethod === 'pix' ? 'Pix' : 'Dinheiro'})` : ''}` : ''}
                  ${order.paymentType === 'sinal' ? `Sinal Pago: ${formatCurrency(order.depositAmount || 0)}` : ''}
                  ${order.paymentType === 'confianca' ? 'Sem sinal / Cliente de confiança' : ''}
                </td></tr>
                ${order.paymentType === 'sinal' ? `<tr><td class="label">Saldo Restante:</td><td><b>${formatCurrency(order.clientPrice - (order.depositAmount || 0))}</b></td></tr>` : ''}
              </table>
            </div>
            <div class="footer">
              <p>Este documento serve como comprovante de encomenda de peças.</p>
              <p>Gerado em ${new Date(order.createdAt).toLocaleDateString('pt-BR')}</p>
            </div>
          </div>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // WhatsApp Order Share Trigger
  const handleShareWhatsAppOrder = (order: CustomerPartOrder) => {
    const cleanPhone = order.customerPhone.replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    
    const paymentText = order.paymentType === 'pago_antecipado' 
      ? `Pago integralmente de forma antecipada${order.paymentMethod ? ` via ${order.paymentMethod === 'debito' ? 'Cartão de Débito' : order.paymentMethod === 'credito' ? 'Cartão de Crédito' : order.paymentMethod === 'pix' ? 'Pix' : 'Dinheiro'}` : ''}`
      : order.paymentType === 'sinal'
        ? `Sinal deixado: ${formatCurrency(order.depositAmount || 0)} (Valor restante: ${formatCurrency(order.clientPrice - (order.depositAmount || 0))})`
        : 'Sinal/Adiantamento dispensado';

    const message = `Olá, *${order.customerName}*!\n\nPassando para confirmar que registramos o seu pedido de encomenda de peça com sucesso em nosso sistema!\n\n📋 *Código do Pedido:* ${order.orderNumber}\n📦 *Peça:* ${order.partName}\n💰 *Valor Combinado:* ${formatCurrency(order.clientPrice)}\n💳 *Status:* ${paymentText}\n📅 *Prazo Estimado:* ${order.daysToArrive} dias para chegada.\n\nFique tranquilo! Assim que a sua peça chegar, nós te avisaremos por aqui imediatamente.\n\nObrigado pela preferência e confiança! 😊`;
    
    const encoded = encodeURIComponent(message);
    window.open(`https://api.whatsapp.com/send?phone=${phoneWithCountry}&text=${encoded}`, '_blank');
  };

  // Complete Order dialog selection (how client wants to receive it)
  const handleOpenCompleteDialog = (order: CustomerPartOrder) => {
    setActiveCompleteOrder(order);
    setShowCompleteModal(true);
  };

  // Complete Order submit
  const handleCompleteOrder = async (deliveryType: 'retirar' | 'entregar') => {
    if (!activeCompleteOrder) return;

    // Update status locally & in firestore
    await onEditPartOrder(activeCompleteOrder.id, {
      status: 'finalizado',
      deliveryType
    });

    setShowCompleteModal(false);

    // Build the predefined message according to delivery choice
    const cleanPhone = activeCompleteOrder.customerPhone.replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    
    let messageText = '';
    if (deliveryType === 'retirar') {
      messageText = `Olá, *${activeCompleteOrder.customerName}*!\n\nExcelente notícia! A sua encomenda da peça *${activeCompleteOrder.partName}* já chegou em nossa loja e está prontinha!\n\n📍 Você já pode vir retirar a sua encomenda quando quiser.\n\nFicamos no seu aguardo!`;
    } else {
      messageText = `Olá, *${activeCompleteOrder.customerName}*!\n\nExcelente notícia! A sua encomenda da peça *${activeCompleteOrder.partName}* já chegou!\n\n🚚 Nós iremos entregar a encomenda do cliente assim que ele confirmar que podemos levar.\n\nPor favor, nos confirme um horário disponível para que possamos realizar a entrega!`;
    }

    const encoded = encodeURIComponent(messageText);
    window.open(`https://api.whatsapp.com/send?phone=${phoneWithCountry}&text=${encoded}`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Banner arriving soon notifications */}
      {ordersArrivingSoonCount > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-5 py-4 rounded-2xl flex items-center gap-3.5 shadow-sm">
          <AlertCircle className="text-emerald-600 shrink-0 animate-bounce" size={20} />
          <div>
            <p className="font-bold text-xs">Encomendas Importantes hoje!</p>
            <p className="text-[11px] text-emerald-700/90 mt-0.5">
              Você possui <strong>{ordersArrivingSoonCount} {ordersArrivingSoonCount === 1 ? 'encomenda' : 'encomendas'}</strong> com apenas 1 dia ou menos de prazo de entrega restante. Verifique a lista abaixo.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Register Order Form Column */}
        <div className="bg-white p-5 border border-zinc-150 rounded-2xl shadow-sm space-y-5">
          <div className="flex items-center gap-2 pb-2 border-b border-zinc-100">
            <ClipboardList className="text-zinc-900" size={18} />
            <h2 className="font-extrabold text-xs text-zinc-950 uppercase tracking-wider">Nova Encomenda</h2>
          </div>

          <form onSubmit={handleRegisterOrder} className="space-y-4">
            
            {/* Customer Search Autocomplete */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-zinc-500 uppercase">Buscar Cliente</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Comece a digitar o nome do cliente..."
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    if (selectedCustomer && e.target.value !== selectedCustomer.name) {
                      setSelectedCustomer(null);
                    }
                  }}
                  className="w-full pl-9 pr-4 py-2 text-xs border border-zinc-200 rounded-xl focus:border-zinc-400 focus:outline-none bg-zinc-50 text-zinc-800"
                />
                <Search className="absolute left-3 top-2.5 text-zinc-400" size={14} />
              </div>

              {/* Autocomplete Dropdown */}
              {filteredCustomers.length > 0 && !selectedCustomer && (
                <div className="bg-white border border-zinc-200 rounded-xl mt-1 shadow-lg overflow-hidden divide-y divide-zinc-50 z-10 relative">
                  {filteredCustomers.map(cust => (
                    <button
                      key={cust.id}
                      type="button"
                      onClick={() => handleSelectCustomer(cust)}
                      className="w-full text-left px-3 py-2 text-xs text-zinc-700 hover:bg-zinc-50 flex items-center justify-between transition-colors"
                    >
                      <span className="font-medium">{cust.name}</span>
                      <span className="text-[10px] text-zinc-400">{cust.phone}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* No match found or register new */}
              {!selectedCustomer && customerSearch.trim().length > 1 && filteredCustomers.length === 0 && (
                <div className="pt-1.5 flex flex-col gap-1">
                  <p className="text-[10px] text-amber-600 font-medium flex items-center gap-1">
                    <Info size={12} /> Cliente não cadastrado
                  </p>
                  <button
                    type="button"
                    onClick={handleStartNewCustomer}
                    className="text-[11px] text-zinc-950 font-bold hover:underline flex items-center gap-1 w-max"
                  >
                    <UserPlus size={12} /> Cadastrar "{customerSearch}" diretamente por aqui
                  </button>
                </div>
              )}

              {selectedCustomer && (
                <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 px-3 py-2 rounded-xl text-xs flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <UserCheck size={14} className="text-emerald-600" />
                    <span>Vinculado a <strong>{selectedCustomer.name}</strong></span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCustomer(null);
                      setCustomerSearch('');
                    }}
                    className="text-[10px] text-zinc-500 font-bold hover:text-zinc-800"
                  >
                    Alterar
                  </button>
                </div>
              )}
            </div>

            {/* If New Customer Mode is enabled, show the additional inputs */}
            {isNewCustomerMode && (
              <div className="p-3 bg-zinc-50 border border-zinc-150 rounded-xl space-y-3 animate-fadeIn">
                <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Cadastro Rápido de Cliente</h4>
                
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-zinc-600">Telefone / WhatsApp *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: (11) 99999-8888"
                    value={newCustPhone}
                    onChange={(e) => setNewCustPhone(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-zinc-200 rounded-lg bg-white text-zinc-800"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-zinc-600">CPF</label>
                    <input
                      type="text"
                      placeholder="Ex: 123.456.789-00"
                      value={newCustCpf}
                      onChange={(e) => setNewCustCpf(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-zinc-200 rounded-lg bg-white text-zinc-800"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-zinc-600">Endereço (opcional)</label>
                    <input
                      type="text"
                      placeholder="Ex: Rua Central, 12"
                      value={newCustAddress}
                      onChange={(e) => setNewCustAddress(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-zinc-200 rounded-lg bg-white text-zinc-800"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="h-px bg-zinc-100 my-2" />

            {/* Piece Info */}
            <div className="space-y-3">
              <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Informações da Peça</h4>
              
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-zinc-600">Nome da Peça *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Tela iPhone 13 Pro Max"
                  value={partName}
                  onChange={(e) => setPartName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-zinc-200 rounded-xl bg-zinc-50 text-zinc-800 focus:outline-none focus:border-zinc-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-zinc-600">Valor para Cliente (R$)*</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={clientPrice}
                    onChange={(e) => setClientPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-zinc-200 rounded-xl bg-zinc-50 text-zinc-800 focus:outline-none focus:border-zinc-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-zinc-600">Dias para Chegar *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="Ex: 5"
                    value={daysToArrive}
                    onChange={(e) => setDaysToArrive(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-zinc-200 rounded-xl bg-zinc-50 text-zinc-800 focus:outline-none focus:border-zinc-400"
                  />
                </div>
              </div>

              {/* Confidence Client Switch */}
              <div className="flex items-center justify-between bg-zinc-50 p-2.5 rounded-xl border border-zinc-150">
                <div className="flex items-start gap-1.5 min-w-0">
                  <Sparkles className="text-amber-500 shrink-0 mt-0.5" size={13} />
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-zinc-700 leading-none">Cliente de Confiança</p>
                    <span className="text-[8px] text-zinc-400 leading-tight block truncate">Uso interno (Disponibiliza sem sinal)</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={isTrustedClient}
                  onChange={(e) => {
                    setIsTrustedClient(e.target.checked);
                    if (e.target.checked) {
                      setPaymentType('confianca');
                    } else {
                      setPaymentType('sinal');
                    }
                  }}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                />
              </div>

              {/* Payment Advance Option */}
              {!isTrustedClient && (
                <div className="space-y-2 pt-1">
                  <label className="block text-[11px] font-bold text-zinc-600">Tipo de Pagamento</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentType('pago_antecipado')}
                      className={`px-3 py-2 rounded-xl text-[10px] font-extrabold border transition-all ${
                        paymentType === 'pago_antecipado'
                          ? 'bg-zinc-950 text-white border-zinc-950'
                          : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50'
                      }`}
                    >
                      Pago Antecipadamente
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentType('sinal')}
                      className={`px-3 py-2 rounded-xl text-[10px] font-extrabold border transition-all ${
                        paymentType === 'sinal'
                          ? 'bg-zinc-950 text-white border-zinc-950'
                          : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50'
                      }`}
                    >
                      Deixar Sinal / Entrada
                    </button>
                  </div>

                  {paymentType === 'sinal' && (
                    <div className="space-y-1 pt-1 animate-fadeIn">
                      <label className="block text-[10px] font-bold text-zinc-600">Valor do Sinal (R$)</label>
                      <input
                        type="number"
                        required
                        min="0"
                        step="0.01"
                        placeholder="Valor pago de entrada"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full px-3 py-1.5 text-xs border border-zinc-200 rounded-lg bg-zinc-50 text-zinc-800"
                      />
                    </div>
                  )}

                  {paymentType === 'pago_antecipado' && (
                    <div className="space-y-1.5 pt-1 animate-fadeIn">
                      <label className="block text-[10px] font-bold text-zinc-600">Forma de Pagamento</label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {[
                          { id: 'pix', label: 'Pix' },
                          { id: 'dinheiro', label: 'Dinheiro' },
                          { id: 'debito', label: 'Cartão de Débito' },
                          { id: 'credito', label: 'Cartão de Crédito' }
                        ].map((method) => (
                          <button
                            key={method.id}
                            type="button"
                            onClick={() => setFormPaymentMethod(method.id as any)}
                            className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${
                              formPaymentMethod === method.id
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50'
                            }`}
                          >
                            {method.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="h-px bg-zinc-100 my-2" />

            {/* Internal Shop Info (only visible for shop staff) */}
            <div className="space-y-3 bg-zinc-50 p-3 border border-zinc-150 rounded-xl">
              <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                <Info size={11} /> Uso Interno da Loja
              </h4>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-zinc-600">Valor de Custo (R$)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 text-xs border border-zinc-200 rounded-lg bg-white text-zinc-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-zinc-600">Link Fornecedor / Peça</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={supplierLink}
                    onChange={(e) => setSupplierLink(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-zinc-200 rounded-lg bg-white text-zinc-800"
                  />
                </div>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="w-full py-2.5 bg-zinc-950 hover:bg-zinc-900 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 mt-4 cursor-pointer"
            >
              <Plus size={14} /> Registrar e Salvar Pedido
            </button>

          </form>
        </div>

        {/* Orders Listing Column (takes 2 units of grid) */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Header Controls */}
          <div className="bg-white p-4 border border-zinc-150 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* Tabs selector */}
            <div className="flex bg-zinc-100 p-1 rounded-xl w-max">
              <button
                onClick={() => setActiveTab('pendentes')}
                className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all ${
                  activeTab === 'pendentes' ? 'bg-white text-zinc-950 shadow-sm' : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                Ativas ({partOrders.filter(o => o.status !== 'finalizado').length})
              </button>
              <button
                onClick={() => setActiveTab('finalizadas')}
                className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all ${
                  activeTab === 'finalizadas' ? 'bg-white text-zinc-950 shadow-sm' : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                Finalizadas ({partOrders.filter(o => o.status === 'finalizado').length})
              </button>
              <button
                onClick={() => setActiveTab('todas')}
                className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all ${
                  activeTab === 'todas' ? 'bg-white text-zinc-950 shadow-sm' : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                Ver Todas ({partOrders.length})
              </button>
            </div>

            {/* Search Input */}
            <div className="relative max-w-xs w-full">
              <input
                type="text"
                placeholder="Filtrar por pedido, cliente ou peça..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-4 py-1.5 text-xs border border-zinc-200 rounded-xl focus:border-zinc-400 focus:outline-none bg-zinc-50 text-zinc-800"
              />
              <Search className="absolute left-2.5 top-2 text-zinc-400" size={13} />
            </div>

          </div>

          {/* Orders list */}
          <div className="space-y-3">
            {filteredOrders.length === 0 ? (
              <div className="bg-white p-8 border border-zinc-150 rounded-2xl shadow-sm text-center">
                <ClipboardList className="mx-auto text-zinc-300 mb-2" size={32} />
                <p className="text-xs font-bold text-zinc-500">Nenhum pedido de encomenda encontrado.</p>
                <p className="text-[10px] text-zinc-400 mt-0.5">Use o painel lateral para registrar novas encomendas.</p>
              </div>
            ) : (
              filteredOrders.map(order => {
                const daysRemaining = getRemainingDays(order);
                const isArrivingSoon = order.status === 'pendente' && daysRemaining <= 1;

                return (
                  <div
                    key={order.id}
                    className={`bg-white border rounded-2xl shadow-sm hover:shadow-md transition-all divide-y divide-zinc-100 ${
                      isArrivingSoon ? 'border-emerald-300 bg-emerald-50/10' : 'border-zinc-150'
                    }`}
                  >
                    
                    {/* Top Order Information */}
                    <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{order.orderNumber}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold ${
                            order.status === 'finalizado' 
                              ? 'bg-zinc-100 text-zinc-600'
                              : isArrivingSoon 
                                ? 'bg-emerald-100 text-emerald-800 animate-pulse'
                                : 'bg-amber-100 text-amber-800'
                          }`}>
                            {order.status === 'finalizado' ? 'Finalizada / Entregue' : 'Pendente / Aguardando'}
                          </span>
                          
                          {order.isTrustedClient && (
                            <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full text-[9px] font-extrabold flex items-center gap-0.5">
                              <Sparkles size={9} /> Confiança
                            </span>
                          )}
                        </div>

                        <div className="flex flex-col gap-1.5 mt-1">
                          <h3 className="font-extrabold text-sm text-zinc-950 flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span>{order.partName}</span>
                            <span className="text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-lg text-xs font-black">
                              {formatCurrency(order.clientPrice)}
                            </span>
                          </h3>
                          
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500">
                            <span className="flex items-center gap-1 font-semibold text-zinc-700 bg-zinc-50 border border-zinc-150 px-2 py-0.5 rounded-lg">
                              <UserCheck size={12} className="text-zinc-500" /> {order.customerName}
                            </span>
                            <span className="flex items-center gap-1">
                              <Phone size={12} className="text-zinc-400" /> {order.customerPhone}
                            </span>
                            {order.customerCpf && (
                              <span className="flex items-center gap-1">
                                <CreditCard size={12} className="text-zinc-400" /> {order.customerCpf}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right Hand Side Countdown */}
                      <div className="flex flex-col items-start sm:items-end gap-1.5 self-start sm:self-center">
                        {order.status !== 'finalizado' ? (
                          <div className={`px-3 py-1.5 rounded-xl text-center flex items-center gap-1.5 border ${
                            isArrivingSoon 
                              ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                              : 'bg-zinc-50 text-zinc-700 border-zinc-150'
                          }`}>
                            <Clock size={12} />
                            <span className="text-xs font-black">
                              {daysRemaining > 1 ? `${daysRemaining} dias restantes` : daysRemaining === 1 ? 'Falta 1 dia!' : daysRemaining === 0 ? 'Chega Hoje!' : `Atrasado ${Math.abs(daysRemaining)} d!`}
                            </span>
                          </div>
                        ) : (
                          <span className="px-2.5 py-1 bg-zinc-100 border border-zinc-200 text-zinc-500 text-[10px] font-extrabold rounded-lg">
                            Finalizado por: {order.deliveryType === 'entregar' ? 'Entregador' : 'Retirada Loja'}
                          </span>
                        )}

                        <span className="text-[10px] text-zinc-400">Registrado em: {formatDate(order.createdAt)}</span>
                      </div>

                    </div>

                    {/* Middle pricing & Internal use section */}
                    <div className="p-4 bg-zinc-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      
                      {/* Financial info */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-xs">
                        <div>
                          <span className="text-zinc-400 block text-[10px] font-bold uppercase">Valor Combinado</span>
                          <span className="font-extrabold text-zinc-950 text-sm">{formatCurrency(order.clientPrice)}</span>
                        </div>
                        <div>
                          <span className="text-zinc-400 block text-[10px] font-bold uppercase">Situação Financeira</span>
                          <span className="font-bold text-zinc-700">
                            {order.paymentType === 'pago_antecipado' && (
                              <span>Pago Antecipadamente {order.paymentMethod ? `(${order.paymentMethod === 'debito' ? 'Débito' : order.paymentMethod === 'credito' ? 'Crédito' : order.paymentMethod.toUpperCase()})` : ''}</span>
                            )}
                            {order.paymentType === 'sinal' && `Sinal: ${formatCurrency(order.depositAmount || 0)}`}
                            {order.paymentType === 'confianca' && 'Dispensado / Confiança'}
                          </span>
                        </div>
                        {order.paymentType === 'sinal' && (
                          <div>
                            <span className="text-zinc-400 block text-[10px] font-bold uppercase">Restante a Pagar</span>
                            <span className="font-extrabold text-red-600">{formatCurrency(order.clientPrice - (order.depositAmount || 0))}</span>
                          </div>
                        )}
                      </div>

                      {/* Store Internal Use (Cost, Supplier Link) */}
                      <div className="border-t md:border-t-0 md:border-l border-zinc-200 pt-2 md:pt-0 md:pl-4 space-y-1.5 flex-shrink-0">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide block">Uso Interno Loja</span>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="text-zinc-600">Custo: <strong className="text-zinc-800">{formatCurrency(order.costPrice)}</strong></span>
                          {order.supplierLink && (
                            <a
                              href={order.supplierLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-zinc-500 hover:text-zinc-950 flex items-center gap-0.5 hover:underline"
                            >
                              Fornecedor <ExternalLink size={11} />
                            </a>
                          )}
                        </div>
                      </div>

                    </div>

                    {/* Bottom Action buttons */}
                    <div className="px-4 py-3 bg-white flex flex-wrap items-center justify-between gap-3 rounded-b-2xl">
                      
                      <div className="flex items-center gap-2">
                        {/* Print Receipt button */}
                        <button
                          onClick={() => handlePrintOrder(order)}
                          className="px-3 py-1.5 bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <Printer size={13} /> Comprovante
                        </button>
                        
                        {/* WhatsApp text receipt details */}
                        <button
                          onClick={() => handleShareWhatsAppOrder(order)}
                          className="px-3 py-1.5 bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <Share2 size={13} /> WhatsApp
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Check Button to Finalize and send custom WhatsApp */}
                        {order.status !== 'finalizado' && (
                          <button
                            onClick={() => handleOpenCompleteDialog(order)}
                            className="px-4 py-1.5 bg-zinc-950 hover:bg-zinc-900 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-sm"
                          >
                            <Check size={14} /> Receber / Finalizar
                          </button>
                        )}

                        {/* Send delivery update text (Always active as requested) */}
                        <button
                          onClick={() => {
                            const cleanPhone = order.customerPhone.replace(/\D/g, '');
                            const phoneWithCountry = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
                            const msg = `Olá, *${order.customerName}*! Passando para te deixar atualizado sobre a encomenda de peça da sua Ordem de Serviço / Compra (*${order.partName}*). Qualquer dúvida estamos à disposição!`;
                            window.open(`https://api.whatsapp.com/send?phone=${phoneWithCountry}&text=${encodeURIComponent(msg)}`, '_blank');
                          }}
                          className="px-3 py-1.5 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-zinc-600 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                          title="Falar com Cliente"
                        >
                          <MessageSquare size={12} /> Contatar Cliente
                        </button>

                        {/* Delete Order button */}
                        <button
                          onClick={() => {
                            if (confirm(`Tem certeza de que deseja excluir o pedido ${order.orderNumber}?`)) {
                              onDeletePartOrder(order.id);
                            }
                          }}
                          className="p-1.5 text-zinc-400 hover:text-red-600 rounded-lg hover:bg-zinc-50 transition-colors"
                          title="Excluir Encomenda"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                    </div>

                    {/* Hidden print payload wrapper inside the HTML */}
                    <div id={`printable-order-${order.id}`} className="hidden" />

                  </div>
                );
              })
            )}
          </div>

        </div>

      </div>

      {/* Sharing options modal */}
      {showShareModal && activeShareOrder && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-zinc-200 max-w-sm w-full p-5 space-y-4 animate-scaleUp">
            <div className="text-center space-y-1">
              <Sparkles className="mx-auto text-emerald-500" size={32} />
              <h3 className="font-extrabold text-sm text-zinc-950">Encomenda Salva com Sucesso!</h3>
              <p className="text-xs text-zinc-500">
                O pedido <strong>{activeShareOrder.orderNumber}</strong> foi criado. Como você deseja enviar as informações para o cliente?
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              <button
                onClick={() => {
                  handlePrintOrder(activeShareOrder);
                  setShowShareModal(false);
                }}
                className="w-full py-2 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-zinc-800 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
              >
                <Printer size={14} /> Imprimir Comprovante
              </button>

              <button
                onClick={() => {
                  handleShareWhatsAppOrder(activeShareOrder);
                  setShowShareModal(false);
                }}
                className="w-full py-2 bg-zinc-950 hover:bg-zinc-900 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
              >
                <Share2 size={14} /> Enviar Comprovante via WhatsApp
              </button>
            </div>

            <button
              onClick={() => setShowShareModal(false)}
              className="w-full text-center text-xs text-zinc-400 font-bold hover:text-zinc-600"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Delivery / Reception Choice Modal */}
      {showCompleteModal && activeCompleteOrder && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-zinc-200 max-w-sm w-full p-5 space-y-4 animate-scaleUp">
            <div className="text-center space-y-1">
              <Check className="mx-auto text-zinc-950 bg-zinc-100 p-1.5 rounded-full" size={36} />
              <h3 className="font-extrabold text-sm text-zinc-950">Finalizar Encomenda</h3>
              <p className="text-xs text-zinc-500">
                A peça <strong>{activeCompleteOrder.partName}</strong> chegou! Como será a entrega para o cliente?
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2.5 pt-2">
              <button
                onClick={() => handleCompleteOrder('retirar')}
                className="w-full py-2.5 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-zinc-800 rounded-xl text-xs font-bold transition-all flex flex-col items-center"
              >
                <span>Cliente virá buscar</span>
                <span className="text-[9px] text-zinc-400 font-medium font-mono mt-0.5">Mensagem: "já pode vir retirar..."</span>
              </button>

              <button
                onClick={() => handleCompleteOrder('entregar')}
                className="w-full py-2.5 bg-zinc-950 hover:bg-zinc-900 text-white rounded-xl text-xs font-bold transition-all flex flex-col items-center"
              >
                <span>Vamos entregar até ele</span>
                <span className="text-[9px] text-zinc-300/80 font-medium font-mono mt-0.5">Mensagem: "iremos entregar assim que confirmar..."</span>
              </button>
            </div>

            <button
              onClick={() => setShowCompleteModal(false)}
              className="w-full text-center text-xs text-zinc-400 font-bold hover:text-zinc-600 pt-2"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
