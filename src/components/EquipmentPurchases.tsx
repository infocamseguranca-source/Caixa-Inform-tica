import React, { useState, useRef, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Calendar, 
  User, 
  Phone, 
  Smartphone, 
  Laptop, 
  CreditCard, 
  Download, 
  Lock, 
  Camera, 
  CheckCircle, 
  X, 
  Printer, 
  ShieldCheck, 
  PenTool,
  Grid
} from 'lucide-react';
import { EquipmentPurchase, ShopConfig, Transaction, Customer } from '../types';
import { formatCurrency, formatDate, formatPhone } from '../utils';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import CustomerAutocomplete from './CustomerAutocomplete';

// Interactive 9-dot Pattern Drawing widget
const PatternLockWidget = ({ value, onChange }: { value: string; onChange: (val: string) => void }) => {
  const activeDots = value ? value.split('-').map(Number) : [];
  const [isDrawing, setIsDrawing] = useState(false);

  const handleDotInteraction = (dotIndex: number) => {
    if (activeDots.includes(dotIndex)) return;
    const newDots = [...activeDots, dotIndex];
    onChange(newDots.join('-'));
  };

  const handleStart = (dotIndex: number) => {
    setIsDrawing(true);
    onChange(dotIndex.toString());
  };

  const handleEnter = (dotIndex: number) => {
    if (!isDrawing) return;
    if (activeDots.includes(dotIndex)) return;
    const newDots = [...activeDots, dotIndex];
    onChange(newDots.join('-'));
  };

  const handleEnd = () => {
    setIsDrawing(false);
  };

  const clearPattern = () => {
    onChange('');
  };

  const getDotCoords = (idx: number) => {
    const row = Math.floor((idx - 1) / 3);
    const col = (idx - 1) % 3;
    return {
      x: 35 + col * 70,
      y: 35 + row * 70
    };
  };

  return (
    <div className="flex flex-col items-center space-y-2 p-3 bg-zinc-50 border border-zinc-200 rounded-xl max-w-xs mx-auto">
      <div 
        className="relative w-[210px] h-[210px] bg-white rounded-xl shadow-inner border border-zinc-150 overflow-hidden select-none"
        onMouseUp={handleEnd}
        onTouchEnd={handleEnd}
      >
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {activeDots.map((dotIdx, i) => {
            if (i === 0) return null;
            const prev = getDotCoords(activeDots[i - 1]);
            const curr = getDotCoords(dotIdx);
            return (
              <line
                key={i}
                x1={prev.x}
                y1={prev.y}
                x2={curr.x}
                y2={curr.y}
                stroke="#10b981"
                strokeWidth="4"
                strokeLinecap="round"
              />
            );
          })}
        </svg>

        <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 p-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((idx) => {
            const isActive = activeDots.includes(idx);
            const order = activeDots.indexOf(idx) + 1;
            return (
              <div
                key={idx}
                onMouseDown={() => handleStart(idx)}
                onMouseEnter={() => handleEnter(idx)}
                onTouchStart={(e) => {
                  e.preventDefault();
                  handleStart(idx);
                }}
                onTouchMove={(e) => {
                  const touch = e.touches[0];
                  const element = document.elementFromPoint(touch.clientX, touch.clientY);
                  if (element) {
                    const dataIdx = element.getAttribute('data-dot-index');
                    if (dataIdx) {
                      const dotIdx = parseInt(dataIdx);
                      if (!isNaN(dotIdx) && !activeDots.includes(dotIdx)) {
                        onChange([...activeDots, dotIdx].join('-'));
                      }
                    }
                  }
                }}
                onClick={() => handleDotInteraction(idx)}
                data-dot-index={idx}
                className="relative flex items-center justify-center cursor-pointer group rounded-full"
              >
                <div 
                  data-dot-index={idx}
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-150 ${
                    isActive 
                      ? 'bg-emerald-500 text-white shadow-md scale-110' 
                      : 'bg-zinc-200 group-hover:bg-zinc-300 scale-100'
                  }`}
                >
                  {isActive ? (
                    <span data-dot-index={idx} className="text-[10px] font-black">{order}</span>
                  ) : (
                    <span data-dot-index={idx} className="text-[8px] text-zinc-400 font-bold">{idx}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex gap-2 w-full justify-between items-center px-1">
        <span className="text-[10px] font-black text-zinc-500">
          Senha Desenho: <span className="font-mono text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-black">{value || 'Vazia'}</span>
        </span>
        <button
          type="button"
          onClick={clearPattern}
          className="text-[9px] font-black bg-zinc-200 hover:bg-zinc-300 px-2 py-1 rounded text-zinc-700 uppercase"
        >
          Limpar
        </button>
      </div>
    </div>
  );
};

interface EquipmentPurchasesProps {
  purchases: EquipmentPurchase[];
  onAddPurchase: (purchase: Omit<EquipmentPurchase, 'id' | 'date'>) => Promise<void>;
  onAddTransaction: (transaction: Omit<Transaction, 'id'>) => Promise<void>;
  config: ShopConfig;
  user: any | null;
  customers: Customer[];
}

export default function EquipmentPurchases({
  purchases,
  onAddPurchase,
  onAddTransaction,
  config,
  user,
  customers
}: EquipmentPurchasesProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('todas');
  const [filterPeriod, setFilterPeriod] = useState<'hoje' | '7dias' | 'mes' | 'todos'>('todos');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printPurchase, setPrintPurchase] = useState<EquipmentPurchase | null>(null);

  // Form Wizard Steps (1: Client Details, 2: Equipment Specs, 3: Security & Credentials, 4: Payment & Review)
  const [step, setStep] = useState(1);

  // Step 1 states
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerCpf, setCustomerCpf] = useState('');
  const [documentPhoto, setDocumentPhoto] = useState<string>('');

  // Step 2 states
  const [purchaseCategory, setPurchaseCategory] = useState('');
  const [equipmentType, setEquipmentType] = useState('');
  const [hasPassword, setHasPassword] = useState(false);
  const [passwordType, setPasswordType] = useState<'padrao' | 'pin' | 'escrita' | 'nenhuma'>('nenhuma');
  const [passwordValue, setPasswordValue] = useState('');
  const [additionalPasswords, setAdditionalPasswords] = useState<{ type: 'padrao' | 'pin' | 'escrita' | 'nenhuma'; value: string }[]>([]);

  // Step 3 states (celular / tablet specifics)
  const [googleAccount, setGoogleAccount] = useState('');
  const [googlePassword, setGooglePassword] = useState('');
  const [imei, setImei] = useState('');
  const [imeiChecked, setImeiChecked] = useState(false);

  // Step 4 states
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'dinheiro' | 'pix' | 'debito' | 'credito'>('pix');
  const [signatureData, setSignatureData] = useState<string>('');

  // Drawing Canvas ref
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Initialize form options based on ShopConfig
  const categoryOptions = config?.purchaseCategories || ['Informatica', 'Celulares'];
  const equipmentTypeOptions = config?.purchaseEquipmentTypes || [
    'Computador', 
    'Notebook', 
    'Celular', 
    'Tablet', 
    'Monitor', 
    'Impressora', 
    'Outros'
  ];
  const isSignatureEnabled = config?.enablePurchaseSignature !== false;

  useEffect(() => {
    if (categoryOptions.length > 0 && !purchaseCategory) {
      setPurchaseCategory(categoryOptions[0]);
    }
    if (equipmentTypeOptions.length > 0 && !equipmentType) {
      setEquipmentType(equipmentTypeOptions[0]);
    }
  }, [categoryOptions, equipmentTypeOptions, purchaseCategory, equipmentType]);

  // Handle signature canvas drawing
  useEffect(() => {
    if (isModalOpen && step === 4 && canvasRef.current && isSignatureEnabled) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#09090b';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, [isModalOpen, step, isSignatureEnabled]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    setIsDrawing(true);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();

    // Prevent scrolling on touch screens
    if ('touches' in e) {
      e.preventDefault();
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    if (canvasRef.current) {
      setSignatureData(canvasRef.current.toDataURL('image/png'));
    }
  };

  const clearSignature = () => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      setSignatureData('');
    }
  };

  const handleDocumentPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setDocumentPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const openNewPurchaseModal = () => {
    setStep(1);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerCpf('');
    setDocumentPhoto('');
    setPurchaseCategory(categoryOptions[0] || 'Informatica');
    setEquipmentType(equipmentTypeOptions[0] || 'Celular');
    setHasPassword(false);
    setPasswordType('nenhuma');
    setPasswordValue('');
    setAdditionalPasswords([]);
    setGoogleAccount('');
    setGooglePassword('');
    setImei('');
    setImeiChecked(false);
    setAmountPaid('');
    setPaymentMethod('pix');
    setSignatureData('');
    setIsModalOpen(true);
  };

  const addAdditionalPassword = () => {
    if (additionalPasswords.length >= 3) {
      alert('Você só pode adicionar no máximo 3 senhas adicionais.');
      return;
    }
    setAdditionalPasswords([...additionalPasswords, { type: 'pin', value: '' }]);
  };

  const updateAdditionalPassword = (idx: number, fields: Partial<{ type: 'padrao' | 'pin' | 'escrita' | 'nenhuma'; value: string }>) => {
    const updated = additionalPasswords.map((pwd, i) => {
      if (i === idx) {
        return { ...pwd, ...fields };
      }
      return pwd;
    });
    setAdditionalPasswords(updated);
  };

  const removeAdditionalPassword = (idx: number) => {
    setAdditionalPasswords(additionalPasswords.filter((_, i) => i !== idx));
  };

  const downloadPurchaseContractPDF = (purchase: EquipmentPurchase) => {
    try {
      const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
      });

      // Shop Header
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(16);
      doc.text(config.name || 'INFO_CAM TECNOLOGIA', 14, 20);

      doc.setFontSize(8);
      doc.setFont('Helvetica', 'normal');
      doc.text(`Contato: ${config.phone || ''} | CNPJ/CPF: ${config.cnpjCpf || ''}`, 14, 26);
      doc.text(`Data da Compra: ${new Date(purchase.date).toLocaleString('pt-BR')}`, 14, 31);

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(`CONTRATO E RECIBO DE COMPRA DE EQUIPAMENTO`, 14, 40);
      doc.setFontSize(10);
      doc.text(`Nº COMPRA: ${purchase.id.substring(0, 8).toUpperCase()}`, 130, 40);

      doc.setDrawColor(220, 220, 224);
      doc.line(14, 44, 196, 44);

      // Client Section
      doc.setFont('Helvetica', 'bold');
      doc.text('1. DADOS DO CLIENTE / VENDEDOR', 14, 52);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`Nome: ${purchase.customerName}`, 14, 58);
      doc.text(`CPF: ${purchase.customerCpf}`, 14, 63);
      doc.text(`Telefone: ${purchase.customerPhone}`, 14, 68);

      doc.line(14, 74, 196, 74);

      // Equipment Section
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('2. ESPECIFICACOES DO EQUIPAMENTO', 14, 82);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`Categoria: ${purchase.purchaseCategory}`, 14, 88);
      doc.text(`Equipamento: ${purchase.equipmentType}`, 14, 93);
      if (purchase.imei) {
        doc.text(`IMEI do Aparelho: ${purchase.imei}`, 14, 98);
        doc.text(`Checado em ConsultaAparelhoImpedido: ${purchase.imeiChecked ? 'SIM / REGULAR' : 'NÃO CHECADO'}`, 14, 103);
      } else {
        doc.text(`Número de Série / Identificação: N/A`, 14, 98);
      }

      // Passwords Section
      let nextY = 112;
      if (purchase.hasPassword || (purchase.additionalPasswords && purchase.additionalPasswords.length > 0)) {
        doc.setFont('Helvetica', 'bold');
        doc.text('3. SENHAS E CONTAS REGISTRADAS', 14, nextY);
        doc.setFont('Helvetica', 'normal');
        nextY += 6;
        if (purchase.hasPassword && purchase.passwordValue) {
          doc.text(`Senha Principal (${purchase.passwordType?.toUpperCase()}): ${purchase.passwordValue}`, 14, nextY);
          nextY += 5;
        }
        if (purchase.additionalPasswords && purchase.additionalPasswords.length > 0) {
          purchase.additionalPasswords.forEach((pwd, idx) => {
            doc.text(`Senha Adicional ${idx + 2} (${pwd.type.toUpperCase()}): ${pwd.value}`, 14, nextY);
            nextY += 5;
          });
        }
        if (purchase.googleAccount) {
          doc.text(`Conta de Segurança (Google/iCloud): ${purchase.googleAccount}`, 14, nextY);
          nextY += 5;
          doc.text(`Senha da Conta: ${purchase.googlePassword || 'Não informada'}`, 14, nextY);
          nextY += 5;
        }
        doc.line(14, nextY + 2, 196, nextY + 2);
        nextY += 10;
      }

      // Legal disclaimer terms
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('4. DECLARACAO DE PROPRIEDADE E RESPONSABILIDADE', 14, nextY);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);
      nextY += 6;
      doc.text('O Vendedor declara, sob as penas da lei, ser o legítimo proprietário e possuidor do equipamento acima descrito, livre', 14, nextY);
      nextY += 4;
      doc.text('e desembaraçado de quaisquer ônus, dúvidas, litígios ou pendências financeiras e judiciais, responsabilizando-se civil', 14, nextY);
      nextY += 4;
      doc.text('e criminalmente pela autenticidade destas declarações e idoneidade de procedência do aparelho.', 14, nextY);
      nextY += 6;

      doc.line(14, nextY, 196, nextY);
      nextY += 8;

      // Values
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(`VALOR PAGO: ${formatCurrency(purchase.amountPaid)} via ${purchase.paymentMethod.toUpperCase()}`, 14, nextY);
      nextY += 15;

      // Signatures
      doc.setDrawColor(180, 180, 180);
      doc.line(20, nextY + 15, 90, nextY + 15);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);
      doc.text('Assinatura do Vendedor / Cliente', 25, nextY + 19);

      if (purchase.signature) {
        try {
          doc.addImage(purchase.signature, 'PNG', 30, nextY - 5, 40, 18);
        } catch (sigErr) {
          console.error('Erro ao adicionar assinatura ao PDF:', sigErr);
        }
      }

      doc.line(110, nextY + 15, 180, nextY + 15);
      doc.text('Pela Empresa (Compradora)', 120, nextY + 19);

      doc.save(`Contrato_Compra_${purchase.customerName.replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      console.error('Erro ao gerar PDF da compra:', err);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amountStrClean(amountPaid));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('Por favor, digite um valor pago válido.');
      return;
    }

    try {
      const purchaseData = {
        customerName,
        customerPhone,
        customerCpf,
        documentPhoto: documentPhoto || undefined,
        purchaseCategory,
        equipmentType,
        hasPassword,
        passwordType: hasPassword ? passwordType : 'nenhuma',
        passwordValue: hasPassword ? passwordValue : undefined,
        googleAccount: isCelularOrTablet ? googleAccount : undefined,
        googlePassword: isCelularOrTablet ? googlePassword : undefined,
        imei: isCelularOrTablet ? imei : undefined,
        imeiChecked: isCelularOrTablet ? imeiChecked : undefined,
        amountPaid: parsedAmount,
        paymentMethod,
        signature: isSignatureEnabled ? signatureData : undefined,
        additionalPasswords: hasPassword ? additionalPasswords : []
      };

      // 1. Save Equipment Purchase Record
      await onAddPurchase(purchaseData);

      // 2. Add Transaction Outflow ("saída") inside Caixa
      await onAddTransaction({
        description: `Compra Equipamento: ${equipmentType} de ${customerName}`,
        amount: parsedAmount,
        type: 'saida',
        category: 'Compra de Peças', // Fits outflow categories
        paymentMethod,
        date: new Date().toISOString()
      });

      // 3. Download PDF locally
      const generatedPurchaseObj: EquipmentPurchase = {
        id: `purchase-${Date.now()}`,
        date: new Date().toISOString(),
        ...purchaseData
      };
      
      downloadPurchaseContractPDF(generatedPurchaseObj);

      setIsModalOpen(false);
      alert('Compra de equipamento registrada com sucesso!');
    } catch (err) {
      console.error(err);
      alert('Erro ao registrar a compra.');
    }
  };

  const amountStrClean = (str: string) => {
    return str.replace(',', '.');
  };

  const isCelularOrTablet = 
    equipmentType.toLowerCase().includes('celular') || 
    equipmentType.toLowerCase().includes('tablet') ||
    equipmentType.toLowerCase().includes('phone') ||
    purchaseCategory.toLowerCase().includes('celular');

  const isPasswordRequiredType = 
    isCelularOrTablet || 
    equipmentType.toLowerCase().includes('notebook') || 
    equipmentType.toLowerCase().includes('computador');

  // Filter & sort list
  const filteredPurchases = purchases.filter(p => {
    const matchesSearch = 
      p.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.equipmentType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.imei && p.imei.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory = filterCategory === 'todas' || p.purchaseCategory === filterCategory;

    // Period check
    let matchesPeriod = true;
    const itemDate = new Date(p.date).getTime();
    const now = new Date().getTime();
    if (filterPeriod === 'hoje') {
      const todayStart = new Date().setHours(0,0,0,0);
      matchesPeriod = itemDate >= todayStart;
    } else if (filterPeriod === '7dias') {
      matchesPeriod = now - itemDate <= 7 * 24 * 60 * 60 * 1000;
    } else if (filterPeriod === 'mes') {
      matchesPeriod = now - itemDate <= 30 * 24 * 60 * 60 * 1000;
    }

    return matchesSearch && matchesCategory && matchesPeriod;
  }).sort((a, b) => {
    const timeA = new Date(a.date).getTime();
    const timeB = new Date(b.date).getTime();
    return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
  });

  const openPrintReceipt = (p: EquipmentPurchase) => {
    setPrintPurchase(p);
    setIsPrintModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-950 font-sans">Compra de Equipamentos Usados</h2>
          <p className="text-xs text-zinc-400">Gerenciamento de aquisições de celulares, informática, laptops e documentações de segurança</p>
        </div>
        <button
          onClick={openNewPurchaseModal}
          className="w-full md:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
        >
          <Plus size={16} />
          Registrar Compra de Equipamento
        </button>
      </div>

      {/* Filters bar */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="bg-white p-4 rounded-2xl border border-zinc-150 flex items-center relative flex-1">
          <Search className="absolute left-7 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
          <input
            type="text"
            placeholder="Buscar por cliente, equipamento, IMEI..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-zinc-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-zinc-900 bg-zinc-50/50 font-medium"
          />
        </div>

        <div className="flex gap-2 shrink-0 flex-wrap">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 border border-zinc-200 rounded-xl text-xs font-bold bg-white text-zinc-700 focus:outline-none"
          >
            <option value="todas">Todas Categorias</option>
            {categoryOptions.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <select
            value={filterPeriod}
            onChange={(e) => setFilterPeriod(e.target.value as any)}
            className="px-3 py-2 border border-zinc-200 rounded-xl text-xs font-bold bg-white text-zinc-700 focus:outline-none"
          >
            <option value="todos">Todos os Períodos</option>
            <option value="hoje">Hoje</option>
            <option value="7dias">Últimos 7 dias</option>
            <option value="mes">Últimos 30 dias</option>
          </select>

          <button
            onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
            className="px-3 py-2 bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            Organização: {sortOrder === 'desc' ? 'Decrescente ⬇️' : 'Crescente ⬆️'}
          </button>
        </div>
      </div>

      {/* Main List */}
      <div className="bg-white border border-zinc-150 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-100 text-xs font-bold text-zinc-400 uppercase tracking-wider">
                <th className="py-4 px-6">Data</th>
                <th className="py-4 px-4">Cliente / Contato</th>
                <th className="py-4 px-4">Equipamento</th>
                <th className="py-4 px-4">Senha / IMEI</th>
                <th className="py-4 px-4">Valor Pago</th>
                <th className="py-4 px-4">Faturamento</th>
                <th className="py-4 px-6 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-sm text-zinc-400">
                    Nenhuma compra de equipamento localizada com os filtros ativos.
                  </td>
                </tr>
              ) : (
                filteredPurchases.map((purchase) => (
                  <tr key={purchase.id} className="hover:bg-zinc-50/40 transition-colors">
                    <td className="py-4 px-6 font-semibold text-zinc-950 text-xs">
                      {formatDate(purchase.date)}
                    </td>
                    <td className="py-4 px-4">
                      <p className="text-sm font-semibold text-zinc-900">{purchase.customerName}</p>
                      <p className="text-xs text-zinc-400 flex items-center gap-1 mt-0.5">
                        <Phone size={12} /> {formatPhone(purchase.customerPhone)}
                      </p>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 bg-zinc-100 text-zinc-700 text-[9px] font-black rounded-full uppercase">
                          {purchase.purchaseCategory}
                        </span>
                        <p className="text-sm font-bold text-zinc-800">{purchase.equipmentType}</p>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-xs">
                      {purchase.hasPassword && purchase.passwordValue ? (
                        <p className="text-zinc-700 font-bold flex items-center gap-1">
                          <Lock size={12} className="text-zinc-400" /> {purchase.passwordValue}
                        </p>
                      ) : (
                        <p className="text-zinc-400">Sem senha</p>
                      )}
                      {purchase.imei && (
                        <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                          IMEI: {purchase.imei} {purchase.imeiChecked && '✔️'}
                        </p>
                      )}
                    </td>
                    <td className="py-4 px-4 text-sm font-black text-zinc-950">
                      {formatCurrency(purchase.amountPaid)}
                    </td>
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full uppercase">
                        Pago via {purchase.paymentMethod.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <button
                        onClick={() => openPrintReceipt(purchase)}
                        className="p-2 hover:bg-zinc-100 text-zinc-700 rounded-lg transition-colors cursor-pointer flex items-center gap-1 mx-auto text-xs font-bold border border-zinc-200"
                        title="Imprimir / Baixar Recibo de Compra"
                      >
                        <Printer size={14} /> Recibo / Contrato
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* REGISTRATION FORM MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-2xl rounded-2xl border border-zinc-100 shadow-xl overflow-hidden"
            >
              {/* Header */}
              <div className="flex justify-between items-center bg-zinc-50 p-5 border-b border-zinc-100">
                <div>
                  <h3 className="text-sm font-bold text-zinc-950 font-sans">
                    Registrar Compra de Equipamento (Passo {step} de 4)
                  </h3>
                  <div className="flex gap-1 mt-1.5">
                    {[1, 2, 3, 4].map((s) => (
                      <div 
                        key={s} 
                        className={`h-1 w-8 rounded-full transition-all ${step >= s ? 'bg-zinc-900' : 'bg-zinc-200'}`}
                      />
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 hover:bg-zinc-200 text-zinc-400 hover:text-zinc-600 rounded-lg transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Steps forms */}
              <div className="p-6 max-h-[70vh] overflow-y-auto">
                {step === 1 && (
                  <div className="space-y-4 text-left">
                    <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider border-b border-zinc-100 pb-2">
                      Dados do Vendedor / Cliente
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-zinc-500 mb-1">Nome Completo</label>
                        <CustomerAutocomplete
                          required
                          value={customerName}
                          onChange={setCustomerName}
                          onSelect={(client) => {
                            setCustomerName(client.name);
                            if (client.phone) setCustomerPhone(client.phone);
                            if (client.cpf) setCustomerCpf(client.cpf);
                          }}
                          user={user}
                          customers={customers}
                          placeholder="Ex: Carlos Oliveira"
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-zinc-500 mb-1">Telefone / WhatsApp</label>
                          <input
                            type="tel"
                            required
                            value={customerPhone}
                            onChange={(e) => setCustomerPhone(e.target.value)}
                            className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-zinc-900"
                            placeholder="Ex: (11) 98888-7777"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-zinc-500 mb-1">CPF do Cliente</label>
                          <input
                            type="text"
                            required
                            value={customerCpf}
                            onChange={(e) => setCustomerCpf(e.target.value)}
                            className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-zinc-900"
                            placeholder="Ex: 000.000.000-00"
                          />
                        </div>
                      </div>

                      <div className="pt-2">
                        <label className="block text-xs font-bold text-zinc-500 mb-1.5 flex items-center gap-1.5">
                          <Camera size={14} className="text-zinc-400" />
                          Foto do Documento (RG / CNH) para Resguardo - Opcional
                        </label>
                        <div className="flex items-center gap-4">
                          <label className="px-4 py-2 border border-dashed border-zinc-300 rounded-xl hover:bg-zinc-50 text-xs font-bold text-zinc-700 cursor-pointer flex items-center gap-1">
                            Escolher Arquivo / Câmera
                            <input
                              type="file"
                              accept="image/*"
                              capture="environment"
                              onChange={handleDocumentPhotoChange}
                              className="hidden"
                            />
                          </label>
                          {documentPhoto && (
                            <div className="relative w-16 h-12 border rounded-lg overflow-hidden">
                              <img src={documentPhoto} alt="Documento" className="w-full h-full object-cover" />
                              <button
                                type="button"
                                onClick={() => setDocumentPhoto('')}
                                className="absolute top-0 right-0 p-0.5 bg-rose-600 text-white rounded-bl"
                              >
                                <X size={10} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 flex justify-end">
                      <button
                        onClick={() => {
                          if (!customerName || !customerPhone || !customerCpf) {
                            alert('Por favor preencha Nome, Telefone e CPF para prosseguir.');
                            return;
                          }
                          setStep(2);
                        }}
                        className="py-2 px-5 bg-zinc-950 text-white rounded-xl text-xs font-bold hover:bg-zinc-800"
                      >
                        Próximo: Dados do Equipamento
                      </button>
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-4 text-left">
                    <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider border-b border-zinc-100 pb-2">
                      Especificação do Equipamento
                    </h4>
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-zinc-500 mb-1">Área / Categoria</label>
                          <select
                            value={purchaseCategory}
                            onChange={(e) => setPurchaseCategory(e.target.value)}
                            className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-xs font-semibold bg-white"
                          >
                            {categoryOptions.map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-zinc-500 mb-1">Qual equipamento?</label>
                          <select
                            value={equipmentType}
                            onChange={(e) => setEquipmentType(e.target.value)}
                            className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-xs font-semibold bg-white"
                          >
                            {equipmentTypeOptions.map(type => (
                              <option key={type} value={type}>{type}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {isPasswordRequiredType && (
                        <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl space-y-3">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id="hasPassword"
                              checked={hasPassword}
                              onChange={(e) => setHasPassword(e.target.checked)}
                              className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                            />
                            <label htmlFor="hasPassword" className="text-xs font-bold text-zinc-700 select-none cursor-pointer">
                              Este aparelho possui senha de desbloqueio de tela / sistema?
                            </label>
                          </div>

                          {hasPassword && (
                            <div className="space-y-4 pt-1">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 border-b border-zinc-100 pb-3">
                                <div>
                                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                                    Tipo de Senha Principal
                                  </label>
                                  <select
                                    value={passwordType}
                                    onChange={(e) => {
                                      setPasswordType(e.target.value as any);
                                      setPasswordValue('');
                                    }}
                                    className="w-full px-2.5 py-1.5 border border-zinc-200 rounded-lg text-xs bg-white font-medium"
                                  >
                                    <option value="padrao">Padrão Desenho (Ex: L-Shape)</option>
                                    <option value="pin">PIN numérico</option>
                                    <option value="escrita">Senha de escrita / Alfanumérica</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                                    Senha Principal
                                  </label>
                                  <input
                                    type="text"
                                    value={passwordValue}
                                    readOnly={passwordType === 'padrao'}
                                    onChange={(e) => setPasswordValue(e.target.value)}
                                    className="w-full px-2.5 py-1.5 border border-zinc-200 rounded-lg text-xs bg-white"
                                    placeholder={passwordType === 'padrao' ? "Desenhe o padrão abaixo" : "Ex: 1234 ou senha"}
                                  />
                                </div>
                              </div>

                              {/* Primary Pattern Lock widget if selected */}
                              {passwordType === 'padrao' && (
                                <div className="p-2 bg-white border border-zinc-150 rounded-xl">
                                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider text-center mb-2">
                                    Desenhe o Padrão de Tela Principal
                                  </label>
                                  <PatternLockWidget value={passwordValue} onChange={setPasswordValue} />
                                </div>
                              )}

                              {/* Additional passwords section */}
                              {additionalPasswords.length > 0 && (
                                <div className="space-y-3 pt-2">
                                  <h5 className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">
                                    Senhas Adicionais ({additionalPasswords.length})
                                  </h5>
                                  {additionalPasswords.map((pwd, idx) => (
                                    <div key={idx} className="p-3 bg-white border border-zinc-200 rounded-xl space-y-3 relative">
                                      <button
                                        type="button"
                                        onClick={() => removeAdditionalPassword(idx)}
                                        className="absolute top-2 right-2 text-rose-500 hover:text-rose-700 font-bold text-xs"
                                      >
                                        Remover
                                      </button>
                                      <p className="text-[10px] font-bold text-zinc-700">Senha Adicional {idx + 2}</p>
                                      
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div>
                                          <label className="block text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                                            Tipo
                                          </label>
                                          <select
                                            value={pwd.type}
                                            onChange={(e) => {
                                              updateAdditionalPassword(idx, { type: e.target.value as any, value: '' });
                                            }}
                                            className="w-full px-2 py-1 border border-zinc-200 rounded-md text-xs bg-white"
                                          >
                                            <option value="padrao">Padrão Desenho</option>
                                            <option value="pin">PIN numérico</option>
                                            <option value="escrita">Senha Escrita</option>
                                          </select>
                                        </div>
                                        <div>
                                          <label className="block text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                                            Senha
                                          </label>
                                          <input
                                            type="text"
                                            value={pwd.value}
                                            readOnly={pwd.type === 'padrao'}
                                            onChange={(e) => updateAdditionalPassword(idx, { value: e.target.value })}
                                            className="w-full px-2 py-1 border border-zinc-200 rounded-md text-xs"
                                            placeholder={pwd.type === 'padrao' ? "Desenhe o padrão abaixo" : "Ex: 1234"}
                                          />
                                        </div>
                                      </div>

                                      {pwd.type === 'padrao' && (
                                        <div className="p-1">
                                          <PatternLockWidget 
                                            value={pwd.value} 
                                            onChange={(val) => updateAdditionalPassword(idx, { value: val })} 
                                          />
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}

                              {additionalPasswords.length < 3 && (
                                <div className="pt-1 flex justify-start">
                                  <button
                                    type="button"
                                    onClick={addAdditionalPassword}
                                    className="py-1 px-3 bg-zinc-200 hover:bg-zinc-300 rounded-lg text-[10px] font-bold text-zinc-700 uppercase"
                                  >
                                    + Adicionar Mais Senhas ({3 - additionalPasswords.length} restantes)
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="pt-4 flex justify-between">
                      <button
                        onClick={() => setStep(1)}
                        className="py-2 px-5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl text-xs font-bold"
                      >
                        Anterior
                      </button>
                      <button
                        onClick={() => {
                          if (isCelularOrTablet) {
                            setStep(3);
                          } else {
                            setStep(4);
                          }
                        }}
                        className="py-2 px-5 bg-zinc-950 text-white rounded-xl text-xs font-bold hover:bg-zinc-800"
                      >
                        {isCelularOrTablet ? 'Próximo: Segurança & IMEI' : 'Próximo: Valores'}
                      </button>
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-4 text-left">
                    <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider border-b border-zinc-100 pb-2">
                      Segurança Celular / Tablet (Dados Importantes)
                    </h4>
                    <div className="space-y-3">
                      <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-[11px] rounded-xl font-medium leading-normal flex gap-1.5">
                        <Lock size={16} className="shrink-0 mt-0.5 text-rose-600" />
                        Anotar conta Google / iCloud vinculada ao aparelho para garantir que seja restaurado e não bloqueado.
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-zinc-500 mb-1">E-mail Conta Google/iCloud</label>
                          <input
                            type="email"
                            value={googleAccount}
                            onChange={(e) => setGoogleAccount(e.target.value)}
                            className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-xs"
                            placeholder="Ex: conta@gmail.com"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-zinc-500 mb-1">Senha da Conta Vinculada</label>
                          <input
                            type="text"
                            value={googlePassword}
                            onChange={(e) => setGooglePassword(e.target.value)}
                            className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-xs"
                            placeholder="Ex: senha123"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 items-end">
                        <div>
                          <label className="block text-xs font-bold text-zinc-500 mb-1">Número IMEI do Aparelho</label>
                          <input
                            type="text"
                            value={imei}
                            onChange={(e) => setImei(e.target.value)}
                            className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-xs font-mono"
                            placeholder="Ex: 35848209..."
                          />
                        </div>
                        <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="imeiChecked"
                            checked={imeiChecked}
                            onChange={(e) => setImeiChecked(e.target.checked)}
                            className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                          />
                          <label htmlFor="imeiChecked" className="text-xs font-bold text-zinc-700 select-none cursor-pointer">
                            Consulta IMEI Checada no ConsultaAparelhoImpedido.com.br
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 flex justify-between">
                      <button
                        onClick={() => setStep(2)}
                        className="py-2 px-5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl text-xs font-bold"
                      >
                        Anterior
                      </button>
                      <button
                        onClick={() => setStep(4)}
                        className="py-2 px-5 bg-zinc-950 text-white rounded-xl text-xs font-bold hover:bg-zinc-800"
                      >
                        Próximo: Pagamento & Assinatura
                      </button>
                    </div>
                  </div>
                )}

                {step === 4 && (
                  <div className="space-y-4 text-left">
                    <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider border-b border-zinc-100 pb-2">
                      Faturamento & Assinatura do Cliente
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-zinc-500 mb-1">Valor Pago ao Cliente</label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">R$</span>
                          <input
                            type="text"
                            required
                            value={amountPaid}
                            onChange={(e) => setAmountPaid(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 border border-zinc-200 rounded-xl text-xs font-extrabold focus:outline-none focus:ring-1 focus:ring-zinc-900 bg-zinc-50/50"
                            placeholder="0,00"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-zinc-500 mb-1">Forma de Saída do Caixa</label>
                        <select
                          value={paymentMethod}
                          onChange={(e) => setPaymentMethod(e.target.value as any)}
                          className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-xs font-bold bg-white"
                        >
                          <option value="pix">PIX</option>
                          <option value="dinheiro">Dinheiro</option>
                          <option value="debito">Cartão de Débito</option>
                          <option value="credito">Cartão de Crédito</option>
                        </select>
                      </div>
                    </div>

                    {isSignatureEnabled && (
                      <div className="border border-zinc-200 rounded-2xl p-4 bg-zinc-50/50 space-y-2">
                        <label className="block text-xs font-bold text-zinc-700 flex items-center gap-1">
                          <PenTool size={14} className="text-zinc-400" />
                          Assinatura Digital do Cliente na Tela
                        </label>
                        <div className="relative border border-zinc-200 bg-white rounded-xl overflow-hidden">
                          <canvas
                            ref={canvasRef}
                            width={550}
                            height={150}
                            onMouseDown={startDrawing}
                            onMouseMove={draw}
                            onMouseUp={stopDrawing}
                            onMouseLeave={stopDrawing}
                            onTouchStart={startDrawing}
                            onTouchMove={draw}
                            onTouchEnd={stopDrawing}
                            className="w-full h-[150px] bg-white cursor-crosshair touch-none"
                          />
                          <button
                            type="button"
                            onClick={clearSignature}
                            className="absolute bottom-2 right-2 px-2.5 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 rounded-lg text-[10px] font-black uppercase transition-colors"
                          >
                            Limpar Tela
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="pt-4 flex justify-between">
                      <button
                        onClick={() => {
                          if (isCelularOrTablet) {
                            setStep(3);
                          } else {
                            setStep(2);
                          }
                        }}
                        className="py-2 px-5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl text-xs font-bold"
                      >
                        Anterior
                      </button>
                      <button
                        onClick={handleFormSubmit}
                        className="py-2.5 px-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer shadow-xs"
                      >
                        <CheckCircle size={14} /> Registrar Compra & Emitir Recibo
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PRINT RECEIPT MODAL (A4 COMPLETE DUAL COPY FOR CUSTOMER / STORE PROTECTION) */}
      <AnimatePresence>
        {isPrintModalOpen && printPurchase && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-3xl rounded-2xl border border-zinc-100 shadow-xl overflow-hidden"
            >
              <div className="flex justify-between items-center bg-zinc-50 p-5 border-b border-zinc-100">
                <h3 className="text-xs font-bold text-zinc-950 uppercase tracking-wider">
                  Contrato de Compra e Recibo de Equipamento (A4 Duas Vias)
                </h3>
                <button onClick={() => setIsPrintModalOpen(false)} className="p-1 hover:bg-zinc-200 text-zinc-400 hover:text-zinc-600 rounded-lg">
                  <X size={20} />
                </button>
              </div>

              {/* DUAL COPY COMPACT PRINT CONTAINER */}
              <div className="p-6 overflow-y-auto max-h-[60vh] text-left space-y-6" id="printable-ticket">
                {/* VIA 1: CLIENT VIA */}
                <div className="space-y-4 border-b-2 border-dashed border-zinc-300 pb-6 mb-2">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      {config.logo ? (
                        <img src={config.logo} alt="Logo" className="w-10 h-10 object-contain" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-10 h-10 bg-zinc-950 text-white rounded-lg flex items-center justify-center font-bold">CP</div>
                      )}
                      <div>
                        <h4 className="text-xs font-black uppercase tracking-wider">{config.name || 'INFO_CAM TECNOLOGIA'}</h4>
                        <p className="text-[8px] text-zinc-500">Contato: {config.phone} | CNPJ/CPF: {config.cnpjCpf}</p>
                        <p className="text-[8px] text-zinc-500">Email: {config.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] font-black bg-zinc-100 border border-zinc-300 text-zinc-800 px-2 py-0.5 rounded-full uppercase tracking-wider">Recibo de Venda (Cliente)</span>
                      <p className="text-xs font-black text-zinc-950 mt-1">Nº COMPRA: {printPurchase.id.substring(0, 8).toUpperCase()}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-[10px] text-zinc-700 bg-zinc-50 p-2 rounded-lg border border-zinc-150">
                    <div>
                      <span className="font-extrabold text-zinc-400 block text-[7px] uppercase">Vendedor / Proprietário</span>
                      <p className="font-bold text-zinc-900">{printPurchase.customerName}</p>
                      <p className="text-[9px]">CPF: {printPurchase.customerCpf}</p>
                      <p className="text-[9px]">{formatPhone(printPurchase.customerPhone)}</p>
                    </div>
                    <div>
                      <span className="font-extrabold text-zinc-400 block text-[7px] uppercase">Equipamento Adquirido</span>
                      <p className="font-bold text-zinc-900">{printPurchase.equipmentType}</p>
                      <p className="text-[9px] uppercase font-black">Área: {printPurchase.purchaseCategory}</p>
                      {printPurchase.imei && <p className="text-[8px] font-mono">IMEI: {printPurchase.imei}</p>}
                    </div>
                    <div>
                      <span className="font-extrabold text-zinc-400 block text-[7px] uppercase">Data Aquisição</span>
                      <p className="font-bold text-zinc-900">{formatDate(printPurchase.date)}</p>
                      <p className="text-[8px] mt-1 text-zinc-500 uppercase">Status: PAGO TOTAL</p>
                    </div>
                  </div>

                  {/* Protection Clauses */}
                  <div className="border border-zinc-150 rounded-lg p-2 bg-zinc-50/50 text-[6.5px] leading-tight text-zinc-500 font-medium space-y-1">
                    <p className="font-extrabold text-zinc-700 uppercase">Declaração de Origem e Responsabilidade do Vendedor</p>
                    <p>
                      1. O proprietário/vendedor acima qualificado declara sob as penas das leis vigentes que o equipamento vendido é de sua legítima propriedade e origem lícita, livre e desembaraçado de quaisquer ônus, litígios ou bloqueios de segurança.
                    </p>
                    <p>
                      2. O vendedor transfere à empresa compradora a propriedade plena do bem acima descrito pelo valor de R$ {printPurchase.amountPaid.toFixed(2)}, dando plena quitação sobre esta transação comercial.
                    </p>
                    <p>
                      3. Em caso de constatação posterior de procedência ilícita, clonagem ou queixa de furto/roubo, o vendedor responderá integralmente perante as autoridades competentes e reembolsará a empresa compradora o valor despendido, acrescido de perdas e danos.
                    </p>
                  </div>

                  {/* Values & Signatures */}
                  <div className="grid grid-cols-2 gap-4 items-center pt-2">
                    <div>
                      <p className="text-xs font-extrabold text-zinc-500 uppercase">VALOR PAGO</p>
                      <p className="text-base font-black text-zinc-950">{formatCurrency(printPurchase.amountPaid)} <span className="text-[10px] text-zinc-400">({printPurchase.paymentMethod.toUpperCase()})</span></p>
                    </div>
                    {printPurchase.signature ? (
                      <div className="text-right flex flex-col items-end">
                        <img src={printPurchase.signature} alt="Assinatura Cliente" className="h-9 object-contain border-b border-zinc-300 pb-1" />
                        <span className="text-[8px] font-bold text-zinc-400 uppercase">Assinatura do Vendedor / Cliente</span>
                      </div>
                    ) : (
                      <div className="border-t border-zinc-300 text-center pt-1 text-[8px] font-bold text-zinc-400 uppercase">
                        Assinatura do Vendedor / Cliente
                      </div>
                    )}
                  </div>
                </div>

                {/* VIA 2: STORE VIA */}
                <div className="space-y-4 pt-2">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      {config.logo ? (
                        <img src={config.logo} alt="Logo" className="w-10 h-10 object-contain" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-10 h-10 bg-zinc-950 text-white rounded-lg flex items-center justify-center font-bold">CP</div>
                      )}
                      <div>
                        <h4 className="text-xs font-black uppercase tracking-wider">{config.name || 'INFO_CAM TECNOLOGIA'}</h4>
                        <p className="text-[8px] text-zinc-500">Contato: {config.phone} | CNPJ/CPF: {config.cnpjCpf}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] font-black bg-zinc-100 border border-zinc-300 text-zinc-800 px-2 py-0.5 rounded-full uppercase tracking-wider">Via da Oficina (Arquivo)</span>
                      <p className="text-xs font-black text-zinc-950 mt-1">Nº COMPRA: {printPurchase.id.substring(0, 8).toUpperCase()}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-[10px] text-zinc-700 bg-zinc-50 p-2 rounded-lg border border-zinc-150">
                    <div>
                      <span className="font-extrabold text-zinc-400 block text-[7px] uppercase">Vendedor / Cliente</span>
                      <p className="font-bold text-zinc-900">{printPurchase.customerName}</p>
                      <p className="text-[9px]">CPF: {printPurchase.customerCpf}</p>
                    </div>
                    <div>
                      <span className="font-extrabold text-zinc-400 block text-[7px] uppercase">Equipamento / Detalhes</span>
                      <p className="font-bold text-zinc-900">{printPurchase.equipmentType}</p>
                      {printPurchase.hasPassword && <p className="text-[8px] font-mono font-bold bg-white px-1 py-0.5 border">Senha: {printPurchase.passwordValue}</p>}
                      {printPurchase.googleAccount && <p className="text-[7.5px] font-mono">Conta: {printPurchase.googleAccount}</p>}
                      {printPurchase.googlePassword && <p className="text-[7.5px] font-mono">Senha Conta: {printPurchase.googlePassword}</p>}
                    </div>
                    <div>
                      <span className="font-extrabold text-zinc-400 block text-[7px] uppercase">Internos</span>
                      <p className="font-bold text-zinc-900">IMEI: {printPurchase.imei || 'N/A'}</p>
                      <p className="text-[8px] text-zinc-500 font-bold uppercase mt-1">Consulta IMEI Impedido: {printPurchase.imeiChecked ? 'CHECADO / OK' : 'Pendente'}</p>
                    </div>
                  </div>

                  {/* Protection Clauses */}
                  <div className="border border-zinc-150 rounded-lg p-2 bg-zinc-50/50 text-[6.5px] leading-tight text-zinc-500 font-medium space-y-1">
                    <p className="font-extrabold text-zinc-700 uppercase">Responsabilidades do Vendedor & Transmissão de Propriedade</p>
                    <p>
                      Atestamos para os devidos fins de direito que o vendedor se responsabiliza inteiramente pela procedência, registro legal e idoneidade de IMEI/senha do aparelho descrito. O vendedor anuiu voluntariamente em transferir a posse plena à empresa InfoCam, garantindo de boa fé a idoneidade das informações anotadas.
                    </p>
                  </div>

                  {/* Values & Signatures */}
                  <div className="grid grid-cols-2 gap-4 items-center pt-2">
                    <div>
                      <p className="text-xs font-extrabold text-zinc-500 uppercase">VALOR PAGO</p>
                      <p className="text-base font-black text-zinc-950">{formatCurrency(printPurchase.amountPaid)} <span className="text-[10px] text-zinc-400">({printPurchase.paymentMethod.toUpperCase()})</span></p>
                    </div>
                    {printPurchase.signature ? (
                      <div className="text-right flex flex-col items-end">
                        <img src={printPurchase.signature} alt="Assinatura Cliente" className="h-9 object-contain border-b border-zinc-300 pb-1" />
                        <span className="text-[8px] font-bold text-zinc-400 uppercase">Assinatura do Vendedor / Cliente</span>
                      </div>
                    ) : (
                      <div className="border-t border-zinc-300 text-center pt-1 text-[8px] font-bold text-zinc-400 uppercase">
                        Assinatura do Vendedor / Cliente
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="p-4 bg-zinc-50 border-t border-zinc-100 flex gap-2">
                <button
                  onClick={() => setIsPrintModalOpen(false)}
                  className="flex-1 py-2 px-4 bg-zinc-200 hover:bg-zinc-300 text-zinc-700 text-xs font-bold rounded-lg cursor-pointer animate-none"
                >
                  Fechar
                </button>
                <button
                  onClick={() => {
                    window.print();
                  }}
                  className="flex-1 py-2 px-4 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Printer size={14} /> Imprimir Ambas Vias
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
