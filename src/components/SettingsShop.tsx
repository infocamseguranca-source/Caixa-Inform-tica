import React, { useState } from 'react';
import { 
  Store, 
  Palette, 
  Users, 
  Settings, 
  Plus, 
  Trash2, 
  Check, 
  Upload,
  Layers,
  ListOrdered,
  Sparkles,
  Percent,
  TrendingUp,
  FileSpreadsheet,
  Shield,
  Lock,
  Key,
  FileText,
  Printer,
  MessageCircle,
  ShoppingBag,
  Cpu
} from 'lucide-react';
import { ShopConfig, Staff, Transaction, ServiceOrder } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';

interface SettingsShopProps {
  config: ShopConfig;
  onSaveConfig: (config: ShopConfig) => Promise<void>;
  staffList: Staff[];
  onAddStaff: (staff: Omit<Staff, 'id'>) => Promise<void>;
  onEditStaff: (id: string, updatedFields: Partial<Staff>) => Promise<void>;
  onDeleteStaff: (id: string) => Promise<void>;
  transactions: Transaction[];
  serviceOrders: ServiceOrder[];
}

const DEFAULT_CATEGORIES = [
  'Serviço de Assistência',
  'Venda de Equipamento',
  'Venda de Peças',
  'Venda de Acessórios',
  'Luz / Internet / Telefone',
  'Aluguel',
  'Marketing / Anúncios',
  'Outras Entradas',
  'Outras Saídas'
];

const AVAILABLE_MENUS = [
  { id: 'dashboard', label: 'Painel Geral' },
  { id: 'caixa', label: 'Fluxo de Caixa' },
  { id: 'vendas', label: 'Vendas (PDV)' },
  { id: 'produtos', label: 'Estoque / Produtos' },
  { id: 'os', label: 'Ordens de Serviço' },
  { id: 'agendamentos', label: 'Agendamentos' },
  { id: 'backup', label: 'Drive & Backup' },
  { id: 'settings_shop', label: 'Configurações' }
];

export default function SettingsShop({
  config,
  onSaveConfig,
  staffList,
  onAddStaff,
  onEditStaff,
  onDeleteStaff,
  transactions,
  serviceOrders
}: SettingsShopProps) {
  const [activeSubTab, setActiveSubTab] = useState<'geral' | 'cores' | 'equipe' | 'categorias' | 'menus' | 'avancado' | 'impressoras' | 'whatsapp'>('geral');
  
  // Shop Config fields
  const [name, setName] = useState(config.name || '');
  const [cnpjCpf, setCnpjCpf] = useState(config.cnpjCpf || '');
  const [phone, setPhone] = useState(config.phone || '');
  const [email, setEmail] = useState(config.email || '');
  const [logo, setLogo] = useState(config.logo || '');
  const [primaryColor, setPrimaryColor] = useState(config.colors?.primary || '#18181b');
  const [accentColor, setAccentColor] = useState(config.colors?.accent || '#10b981');
  const [osStartNumber, setOsStartNumber] = useState<number>(config.osStartNumber || 1001);
  const [categories, setCategories] = useState<string[]>(config.categories || DEFAULT_CATEGORIES);
  const [menuOrder, setMenuOrder] = useState<string[]>(config.menuOrder || AVAILABLE_MENUS.map(m => m.id));
  const [autoSaveOSToDrive, setAutoSaveOSToDrive] = useState<boolean>(config.autoSaveOSToDrive || false);

  // Printer settings
  const [nonFiscalPrinterType, setNonFiscalPrinterType] = useState<'none' | 'bluetooth' | 'usb' | 'network'>(config.nonFiscalPrinterType || 'none');
  const [nonFiscalPrinterName, setNonFiscalPrinterName] = useState(config.nonFiscalPrinterName || '');
  const [commonPrinterType, setCommonPrinterType] = useState<'none' | 'system' | 'network'>(config.commonPrinterType || 'none');
  const [commonPrinterName, setCommonPrinterName] = useState(config.commonPrinterName || '');

  // App Options / Advanced Configs
  const [commissionPassword, setCommissionPassword] = useState(config.commissionPassword || '');
  const [finalizationOptions, setFinalizationOptions] = useState<string[]>(
    config.finalizationOptions || ['Pronto para Retirada', 'Retirado Sem Reparo', 'Devolvido ao Cliente']
  );
  const [purchaseCategories, setPurchaseCategories] = useState<string[]>(
    config.purchaseCategories || ['Informatica', 'Celulares']
  );
  const [purchaseEquipmentTypes, setPurchaseEquipmentTypes] = useState<string[]>(
    config.purchaseEquipmentTypes || ['Computador', 'Notebook', 'Celular', 'Tablet', 'Monitor', 'Impressora', 'Outros']
  );
  const [productTypes, setProductTypes] = useState<string[]>(
    config.productTypes || ['Capa', 'Película', 'Carregador', 'Cabo', 'Fone', 'Aparelho', 'Outros']
  );
  const [enablePurchaseSignature, setEnablePurchaseSignature] = useState<boolean>(
    config.enablePurchaseSignature ?? true
  );

  const [waMsgAguardando, setWaMsgAguardando] = useState(config.whatsappMessages?.aguardando || 'Olá, {nome}. A sua OS {os} está atualizada como *{status}*. Estamos aguardando a sua autorização para o serviço. Obrigado pela preferência!!!');
  const [waMsgAprovado, setWaMsgAprovado] = useState(config.whatsappMessages?.aprovado || 'Olá, {nome}. A sua OS {os} está atualizada como *{status}*. Seu orçamento foi aprovado. Obrigado pela preferência!!!');
  const [waMsgEmReparo, setWaMsgEmReparo] = useState(config.whatsappMessages?.em_reparo || 'Olá, {nome}. A sua OS {os} está atualizada como *{status}*. Seu equipamento está em manutenção. Obrigado pela preferência!!!');
  const [waMsgPronto, setWaMsgPronto] = useState(config.whatsappMessages?.pronto || 'Olá, {nome}. A sua OS {os} está atualizada como *{status}*. O seu aparelho já está pronto para a entrega. Obrigado pela preferência!!!');
  const [waMsgEntregue, setWaMsgEntregue] = useState(config.whatsappMessages?.entregue || 'Olá, {nome}. A sua OS {os} está atualizada como *{status}*. Esperamos que tenha tido uma ótima experiência. Obrigado pela preferência!!!');
  const [waMsgDefault, setWaMsgDefault] = useState(config.whatsappMessages?.default || 'Olá, {nome}. A sua OS {os} está atualizada como *{status}*. Obrigado pela preferência!!!');
  const [waMsgAppointment, setWaMsgAppointment] = useState(config.whatsappMessages?.appointment || 'Olá, {nome}. Aqui é da Assistência Técnica.\n\nEste é um lembrete do seu agendamento para o serviço de *{servico}*.\n\n📅 *Data/Hora:* {data}\n⚙️ *Técnico:* {tecnico}\n\nObrigado por escolher nossa assistência!');

  // Advanced sub inputs
  const [newFinOption, setNewFinOption] = useState('');
  const [newPurCategory, setNewPurCategory] = useState('');
  const [newPurEquipType, setNewPurEquipType] = useState('');
  const [newProductType, setNewProductType] = useState('');
  
  const [draggedMenuIdx, setDraggedMenuIdx] = useState<number | null>(null);
  const [draggedProductTypeIdx, setDraggedProductTypeIdx] = useState<number | null>(null);

  // Password Modal for commissions download
  const [isPassModalOpen, setIsPassModalOpen] = useState(false);
  const [promptPasswordInput, setPromptPasswordInput] = useState('');
  const [passPromptType, setPassPromptType] = useState<'consolidated' | 'individual' | 'eye' | 'masterUnlock'>('consolidated');
  const [passPromptStaff, setPassPromptStaff] = useState<Staff | null>(null);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'jpg' | 'csv'>('pdf');
  const [unblurredStaffIds, setUnblurredStaffIds] = useState<string[]>([]);
  const [isMasterUnlocked, setIsMasterUnlocked] = useState(false);

  // Staff fields
  const [staffName, setStaffName] = useState('');
  const [staffIsSeller, setStaffIsSeller] = useState(false);
  const [staffIsTechnician, setStaffIsTechnician] = useState(true);
  const [staffSalesCommission, setStaffSalesCommission] = useState('0');
  const [staffSalesMinLimit, setStaffSalesMinLimit] = useState('0');
  const [staffTechCommissionByType, setStaffTechCommissionByType] = useState<{type: string, rate: number}[]>([]);
  const [staffTargetAmount, setStaffTargetAmount] = useState('');
  const [staffTargetCommission, setStaffTargetCommission] = useState('');
  const [staffPassword, setStaffPassword] = useState('');

  // Editing staff states
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [editStaffName, setEditStaffName] = useState('');
  const [editStaffIsSeller, setEditStaffIsSeller] = useState(false);
  const [editStaffIsTechnician, setEditStaffIsTechnician] = useState(false);
  const [editStaffSalesCommission, setEditStaffSalesCommission] = useState('0');
  const [editStaffSalesMinLimit, setEditStaffSalesMinLimit] = useState('0');
  const [editStaffTechCommissionByType, setEditStaffTechCommissionByType] = useState<{type: string, rate: number}[]>([]);
  const [editStaffTargetAmount, setEditStaffTargetAmount] = useState('');
  const [editStaffTargetCommission, setEditStaffTargetCommission] = useState('');
  const [editStaffPassword, setEditStaffPassword] = useState('');

  // Category control
  const [newCategory, setNewCategory] = useState('');

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onSaveConfig({
        ...config,
        name,
        cnpjCpf,
        phone,
        email,
        logo,
        osStartNumber,
        autoSaveOSToDrive
      });
      alert('Configurações da loja salvas com sucesso!');
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar as configurações.');
    }
  };

  const handleSaveAdvanced = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      await onSaveConfig({
        ...config,
        commissionPassword,
        finalizationOptions,
        purchaseCategories,
        purchaseEquipmentTypes,
        productTypes,
        enablePurchaseSignature
      });
      alert('Configurações salvas com sucesso!');
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar configurações.');
    }
  };

  const handleSavePrinters = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      await onSaveConfig({
        ...config,
        nonFiscalPrinterType,
        nonFiscalPrinterName,
        commonPrinterType,
        commonPrinterName
      });
      alert('Configurações de impressora salvas com sucesso!');
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar as configurações de impressora.');
    }
  };

  const handleSaveWhatsApp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      await onSaveConfig({
        ...config,
        whatsappMessages: {
          aguardando: waMsgAguardando,
          aprovado: waMsgAprovado,
          em_reparo: waMsgEmReparo,
          pronto: waMsgPronto,
          entregue: waMsgEntregue,
          default: waMsgDefault,
          appointment: waMsgAppointment
        }
      });
      alert('Configurações do WhatsApp salvas com sucesso!');
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar configurações do WhatsApp.');
    }
  };

  const calculateStaffCommission = (st: Staff) => {
    // Determine actual roles based on legacy or new boolean fields
    const isSeller = st.isSeller !== undefined ? st.isSeller : (st.role === 'vendedor' || st.role === 'ambos');
    const isTechnician = st.isTechnician !== undefined ? st.isTechnician : (st.role === 'tecnico' || st.role === 'ambos');

    const activeSalesRate = isSeller ? (st.salesCommissionRate !== undefined ? st.salesCommissionRate : st.commission) : 0;
    const salesMinLimit = st.salesCommissionMinLimit || 0;
    
    // --- Vendas / Sales ---
    const sellerTxs = transactions.filter(t => t.sellerId === st.id && t.type === 'entrada');
    let totalSales = 0;
    let commissionSales = 0;
    const items: any[] = [];
    
    sellerTxs.forEach(t => {
      totalSales += t.amount;
      if (t.amount >= salesMinLimit) {
        const comm = t.amount * (activeSalesRate / 100);
        commissionSales += comm;
        items.push({
          date: new Date(t.date).toLocaleDateString('pt-BR'),
          type: 'Venda (PDV)',
          document: t.description,
          desc: t.category,
          value: t.amount,
          rate: activeSalesRate,
          comm
        });
      }
    });

    // --- Serviços / OS (Tech) ---
    const techOSs = serviceOrders.filter(os => os.technicianId === st.id && os.status === 'entregue');
    let totalOS = 0;
    let commissionOS = 0;

    techOSs.forEach(os => {
      const labor = os.priceLabor || 0;
      const parts = os.priceParts || 0;
      totalOS += (labor + parts);
      
      let laborRate = st.commission;
      if (st.targetAmount && totalOS + totalSales >= st.targetAmount) {
        laborRate = st.targetCommission !== undefined ? st.targetCommission : st.commission;
      }
      
      if (labor > 0) {
        const comm = labor * (laborRate / 100);
        commissionOS += comm;
        items.push({
          date: new Date(os.createdAt).toLocaleDateString('pt-BR'),
          type: 'Ordem de Serviço (Mão de Obra)',
          document: os.osNumber,
          desc: `${os.deviceName} - ${os.reportedDefect}`,
          value: labor,
          rate: laborRate,
          comm
        });
      }
    });

    // Tech commission on specific products (from transactions)
    let commissionTechProducts = 0;
    const techTxs = transactions.filter(t => t.technicianId === st.id && t.type === 'entrada');
    
    techTxs.forEach(t => {
      if (t.items && st.techCommissionByType && st.techCommissionByType.length > 0) {
        t.items.forEach(item => {
          const itemType = item.product?.type || 'Outro';
          const rule = st.techCommissionByType!.find(r => r.type === itemType);
          if (rule && rule.rate > 0) {
            const itemTotal = (item.unitPrice || item.product.price) * item.qty;
            const comm = itemTotal * (rule.rate / 100);
            commissionTechProducts += comm;
            items.push({
              date: new Date(t.date).toLocaleDateString('pt-BR'),
              type: `Produto Téc. (${itemType})`,
              document: t.description,
              desc: item.product.name,
              value: itemTotal,
              rate: rule.rate,
              comm
            });
          }
        });
      }
    });

    // Add tech product commission to total tech commission
    commissionOS += commissionTechProducts;
    
    const totalSalesOrServices = totalSales + totalOS;
    let isTargetMet = false;

    const targetAmt = st.targetAmount || 0;
    if (targetAmt > 0 && totalSalesOrServices >= targetAmt) {
      isTargetMet = true;
    }
    
    const totalCommission = commissionSales + commissionOS;

    return {
      totalSalesOrServices,
      totalSales,
      totalOS,
      commissionSales,
      commissionOS,
      totalCommission,
      isTargetMet,
      activeRate: isSeller ? activeSalesRate : st.commission,
      items
    };
  };

  const handleExportCommissions = () => {
    if (!config.commissionPassword) {
      alert('Atenção: Cadastre a Senha Master para download de comissões na aba "Equipe & Comissões" ou "Opções do App" antes de continuar.');
      return;
    }
    setPassPromptType('consolidated');
    setPassPromptStaff(null);
    setExportFormat('pdf');
    setIsPassModalOpen(true);
    setPromptPasswordInput('');
  };

  const handleExportIndividualCommission = (st: Staff) => {
    if (!st.password && !config.commissionPassword) {
      alert('Atenção: Cadastre uma senha para este colaborador ou configure a Senha Master antes de prosseguir.');
      return;
    }
    setPassPromptType('individual');
    setPassPromptStaff(st);
    setExportFormat('pdf');
    setIsPassModalOpen(true);
    setPromptPasswordInput('');
  };

  const handleEyeClick = (st: Staff) => {
    if (unblurredStaffIds.includes(st.id)) {
      setUnblurredStaffIds(prev => prev.filter(id => id !== st.id));
      return;
    }
    
    if (!st.password && !config.commissionPassword) {
      // If no passwords exist at all, just show it
      setUnblurredStaffIds(prev => [...prev, st.id]);
      return;
    }

    setPassPromptType('eye');
    setPassPromptStaff(st);
    setIsPassModalOpen(true);
    setPromptPasswordInput('');
  };

  const verifyPasswordAndDownload = () => {
    // 1. Password Verification
    if (passPromptType === 'masterUnlock') {
      if (promptPasswordInput !== config.commissionPassword) {
        alert('Senha master incorreta! Acesso negado.');
        return;
      }
      setIsMasterUnlocked(true);
      setIsPassModalOpen(false);
      return;
    } else if (passPromptType === 'consolidated') {
      if (promptPasswordInput !== config.commissionPassword) {
        alert('Senha incorreta! Acesso negado.');
        return;
      }
    } else {
      const st = passPromptStaff;
      if (!st) return;
      const isMasterPass = promptPasswordInput === config.commissionPassword;
      const isStaffPass = st.password && promptPasswordInput === st.password;
      if (!isMasterPass && !isStaffPass) {
        alert('Senha incorreta! Acesso negado.');
        return;
      }
      if (passPromptType === 'eye') {
        setUnblurredStaffIds(prev => [...prev, st.id]);
        setIsPassModalOpen(false);
        return;
      }
    }

    setIsPassModalOpen(false);

    const primaryHex = config.colors?.primary || '#18181b';
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
    const rgb = hexToRgb(primaryHex);

    // Helper to format currency inside report exports
    const formatCurr = (val: number) => {
      return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    // Prepare consolidated rows data
    const consolidatedData = staffList.map(st => {
      const { totalSalesOrServices, totalCommission, commissionSales, commissionOS, isTargetMet, activeRate } = calculateStaffCommission(st);
      return {
        name: st.name,
        role: st.role === 'tecnico' ? 'Técnico' : 'Vendedor',
        totalSalesOrServices,
        targetAmount: st.targetAmount || 0,
        isTargetMet,
        commissionSales,
        commissionOS,
        totalCommission,
        activeRate
      };
    });

    // Prepare individual rows data
    const individualData: {
      staff: Staff;
      totalSalesOrServices: number;
      totalCommission: number;
      isTargetMet: boolean;
      activeRate: number;
      items: { date: string; type: string; document: string; desc: string; value: number; rate: number; comm: number }[];
    } | null = passPromptType === 'individual' && passPromptStaff ? (() => {
      const st = passPromptStaff;
      const { totalSalesOrServices, totalCommission, isTargetMet, activeRate, items } = calculateStaffCommission(st);

      return {
        staff: st,
        totalSalesOrServices,
        totalCommission,
        isTargetMet,
        activeRate,
        items: items || []
      };
    })() : null;

    // --- FORMAT: CSV ---
    if (exportFormat === 'csv') {
      let rows: string[][] = [];
      let filename = '';

      if (passPromptType === 'consolidated') {
        filename = `comissoes_consolidadas_${new Date().toISOString().split('T')[0]}.csv`;
        rows = [
          ['Colaborador', 'Cargo', 'Total Produzido (R$)', 'Meta (R$)', 'Meta Atingida', 'Comissão Vendas (R$)', 'Comissão OS (R$)', 'Comissão Total (R$)', 'Taxa Aplicada (%)']
        ];
        consolidatedData.forEach(d => {
          rows.push([
            d.name,
            d.role,
            d.totalSalesOrServices.toFixed(2),
            d.targetAmount ? d.targetAmount.toFixed(2) : 'Sem Meta',
            d.targetAmount ? (d.isTargetMet ? 'Sim' : 'Não') : 'N/A',
            d.commissionSales.toFixed(2),
            d.commissionOS.toFixed(2),
            d.totalCommission.toFixed(2),
            `${d.activeRate}%`
          ]);
        });
      } else if (individualData) {
        const st = individualData.staff;
        filename = `comissao_${st.name.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
        rows = [
          ['Relatório de Comissão Individual'],
          ['Colaborador', st.name],
          ['Cargo', st.role === 'tecnico' ? 'Técnico' : 'Vendedor'],
          ['Data de Emissão', new Date().toLocaleDateString('pt-BR')],
          [],
          ['Data', 'Tipo', 'Documento', 'Descrição', 'Valor Item (R$)', 'Taxa Comissão (%)', 'Comissão Devida (R$)']
        ];
        individualData.items.forEach(it => {
          rows.push([
            it.date,
            it.type,
            it.document,
            it.desc,
            it.value.toFixed(2),
            `${it.rate}%`,
            it.comm.toFixed(2)
          ]);
        });
        rows.push(
          [],
          ['RESUMO FINANCEIRO'],
          ['Total Produzido (R$)', individualData.totalSalesOrServices.toFixed(2)],
          ['Meta Estabelecida (R$)', st.targetAmount ? st.targetAmount.toFixed(2) : 'Sem Meta'],
          ['Meta Atingida', st.targetAmount ? (individualData.isTargetMet ? 'Sim' : 'Não') : 'N/A'],
          ['Taxa de Comissão Aplicada (%)', `${individualData.activeRate}%`],
          ['Total de Comissão a Receber (R$)', individualData.totalCommission.toFixed(2)]
        );
      }

      const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
        + rows.map(e => e.map(val => `"${val.toString().replace(/"/g, '""')}"`).join(",")).join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      alert('Relatório CSV baixado com sucesso!');
      return;
    }

    // --- FORMAT: PDF (Beautiful jsPDF template) ---
    if (exportFormat === 'pdf') {
      const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
      });

      // Outer border & top bar
      doc.setDrawColor(228, 228, 231);
      doc.rect(10, 10, 190, 277);
      doc.setFillColor(rgb.r, rgb.g, rgb.b);
      doc.rect(10, 10, 190, 5, 'F');

      // Shop Header
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(15);
      doc.setTextColor(30, 30, 30);
      doc.text(config.name || 'INFO_CAM TECNOLOGIA', 15, 23);
      
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text(`Relatório de Comissões | CNPJ/CPF: ${config.cnpjCpf || 'N/A'}`, 15, 28);
      doc.text(`Gerado automaticamente em ${new Date().toLocaleString('pt-BR')}`, 15, 32);

      // Metadata Panel (Right Header)
      doc.setFillColor(244, 244, 245);
      doc.rect(135, 18, 55, 16, 'F');
      doc.setDrawColor(212, 212, 216);
      doc.rect(135, 18, 55, 16);

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(30, 30, 30);
      doc.text('TIPO DE RELATÓRIO', 139, 23);
      doc.setFontSize(9.5);
      doc.setTextColor(rgb.r, rgb.g, rgb.b);
      doc.text(passPromptType === 'consolidated' ? 'CONSOLIDADO' : 'INDIVIDUAL', 139, 29);

      const drawHeaderBar = (title: string, yPos: number) => {
        doc.setFillColor(rgb.r, rgb.g, rgb.b);
        doc.rect(15, yPos, 180, 5.5, 'F');
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(255, 255, 255);
        doc.text(title, 18, yPos + 4);
      };

      if (passPromptType === 'consolidated') {
        let y = 42;
        drawHeaderBar('DEMONSTRATIVO GERAL DE COMISSÕES', y);

        y += 11;
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(100, 100, 100);
        doc.text('COLABORADOR', 17, y);
        doc.text('CARGO', 47, y);
        doc.text('PRODUÇÃO', 65, y);
        doc.text('C. VENDAS', 87, y);
        doc.text('C. O.S.', 110, y);
        doc.text('META ATING.', 130, y);
        doc.text('TAXA', 153, y);
        doc.text('TOTAL DEVIDO', 170, y);

        doc.setDrawColor(200, 200, 200);
        doc.line(15, y + 2, 195, y + 2);
        y += 7;

        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(7);
        consolidatedData.forEach((d, idx) => {
          if (idx % 2 === 0) {
            doc.setFillColor(250, 250, 251);
            doc.rect(15, y - 3.5, 180, 5, 'F');
          }
          doc.setTextColor(30, 30, 30);
          doc.text(d.name.substring(0, 15), 17, y);
          doc.text(d.role, 47, y);
          doc.text(formatCurr(d.totalSalesOrServices), 65, y);
          doc.text(formatCurr(d.commissionSales), 87, y);
          doc.text(formatCurr(d.commissionOS), 110, y);
          
          if (d.targetAmount) {
            if (d.isTargetMet) {
              doc.setFont('Helvetica', 'bold');
              doc.setTextColor(22, 101, 52); // green
              doc.text('SIM', 130, y);
            } else {
              doc.setFont('Helvetica', 'normal');
              doc.setTextColor(180, 83, 9); // orange
              doc.text('NÃO', 130, y);
            }
          } else {
            doc.setFont('Helvetica', 'normal');
            doc.setTextColor(120, 120, 120);
            doc.text('N/A', 130, y);
          }

          doc.setFont('Helvetica', 'normal');
          doc.setTextColor(30, 30, 30);
          doc.text(`${d.activeRate}%`, 153, y);
          doc.setFont('Helvetica', 'bold');
          doc.text(formatCurr(d.totalCommission), 170, y);
          y += 5.5;
        });

        // Add general summary block
        y += 6;
        doc.setFillColor(248, 250, 252);
        doc.rect(15, y, 180, 16, 'F');
        doc.rect(15, y, 180, 16);

        const totalCompanySales = consolidatedData.reduce((acc, curr) => acc + curr.totalSalesOrServices, 0);
        const totalCompanyComms = consolidatedData.reduce((acc, curr) => acc + curr.totalCommission, 0);

        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(rgb.r, rgb.g, rgb.b);
        doc.text(`TOTAL EM VENDAS / SERVIÇOS: ${formatCurr(totalCompanySales)}`, 18, y + 6);
        doc.text(`TOTAL EM COMISSÕES DEVIGAS: ${formatCurr(totalCompanyComms)}`, 18, y + 11);

        doc.save(`relatorio_consolidado_comissoes_${new Date().toISOString().split('T')[0]}.pdf`);
      } else if (individualData) {
        const st = individualData.staff;
        let y = 42;
        
        // Colaborador Info Box
        doc.setFillColor(248, 250, 252);
        doc.rect(15, y, 180, 18, 'F');
        doc.rect(15, y, 180, 18);

        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(80, 80, 80);
        doc.text('COLABORADOR:', 18, y + 6);
        doc.setFont('Helvetica', 'normal');
        doc.setTextColor(30, 30, 30);
        doc.text(st.name, 48, y + 6);

        doc.setFont('Helvetica', 'bold');
        doc.setTextColor(80, 80, 80);
        doc.text('CARGO:', 18, y + 12);
        doc.setFont('Helvetica', 'normal');
        doc.setTextColor(30, 30, 30);
        doc.text(st.role === 'tecnico' ? 'Técnico Responsável' : 'Consultor de Vendas', 32, y + 12);

        doc.setFont('Helvetica', 'bold');
        doc.setTextColor(80, 80, 80);
        doc.text('TAXA BASE:', 115, y + 6);
        doc.setFont('Helvetica', 'normal');
        doc.setTextColor(30, 30, 30);
        doc.text(`${st.commission}%`, 135, y + 6);

        if (st.targetAmount) {
          doc.setFont('Helvetica', 'bold');
          doc.setTextColor(80, 80, 80);
          doc.text('META ATIVA:', 115, y + 12);
          doc.setFont('Helvetica', 'normal');
          doc.setTextColor(30, 30, 30);
          doc.text(`${formatCurr(st.targetAmount)} (bônus p/ ${st.targetCommission}%)`, 137, y + 12);
        }

        y += 24;
        drawHeaderBar('HISTÓRICO DETALHADO DE PARTICIPAÇÃO', y);

        y += 11;
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(100, 100, 100);
        doc.text('DATA', 17, y);
        doc.text('TIPO DE LANÇAMENTO', 35, y);
        doc.text('DOCUMENTO/DESCR.', 75, y);
        doc.text('VALOR ITEM', 135, y);
        doc.text('TAXA COM.', 160, y);
        doc.text('COMISSÃO', 176, y);

        doc.setDrawColor(200, 200, 200);
        doc.line(15, y + 2, 195, y + 2);
        y += 7;

        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(7.2);
        individualData.items.forEach((it, idx) => {
          if (y > 230) {
            doc.addPage();
            doc.setDrawColor(228, 228, 231);
            doc.rect(10, 10, 190, 277);
            doc.setFillColor(rgb.r, rgb.g, rgb.b);
            doc.rect(10, 10, 190, 5, 'F');
            y = 20;
          }
          if (idx % 2 === 0) {
            doc.setFillColor(250, 250, 251);
            doc.rect(15, y - 3.5, 180, 5, 'F');
          }
          doc.setTextColor(30, 30, 30);
          doc.text(it.date, 17, y);
          doc.text(it.type, 35, y);
          doc.text(it.document.substring(0, 38), 75, y);
          doc.text(formatCurr(it.value), 135, y);
          doc.text(`${it.rate}%`, 160, y);
          doc.setFont('Helvetica', 'bold');
          doc.text(formatCurr(it.comm), 176, y);
          doc.setFont('Helvetica', 'normal');
          y += 5.5;
        });

        // Resumo
        y += 6;
        doc.setFillColor(248, 250, 252);
        doc.rect(15, y, 180, 22, 'F');
        doc.rect(15, y, 180, 22);

        doc.setFontSize(8.5);
        doc.setFont('Helvetica', 'bold');
        doc.setTextColor(rgb.r, rgb.g, rgb.b);
        doc.text(`TOTAL PRODUZIDO PELO PROFISSIONAL: ${formatCurr(individualData.totalSalesOrServices)}`, 18, y + 6);
        doc.text(`SITUAÇÃO DE METAS: ${st.targetAmount ? (individualData.isTargetMet ? 'META ALCANÇADA!' : 'META NÃO ATINGIDA') : 'NÃO POSSUI META CONFIGURADA'}`, 18, y + 11);
        doc.text(`TOTAL DE COMISSÃO LÍQUIDA A PAGAR: ${formatCurr(individualData.totalCommission)}`, 18, y + 16);

        doc.save(`comissao_detalhada_${st.name.toLowerCase().replace(/\s+/g, '_')}.pdf`);
      }
      alert('Relatório PDF exportado com sucesso!');
      return;
    }

    // --- FORMAT: JPG (High-resolution, beautifully crafted canvas download) ---
    if (exportFormat === 'jpg') {
      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = passPromptType === 'consolidated' ? 1000 : 1600;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Background card
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Outer thin border
      ctx.strokeStyle = '#e4e4e7';
      ctx.lineWidth = 4;
      ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

      // Elegant top brand bar
      ctx.fillStyle = primaryHex;
      ctx.fillRect(20, 20, canvas.width - 40, 16);

      // Title & header info
      ctx.fillStyle = '#18181b';
      ctx.font = 'bold 36px Helvetica';
      ctx.fillText(config.name?.toUpperCase() || 'INFO_CAM TECNOLOGIA', 40, 85);

      ctx.fillStyle = '#71717a';
      ctx.font = '20px Helvetica';
      ctx.fillText(`RELATÓRIO DE COMISSÕES | EMISSÃO: ${new Date().toLocaleString('pt-BR')}`, 40, 120);

      // Section drawing
      if (passPromptType === 'consolidated') {
        // Section header
        ctx.fillStyle = primaryHex;
        ctx.fillRect(40, 150, canvas.width - 80, 45);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 22px Helvetica';
        ctx.fillText('DEMONSTRATIVO GERAL DE COMISSÕES CONSOLIDADAS', 60, 180);

        // Table Columns Header
        ctx.fillStyle = '#71717a';
        ctx.font = 'bold 18px Helvetica';
        let rowY = 240;
        ctx.fillText('COLABORADOR', 50, rowY);
        ctx.fillText('CARGO', 320, rowY);
        ctx.fillText('FATURAMENTO', 480, rowY);
        ctx.fillText('META CONFIG.', 680, rowY);
        ctx.fillText('STATUS META', 880, rowY);
        ctx.fillText('COMISSÃO', 1040, rowY);

        ctx.strokeStyle = '#d4d4d8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(40, rowY + 12);
        ctx.lineTo(canvas.width - 40, rowY + 12);
        ctx.stroke();

        rowY += 45;
        consolidatedData.forEach((d, idx) => {
          if (idx % 2 === 0) {
            ctx.fillStyle = '#fafafa';
            ctx.fillRect(40, rowY - 30, canvas.width - 80, 42);
          }

          ctx.fillStyle = '#18181b';
          ctx.font = '18px Helvetica';
          ctx.fillText(d.name, 50, rowY);
          ctx.fillText(d.role, 320, rowY);
          ctx.fillText(formatCurr(d.totalSalesOrServices), 480, rowY);
          ctx.fillText(d.targetAmount ? formatCurr(d.targetAmount) : 'Sem Meta', 680, rowY);
          
          if (d.targetAmount) {
            if (d.isTargetMet) {
              ctx.fillStyle = '#16a34a';
              ctx.font = 'bold 18px Helvetica';
              ctx.fillText('ALCANÇADA', 880, rowY);
            } else {
              ctx.fillStyle = '#d97706';
              ctx.font = '18px Helvetica';
              ctx.fillText('PENDENTE', 880, rowY);
            }
          } else {
            ctx.fillStyle = '#a1a1aa';
            ctx.fillText('N/A', 880, rowY);
          }

          ctx.fillStyle = primaryHex;
          ctx.font = 'bold 19px Helvetica';
          ctx.fillText(formatCurr(d.totalCommission), 1040, rowY);

          rowY += 42;
        });

        // Summary footer
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(40, rowY + 10, canvas.width - 80, 110);
        ctx.strokeStyle = '#cbd5e1';
        ctx.strokeRect(40, rowY + 10, canvas.width - 80, 110);

        const totalCompanySales = consolidatedData.reduce((acc, curr) => acc + curr.totalSalesOrServices, 0);
        const totalCompanyComms = consolidatedData.reduce((acc, curr) => acc + curr.totalCommission, 0);

        ctx.fillStyle = '#1e293b';
        ctx.font = 'bold 22px Helvetica';
        ctx.fillText(`VOLUME TOTAL EM OPERAÇÕES DO CAIXA: ${formatCurr(totalCompanySales)}`, 70, rowY + 55);
        ctx.fillText(`REPASSE TOTAL DE COMISSÕES EXECUTADAS: ${formatCurr(totalCompanyComms)}`, 70, rowY + 95);

      } else if (individualData) {
        const st = individualData.staff;
        // Colaborador summary box
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(40, 150, canvas.width - 80, 110);
        ctx.strokeStyle = '#cbd5e1';
        ctx.strokeRect(40, 150, canvas.width - 80, 110);

        ctx.fillStyle = '#334155';
        ctx.font = 'bold 20px Helvetica';
        ctx.fillText(`COLABORADOR: ${st.name}`, 60, 190);
        ctx.fillText(`CARGO / FUNÇÃO: ${st.role === 'tecnico' ? 'TÉCNICO DE MANUTENÇÃO' : 'CONSULTOR COMERCIAL'}`, 60, 235);
        ctx.fillText(`TAXA PADRÃO: ${st.commission}%`, 660, 190);
        if (st.targetAmount) {
          ctx.fillText(`META DE FATURAMENTO: ${formatCurr(st.targetAmount)} (bônus p/ ${st.targetCommission}%)`, 660, 235);
        }

        // Table Header
        ctx.fillStyle = primaryHex;
        ctx.fillRect(40, 280, canvas.width - 80, 45);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 22px Helvetica';
        ctx.fillText('HISTÓRICO INDIVIDUAL DE LANÇAMENTOS E PARTICIPAÇÃO', 60, 310);

        ctx.fillStyle = '#71717a';
        ctx.font = 'bold 18px Helvetica';
        let rowY = 370;
        ctx.fillText('DATA', 50, rowY);
        ctx.fillText('TIPO LANÇAMENTO', 190, rowY);
        ctx.fillText('DOCUMENTO / DETALHAMENTO', 420, rowY);
        ctx.fillText('VALOR ITEM', 820, rowY);
        ctx.fillText('TAXA', 980, rowY);
        ctx.fillText('COMISSÃO', 1080, rowY);

        ctx.strokeStyle = '#d4d4d8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(40, rowY + 12);
        ctx.lineTo(canvas.width - 40, rowY + 12);
        ctx.stroke();

        rowY += 45;
        individualData.items.forEach((it, idx) => {
          if (rowY > canvas.height - 200) return; // safeguard page cut

          if (idx % 2 === 0) {
            ctx.fillStyle = '#fafafa';
            ctx.fillRect(40, rowY - 30, canvas.width - 80, 42);
          }

          ctx.fillStyle = '#18181b';
          ctx.font = '18px Helvetica';
          ctx.fillText(it.date, 50, rowY);
          ctx.fillText(it.type, 190, rowY);
          ctx.fillText(it.document.substring(0, 32), 420, rowY);
          ctx.fillText(formatCurr(it.value), 820, rowY);
          ctx.fillText(`${it.rate}%`, 980, rowY);
          
          ctx.fillStyle = primaryHex;
          ctx.font = 'bold 19px Helvetica';
          ctx.fillText(formatCurr(it.comm), 1080, rowY);

          rowY += 42;
        });

        // Total Summary Box bottom
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(40, canvas.height - 180, canvas.width - 80, 130);
        ctx.strokeStyle = '#cbd5e1';
        ctx.strokeRect(40, canvas.height - 180, canvas.width - 80, 130);

        ctx.fillStyle = '#1e293b';
        ctx.font = 'bold 22px Helvetica';
        ctx.fillText(`TOTAL PRODUZIDO PELO COLABORADOR: ${formatCurr(individualData.totalSalesOrServices)}`, 70, canvas.height - 135);
        ctx.fillText(`SITUAÇÃO DE METAS CONFIGURADAS: ${st.targetAmount ? (individualData.isTargetMet ? 'META ALCANÇADA COM SUCESSO! 🎯' : 'META NÃO ALCANÇADA ESTE MÊS') : 'NÃO CONSTA META ATIVA'}`, 70, canvas.height - 95);
        ctx.fillText(`TOTAL DE REPASSE LÍQUIDO A PAGAR: ${formatCurr(individualData.totalCommission)}`, 70, canvas.height - 55);
      }

      // Download trigger
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      const link = document.createElement("a");
      link.href = dataUrl;
      const filename = passPromptType === 'consolidated' 
        ? `comissoes_consolidadas_${new Date().toISOString().split('T')[0]}.jpg`
        : `comissao_${passPromptStaff?.name.toLowerCase().replace(/\s+/g, '_') || 'individual'}_${new Date().toISOString().split('T')[0]}.jpg`;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      alert('Relatório de comissões exportado como imagem JPG com sucesso!');
    }
  };

  const handleSaveColors = async () => {
    try {
      await onSaveConfig({
        ...config,
        colors: {
          primary: primaryColor,
          accent: accentColor
        }
      });
      // Apply theme variables globally if we want (handled in index.html/App.tsx)
      alert('Paleta de cores atualizada com sucesso!');
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffName) return;
    try {
      await onAddStaff({
        name: staffName,
        role: staffIsSeller && staffIsTechnician ? 'ambos' : staffIsSeller ? 'vendedor' : 'tecnico',
        isSeller: staffIsSeller,
        isTechnician: staffIsTechnician,
        commission: 0, // Legacy fallback
        salesCommissionRate: staffIsSeller ? (parseFloat(staffSalesCommission) || 0) : 0,
        salesCommissionMinLimit: staffIsSeller ? (parseFloat(staffSalesMinLimit) || 0) : 0,
        techCommissionRate: 0,
        techCommissionByType: staffIsTechnician ? staffTechCommissionByType : [],
        password: staffPassword || undefined
      });
      setStaffName('');
      setStaffIsSeller(false);
      setStaffIsTechnician(true);
      setStaffSalesCommission('0');
      setStaffSalesMinLimit('0');
      setStaffTechCommissionByType([]);
      setStaffPassword('');
      alert('Membro da equipe cadastrado com sucesso!');
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    try {
      await onEditStaff(editingStaff.id, {
        name: editStaffName,
        role: editStaffIsSeller && editStaffIsTechnician ? 'ambos' : editStaffIsSeller ? 'vendedor' : 'tecnico',
        isSeller: editStaffIsSeller,
        isTechnician: editStaffIsTechnician,
        commission: 0,
        salesCommissionRate: editStaffIsSeller ? (parseFloat(editStaffSalesCommission) || 0) : 0,
        salesCommissionMinLimit: editStaffIsSeller ? (parseFloat(editStaffSalesMinLimit) || 0) : 0,
        techCommissionRate: 0,
        techCommissionByType: editStaffIsTechnician ? editStaffTechCommissionByType : [],
        password: editStaffPassword || undefined
      });
      setEditingStaff(null);
      alert('Cadastro do colaborador atualizado com sucesso!');
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenEditStaff = (st: Staff) => {
    setEditingStaff(st);
    setEditStaffName(st.name);
    
    // Support legacy role string
    const isS = st.isSeller !== undefined ? st.isSeller : (st.role === 'vendedor' || st.role === 'ambos');
    const isT = st.isTechnician !== undefined ? st.isTechnician : (st.role === 'tecnico' || st.role === 'ambos');
    
    setEditStaffIsSeller(isS);
    setEditStaffIsTechnician(isT);
    
    setEditStaffSalesCommission(st.salesCommissionRate !== undefined ? st.salesCommissionRate.toString() : (st.role === 'vendedor' ? st.commission.toString() : '0'));
    setEditStaffSalesMinLimit(st.salesCommissionMinLimit !== undefined ? st.salesCommissionMinLimit.toString() : '0');
    setEditStaffTechCommissionByType(st.techCommissionByType || []);
    setEditStaffPassword(st.password || '');
  };

  const handleAddCategory = async () => {
    if (!newCategory || categories.includes(newCategory)) return;
    const updated = [...categories, newCategory];
    setCategories(updated);
    setNewCategory('');
    try {
      await onSaveConfig({ ...config, categories: updated });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteCategory = async (cat: string) => {
    const updated = categories.filter(c => c !== cat);
    setCategories(updated);
    try {
      await onSaveConfig({ ...config, categories: updated });
    } catch (err) {
      console.error(err);
    }
  };

  // Reorder Menu
  const moveMenu = async (index: number, direction: 'up' | 'down') => {
    const updated = [...menuOrder];
    if (direction === 'up' && index > 0) {
      const temp = updated[index];
      updated[index] = updated[index - 1];
      updated[index - 1] = temp;
    } else if (direction === 'down' && index < updated.length - 1) {
      const temp = updated[index];
      updated[index] = updated[index + 1];
      updated[index + 1] = temp;
    }
    setMenuOrder(updated);
    try {
      await onSaveConfig({ ...config, menuOrder: updated });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-zinc-950 font-sans">Configurações da Loja & Equipe</h2>
        <p className="text-xs text-zinc-400">Gerencie a identidade visual, dados cadastrais, técnicos, vendedores e ordens do menu</p>
      </div>

      {/* Sub tabs */}
      <div className="flex gap-1 border-b border-zinc-200 overflow-x-auto pb-px scrollbar-none">
        <button
          onClick={() => setActiveSubTab('geral')}
          className={`py-2 px-4 text-xs font-bold whitespace-nowrap border-b-2 cursor-pointer transition-all ${activeSubTab === 'geral' ? 'border-zinc-950 text-zinc-950 font-extrabold' : 'border-transparent text-zinc-400 hover:text-zinc-600'}`}
        >
          <Store className="inline-block mr-1.5" size={14} /> Dados da Loja
        </button>
        <button
          onClick={() => setActiveSubTab('cores')}
          className={`py-2 px-4 text-xs font-bold whitespace-nowrap border-b-2 cursor-pointer transition-all ${activeSubTab === 'cores' ? 'border-zinc-950 text-zinc-950 font-extrabold' : 'border-transparent text-zinc-400 hover:text-zinc-600'}`}
        >
          <Palette className="inline-block mr-1.5" size={14} /> Identidade & Cores
        </button>
        <button
          onClick={() => setActiveSubTab('equipe')}
          className={`py-2 px-4 text-xs font-bold whitespace-nowrap border-b-2 cursor-pointer transition-all ${activeSubTab === 'equipe' ? 'border-zinc-950 text-zinc-950 font-extrabold' : 'border-transparent text-zinc-400 hover:text-zinc-600'}`}
        >
          <Users className="inline-block mr-1.5" size={14} /> Equipe & Comissões
        </button>
        <button
          onClick={() => setActiveSubTab('categorias')}
          className={`py-2 px-4 text-xs font-bold whitespace-nowrap border-b-2 cursor-pointer transition-all ${activeSubTab === 'categorias' ? 'border-zinc-950 text-zinc-950 font-extrabold' : 'border-transparent text-zinc-400 hover:text-zinc-600'}`}
        >
          <Layers className="inline-block mr-1.5" size={14} /> Categorias do Caixa
        </button>
        <button
          onClick={() => setActiveSubTab('menus')}
          className={`py-2 px-4 text-xs font-bold whitespace-nowrap border-b-2 cursor-pointer transition-all ${activeSubTab === 'menus' ? 'border-zinc-950 text-zinc-950 font-extrabold' : 'border-transparent text-zinc-400 hover:text-zinc-600'}`}
        >
          <ListOrdered className="inline-block mr-1.5" size={14} /> Ordem dos Menus
        </button>
        <button
          onClick={() => setActiveSubTab('impressoras')}
          className={`py-2 px-4 text-xs font-bold whitespace-nowrap border-b-2 cursor-pointer transition-all ${activeSubTab === 'impressoras' ? 'border-zinc-950 text-zinc-950 font-extrabold' : 'border-transparent text-zinc-400 hover:text-zinc-600'}`}
        >
          <Printer className="inline-block mr-1.5" size={14} /> Impressoras
        </button>
        <button
          onClick={() => setActiveSubTab('whatsapp')}
          className={`py-2 px-4 text-xs font-bold whitespace-nowrap border-b-2 cursor-pointer transition-all ${activeSubTab === 'whatsapp' ? 'border-zinc-950 text-zinc-950 font-extrabold' : 'border-transparent text-zinc-400 hover:text-zinc-600'}`}
        >
          <MessageCircle className="inline-block mr-1.5" size={14} /> Mensagens WhatsApp
        </button>
        <button
          onClick={() => setActiveSubTab('avancado')}
          className={`py-2 px-4 text-xs font-bold whitespace-nowrap border-b-2 cursor-pointer transition-all ${activeSubTab === 'avancado' ? 'border-zinc-950 text-zinc-950 font-extrabold' : 'border-transparent text-zinc-400 hover:text-zinc-600'}`}
        >
          <Settings className="inline-block mr-1.5" size={14} /> Opções do App
        </button>
      </div>

      {/* Sub tabs contents */}
      <div className="bg-white border border-zinc-150 rounded-2xl overflow-hidden p-6 shadow-xs">
        {activeSubTab === 'geral' && (
          <form onSubmit={handleSaveGeneral} className="space-y-5">
            <h3 className="text-sm font-bold text-zinc-900 border-b border-zinc-100 pb-2">Informações Cadastrais</h3>
            <p className="text-xs text-zinc-400">Estes dados serão automaticamente inclusos no cabeçalho das ordens de serviço (O.S.) e comprovantes não fiscais.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1">Nome Fantasia da Loja</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  placeholder="Ex: InfoCam Assistência Técnica"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1">CNPJ / CPF</label>
                <input
                  type="text"
                  value={cnpjCpf}
                  onChange={(e) => setCnpjCpf(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  placeholder="Ex: 00.000.000/0001-00"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1">Telefone / WhatsApp</label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  placeholder="Ex: (11) 99999-9999"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1">Email de Contato</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  placeholder="Ex: contato@sualoja.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1">Logo da Assistência (Imagem)</label>
                <div className="flex items-center gap-4 border border-dashed border-zinc-200 p-4 rounded-xl">
                  {logo ? (
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-zinc-150 shrink-0">
                      <img src={logo} alt="Logo" className="object-contain w-full h-full" referrerPolicy="no-referrer" />
                      <button 
                        type="button"
                        onClick={() => setLogo('')}
                        className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-[10px] font-bold opacity-0 hover:opacity-100 transition-opacity"
                      >
                        Remover
                      </button>
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-zinc-50 border border-zinc-150 flex items-center justify-center text-zinc-400 shrink-0">
                      <Store size={22} />
                    </div>
                  )}
                  <div className="flex-1 space-y-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      id="logo-file"
                      className="hidden"
                    />
                    <label 
                      htmlFor="logo-file"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold rounded-lg cursor-pointer transition-colors"
                    >
                      <Upload size={12} /> Selecionar Logo
                    </label>
                    <p className="text-[10px] text-zinc-400">Recomendado formato PNG transparente quadrado ou retangular pequeno.</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1">Número de Início das O.S.</label>
                <input
                  type="number"
                  min="1"
                  value={osStartNumber}
                  onChange={(e) => setOsStartNumber(parseInt(e.target.value) || 1001)}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  placeholder="Ex: 1001"
                />
                <p className="text-[10px] text-zinc-400 mt-1">O sistema gerará a próxima ordem de serviço a partir deste número sequencial para manter seu histórico.</p>
              </div>
            </div>

            <div className="border-t border-zinc-100 pt-4">
              <div className="flex items-start justify-between p-4 bg-zinc-50 border border-zinc-200/60 rounded-2xl">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-900 block">Salvar PDF no Google Drive</label>
                  <span className="text-[10px] text-zinc-500 block max-w-xl">Ao habilitar, toda nova Ordem de Serviço gerará um PDF automatizado que será salvo na pasta do programa no seu Google Drive (caso esteja conectado na aba Backup).</span>
                </div>
                <div className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    id="auto-save-drive-toggle"
                    checked={autoSaveOSToDrive} 
                    onChange={(e) => setAutoSaveOSToDrive(e.target.checked)}
                    className="sr-only peer"
                  />
                  <label htmlFor="auto-save-drive-toggle" className="sr-only">Habilitar backup automático de O.S. no Drive</label>
                  <div className="w-9 h-5 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-zinc-950"></div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full md:w-auto px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold cursor-pointer transition-all"
            >
              Salvar Alterações
            </button>
          </form>
        )}

        {activeSubTab === 'cores' && (
          <div className="space-y-5">
            <h3 className="text-sm font-bold text-zinc-900 border-b border-zinc-100 pb-2">Identidade Visual & Cores do App</h3>
            <p className="text-xs text-zinc-400">Personalize a paleta de cores primária e secundária para alinhar com a marca da sua empresa. Isso afetará as ordens de serviço e planilhas exportadas.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div className="border border-zinc-100 p-4 rounded-xl space-y-3">
                <span className="block text-xs font-bold text-zinc-500">Cor Primária (Menus, Cabeçalhos)</span>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0"
                  />
                  <input
                    type="text"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="flex-1 px-3 py-2 border border-zinc-200 rounded-lg text-sm font-mono text-zinc-700"
                  />
                </div>
              </div>

              <div className="border border-zinc-100 p-4 rounded-xl space-y-3">
                <span className="block text-xs font-bold text-zinc-500">Cor de Destaque / Ação (Botões, Sucessos)</span>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0"
                  />
                  <input
                    type="text"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="flex-1 px-3 py-2 border border-zinc-200 rounded-lg text-sm font-mono text-zinc-700"
                  />
                </div>
              </div>
            </div>

            <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-150 space-y-2">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Visualização do Tema</span>
              <div className="flex gap-2">
                <div 
                  className="px-4 py-2 text-xs font-bold rounded-lg text-white text-center shadow-xs flex-1"
                  style={{ backgroundColor: primaryColor }}
                >
                  Menu / Fundo
                </div>
                <div 
                  className="px-4 py-2 text-xs font-bold rounded-lg text-white text-center shadow-xs flex-1"
                  style={{ backgroundColor: accentColor }}
                >
                  Botão de Ação
                </div>
              </div>
            </div>

            <button
              onClick={handleSaveColors}
              className="w-full md:w-auto px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold cursor-pointer transition-all"
            >
              Aplicar Nova Paleta de Cores
            </button>
          </div>
        )}

        {activeSubTab === 'equipe' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-100 pb-2 gap-2">
              <h3 className="text-sm font-bold text-zinc-900">Gerenciamento de Equipe & Comissões</h3>
              {!isMasterUnlocked ? (
                <button
                  type="button"
                  onClick={() => {
                    if (!config.commissionPassword) {
                      alert('Configure uma Senha Master abaixo antes de usar o desbloqueio.');
                      return;
                    }
                    setPassPromptType('masterUnlock');
                    setPassPromptStaff(null);
                    setIsPassModalOpen(true);
                    setPromptPasswordInput('');
                  }}
                  className="px-3 py-1.5 bg-zinc-900 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 hover:bg-zinc-800 transition-colors shrink-0 cursor-pointer"
                >
                  <Lock size={12} /> Desbloquear Master
                </button>
              ) : (
                <div className="px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-xl flex items-center gap-1.5 shrink-0 border border-emerald-200">
                  <Check size={12} /> Master Desbloqueado
                </div>
              )}
            </div>
            <p className="text-xs text-zinc-400">Cadastre técnicos e vendedores. O sistema calculará comissões individuais automaticamente quando os atendimentos ou vendas forem realizados.</p>

            <form onSubmit={handleAddStaffSubmit} className="space-y-4 bg-zinc-50/50 p-5 rounded-2xl border border-zinc-150 shadow-2xs">
              <div className="text-xs font-bold text-zinc-800 border-b border-zinc-100 pb-1.5 flex items-center gap-1.5">
                <Plus size={14} className="text-zinc-600" />
                <span>Cadastrar Novo Colaborador</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Nome Completo</label>
                  <input
                    type="text"
                    required
                    value={staffName}
                    onChange={(e) => setStaffName(e.target.value)}
                    className="w-full px-3 py-1.5 border border-zinc-200 rounded-xl text-xs bg-white"
                    placeholder="Ex: Carlos Oliveira"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Funções (Marque as que se aplicam)</label>
                  <div className="flex items-center gap-4 mt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={staffIsSeller} 
                        onChange={(e) => setStaffIsSeller(e.target.checked)} 
                        className="w-4 h-4 text-emerald-600 rounded border-zinc-300 focus:ring-emerald-500" 
                      />
                      <span className="text-xs font-bold text-zinc-700">Vendedor (Vendas no PDV)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={staffIsTechnician} 
                        onChange={(e) => setStaffIsTechnician(e.target.checked)} 
                        className="w-4 h-4 text-emerald-600 rounded border-zinc-300 focus:ring-emerald-500" 
                      />
                      <span className="text-xs font-bold text-zinc-700">Técnico (Serviços/OS)</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Commission Configs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-zinc-100">
                {/* Vendedor Commission */}
                <div className={`space-y-3 p-3 rounded-xl border ${staffIsSeller ? 'border-zinc-200 bg-white' : 'border-zinc-100 bg-zinc-50/50 opacity-50 pointer-events-none'}`}>
                  <h4 className="text-[10px] font-bold text-zinc-800 uppercase tracking-wider flex items-center gap-1.5"><ShoppingBag size={12}/> Configurações de Vendedor</h4>
                  
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 mb-1">
                      Comissão de Vendas (%)
                      {!isMasterUnlocked && <span className="ml-1 text-red-400 font-normal normal-case">(Requer Master)</span>}
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      disabled={!isMasterUnlocked}
                      value={staffSalesCommission}
                      onChange={(e) => setStaffSalesCommission(e.target.value)}
                      className="w-full px-3 py-1.5 border border-zinc-200 rounded-xl text-xs disabled:bg-zinc-100"
                      placeholder="Ex: 5"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 mb-1">Comissão apenas p/ vendas acima de (R$)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      disabled={!isMasterUnlocked}
                      value={staffSalesMinLimit}
                      onChange={(e) => setStaffSalesMinLimit(e.target.value)}
                      className="w-full px-3 py-1.5 border border-zinc-200 rounded-xl text-xs disabled:bg-zinc-100"
                      placeholder="Ex: 100.00 (Deixe 0 para todas)"
                    />
                  </div>
                </div>

                {/* Technician Commission */}
                <div className={`space-y-3 p-3 rounded-xl border ${staffIsTechnician ? 'border-zinc-200 bg-white' : 'border-zinc-100 bg-zinc-50/50 opacity-50 pointer-events-none'}`}>
                  <h4 className="text-[10px] font-bold text-zinc-800 uppercase tracking-wider flex items-center gap-1.5"><Cpu size={12}/> Configurações de Técnico</h4>
                  <p className="text-[9px] text-zinc-500">Defina comissão por tipo de produto vendido/reparado. (Se vazio, técnico não ganha comissão sobre produtos).</p>
                  
                  <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                    {['Acessório', 'Notebook', 'Computador', 'Celular', 'Tablet', 'Console', 'Impressora', 'Peça', 'Outro'].map(type => {
                      const currentRate = staffTechCommissionByType.find(t => t.type === type)?.rate || 0;
                      return (
                        <div key={type} className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-semibold text-zinc-700 w-24 truncate">{type}</span>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.1"
                              disabled={!isMasterUnlocked}
                              value={currentRate || ''}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                setStaffTechCommissionByType(prev => {
                                  const filtered = prev.filter(t => t.type !== type);
                                  if (val > 0) return [...filtered, { type, rate: val }];
                                  return filtered;
                                });
                              }}
                              className="w-16 px-2 py-1 border border-zinc-200 rounded text-xs disabled:bg-zinc-100"
                              placeholder="0"
                            />
                            <span className="text-[10px] text-zinc-500">%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Targets and Passwords Accordion / Sub-panel */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-zinc-100">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <TrendingUp size={12} className="text-zinc-400" /> Meta de Faturamento (R$) <span className="text-[9px] text-zinc-400 font-normal normal-case">(Opcional)</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    disabled={!isMasterUnlocked}
                    value={staffTargetAmount}
                    onChange={(e) => setStaffTargetAmount(e.target.value)}
                    className="w-full px-3 py-1.5 border border-zinc-200 rounded-xl text-xs bg-white disabled:bg-zinc-100 disabled:text-zinc-400"
                    placeholder="Ex: 5000.00"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Percent size={12} className="text-zinc-400" /> Comissão Após Meta (%) <span className="text-[9px] text-zinc-400 font-normal normal-case">(Opcional)</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    disabled={!isMasterUnlocked}
                    value={staffTargetCommission}
                    onChange={(e) => setStaffTargetCommission(e.target.value)}
                    className="w-full px-3 py-1.5 border border-zinc-200 rounded-xl text-xs bg-white disabled:bg-zinc-100 disabled:text-zinc-400"
                    placeholder="Ex: 8"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Key size={12} className="text-zinc-400" /> Senha para Download <span className="text-[9px] text-zinc-400 font-normal normal-case">(Opcional)</span>
                  </label>
                  <input
                    type="password"
                    value={staffPassword}
                    onChange={(e) => setStaffPassword(e.target.value)}
                    className="w-full px-3 py-1.5 border border-zinc-200 rounded-xl text-xs bg-white"
                    placeholder="Configure para download individual..."
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                >
                  <Plus size={14} /> Cadastrar na Equipe
                </button>
              </div>
            </form>

            <div className="space-y-3 pt-2">
              <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                Lista de Colaboradores & Desempenho
              </div>
              
              <div className="space-y-3">
                {staffList.length === 0 ? (
                  <div className="p-8 text-center text-xs text-zinc-400 bg-white border border-zinc-150 rounded-2xl">
                    Nenhum funcionário ou colaborador cadastrado ainda.
                  </div>
                ) : (
                  staffList.map((st) => {
                    const { totalSalesOrServices, totalCommission, commissionSales, commissionOS, isTargetMet, activeRate } = calculateStaffCommission(st);
                    const isBlurred = !isMasterUnlocked && !unblurredStaffIds.includes(st.id);
                    const blurClass = isBlurred ? "blur-sm select-none transition-all duration-300" : "transition-all duration-300";
                    
                    return (
                      <div key={st.id} className="p-4 bg-white border border-zinc-150 rounded-2xl flex flex-col md:flex-row md:items-start justify-between gap-4 hover:border-zinc-300 transition-all shadow-3xs group relative">
                        <div className="space-y-2 flex-1 relative">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-zinc-950 text-sm">{st.name}</span>
                              <span className="capitalize text-zinc-500 bg-zinc-100 px-2.5 py-0.5 rounded-full text-[9px] font-bold">
                                {st.role === 'tecnico' ? '⚙️ Técnico' : '🛒 Vendedor'}
                              </span>
                            </div>
                            <button 
                              onClick={() => handleEyeClick(st)}
                              className="text-zinc-400 hover:text-zinc-700 bg-zinc-50 hover:bg-zinc-100 p-1.5 rounded-full transition-colors"
                              title={isBlurred ? "Visualizar Comissões" : "Ocultar Comissões"}
                            >
                              {isBlurred ? '👁️' : '🙈'}
                            </button>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 pt-1">
                            <div className="bg-zinc-50/50 p-2.5 rounded-xl border border-zinc-100">
                              <span className="block text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Produção / Vendas</span>
                              <span className={`font-extrabold text-zinc-800 text-xs block ${blurClass}`}>
                                R$ {totalSalesOrServices.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>

                            <div className="bg-zinc-50/50 p-2.5 rounded-xl border border-zinc-100 flex flex-col gap-1">
                              <span className="block text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Comissão Vendas</span>
                              <span className={`font-bold text-zinc-700 text-xs block ${blurClass}`}>
                                R$ {commissionSales.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>

                            <div className="bg-zinc-50/50 p-2.5 rounded-xl border border-zinc-100 flex flex-col gap-1">
                              <span className="block text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Comissão O.S.</span>
                              <span className={`font-bold text-zinc-700 text-xs block ${blurClass}`}>
                                R$ {commissionOS.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>

                            <div className="bg-zinc-50/50 p-2.5 rounded-xl border border-zinc-100 relative overflow-hidden">
                              <span className="block text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Comissão Total Devida</span>
                              <span className={`font-extrabold text-indigo-700 text-xs block ${blurClass}`}>
                                R$ {totalCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                              <span className={`text-[9px] text-zinc-500 block ${blurClass}`}>Taxa Aplicada: {activeRate}%</span>
                            </div>

                            <div className={`bg-zinc-50/50 p-2.5 rounded-xl border border-zinc-100 sm:col-span-4 ${blurClass}`}>
                              <span className="block text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Meta & Incentivos</span>
                              {st.targetAmount ? (
                                <div className="space-y-0.5">
                                  <span className="font-semibold text-zinc-700 text-[10px] block leading-none">
                                    Meta: R$ {st.targetAmount.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                  </span>
                                  {isTargetMet ? (
                                    <span className="inline-flex items-center gap-0.5 bg-emerald-50 text-emerald-700 px-1 py-0.2 rounded-sm text-[9px] font-black">
                                      Meta Atingida ({st.targetCommission}%)
                                    </span>
                                  ) : (
                                    <span className="text-[9px] text-zinc-500 block">
                                      Falta R$ {Math.max(0, st.targetAmount - totalSalesOrServices).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} para {st.targetCommission}%
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-[10px] text-zinc-400 block leading-normal">Nenhuma meta configurada</span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-3 text-[10px] text-zinc-400">
                            <span className="flex items-center gap-1">
                              <Percent size={11} className="text-zinc-400" /> Comissão Padrão: {st.commission}%
                            </span>
                            <span className="flex items-center gap-1">
                              <Key size={11} className="text-zinc-400" /> Senha de Download: {st.password ? <span className="text-emerald-600 font-bold">Ativa</span> : <span className="text-zinc-400">Não configurada</span>}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 md:self-center shrink-0">
                          {!isBlurred && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleExportIndividualCommission(st)}
                                className="p-2 hover:bg-indigo-50 text-indigo-600 hover:text-indigo-700 rounded-xl border border-zinc-150 bg-white transition-all cursor-pointer flex items-center gap-1"
                                title="Baixar Relatório de Comissão do Colaborador"
                              >
                                <FileSpreadsheet size={14} />
                                <span className="text-[10px] font-bold">Baixar</span>
                              </button>
                              
                              <button
                                type="button"
                                onClick={() => handleOpenEditStaff(st)}
                                className="p-2 hover:bg-zinc-100 text-zinc-600 rounded-xl border border-zinc-150 bg-white transition-all cursor-pointer"
                                title="Editar Colaborador"
                              >
                                <Settings size={14} />
                              </button>
                            </>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Tem certeza que deseja remover ${st.name} da equipe?`)) {
                                onDeleteStaff(st.id);
                              }
                            }}
                            className="p-2 hover:bg-rose-50 text-rose-600 hover:text-rose-700 rounded-xl border border-zinc-150 bg-white transition-all cursor-pointer"
                            title="Remover Colaborador"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Master Password Configuration Inside Equipe & Comissões */}
            <div className="bg-zinc-50 border border-zinc-150 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Lock size={14} className="text-zinc-600" />
                  <h4 className="text-xs font-bold text-zinc-900">Configuração de Senha Master</h4>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    if (confirm('Tem certeza que deseja EXCLUIR TODOS OS COLABORADORES e RESETAR a Senha Master?')) {
                      for (const st of staffList) {
                        await onDeleteStaff(st.id);
                      }
                      await onSaveConfig({ ...config, commissionPassword: '' });
                      setCommissionPassword('');
                      alert('Colaboradores excluídos e Senha Master resetada!');
                    }
                  }}
                  className="px-2 py-1 text-[10px] bg-rose-100 text-rose-700 font-bold rounded-lg cursor-pointer"
                >
                  Resetar Tudo
                </button>
              </div>
              <p className="text-[10px] text-zinc-400 leading-relaxed">A Senha Master libera o download de qualquer relatório de comissão individual e permite baixar o relatório consolidado de toda a equipe.</p>
              
              <div className="flex flex-col sm:flex-row gap-2 max-w-md">
                <input
                  type="password"
                  placeholder="Defina uma senha master segura..."
                  value={commissionPassword}
                  onChange={(e) => setCommissionPassword(e.target.value)}
                  className="flex-1 px-3 py-1.5 border border-zinc-200 rounded-xl text-xs bg-white"
                />
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await onSaveConfig({ ...config, commissionPassword });
                      alert('Senha master Criada');
                    } catch (err) {
                      console.error(err);
                      alert('Erro ao salvar a senha master.');
                    }
                  }}
                  className="px-4 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shrink-0"
                >
                  Salvar Senha Master
                </button>
              </div>
            </div>

            {/* Secure Download Consolidated Commissions Section */}
            <div className="bg-zinc-50 border border-zinc-150 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-3xs">
              <div>
                <h4 className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
                  <Shield size={14} className="text-zinc-600" /> Relatório Consolidado de Comissões
                </h4>
                <p className="text-[10px] text-zinc-500 mt-1">Este download é protegido pela Senha Master de segurança. Contém os totais devidos de comissões calculadas por colaborador.</p>
              </div>
              <button
                type="button"
                onClick={handleExportCommissions}
                className="px-4 py-2 bg-zinc-950 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all shrink-0 shadow-sm"
              >
                <FileSpreadsheet size={14} /> Baixar Comissões Consolidadas (CSV)
              </button>
            </div>
          </div>
        )}

        {activeSubTab === 'categorias' && (
          <div className="space-y-5">
            <h3 className="text-sm font-bold text-zinc-900 border-b border-zinc-100 pb-2">Categorias Disponíveis para Lançamento</h3>
            <p className="text-xs text-zinc-400">Personalize as categorias que podem ser selecionadas nas receitas e despesas do fluxo de caixa.</p>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ex: Manutenção de Carro da Loja"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="flex-1 px-3 py-2 border border-zinc-200 rounded-xl text-sm"
              />
              <button
                onClick={handleAddCategory}
                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <Plus size={14} /> Adicionar
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pt-2">
              {categories.map((cat) => (
                <div key={cat} className="flex justify-between items-center py-2 px-3 border border-zinc-150 rounded-xl text-xs font-semibold text-zinc-700 bg-zinc-50">
                  <span>{cat}</span>
                  <button
                    onClick={() => handleDeleteCategory(cat)}
                    className="p-0.5 text-zinc-400 hover:text-rose-600 hover:bg-white rounded transition-colors cursor-pointer"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeSubTab === 'menus' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-zinc-900 border-b border-zinc-100 pb-2">Personalizar Ordem do Menu Lateral</h3>
            <p className="text-xs text-zinc-400">Reordene livremente a exibição dos módulos do sistema no menu principal para o seu fluxo diário mais ágil.</p>

            <div className="space-y-2 max-w-md border border-zinc-100 rounded-xl overflow-hidden divide-y divide-zinc-100">
              {menuOrder.map((menuId, idx) => {
                const label = AVAILABLE_MENUS.find(m => m.id === menuId)?.label || menuId;
                return (
                  <div 
                    key={menuId} 
                    draggable
                    onDragStart={() => setDraggedMenuIdx(idx)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (draggedMenuIdx === null || draggedMenuIdx === idx) return;
                      const newOrder = [...menuOrder];
                      const item = newOrder.splice(draggedMenuIdx, 1)[0];
                      newOrder.splice(idx, 0, item);
                      setMenuOrder(newOrder);
                      setDraggedMenuIdx(null);
                    }}
                    className="flex justify-between items-center p-3.5 bg-zinc-50/40 text-xs text-zinc-800 hover:bg-zinc-50 transition-colors cursor-move"
                  >
                    <span className="font-bold flex items-center gap-2">
                      <span className="text-zinc-400">⣿</span>
                      {idx + 1}. {label}
                    </span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => moveMenu(idx, 'up')}
                        disabled={idx === 0}
                        className="py-1 px-2.5 border border-zinc-200 rounded bg-white hover:bg-zinc-100 text-zinc-600 text-[10px] font-bold disabled:opacity-30 cursor-pointer"
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => moveMenu(idx, 'down')}
                        disabled={idx === menuOrder.length - 1}
                        className="py-1 px-2.5 border border-zinc-200 rounded bg-white hover:bg-zinc-100 text-zinc-600 text-[10px] font-bold disabled:opacity-30 cursor-pointer"
                      >
                        ▼
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeSubTab === 'whatsapp' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 border-b border-zinc-100 pb-2">Templates de Mensagens do WhatsApp</h3>
              <p className="text-xs text-zinc-500 mt-1">Configure as mensagens padrão que serão enviadas para o WhatsApp do cliente em cada situação.</p>
              <p className="text-xs text-zinc-500 mt-1 bg-zinc-50 p-2 rounded border border-zinc-200">
                <span className="font-bold">Variáveis disponíveis para OS:</span> <code className="bg-white px-1 text-zinc-900">{`{nome}`}</code>, <code className="bg-white px-1 text-zinc-900">{`{os}`}</code>, <code className="bg-white px-1 text-zinc-900">{`{status}`}</code><br />
                <span className="font-bold">Variáveis disponíveis para Agendamentos:</span> <code className="bg-white px-1 text-zinc-900">{`{nome}`}</code>, <code className="bg-white px-1 text-zinc-900">{`{servico}`}</code>, <code className="bg-white px-1 text-zinc-900">{`{data}`}</code>, <code className="bg-white px-1 text-zinc-900">{`{tecnico}`}</code>
              </p>
            </div>

            <div className="space-y-4 max-w-4xl">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Aguardando Autorização (Orçamento)</label>
                <textarea
                  value={waMsgAguardando}
                  onChange={(e) => setWaMsgAguardando(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-xs bg-white resize-y"
                  rows={2}
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Orçamento Aprovado</label>
                <textarea
                  value={waMsgAprovado}
                  onChange={(e) => setWaMsgAprovado(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-xs bg-white resize-y"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Em Manutenção</label>
                <textarea
                  value={waMsgEmReparo}
                  onChange={(e) => setWaMsgEmReparo(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-xs bg-white resize-y"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Pronto para Entrega</label>
                <textarea
                  value={waMsgPronto}
                  onChange={(e) => setWaMsgPronto(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-xs bg-white resize-y"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Entregue / Finalizado</label>
                <textarea
                  value={waMsgEntregue}
                  onChange={(e) => setWaMsgEntregue(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-xs bg-white resize-y"
                  rows={2}
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Lembrete de Agendamento</label>
                <textarea
                  value={waMsgAppointment}
                  onChange={(e) => setWaMsgAppointment(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-xs bg-white resize-y"
                  rows={4}
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Padrão (Outros Status)</label>
                <textarea
                  value={waMsgDefault}
                  onChange={(e) => setWaMsgDefault(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-xs bg-white resize-y"
                  rows={2}
                />
              </div>

              <div className="pt-4 border-t border-zinc-100 flex justify-end">
                <button
                  onClick={handleSaveWhatsApp}
                  className="py-2 px-6 bg-zinc-900 text-white rounded-xl text-xs font-bold hover:bg-zinc-800 transition-colors shadow-sm cursor-pointer"
                >
                  Salvar Mensagens
                </button>
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'avancado' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 border-b border-zinc-100 pb-2">Opções Gerais do Aplicativo</h3>
              <p className="text-xs text-zinc-400">Gerencie a segurança das comissões, opções de finalização de O.S. e as configurações do menu de compras de aparelhos.</p>
            </div>

            {/* Commission Password */}
            <div className="bg-zinc-50 p-4 border border-zinc-150 rounded-2xl space-y-3">
              <h4 className="text-xs font-extrabold text-zinc-700 uppercase tracking-wider flex items-center gap-1.5">
                <Lock size={14} className="text-zinc-500" /> Senha para Exportação de Comissões
              </h4>
              <p className="text-[10px] text-zinc-400">Crie ou altere a senha exigida para baixar o relatório financeiro de comissões. Sem essa senha, ninguém poderá acessar ou baixar os dados de comissão dos técnicos e vendedores.</p>
              <div className="flex gap-2 max-w-sm">
                <input
                  type="password"
                  placeholder="Defina uma senha segura..."
                  value={commissionPassword}
                  onChange={(e) => setCommissionPassword(e.target.value)}
                  className="w-full px-3 py-1.5 border border-zinc-200 rounded-xl text-xs bg-white"
                />
              </div>
            </div>

            {/* OS Finalization Options */}
            <div className="bg-zinc-50 p-4 border border-zinc-150 rounded-2xl space-y-3">
              <h4 className="text-xs font-extrabold text-zinc-700 uppercase tracking-wider flex items-center gap-1.5">
                <Check size={14} className="text-zinc-500" /> Opções de Status para Finalização de O.S.
              </h4>
              <p className="text-[10px] text-zinc-400">Defina as opções de desfecho ao encerrar uma ordem de serviço. O sistema solicitará uma observação caso escolha opções sem reparo ou devolução.</p>
              
              <div className="flex gap-2 max-w-md">
                <input
                  type="text"
                  placeholder="Ex: Sem conserto / Sucata"
                  value={newFinOption}
                  onChange={(e) => setNewFinOption(e.target.value)}
                  className="flex-1 px-3 py-1.5 border border-zinc-200 rounded-xl text-xs bg-white"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newFinOption.trim()) {
                      setFinalizationOptions([...finalizationOptions, newFinOption.trim()]);
                      setNewFinOption('');
                    }
                  }}
                  className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Adicionar
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {finalizationOptions.map((opt) => (
                  <span key={opt} className="inline-flex items-center gap-1 py-1 px-2.5 bg-white border border-zinc-150 rounded-lg text-[10px] font-bold text-zinc-700 shadow-2xs">
                    {opt}
                    <button
                      type="button"
                      onClick={() => setFinalizationOptions(finalizationOptions.filter(f => f !== opt))}
                      className="text-zinc-400 hover:text-rose-600 font-bold ml-1 text-xs"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Product Types Settings */}
            <div className="bg-zinc-50 p-4 border border-zinc-150 rounded-2xl space-y-4">
              <h4 className="text-xs font-extrabold text-zinc-700 uppercase tracking-wider flex items-center gap-1.5">
                <ShoppingBag size={14} className="text-zinc-500" /> Categorias de Produtos
              </h4>
              <p className="text-[10px] text-zinc-400">Configure os tipos de produtos para organizar o seu estoque em pastas (Capa, Película, Carregador, Aparelho, etc).</p>
              
              <div className="space-y-2">
                <div className="flex gap-2 max-w-md">
                  <input
                    type="text"
                    placeholder="Nova categoria de produto..."
                    value={newProductType}
                    onChange={(e) => setNewProductType(e.target.value)}
                    className="flex-1 px-3 py-1.5 border border-zinc-200 rounded-xl text-xs bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newProductType.trim()) {
                        setProductTypes([...productTypes, newProductType.trim()]);
                        setNewProductType('');
                      }
                    }}
                    className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Adicionar
                  </button>
                </div>
                <div className="flex flex-col gap-1.5 pt-1">
                  {productTypes.map((type, idx) => (
                    <div 
                      key={type} 
                      draggable
                      onDragStart={() => setDraggedProductTypeIdx(idx)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (draggedProductTypeIdx === null || draggedProductTypeIdx === idx) return;
                        const newTypes = [...productTypes];
                        const item = newTypes.splice(draggedProductTypeIdx, 1)[0];
                        newTypes.splice(idx, 0, item);
                        setProductTypes(newTypes);
                        setDraggedProductTypeIdx(null);
                      }}
                      className="flex items-center justify-between py-2 px-3 bg-white border border-zinc-150 rounded-lg text-xs font-bold text-zinc-700 shadow-2xs cursor-move hover:bg-zinc-50 transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-zinc-400">⣿</span>
                        {type}
                      </span>
                      <button
                        type="button"
                        onClick={() => setProductTypes(productTypes.filter(t => t !== type))}
                        className="text-zinc-400 hover:text-rose-600 font-bold ml-1 text-xs px-2"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Equipment Purchases Settings */}
            <div className="bg-zinc-50 p-4 border border-zinc-150 rounded-2xl space-y-4">
              <h4 className="text-xs font-extrabold text-zinc-700 uppercase tracking-wider flex items-center gap-1.5">
                <Store size={14} className="text-zinc-500" /> Parâmetros de Compra de Equipamentos Usados
              </h4>
              <p className="text-[10px] text-zinc-400">Configure as opções exibidas quando sua assistência estiver comprando celulares, notebooks ou outros equipamentos de clientes.</p>

              {/* Purchase categories */}
              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-zinc-500">Categorias de Compra (Ex: Celulares, Informática)</label>
                <div className="flex gap-2 max-w-md">
                  <input
                    type="text"
                    placeholder="Nova categoria de compra..."
                    value={newPurCategory}
                    onChange={(e) => setNewPurCategory(e.target.value)}
                    className="flex-1 px-3 py-1.5 border border-zinc-200 rounded-xl text-xs bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newPurCategory.trim()) {
                        setPurchaseCategories([...purchaseCategories, newPurCategory.trim()]);
                        setNewPurCategory('');
                      }
                    }}
                    className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Adicionar
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {purchaseCategories.map((cat) => (
                    <span key={cat} className="inline-flex items-center gap-1 py-1 px-2.5 bg-white border border-zinc-150 rounded-lg text-[10px] font-bold text-zinc-700 shadow-2xs">
                      {cat}
                      <button
                        type="button"
                        onClick={() => setPurchaseCategories(purchaseCategories.filter(c => c !== cat))}
                        className="text-zinc-400 hover:text-rose-600 font-bold ml-1 text-xs"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Equipment types */}
              <div className="space-y-2 pt-2">
                <label className="block text-[11px] font-bold text-zinc-500">Tipos de Aparelho Disponíveis</label>
                <div className="flex gap-2 max-w-md">
                  <input
                    type="text"
                    placeholder="Computador, Tablet, Drone..."
                    value={newPurEquipType}
                    onChange={(e) => setNewPurEquipType(e.target.value)}
                    className="flex-1 px-3 py-1.5 border border-zinc-200 rounded-xl text-xs bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newPurEquipType.trim()) {
                        setPurchaseEquipmentTypes([...purchaseEquipmentTypes, newPurEquipType.trim()]);
                        setNewPurEquipType('');
                      }
                    }}
                    className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Adicionar
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {purchaseEquipmentTypes.map((t) => (
                    <span key={t} className="inline-flex items-center gap-1 py-1 px-2.5 bg-white border border-zinc-150 rounded-lg text-[10px] font-bold text-zinc-700 shadow-2xs">
                      {t}
                      <button
                        type="button"
                        onClick={() => setPurchaseEquipmentTypes(purchaseEquipmentTypes.filter(x => x !== t))}
                        className="text-zinc-400 hover:text-rose-600 font-bold ml-1 text-xs"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Enable online signature */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="enableSignature"
                  checked={enablePurchaseSignature}
                  onChange={(e) => setEnablePurchaseSignature(e.target.checked)}
                  className="w-4 h-4 text-zinc-900 border-zinc-300 rounded focus:ring-zinc-900"
                />
                <label htmlFor="enableSignature" className="text-xs font-bold text-zinc-700 cursor-pointer select-none">
                  Habilitar Assinatura Online do Cliente na Tela do Celular / Tablet
                </label>
              </div>
            </div>

            <div className="flex justify-end pt-3">
              <button
                type="button"
                onClick={() => handleSaveAdvanced()}
                className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-sm"
              >
                Salvar Opções Avançadas
              </button>
            </div>
          </div>
        )}

        {activeSubTab === 'impressoras' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 border-b border-zinc-100 pb-2">Conexão de Impressoras</h3>
              <p className="text-xs text-zinc-400">Gerencie a conexão do sistema com impressoras não fiscais (térmicas de recibo) e impressoras comuns (A4).</p>
            </div>

            {/* Impressora Não Fiscal */}
            <div className="bg-zinc-50 p-5 border border-zinc-150 rounded-2xl space-y-4">
              <h4 className="text-xs font-extrabold text-zinc-700 uppercase tracking-wider flex items-center gap-1.5 border-b border-zinc-200 pb-2">
                <Printer size={16} className="text-emerald-500" /> Impressora Não Fiscal (Térmica de Recibo)
              </h4>
              <p className="text-[10px] text-zinc-400">Configure para impressão rápida de comprovantes térmicos de 58mm ou 80mm em atendimentos de balcão e vendas PDV.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 mb-1">Meio de Conexão</label>
                  <select
                    value={nonFiscalPrinterType}
                    onChange={(e) => setNonFiscalPrinterType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-xs bg-white font-medium focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  >
                    <option value="none">Desconectada / Nenhuma</option>
                    <option value="bluetooth">Bluetooth (Impressora Térmica Portátil)</option>
                    <option value="usb">USB (via Driver ou WebUSB Direta)</option>
                    <option value="network">Rede TCP/IP (Ethernet / Wi-Fi)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 mb-1">Identificação / IP / Porta</label>
                  <input
                    type="text"
                    placeholder={nonFiscalPrinterType === 'network' ? 'Ex: 192.168.1.100:9100' : 'Ex: POS-80 ou COM3'}
                    disabled={nonFiscalPrinterType === 'none'}
                    value={nonFiscalPrinterName}
                    onChange={(e) => setNonFiscalPrinterName(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-1 focus:ring-zinc-900 disabled:opacity-50"
                  />
                </div>
              </div>

              {nonFiscalPrinterType !== 'none' && (
                <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-[10px] text-emerald-800 font-medium">
                  {nonFiscalPrinterType === 'bluetooth' && '✓ Impressora Bluetooth configurada. Garanta que o aparelho de vendas esteja pareado com a impressora térmica.'}
                  {nonFiscalPrinterType === 'usb' && '✓ Conexão via porta USB configurada. O sistema usará as rotinas de impressão local do navegador.'}
                  {nonFiscalPrinterType === 'network' && '✓ Impressora de rede configurada. O sistema enviará comandos diretamente para o endereço IP especificado.'}
                </div>
              )}
            </div>

            {/* Impressora Comum */}
            <div className="bg-zinc-50 p-5 border border-zinc-150 rounded-2xl space-y-4">
              <h4 className="text-xs font-extrabold text-zinc-700 uppercase tracking-wider flex items-center gap-1.5 border-b border-zinc-200 pb-2">
                <Printer size={16} className="text-zinc-600" /> Impressora Comum (A4 / Laser / Jato de Tinta)
              </h4>
              <p className="text-[10px] text-zinc-400">Configure a impressora padrão para emissão de Contratos de Compra, Ordens de Serviço completas ou Relatórios de Caixa.</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 mb-1">Meio de Conexão</label>
                  <select
                    value={commonPrinterType}
                    onChange={(e) => setCommonPrinterType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-xs bg-white font-medium focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  >
                    <option value="none">Desconectada / Nenhuma</option>
                    <option value="system">Diálogo de Impressão do Sistema (A4 Padrão)</option>
                    <option value="network">Rede IP (Wi-Fi / Cabeada)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 mb-1">Nome / IP da Impressora</label>
                  <input
                    type="text"
                    placeholder={commonPrinterType === 'network' ? 'Ex: 192.168.1.150' : 'Ex: HP Laserjet Pro'}
                    disabled={commonPrinterType === 'none'}
                    value={commonPrinterName}
                    onChange={(e) => setCommonPrinterName(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-1 focus:ring-zinc-900 disabled:opacity-50"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3">
              <button
                type="button"
                onClick={() => handleSavePrinters()}
                className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-sm"
              >
                Salvar Configurações de Impressora
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Password Modal for Secure Downloads */}
      <AnimatePresence>
        {isPassModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-zinc-150 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl"
            >
              <div className="flex items-center gap-2.5 text-zinc-950 font-sans font-bold">
                <Lock className="text-zinc-600" size={18} />
                <span>Confirme sua Senha</span>
              </div>
              <p className="text-xs text-zinc-500 leading-relaxed">
                {passPromptType === 'consolidated' 
                  ? "Insira a Senha Master de comissões para baixar o relatório consolidado de toda a equipe."
                  : `Insira a senha individual de ${passPromptStaff?.name} ou a Senha Master para baixar o relatório de comissão individual.`}
              </p>
              
              <input
                type="password"
                placeholder="Digite a senha..."
                value={promptPasswordInput}
                onChange={(e) => setPromptPasswordInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && verifyPasswordAndDownload()}
                className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm"
                autoFocus
              />

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Formato de Exportação</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['pdf', 'jpg', 'csv'] as const).map((fmt) => (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => setExportFormat(fmt)}
                      className={`py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        exportFormat === fmt
                          ? 'border-zinc-950 bg-zinc-950 text-white shadow-xs'
                          : 'border-zinc-200 hover:bg-zinc-50 text-zinc-600 bg-white'
                      }`}
                    >
                      {fmt.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 text-xs font-bold pt-2">
                <button
                  type="button"
                  onClick={() => setIsPassModalOpen(false)}
                  className="px-4 py-2 border border-zinc-200 text-zinc-600 rounded-xl hover:bg-zinc-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={verifyPasswordAndDownload}
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl cursor-pointer"
                >
                  Confirmar e Baixar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Editing Staff Modal */}
      <AnimatePresence>
        {editingStaff && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-zinc-150 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl"
            >
              <div className="flex items-center gap-2 text-zinc-950 font-sans font-bold border-b border-zinc-100 pb-3">
                <Settings className="text-zinc-600" size={18} />
                <span>Editar Colaborador: {editingStaff.name}</span>
              </div>

              <form onSubmit={handleEditStaffSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto pr-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Nome Completo</label>
                    <input
                      type="text"
                      required
                      value={editStaffName}
                      onChange={(e) => setEditStaffName(e.target.value)}
                      className="w-full px-3 py-1.5 border border-zinc-200 rounded-xl text-xs bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Funções (Marque as que se aplicam)</label>
                    <div className="flex items-center gap-4 mt-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={editStaffIsSeller} 
                          onChange={(e) => setEditStaffIsSeller(e.target.checked)} 
                          className="w-4 h-4 text-emerald-600 rounded border-zinc-300 focus:ring-emerald-500" 
                        />
                        <span className="text-xs font-bold text-zinc-700">Vendedor (Vendas)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={editStaffIsTechnician} 
                          onChange={(e) => setEditStaffIsTechnician(e.target.checked)} 
                          className="w-4 h-4 text-emerald-600 rounded border-zinc-300 focus:ring-emerald-500" 
                        />
                        <span className="text-xs font-bold text-zinc-700">Técnico (OS)</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Commission Configs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-zinc-100">
                  {/* Vendedor Commission */}
                  <div className={`space-y-3 p-3 rounded-xl border ${editStaffIsSeller ? 'border-zinc-200 bg-white' : 'border-zinc-100 bg-zinc-50/50 opacity-50 pointer-events-none'}`}>
                    <h4 className="text-[10px] font-bold text-zinc-800 uppercase tracking-wider flex items-center gap-1.5"><ShoppingBag size={12}/> Configurações de Vendedor</h4>
                    
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 mb-1">
                        Comissão de Vendas (%)
                        {!isMasterUnlocked && <span className="ml-1 text-red-400 font-normal normal-case">(Requer Master)</span>}
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        disabled={!isMasterUnlocked}
                        value={editStaffSalesCommission}
                        onChange={(e) => setEditStaffSalesCommission(e.target.value)}
                        className="w-full px-3 py-1.5 border border-zinc-200 rounded-xl text-xs disabled:bg-zinc-100"
                        placeholder="Ex: 5"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 mb-1">Comissão apenas p/ vendas acima de (R$)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        disabled={!isMasterUnlocked}
                        value={editStaffSalesMinLimit}
                        onChange={(e) => setEditStaffSalesMinLimit(e.target.value)}
                        className="w-full px-3 py-1.5 border border-zinc-200 rounded-xl text-xs disabled:bg-zinc-100"
                        placeholder="Ex: 100.00 (Deixe 0 para todas)"
                      />
                    </div>
                  </div>

                  {/* Technician Commission */}
                  <div className={`space-y-3 p-3 rounded-xl border ${editStaffIsTechnician ? 'border-zinc-200 bg-white' : 'border-zinc-100 bg-zinc-50/50 opacity-50 pointer-events-none'}`}>
                    <h4 className="text-[10px] font-bold text-zinc-800 uppercase tracking-wider flex items-center gap-1.5"><Cpu size={12}/> Configurações de Técnico</h4>
                    <p className="text-[9px] text-zinc-500">Defina comissão por tipo de produto.</p>
                    
                    <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                      {['Acessório', 'Notebook', 'Computador', 'Celular', 'Tablet', 'Console', 'Impressora', 'Peça', 'Outro'].map(type => {
                        const currentRate = editStaffTechCommissionByType.find(t => t.type === type)?.rate || 0;
                        return (
                          <div key={type} className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-semibold text-zinc-700 w-24 truncate">{type}</span>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                disabled={!isMasterUnlocked}
                                value={currentRate || ''}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  setEditStaffTechCommissionByType(prev => {
                                    const filtered = prev.filter(t => t.type !== type);
                                    if (val > 0) return [...filtered, { type, rate: val }];
                                    return filtered;
                                  });
                                }}
                                className="w-16 px-2 py-1 border border-zinc-200 rounded text-xs disabled:bg-zinc-100"
                                placeholder="0"
                              />
                              <span className="text-[10px] text-zinc-500">%</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="pt-1.5 border-t border-zinc-100">
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Key size={12} className="text-zinc-400" /> Senha para Download de Comissão <span className="text-[9px] text-zinc-400 font-normal normal-case">(Opcional)</span>
                  </label>
                  <input
                    type="password"
                    value={editStaffPassword}
                    onChange={(e) => setEditStaffPassword(e.target.value)}
                    className="w-full px-3 py-1.5 border border-zinc-200 rounded-xl text-xs bg-white"
                    placeholder="Configure para download individual..."
                  />
                  <p className="text-[9px] text-zinc-400 mt-1">
                    O colaborador usará esta senha para baixar o relatório de comissões dele de forma independente.
                  </p>
                </div>

                <div className="flex justify-end gap-2 text-xs font-bold pt-3 border-t border-zinc-100">
                  <button
                    type="button"
                    onClick={() => setEditingStaff(null)}
                    className="px-4 py-2 border border-zinc-200 text-zinc-600 rounded-xl hover:bg-zinc-50 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl cursor-pointer"
                  >
                    Salvar Alterações
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
