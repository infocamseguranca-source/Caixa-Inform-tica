import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Wrench, 
  Search, 
  Plus, 
  User, 
  Phone, 
  Laptop, 
  DollarSign, 
  CheckCircle, 
  X, 
  Clock, 
  AlertTriangle,
  Play,
  Check,
  Printer,
  FileText,
  Key,
  ChevronRight,
  Edit,
  Trash2,
  Calendar,
  Lock,
  Camera,
  PenTool,
  Share2,
  ExternalLink,
  QrCode,
  Grid,
  Download,
  MessageCircle
} from 'lucide-react';
import { ServiceOrder, OSStatus, PartOrder, ShopConfig, Customer, Staff } from '../types';
import { formatCurrency, formatDate, generateOSNumber, formatPhone } from '../utils';
import CustomerAutocomplete from './CustomerAutocomplete';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';

import PatternLockWidget from './PatternLockWidget';

interface ServiceOrdersProps {
  serviceOrders: ServiceOrder[];
  onAddOS: (os: Omit<ServiceOrder, 'id' | 'osNumber' | 'createdAt' | 'updatedAt'>) => Promise<ServiceOrder>;
  onEditOS: (id: string, os: Partial<ServiceOrder>) => Promise<ServiceOrder>;
  onDeleteOS: (id: string) => Promise<void>;
  onReceivePayment: (os: ServiceOrder, paymentMethod: 'dinheiro' | 'pix' | 'debito' | 'credito') => Promise<void>;
  onAddCustomer?: (customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  shopName?: string;
  shopPhone?: string;
  shopCnpjCpf?: string;
  shopEmail?: string;
  shopLogo?: string;
  autoSaveOSToDrive?: boolean;
  googleToken?: string | null;
  config?: ShopConfig;
  user: any | null;
  customers: Customer[];
  staffList: Staff[];
}

const capitalizeSentences = (text: string): string => {
  if (!text) return '';
  return text.replace(/(^\s*|[.!?]\s+)(.)/g, (match, separator, char) => {
    return separator + char.toUpperCase();
  });
};

const STATUS_OPTIONS: { value: OSStatus; label: string; colorClass: string; bgClass: string; borderClass: string }[] = [
  { value: 'aguardando', label: 'Orçamento', colorClass: 'text-amber-700', bgClass: 'bg-amber-50', borderClass: 'border-amber-200' },
  { value: 'aprovado', label: 'Aprovada', colorClass: 'text-sky-700', bgClass: 'bg-sky-50', borderClass: 'border-sky-200' },
  { value: 'em_reparo', label: 'Em Manutenção', colorClass: 'text-blue-700', bgClass: 'bg-blue-50', borderClass: 'border-blue-200' },
  { value: 'pronto', label: 'Pronta', colorClass: 'text-indigo-700', bgClass: 'bg-indigo-50', borderClass: 'border-indigo-200' },
  { value: 'entregue', label: 'Entregue / Finalizada', colorClass: 'text-emerald-700', bgClass: 'bg-emerald-50', borderClass: 'border-emerald-200' },
  { value: 'cancelado', label: 'Cancelada', colorClass: 'text-rose-700', bgClass: 'bg-rose-50', borderClass: 'border-rose-200' }
];

const PREDEFINED_DEVICES = [
  'Celular',
  'Tablet',
  'Notebook',
  'Computador',
  'Console',
  'Impressora'
];

export default function ServiceOrders({
  serviceOrders,
  onAddOS,
  onEditOS,
  onDeleteOS,
  onReceivePayment,
  onAddCustomer,
  shopName,
  shopPhone,
  shopCnpjCpf,
  shopEmail,
  shopLogo,
  autoSaveOSToDrive,
  googleToken,
  config,
  user,
  customers,
  staffList
}: ServiceOrdersProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'todas' | OSStatus>('todas');
  
  const [filterMonth, setFilterMonth] = useState<string>('todos');
  const [filterDay, setFilterDay] = useState<string>('todos');

  // Sorting order ('desc' is newest first, 'asc' is oldest first)
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // OS Finalization States
  const [isFinalizeModalOpen, setIsFinalizeModalOpen] = useState(false);
  const [finalizingOS, setFinalizingOS] = useState<ServiceOrder | null>(null);
  const [selectedFinalizationType, setSelectedFinalizationType] = useState('');
  const [finalizationObservation, setFinalizationObservation] = useState('');
  const [finalizePaymentMethod, setFinalizePaymentMethod] = useState<'dinheiro' | 'pix' | 'debito' | 'credito'>('pix');
  const [finalizeMarkAsPaid, setFinalizeMarkAsPaid] = useState(false);

  const handleOpenFinalize = (os: ServiceOrder) => {
    setFinalizingOS(os);
    const options = config?.finalizationOptions || ['Pronto para Retirada', 'Retirado Sem Reparo', 'Devolvido ao Cliente'];
    setSelectedFinalizationType(options[0] || 'Pronto para Retirada');
    setFinalizationObservation('');
    setFinalizeMarkAsPaid(os.paymentStatus === 'pago');
    setIsFinalizeModalOpen(true);
  };

  const handleSubmitFinalize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!finalizingOS) return;

    try {
      const isNoRepair = selectedFinalizationType.toLowerCase().includes('sem reparo') || 
                          selectedFinalizationType.toLowerCase().includes('devol') || 
                          selectedFinalizationType.toLowerCase().includes('sem conserto');

      // Append finalization note to technical diagnosis
      const appendNote = `\n[Finalização: ${selectedFinalizationType}${finalizationObservation ? ` - Obs: ${finalizationObservation}` : ''}]`;
      const updatedDiagnosis = (finalizingOS.technicalDiagnosis || '') + appendNote;

      const updatedFields: Partial<ServiceOrder> = {
        status: 'entregue',
        technicalDiagnosis: updatedDiagnosis,
        updatedAt: new Date().toISOString()
      };

      if (finalizeMarkAsPaid && finalizingOS.paymentStatus !== 'pago') {
        updatedFields.paymentStatus = 'pago';
        updatedFields.paymentMethod = finalizePaymentMethod;
      }

      const updatedOS = await onEditOS(finalizingOS.id, updatedFields);
      
      setIsFinalizeModalOpen(false);
      setFinalizingOS(null);
      
      setSavedOSForPrompt(updatedOS);
      setIsSavedPromptOpen(true);
    } catch (err) {
      console.error(err);
      alert('Erro ao finalizar a Ordem de Serviço.');
    }
  };

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOS, setEditingOS] = useState<ServiceOrder | null>(null);
  
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentOS, setPaymentOS] = useState<ServiceOrder | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'dinheiro' | 'pix' | 'debito' | 'credito'>('pix');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printOS, setPrintOS] = useState<ServiceOrder | null>(null);

  // Saved / Finalized OS prompt states
  const [isSavedPromptOpen, setIsSavedPromptOpen] = useState(false);
  const [savedOSForPrompt, setSavedOSForPrompt] = useState<ServiceOrder | null>(null);

  // Confirm Print Prompt states
  const [isConfirmPrintModalOpen, setIsConfirmPrintModalOpen] = useState(false);
  const [confirmPrintOS, setConfirmPrintOS] = useState<ServiceOrder | null>(null);

  // Form Fields
  const [customerName, setCustomerName] = useState('');
  const [customerCpfCnpj, setCustomerCpfCnpj] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerBirthDate, setCustomerBirthDate] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [deviceType, setDeviceType] = useState('Celular');
  const [serialNumber, setSerialNumber] = useState('');
  const [reportedDefect, setReportedDefect] = useState('');
  const [deviceObservations, setDeviceObservations] = useState('');
  const [technicalDiagnosis, setTechnicalDiagnosis] = useState('');
  const [status, setStatus] = useState<OSStatus>('aguardando');
  const [priceLaborStr, setPriceLaborStr] = useState('0');
  const [pricePartsStr, setPricePartsStr] = useState('0');
  const [paymentStatus, setPaymentStatus] = useState<'pendente' | 'pago'>('pendente');
  const [formPaymentMethod, setFormPaymentMethod] = useState<'dinheiro' | 'pix' | 'debito' | 'credito'>('pix');
  const [technicianId, setTechnicianId] = useState<string>('');

  // New Fields: Pattern Lock sequence
  const [patternLock, setPatternLock] = useState<string>('');
  const [passwordType, setPasswordType] = useState<'pin' | 'padrao' | 'escrita'>('padrao');
  const [passwordValue, setPasswordValue] = useState<string>('');
  
  // Signature ref
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signatureData, setSignatureData] = useState<string>('');

  // Device Photos state
  const [photos, setPhotos] = useState<string[]>([]);

  // Part Order states
  const [partName, setPartName] = useState('');
  const [partCostPrice, setPartCostPrice] = useState('0');
  const [partClientPrice, setPartClientPrice] = useState('0');
  const [partSupplierLink, setPartSupplierLink] = useState('');

  // Automatically generate and save/download OS PDF locally, and upload to Google Drive if token available
  const generateAndSaveOSPDF = async (os: ServiceOrder) => {
    try {
      console.log('Starting custom visual PDF generation for O.S. #', os.osNumber);

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

      const primaryHex = config?.colors?.primary || '#18181b';
      const rgb = hexToRgb(primaryHex);

      // --- PAGE BORDER & STYLE ---
      doc.setDrawColor(228, 228, 231); // Light zinc border
      doc.rect(10, 10, 190, 277); // Outer frame

      // --- HEADER ACCENT BAR (Top colored brand bar) ---
      doc.setFillColor(rgb.r, rgb.g, rgb.b);
      doc.rect(10, 10, 190, 5, 'F');

      // --- COMPANY LOGO OR TITLE ---
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
          doc.text(`Contato: ${formatPhone(shopPhone || '')} | Email: ${shopEmail || 'N/A'}`, 39, 33);
        } catch (logoErr) {
          console.error("Error drawing shop logo, defaulting to text:", logoErr);
          // Fallback text
          doc.setFont('Helvetica', 'bold');
          doc.setFontSize(16);
          doc.setTextColor(rgb.r, rgb.g, rgb.b);
          doc.text(shopName || 'INFO_CAM TECNOLOGIA', 15, 24);
          
          doc.setFont('Helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(100, 100, 100);
          doc.text(`CNPJ/CPF: ${shopCnpjCpf || 'N/A'} | Contato: ${formatPhone(shopPhone || '')}`, 15, 30);
          doc.text(`Email: ${shopEmail || 'N/A'}`, 15, 35);
        }
      } else {
        // Text header
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(16);
        doc.setTextColor(rgb.r, rgb.g, rgb.b);
        doc.text(shopName || 'INFO_CAM TECNOLOGIA', 15, 24);
        
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(`CNPJ/CPF: ${shopCnpjCpf || 'N/A'} | Contato: ${formatPhone(shopPhone || '')}`, 15, 30);
        doc.text(`Email: ${shopEmail || 'N/A'}`, 15, 35);
      }

      // --- DOCUMENT METADATA PANEL (Right Header) ---
      doc.setFillColor(244, 244, 245); // light grey block
      doc.rect(130, 18, 65, 22, 'F');
      doc.setDrawColor(212, 212, 216);
      doc.rect(130, 18, 65, 22);

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(30, 30, 30);
      doc.text(`ORDEM DE SERVIÇO`, 134, 23);
      doc.setFontSize(12);
      doc.setTextColor(rgb.r, rgb.g, rgb.b);
      doc.text(`Nº ${os.osNumber}`, 134, 29);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 100, 100);
      doc.text(`Abertura: ${formatDate(os.createdAt)}`, 134, 34);
      doc.text(`Status: ${os.status.toUpperCase()}`, 134, 38);

      // --- SECTION BUILDER HELPER ---
      const drawSectionHeader = (title: string, yPos: number) => {
        doc.setFillColor(rgb.r, rgb.g, rgb.b);
        doc.rect(15, yPos, 180, 5.5, 'F');
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(255, 255, 255);
        doc.text(title, 18, yPos + 4);
      };

      // --- CLIENT DATA SECTION ---
      let y = 46;
      drawSectionHeader('DADOS DO CLIENTE', y);
      
      doc.setDrawColor(rgb.r, rgb.g, rgb.b);
      doc.rect(15, y + 5.5, 180, 22); // Client box
      
      doc.setFontSize(8);
      doc.setTextColor(80, 80, 80);
      doc.setFont('Helvetica', 'bold');
      doc.text('Nome:', 18, y + 10.5);
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(30, 30, 30);
      doc.text(os.customerName, 28, y + 10.5);

      if (os.customerCpfCnpj) {
        doc.setTextColor(80, 80, 80);
        doc.setFont('Helvetica', 'bold');
        doc.text('CPF/CNPJ:', 120, y + 10.5);
        doc.setFont('Helvetica', 'normal');
        doc.setTextColor(30, 30, 30);
        doc.text(os.customerCpfCnpj, 137, y + 10.5);
      }

      doc.setTextColor(80, 80, 80);
      doc.setFont('Helvetica', 'bold');
      doc.text('Telefone:', 18, y + 15.5);
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(30, 30, 30);
      doc.text(formatPhone(os.customerPhone), 31, y + 15.5);

      doc.setTextColor(80, 80, 80);
      doc.setFont('Helvetica', 'bold');
      doc.text('Email:', 18, y + 20.5);
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(30, 30, 30);
      doc.text(os.customerEmail || 'Não informado', 28, y + 20.5);

      // Address on client box right-side
      doc.setTextColor(80, 80, 80);
      doc.setFont('Helvetica', 'bold');
      doc.text('Endereço:', 105, y + 10.5);
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(30, 30, 30);
      doc.text(os.customerAddress || 'Não informado', 120, y + 10.5, { maxWidth: 70 });

      // --- DEVICE / EQUIPMENT DATA SECTION ---
      y = 78;
      drawSectionHeader('ESPECIFICAÇÕES DO EQUIPAMENTO', y);
      
      doc.rect(15, y + 5.5, 180, 18); // Equipment box
      
      doc.setFontSize(8);
      doc.setTextColor(80, 80, 80);
      doc.setFont('Helvetica', 'bold');
      doc.text('Equipamento:', 18, y + 10.5);
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(30, 30, 30);
      doc.text(os.deviceName, 38, y + 10.5);

      doc.setTextColor(80, 80, 80);
      doc.setFont('Helvetica', 'bold');
      doc.text('Tipo de Aparelho:', 18, y + 15.5);
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(30, 30, 30);
      doc.text(os.deviceType || 'Celular', 42, y + 15.5);

      doc.setTextColor(80, 80, 80);
      doc.setFont('Helvetica', 'bold');
      doc.text('Nº de Série/IMEI:', 105, y + 10.5);
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(30, 30, 30);
      doc.text(os.serialNumber || 'N/A', 130, y + 10.5);

      // Password logic: "e a senha Padrão aparecendo apenas na OS de celular ou tablets."
      const isCellOrTablet = ['celular', 'tablet', 'celulares', 'tablets', 'smartphone', 'smartphones'].includes((os.deviceType || '').toLowerCase());
      if (isCellOrTablet) {
        doc.setTextColor(80, 80, 80);
        doc.setFont('Helvetica', 'bold');
        doc.text('Senha de Desbloqueio:', 105, y + 15.5);
        doc.setFont('Helvetica', 'normal');
        doc.setTextColor(190, 24, 24); // red text to make it easy to find
        let pwdText = 'Não informada';
        if (os.passwordType === 'padrao' || !os.passwordType) {
          pwdText = os.patternLock ? `Padrão: ${os.patternLock}` : 'Não informada';
        } else {
          pwdText = `${os.passwordType === 'pin' ? 'PIN' : 'Escrita'}: ${os.passwordValue || 'Não informada'}`;
        }
        doc.text(pwdText, 140, y + 15.5);
      } else {
        doc.setTextColor(120, 120, 120);
        doc.setFont('Helvetica', 'normal');
        doc.text('Senha de Desbloqueio: Ocultada (Dispositivo s/ tela)', 105, y + 15.5);
      }

      // --- PROBLEM AND DIAGNOSIS SECTION ---
      y = 106;
      drawSectionHeader('DEFEITO RECLAMADO & DIAGNÓSTICO TÉCNICO', y);
      
      doc.rect(15, y + 5.5, 180, 32); // Problem box
      
      doc.setFontSize(8);
      doc.setTextColor(80, 80, 80);
      doc.setFont('Helvetica', 'bold');
      doc.text('Defeito Reclamado pelo Cliente:', 18, y + 10.5);
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(30, 30, 30);
      doc.text(os.reportedDefect || 'Sem defeito relatado.', 18, y + 15.5, { maxWidth: 174 });

      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(80, 80, 80);
      doc.text('Diagnóstico e Solução Técnica:', 18, y + 23.5);
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(30, 30, 30);
      doc.text(os.technicalDiagnosis || 'Aguardando avaliação técnica.', 18, y + 28.5, { maxWidth: 174 });

      // --- FINANCIAL AND PRICING SUMMARY ---
      y = 148;
      drawSectionHeader('VALORES E SITUAÇÃO DE FATURAMENTO', y);
      
      doc.setFillColor(248, 250, 252); // extremely soft slate blue bg
      doc.rect(15, y + 5.5, 180, 24, 'F');
      doc.rect(15, y + 5.5, 180, 24); // border
      
      doc.setFontSize(8);
      doc.setTextColor(80, 80, 80);
      doc.setFont('Helvetica', 'bold');
      doc.text('Valor da Mão de Obra / Serviços:', 18, y + 11);
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(30, 30, 30);
      doc.text(formatCurrency(os.priceLabor), 65, y + 11);

      doc.setTextColor(80, 80, 80);
      doc.setFont('Helvetica', 'bold');
      doc.text('Valor de Peças / Componentes:', 18, y + 16);
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(30, 30, 30);
      doc.text(formatCurrency(os.priceParts), 65, y + 16);

      // Draw vertical divider
      doc.setDrawColor(200, 200, 200);
      doc.line(110, y + 7, 110, y + 22);

      // Right column summary (TOTAL)
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(rgb.r, rgb.g, rgb.b);
      doc.text(`VALOR TOTAL: ${formatCurrency(os.totalAmount)}`, 115, y + 12);
      
      doc.setFontSize(8);
      doc.setTextColor(80, 80, 80);
      doc.text('Situação Financeira:', 115, y + 18);
      doc.setFont('Helvetica', 'bold');
      if (os.paymentStatus === 'pago') {
        doc.setTextColor(22, 101, 52); // green
        doc.text('PAGO / RECEBIDO', 148, y + 18);
      } else {
        doc.setTextColor(180, 83, 9); // orange
        doc.text('PENDENTE / AGUARDANDO', 148, y + 18);
      }

      // --- OBSERVATIONS AND TERMS ---
      y = 182;
      drawSectionHeader('TERMOS DE SERVIÇO & OBSERVAÇÕES', y);
      
      doc.rect(15, y + 5.5, 180, 22); // Terms box
      
      doc.setFontSize(6.5);
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text('1. Os serviços prestados possuem garantia legal de 90 dias a contar da data de entrega do equipamento.', 18, y + 9.5);
      doc.text('2. Aparelhos prontos e não retirados em até 90 dias úteis estarão sujeitos à venda pública para custeio dos custos de reparo, insumos e armazenamento.', 18, y + 12.5);
      doc.text('3. A garantia cobre apenas os defeitos reparados descritos no presente laudo técnico, não se aplicando a outros componentes ou avarias futuras.', 18, y + 15.5);
      if (os.deviceObservations) {
        doc.setFont('Helvetica', 'bold');
        doc.text(`OBSERVAÇÕES: ${os.deviceObservations}`, 18, y + 20.5, { maxWidth: 174 });
      }

      // --- SIGNATURES ---
      let sigY = 216;
      doc.setDrawColor(180, 180, 180);
      
      // Technical Signature Line
      doc.line(25, sigY + 18, 90, sigY + 18);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(80, 80, 80);
      doc.text('Assinatura do Técnico Responsável', 38, sigY + 22);

      // Customer Signature Line
      doc.line(120, sigY + 18, 185, sigY + 18);
      doc.text('Assinatura do Cliente / Proprietário', 133, sigY + 22);

      // Draw Customer signature image if exists!
      if (os.signature && os.signature.trim().startsWith('data:image')) {
        try {
          doc.addImage(os.signature, 'PNG', 132, sigY + 1, 40, 15);
        } catch (sigErr) {
          console.error("Error drawing signature image in PDF:", sigErr);
        }
      }

      // Footer
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(150, 150, 150);
      doc.text(`Documento emitido automaticamente em ${new Date().toLocaleString('pt-BR')}`, 15, 272);

      // Save PDF locally first
      const cleanCustomerName = os.customerName.replace(/[^a-zA-Z0-9]/g, '_');
      doc.save(`OS_${os.osNumber}_${cleanCustomerName}.pdf`);

      const pdfBlob = doc.output('blob');

      // If Google Drive integration is not active or set up, don't try to upload
      if (!googleToken || !autoSaveOSToDrive) {
        return;
      }

      // 2. Query for directory folder named "InfoCam_OS_PDFs"
      const folderQueryResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=name='InfoCam_OS_PDFs'+and+mimeType='application/vnd.google-apps.folder'+and+trashed=false`,
        {
          headers: {
            'Authorization': `Bearer ${googleToken}`
          }
        }
      );

      let folderId = '';
      if (folderQueryResponse.ok) {
        const folderQueryData = await folderQueryResponse.json();
        if (folderQueryData.files && folderQueryData.files.length > 0) {
          folderId = folderQueryData.files[0].id;
        }
      }

      // Create folder if it doesn't exist
      if (!folderId) {
        const createFolderResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${googleToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: 'InfoCam_OS_PDFs',
            mimeType: 'application/vnd.google-apps.folder',
            description: 'Pasta para salvamento automático das ordens de serviço geradas'
          })
        });

        if (createFolderResponse.ok) {
          const createFolderData = await createFolderResponse.json();
          folderId = createFolderData.id;
        }
      }

      // 3. Upload raw Blob directly as base64 multipart form
      const fileName = `OS_${os.osNumber}_${cleanCustomerName}.pdf`;
      const metadata = {
        name: fileName,
        mimeType: 'application/pdf',
        parents: folderId ? [folderId] : []
      };

      const boundary = 'os_pdf_boundary_999';
      const delimiter = `\r\n--${boundary}\r\n`;
      const closeDelim = `\r\n--${boundary}--`;

      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result?.toString().split(',')[1];
        if (!base64Data) return;

        const metadataPart = delimiter +
          'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
          JSON.stringify(metadata);

        const mediaPart = delimiter +
          'Content-Type: application/pdf\r\n' +
          'Content-Transfer-Encoding: base64\r\n\r\n' +
          base64Data +
          closeDelim;

        const multipartBody = metadataPart + mediaPart;

        const uploadResponse = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${googleToken}`,
            'Content-Type': `multipart/related; boundary=${boundary}`
          },
          body: multipartBody
        });

        if (uploadResponse.ok) {
          console.log(`[Google Drive] PDF da O.S. ${os.osNumber} salvo com sucesso!`);
        } else {
          console.error('[Google Drive] Erro ao enviar PDF:', await uploadResponse.text());
        }
      };

      reader.readAsDataURL(pdfBlob);

    } catch (err) {
      console.error('[Google Drive] Falha geral no auto-save:', err);
    }
  };

  // Setup/Reset drawing pad canvas
  useEffect(() => {
    if (isModalOpen && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#18181b';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      if (editingOS?.signature) {
        // Redraw saved signature if editing
        const image = new Image();
        image.src = editingOS.signature;
        image.onload = () => {
          ctx?.drawImage(image, 0, 0);
          setSignatureData(editingOS.signature || '');
        };
      } else {
        setSignatureData('');
      }
    }
  }, [isModalOpen, editingOS]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    // Get mouse or touch coordinates
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    ctx.beginPath();
    ctx.moveTo((clientX - rect.left) * scaleX, (clientY - rect.top) * scaleY);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.lineTo((clientX - rect.left) * scaleX, (clientY - rect.top) * scaleY);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (canvasRef.current) {
      setSignatureData(canvasRef.current.toDataURL('image/png'));
    }
  };

  const clearSignature = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setSignatureData('');
    }
  };

  // Pattern lock click handling (simple, robust dot selection sequence)
  const togglePatternDot = (dotId: number) => {
    const sequence = patternLock ? patternLock.split('-') : [];
    if (sequence.includes(dotId.toString())) {
      // Remove it and subsequent ones
      const idx = sequence.indexOf(dotId.toString());
      const updated = sequence.slice(0, idx);
      setPatternLock(updated.join('-'));
    } else {
      sequence.push(dotId.toString());
      setPatternLock(sequence.join('-'));
    }
  };

  const hasChangesComputed = useMemo(() => {
    if (!editingOS) return false;
    return (
      customerName !== editingOS.customerName ||
      customerCpfCnpj !== (editingOS.customerCpfCnpj || '') ||
      customerPhone !== editingOS.customerPhone ||
      customerEmail !== (editingOS.customerEmail || '') ||
      customerBirthDate !== (editingOS.customerBirthDate || '') ||
      customerAddress !== (editingOS.customerAddress || '') ||
      deviceName !== editingOS.deviceName ||
      deviceType !== editingOS.deviceType ||
      serialNumber !== (editingOS.serialNumber || '') ||
      reportedDefect !== editingOS.reportedDefect ||
      deviceObservations !== (editingOS.deviceObservations || '') ||
      technicalDiagnosis !== (editingOS.technicalDiagnosis || '') ||
      status !== editingOS.status ||
      priceLaborStr !== (editingOS.priceLabor?.toString() || '0') ||
      pricePartsStr !== (editingOS.priceParts?.toString() || '0') ||
      paymentStatus !== editingOS.paymentStatus ||
      technicianId !== (editingOS.technicianId || '') ||
      patternLock !== (editingOS.patternLock || '') ||
      passwordType !== (editingOS.passwordType || 'padrao') ||
      passwordValue !== (editingOS.passwordValue || '') ||
      partName !== (editingOS.partOrder?.name || '') ||
      partCostPrice !== (editingOS.partOrder?.costPrice?.toString() || '0') ||
      partClientPrice !== (editingOS.partOrder?.clientPrice?.toString() || '0') ||
      partSupplierLink !== (editingOS.partOrder?.supplierLink || '')
    );
  }, [
    editingOS, customerName, customerCpfCnpj, customerPhone, customerEmail, customerBirthDate, 
    customerAddress, deviceName, deviceType, serialNumber, reportedDefect, 
    deviceObservations, technicalDiagnosis, status, priceLaborStr, pricePartsStr, 
    paymentStatus, technicianId, patternLock, passwordType, passwordValue, partName, partCostPrice, partClientPrice, partSupplierLink
  ]);

  // Base64 Photo Upload handlers
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPhotos(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file as Blob);
      });
    }
  };

  const removePhoto = (idx: number) => {
    setPhotos(photos.filter((_, i) => i !== idx));
  };

  const openAddModal = () => {
    setEditingOS(null);
    setCustomerName('');
    setCustomerCpfCnpj('');
    setCustomerPhone('');
    setCustomerEmail('');
    setCustomerBirthDate('');
    setCustomerAddress('');
    setDeviceName('');
    setDeviceType('Celular');
    setSerialNumber('');
    setReportedDefect('');
    setDeviceObservations('');
    setTechnicalDiagnosis('');
    setStatus('aguardando');
    setPriceLaborStr('0');
    setPricePartsStr('0');
    setPaymentStatus('pendente');
    setFormPaymentMethod('pix');
    setTechnicianId('');
    setPatternLock('');
    setPasswordType('padrao');
    setPasswordValue('');
    setPhotos([]);
    setSignatureData('');
    // Part Order reset
    setPartName('');
    setPartCostPrice('0');
    setPartClientPrice('0');
    setPartSupplierLink('');
    setIsModalOpen(true);
  };

  const openEditModal = (os: ServiceOrder) => {
    setEditingOS(os);
    setCustomerName(os.customerName);
    setCustomerCpfCnpj(os.customerCpfCnpj || '');
    setCustomerPhone(os.customerPhone);
    setCustomerEmail(os.customerEmail || '');
    setCustomerBirthDate(os.customerBirthDate || '');
    setCustomerAddress(os.customerAddress || '');
    setDeviceName(os.deviceName);
    setDeviceType(os.deviceType || 'Celular');
    setSerialNumber(os.serialNumber || '');
    setReportedDefect(os.reportedDefect);
    setDeviceObservations(os.deviceObservations || '');
    setTechnicalDiagnosis(os.technicalDiagnosis || '');
    setStatus(os.status);
    setPriceLaborStr(os.priceLabor.toString());
    setPricePartsStr(os.priceParts.toString());
    setPaymentStatus(os.paymentStatus);
    setFormPaymentMethod(os.paymentMethod || 'pix');
    setTechnicianId(os.technicianId || '');
    setPatternLock(os.patternLock || '');
    setPasswordType(os.passwordType || 'padrao');
    setPasswordValue(os.passwordValue || '');
    setPhotos(os.photos || []);
    setSignatureData(os.signature || '');
    // Part Order fields loading
    setPartName(os.partOrder?.name || '');
    setPartCostPrice(os.partOrder?.costPrice?.toString() || '0');
    setPartClientPrice(os.partOrder?.clientPrice?.toString() || '0');
    setPartSupplierLink(os.partOrder?.supplierLink || '');
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const priceLabor = parseFloat(priceLaborStr.replace(',', '.')) || 0;
    const priceParts = parseFloat(pricePartsStr.replace(',', '.')) || 0;

    let partOrder: PartOrder | undefined = undefined;
    if (partName.trim()) {
      partOrder = {
        name: partName,
        costPrice: parseFloat(partCostPrice.replace(',', '.')) || 0,
        clientPrice: parseFloat(partClientPrice.replace(',', '.')) || 0,
        supplierLink: partSupplierLink
      };
    }

    try {
      // Auto-register customer if not exists
      if (onAddCustomer && customerName.trim()) {
        const normalizedNewPhone = customerPhone.replace(/\D/g, '');
        const normalizedNewName = customerName.trim().toLowerCase();
        
        const clientExists = customers.some(c => {
          const existingPhone = c.phone ? String(c.phone).replace(/\D/g, '') : '';
          const existingName = c.name ? String(c.name).trim().toLowerCase() : '';
          if (normalizedNewPhone && existingPhone && normalizedNewPhone === existingPhone) return true;
          if (normalizedNewName === existingName) return true;
          return false;
        });

        if (!clientExists) {
          try {
            await onAddCustomer({
              name: customerName,
              phone: customerPhone,
              email: customerEmail,
              address: customerAddress,
              birthDate: customerBirthDate,
              cpfCnpj: customerCpfCnpj
            });
            console.log('Customer registered automatically:', customerName);
          } catch (autoErr) {
            console.error('Error auto-registering customer during OS creation:', autoErr);
          }
        }
      }

      let savedOS: ServiceOrder | null = null;
      if (editingOS) {
        savedOS = await onEditOS(editingOS.id, {
          customerName,
          customerCpfCnpj,
          customerPhone,
          customerEmail,
          customerBirthDate,
          customerAddress,
          deviceName,
          deviceType,
          serialNumber,
          reportedDefect,
          deviceObservations,
          technicalDiagnosis,
          status,
          priceLabor,
          priceParts,
          totalAmount: priceLabor + priceParts,
          paymentStatus,
          paymentMethod: formPaymentMethod,
          patternLock,
          passwordType,
          passwordValue,
          signature: signatureData || undefined,
          photos,
          partOrder,
          technicianId
        });
      } else {
        savedOS = await onAddOS({
          customerName,
          customerCpfCnpj,
          customerPhone,
          customerEmail,
          customerBirthDate,
          customerAddress,
          deviceName,
          deviceType,
          serialNumber,
          reportedDefect,
          deviceObservations,
          technicalDiagnosis,
          status,
          priceLabor,
          priceParts,
          totalAmount: priceLabor + priceParts,
          paymentStatus,
          paymentMethod: formPaymentMethod,
          patternLock,
          passwordType,
          passwordValue,
          signature: signatureData || undefined,
          photos,
          partOrder,
          technicianId
        });
      }
      setIsModalOpen(false);
      
      if (savedOS) {
        setSavedOSForPrompt(savedOS);
        setIsSavedPromptOpen(true);
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar Ordem de Serviço.');
    }
  };

  const handleDelete = async (id: string) => {
    if (config?.commissionPassword) {
      const pass = window.prompt('Digite a Senha Master para excluir:');
      if (pass !== config.commissionPassword) {
        alert('Senha incorreta!');
        return;
      }
    }

    if (window.confirm('Excluir esta ordem de serviço? Isso removerá o registro permanentemente.')) {
      try {
        await onDeleteOS(id);
      } catch (err) {
        console.error(err);
        alert('Erro ao excluir.');
      }
    }
  };

  const handleSendWhatsApp = (os: ServiceOrder) => {
    if (!os.customerPhone) {
      alert('Esta OS não possui um telefone de cliente cadastrado.');
      return;
    }

    const cleanPhone = os.customerPhone.replace(/\D/g, '');
    let formattedPhone = cleanPhone;
    
    // Check if country code is missing, assume Brazil (+55)
    if (cleanPhone.length === 10 || cleanPhone.length === 11) {
      formattedPhone = '55' + cleanPhone;
    }

    const statusObj = STATUS_OPTIONS.find(s => s.value === os.status);
    const statusName = statusObj ? statusObj.label : os.status;

    let messageTemplate = '';
    
    if (config?.whatsappMessages) {
      if (os.status === 'pronto') {
        messageTemplate = config.whatsappMessages.pronto || '';
      } else if (os.status === 'aguardando') {
        messageTemplate = config.whatsappMessages.aguardando || '';
      } else if (os.status === 'aprovado') {
        messageTemplate = config.whatsappMessages.aprovado || '';
      } else if (os.status === 'em_reparo') {
        messageTemplate = config.whatsappMessages.em_reparo || '';
      } else if (os.status === 'entregue') {
        messageTemplate = config.whatsappMessages.entregue || '';
      }
    }
    
    if (!messageTemplate) {
       messageTemplate = config?.whatsappMessages?.default || `Olá, {nome}. A sua OS {os} está atualizada como *{status}*. Obrigado pela preferência!!!`;
    }

    const message = messageTemplate
      .replace(/\{nome\}/g, os.customerName)
      .replace(/\{os\}/g, os.osNumber)
      .replace(/\{status\}/g, statusName);

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;

    if (config?.whatsappApiToken && config?.whatsappPhoneNumberId) {
      try {
        fetch(`https://graph.facebook.com/v17.0/${config.whatsappPhoneNumberId}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.whatsappApiToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: formattedPhone,
            type: "text",
            text: { body: message }
          })
        }).then(async (response) => {
          if (!response.ok) {
            const errData = await response.json();
            console.error('WhatsApp API Error:', errData);
            alert('Erro na API do WhatsApp (verifique a regra de 24h ou credenciais). Abrindo o WhatsApp Web como fallback...');
            window.open(whatsappUrl, '_blank');
          } else {
            alert('Mensagem enviada com sucesso pela API do WhatsApp Business!');
          }
        }).catch((err) => {
          console.error('Fetch error:', err);
          window.open(whatsappUrl, '_blank');
        });
        return;
      } catch (err) {
        console.error(err);
      }
    }
    
    window.open(whatsappUrl, '_blank');
  };

  const triggerPaymentFlow = (os: ServiceOrder) => {
    setPaymentOS(os);
    setSelectedPaymentMethod('pix');
    setIsPaymentModalOpen(true);
  };

  const confirmPayment = async () => {
    if (!paymentOS) return;
    try {
      await onReceivePayment(paymentOS, selectedPaymentMethod);
      setIsPaymentModalOpen(false);
      setPaymentOS(null);
    } catch (err) {
      console.error(err);
      alert('Erro ao processar o pagamento.');
    }
  };

  const openPrintPreview = (os: ServiceOrder) => {
    setPrintOS(os);
    setIsPrintModalOpen(true);
  };

  const handlePrintClick = (os: ServiceOrder) => {
    setConfirmPrintOS(os);
    setIsConfirmPrintModalOpen(true);
  };

  // WhatsApp quick sharing message generator
  const sendWhatsApp = (os: ServiceOrder) => {
    const formattedPhone = os.customerPhone.replace(/\D/g, '');
    const trackingUrl = `${window.location.origin}?os_track=${os.osNumber}`;
    const statusText = STATUS_OPTIONS.find(s => s.value === os.status)?.label || os.status;
    const message = `Olá *${os.customerName}*,\n` +
      `Sua Ordem de Serviço *${os.osNumber}* na *${shopName || 'Nossa Assistência'}* está no status: *${statusText}*.\n` +
      `🛠️ Equipamento: ${os.deviceName}\n` +
      `💰 Valor Total: ${formatCurrency(os.totalAmount)}\n` +
      `🔗 Acompanhe em tempo real pelo link:\n` +
      `${trackingUrl}\n` +
      `Obrigado por sua confiança!`;

    const encodedText = encodeURIComponent(message);
    const link = `https://api.whatsapp.com/send?phone=55${formattedPhone}&text=${encodedText}`;
    window.open(link, '_blank');
  };

  // Filter service orders
  const filteredOS = serviceOrders.filter(os => {
    const matchesSearch = 
      os.osNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      os.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      os.deviceName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTab = activeTab === 'todas' || os.status === activeTab;

    let matchesPeriod = true;
    const osDate = new Date(os.createdAt);
    if (filterMonth !== 'todos') {
      matchesPeriod = matchesPeriod && osDate.getMonth().toString() === filterMonth;
    }
    if (filterDay !== 'todos') {
      matchesPeriod = matchesPeriod && osDate.getDate().toString() === filterDay;
    }

    return matchesSearch && matchesTab && matchesPeriod;
  }).sort((a, b) => {
    const timeA = new Date(a.createdAt).getTime();
    const timeB = new Date(b.createdAt).getTime();
    return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-950 font-sans">Ordens de Serviço (O.S.)</h2>
          <p className="text-xs text-zinc-400">Controle de reparos técnicos, orçamentos, faturamento e entrega de equipamentos</p>
        </div>
        <button
          onClick={openAddModal}
          className="w-full md:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
        >
          <Plus size={16} />
          Nova Ordem de Serviço
        </button>
      </div>

      {/* Tabs Menu */}
      <div className="flex gap-1 border-b border-zinc-200 overflow-x-auto pb-px scrollbar-none">
        <button
          onClick={() => setActiveTab('todas')}
          className={`py-2 px-4 text-xs font-bold whitespace-nowrap transition-all border-b-2 cursor-pointer ${
            activeTab === 'todas' 
              ? 'border-zinc-900 text-zinc-950 font-extrabold' 
              : 'border-transparent text-zinc-400 hover:text-zinc-600'
          }`}
        >
          Todas ({serviceOrders.length})
        </button>
        {STATUS_OPTIONS.map(opt => {
          const count = serviceOrders.filter(os => os.status === opt.value).length;
          return (
            <button
              key={opt.value}
              onClick={() => setActiveTab(opt.value)}
              className={`py-2 px-4 text-xs font-bold whitespace-nowrap transition-all border-b-2 cursor-pointer ${
                activeTab === opt.value 
                  ? 'border-zinc-900 text-zinc-950 font-extrabold' 
                  : 'border-transparent text-zinc-400 hover:text-zinc-600'
              }`}
            >
              {opt.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Date Filters */}
      <div className="bg-white p-5 rounded-2xl border border-zinc-100 flex flex-col gap-3 overflow-hidden">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-400 mr-1 min-w-[30px]">Mês:</span>
          {Array.from({length: 12}, (_, i) => {
            const m = i.toString();
            const label = new Date(2020, i, 1).toLocaleString('pt-BR', { month: 'short' }).substring(0, 3).toUpperCase();
            return (
              <button
                key={m}
                onClick={() => setFilterMonth(filterMonth === m ? 'todos' : m)}
                className={`flex-shrink-0 w-9 h-9 rounded-full text-[10px] font-bold transition-all ${filterMonth === m ? 'bg-zinc-900 text-white shadow-md scale-105' : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'}`}
              >
                {label}
              </button>
            )
          })}
        </div>
        
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-400 mr-1 min-w-[30px]">Dia:</span>
          {Array.from({length: 31}, (_, i) => {
            const d = (i + 1).toString();
            return (
              <button
                key={d}
                onClick={() => setFilterDay(filterDay === d ? 'todos' : d)}
                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${filterDay === d ? 'bg-zinc-900 text-white shadow-md scale-105' : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'}`}
              >
                {d}
              </button>
            )
          })}
        </div>
      </div>

      {/* Search Input & Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="bg-white p-4 rounded-2xl border border-zinc-150 flex items-center relative flex-1">
          <Search className="absolute left-7 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
          <input
            type="text"
            placeholder="Buscar por número da OS, cliente ou aparelho..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-zinc-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-zinc-900 bg-zinc-50/50 font-medium"
          />
        </div>
        
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              const num = window.prompt("Digite o número exato da O.S. (Ex: 1005):");
              if (num && num.trim()) {
                setSearchTerm(num.trim());
                setActiveTab('todas');
              }
            }}
            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            title="Buscar OS digitando apenas o número"
          >
            <Search size={14} /> Buscar O.S. por Nº
          </button>

          <button
            type="button"
            onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
            className="px-4 py-2 bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            title="Alterar ordenação entre crescente e decrescente"
          >
            Organização: {sortOrder === 'desc' ? 'Decrescente ⬇️' : 'Crescente ⬆️'}
          </button>
        </div>
      </div>

      {/* OS List */}
      <div className="bg-white border border-zinc-150 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-100 text-xs font-bold text-zinc-400 uppercase tracking-wider">
                <th className="py-4 px-6">OS</th>
                <th className="py-4 px-4">Cliente</th>
                <th className="py-4 px-4">Equipamento</th>
                <th className="py-4 px-4">Valor Cobrado</th>
                <th className="py-4 px-4">Faturamento</th>
                <th className="py-4 px-4">Status</th>
                <th className="py-4 px-6 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredOS.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-sm text-zinc-400">
                    Nenhuma ordem de serviço ativa com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredOS.map((os) => {
                  const statusInfo = STATUS_OPTIONS.find(s => s.value === os.status) || STATUS_OPTIONS[0];
                  return (
                    <tr key={os.id} className="hover:bg-zinc-50/40 transition-colors">
                      {/* OS Code */}
                      <td className="py-4 px-6 font-bold text-zinc-950 text-sm">
                        {os.osNumber}
                      </td>

                      {/* Customer info */}
                      <td className="py-4 px-4">
                        <p className="text-sm font-semibold text-zinc-900">{os.customerName}</p>
                        <p className="text-xs text-zinc-400 flex items-center gap-1 mt-0.5">
                          <Phone size={12} /> {formatPhone(os.customerPhone)}
                        </p>
                      </td>

                      {/* Device */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 bg-zinc-100 text-zinc-700 text-[9px] font-black rounded-full uppercase">{os.deviceType || 'Aparelho'}</span>
                          <p className="text-sm font-medium text-zinc-800">{os.deviceName}</p>
                        </div>
                        <p className="text-xs text-zinc-400 truncate max-w-[180px]">{os.reportedDefect}</p>
                      </td>

                      {/* Price Total */}
                      <td className="py-4 px-4 text-sm font-bold text-zinc-950">
                        {formatCurrency(os.totalAmount)}
                      </td>

                      {/* Payment Status */}
                      <td className="py-4 px-4">
                        {os.paymentStatus === 'pago' ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                            <CheckCircle size={12} /> Pago
                          </span>
                        ) : (
                          <div className="flex flex-col items-start gap-1">
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-full">
                              <Clock size={12} /> Pendente
                            </span>
                            {os.status === 'pronto' && (
                              <button
                                onClick={() => triggerPaymentFlow(os)}
                                className="text-[10px] text-zinc-900 font-extrabold hover:underline flex items-center gap-0.5 cursor-pointer mt-1"
                              >
                                Receber agora <ChevronRight size={10} />
                              </button>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        <span className={`inline-block text-xs font-bold px-2.5 py-0.5 rounded-full border ${statusInfo.bgClass} ${statusInfo.colorClass} ${statusInfo.borderClass}`}>
                          {statusInfo.label}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {os.status !== 'entregue' && (
                            <button
                              onClick={() => handleOpenFinalize(os)}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black uppercase transition-colors cursor-pointer flex items-center gap-0.5"
                              title="Finalizar Ordem de Serviço"
                            >
                              <Check size={10} /> Finalizar
                            </button>
                          )}
                          <button
                            onClick={() => sendWhatsApp(os)}
                            className="p-1.5 hover:bg-emerald-50 text-emerald-600 rounded-lg transition-colors cursor-pointer"
                            title="Enviar OS pelo WhatsApp"
                          >
                            <Share2 size={16} />
                          </button>
                          <button
                            onClick={() => handlePrintClick(os)}
                            className="p-1.5 hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900 rounded-lg transition-colors cursor-pointer"
                            title="Visualizar Comprovante / Via"
                          >
                            <Printer size={16} />
                          </button>
                          <button
                            onClick={() => openEditModal(os)}
                            className="p-1.5 hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900 rounded-lg transition-colors cursor-pointer"
                            title="Editar OS"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleSendWhatsApp(os)}
                            className="p-1.5 hover:bg-green-50 text-zinc-500 hover:text-green-600 rounded-lg transition-colors cursor-pointer"
                            title="Enviar WhatsApp"
                          >
                            <MessageCircle size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(os.id)}
                            className="p-1.5 hover:bg-rose-50 text-zinc-500 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                            title="Excluir OS"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* OS Add/Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-3xl rounded-2xl border border-zinc-100 shadow-xl overflow-hidden"
            >
              <div className="flex justify-between items-center bg-zinc-50 p-5 border-b border-zinc-100">
                <h3 className="text-sm font-bold text-zinc-950 font-sans">
                  {editingOS ? `Editar Ordem de Serviço: ${editingOS.osNumber}` : 'Nova Ordem de Serviço'}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 hover:bg-zinc-200 text-zinc-400 hover:text-zinc-600 rounded-lg transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleFormSubmit} className="p-6 max-h-[80vh] overflow-y-auto space-y-5 text-left">
                {/* Section 1: Customer */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider pb-1.5 border-b border-zinc-100">Dados do Cliente</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 mb-1">Nome Completo</label>
                      <CustomerAutocomplete
                        required
                        value={customerName}
                        onChange={setCustomerName}
                        onSelect={(client) => {
                          setCustomerName(client.name);
                          if (client.cpfCnpj) setCustomerCpfCnpj(client.cpfCnpj);
                          if (client.phone) setCustomerPhone(client.phone);
                          if (client.email) setCustomerEmail(client.email);
                          if (client.birthDate) setCustomerBirthDate(client.birthDate);
                          if (client.address) setCustomerAddress(client.address);
                        }}
                        user={user}
                        customers={customers}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 mb-1">CPF / CNPJ <span className="text-[9px] text-zinc-400 font-normal">(Opcional)</span></label>
                      <input
                        type="text"
                        value={customerCpfCnpj}
                        onChange={(e) => setCustomerCpfCnpj(e.target.value)}
                        placeholder="000.000.000-00"
                        className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-zinc-900 bg-white"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 mb-1">WhatsApp / Telefone</label>
                      <input
                        type="tel"
                        required
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-zinc-900"
                        placeholder="Ex: (11) 99999-9999"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 mb-1">Email (Opcional)</label>
                      <input
                        type="email"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-zinc-900"
                        placeholder="Ex: joao@email.com"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 mb-1">Data de Nascimento (Opcional)</label>
                      <input
                        type="date"
                        value={customerBirthDate}
                        onChange={(e) => setCustomerBirthDate(e.target.value)}
                        className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-xs text-zinc-600 bg-white focus:outline-none focus:ring-1 focus:ring-zinc-900"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 mb-1">Endereço Completo (Opcional)</label>
                    <textarea
                      rows={2}
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(capitalizeSentences(e.target.value))}
                      className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-zinc-900 resize-none bg-white text-zinc-800"
                      placeholder="Ex: Rua do Imperador, 123 - Centro - Petrópolis/RJ"
                    />
                  </div>
                </div>

                {/* Section 2: Device */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider pb-1.5 border-b border-zinc-100">Equipamento</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 mb-1">Tipo de Aparelho</label>
                      <select
                        value={deviceType}
                        onChange={(e) => setDeviceType(e.target.value)}
                        className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-xs bg-white text-zinc-800"
                      >
                        {PREDEFINED_DEVICES.map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                        <option value="Outro">Outro...</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 mb-1">Modelo / Aparelho</label>
                      <input
                        type="text"
                        required
                        value={deviceName}
                        onChange={(e) => setDeviceName(e.target.value)}
                        className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-xs"
                        placeholder="Ex: iPhone 13 Pro Max"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 mb-1">Técnico Responsável</label>
                      <select
                        value={technicianId}
                        onChange={(e) => setTechnicianId(e.target.value)}
                        className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-xs bg-white text-zinc-800"
                      >
                        <option value="">Selecione...</option>
                        {staffList.filter(s => s.role === 'tecnico').map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 mb-1">Nº de Série / Código</label>
                      <input
                        type="text"
                        value={serialNumber}
                        onChange={(e) => setSerialNumber(e.target.value)}
                        className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-xs"
                        placeholder="Ex: SN-847294"
                      />
                    </div>
                  </div>

                  {/* Device Password for Cellphones and Tablets */}
                  {['Celular', 'Tablet'].includes(deviceType) && (
                    <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-150 flex flex-col items-center">
                      <div className="space-y-1 w-full text-center mb-3">
                        <span className="text-xs font-bold text-zinc-700 flex items-center justify-center gap-1">
                          <Lock size={14} className="text-zinc-500" /> Senha do Dispositivo
                        </span>
                        <p className="text-[10px] text-zinc-400">Qual é a senha de desbloqueio do aparelho do cliente?</p>
                      </div>

                      <div className="flex gap-2 mb-4">
                        <button
                          type="button"
                          onClick={() => setPasswordType('pin')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${passwordType === 'pin' ? 'bg-zinc-900 text-white' : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-100'}`}
                        >
                          PIN Numérico
                        </button>
                        <button
                          type="button"
                          onClick={() => setPasswordType('padrao')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${passwordType === 'padrao' ? 'bg-zinc-900 text-white' : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-100'}`}
                        >
                          Desenho (Padrão)
                        </button>
                        <button
                          type="button"
                          onClick={() => setPasswordType('escrita')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${passwordType === 'escrita' ? 'bg-zinc-900 text-white' : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-100'}`}
                        >
                          Escrita (Texto)
                        </button>
                      </div>
                      
                      {passwordType === 'padrao' && (
                        <PatternLockWidget value={patternLock} onChange={setPatternLock} />
                      )}

                      {(passwordType === 'pin' || passwordType === 'escrita') && (
                        <div className="w-full max-w-xs">
                          <input
                            type={passwordType === 'pin' ? 'number' : 'text'}
                            value={passwordValue}
                            onChange={(e) => setPasswordValue(e.target.value)}
                            placeholder={passwordType === 'pin' ? 'Ex: 123456' : 'Ex: senha@123'}
                            className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-zinc-900 text-center font-mono"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 mb-1">Defeito Relatado</label>
                      <textarea
                        required
                        rows={2}
                        value={reportedDefect}
                        onChange={(e) => setReportedDefect(capitalizeSentences(e.target.value))}
                        className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-xs resize-none"
                        placeholder="Ex: Não liga após queda."
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 mb-1">Observações Estéticas do Aparelho</label>
                      <textarea
                        rows={2}
                        value={deviceObservations}
                        onChange={(e) => setDeviceObservations(capitalizeSentences(e.target.value))}
                        className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-xs resize-none"
                        placeholder="Ex: Riscos na parte traseira, película de vidro trincada."
                      />
                    </div>
                  </div>
                </div>

                {/* Section 3: Diagnosis and Supplier Ordering */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider pb-1.5 border-b border-zinc-100 font-sans">Diagnóstico Técnico & Peças Encomendas</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 mb-1">Laudo / Solução Técnica</label>
                      <textarea
                        rows={3}
                        value={technicalDiagnosis}
                        onChange={(e) => setTechnicalDiagnosis(capitalizeSentences(e.target.value))}
                        className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-xs resize-none h-[155px]"
                        placeholder="Ex: Substituição da placa conector de carga efetuada."
                      />
                    </div>

                    {/* Part Ordering (Visible internally) */}
                    <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200 space-y-2">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Encomenda de Peça (Interno Loja)</span>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div className="col-span-2">
                          <input
                            type="text"
                            placeholder="Nome da peça encomendada"
                            value={partName}
                            onChange={(e) => setPartName(capitalizeSentences(e.target.value))}
                            className="w-full px-2 py-1.5 border border-zinc-200 bg-white rounded-lg text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-zinc-400">Preço de Custo (R$)</label>
                          <input
                            type="text"
                            placeholder="Custo"
                            value={partCostPrice}
                            onChange={(e) => setPartCostPrice(e.target.value)}
                            className="w-full px-2 py-1.5 border border-zinc-200 bg-white rounded-lg text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-zinc-400">Preço p/ Cliente (R$)</label>
                          <input
                            type="text"
                            placeholder="Venda"
                            value={partClientPrice}
                            onChange={(e) => setPartClientPrice(e.target.value)}
                            className="w-full px-2 py-1.5 border border-zinc-200 bg-white rounded-lg text-xs"
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="text"
                            placeholder="Link do fornecedor (Oculto no PDF)"
                            value={partSupplierLink}
                            onChange={(e) => setPartSupplierLink(e.target.value)}
                            className="w-full px-2 py-1.5 border border-zinc-200 bg-white rounded-lg text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 4: Device Photos Attachment */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider pb-1.5 border-b border-zinc-100 font-sans">Fotografia do Aparelho</h4>
                  <div className="border border-dashed border-zinc-200 p-4 rounded-xl flex items-center gap-4">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      id="os-photos"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                    <label 
                      htmlFor="os-photos"
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold rounded-lg cursor-pointer transition-colors"
                    >
                      <Camera size={14} /> Anexar Fotos do Aparelho
                    </label>
                    <p className="text-[10px] text-zinc-400">Tire fotos de riscos, marcas ou do estado de entrada.</p>
                  </div>

                  {photos.length > 0 && (
                    <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                      {photos.map((ph, idx) => (
                        <div key={idx} className="relative aspect-square rounded-xl border border-zinc-200 overflow-hidden group">
                          <img src={ph} alt="Aparelho" className="object-cover w-full h-full" referrerPolicy="no-referrer" />
                          <button
                            type="button"
                            onClick={() => removePhoto(idx)}
                            className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-bold opacity-0 group-hover:opacity-100 transition-opacity text-[10px]"
                          >
                            Remover
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Section 5: Signature Pad */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider pb-1.5 border-b border-zinc-100 font-sans">Assinatura do Cliente</h4>
                  <div className="border border-zinc-200 rounded-2xl overflow-hidden bg-zinc-50">
                    <canvas
                      ref={canvasRef}
                      width={650}
                      height={130}
                      className="w-full bg-white border-b border-zinc-150 touch-none cursor-crosshair"
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                    />
                    <div className="flex justify-between items-center p-2.5 bg-zinc-50">
                      <span className="text-[10px] text-zinc-400 font-semibold flex items-center gap-1">
                        <PenTool size={12} /> Assinar digitalmente (Suporte a celular e touch)
                      </span>
                      <button
                        type="button"
                        onClick={clearSignature}
                        className="py-1 px-3 border border-zinc-200 hover:bg-zinc-200 text-zinc-500 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
                      >
                        Limpar Assinatura
                      </button>
                    </div>
                  </div>
                </div>

                {/* Section 6: Status & Pricing */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider pb-1.5 border-b border-zinc-100">Status & Preços</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 mb-1">Status do Serviço</label>
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value as OSStatus)}
                        className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-xs bg-white text-zinc-800"
                      >
                        {STATUS_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-500 mb-1">Mão de Obra (R$)</label>
                      <input
                        type="text"
                        value={priceLaborStr}
                        onChange={(e) => setPriceLaborStr(e.target.value)}
                        className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-500 mb-1">Peças / Insumos (R$)</label>
                      <input
                        type="text"
                        value={pricePartsStr}
                        onChange={(e) => setPricePartsStr(e.target.value)}
                        className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-zinc-500 mb-1">Faturamento da O.S.</label>
                        <select
                          value={paymentStatus}
                          onChange={(e) => setPaymentStatus(e.target.value as any)}
                          className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-xs bg-white text-zinc-800"
                        >
                          <option value="pendente">Pendente de Pagamento</option>
                          <option value="pago">Pago / Recebido</option>
                        </select>
                      </div>

                      {paymentStatus === 'pago' && (
                        <div>
                          <label className="block text-xs font-bold text-zinc-500 mb-1">Forma de Pagamento</label>
                          <select
                            value={formPaymentMethod}
                            onChange={(e) => setFormPaymentMethod(e.target.value as any)}
                            className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-xs bg-white text-zinc-800"
                          >
                            <option value="pix">PIX</option>
                            <option value="dinheiro">Dinheiro</option>
                            <option value="debito">Cartão de Débito</option>
                            <option value="credito">Cartão de Crédito</option>
                          </select>
                        </div>
                      )}
                    </div>

                    <div className="bg-zinc-50 p-4 rounded-xl flex items-center justify-between border border-zinc-100 self-start">
                      <div>
                        <span className="text-xs font-bold text-zinc-400">Total O.S.</span>
                        <p className="text-lg font-extrabold text-zinc-950 mt-0.5">
                          {formatCurrency((parseFloat(priceLaborStr.replace(',', '.')) || 0) + (parseFloat(pricePartsStr.replace(',', '.')) || 0))}
                        </p>
                      </div>
                      <Wrench className="text-zinc-300 animate-pulse" size={28} />
                    </div>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex gap-2 pt-4 border-t border-zinc-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-2.5 px-4 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 px-4 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-semibold transition-all cursor-pointer"
                  >
                    {editingOS && hasChangesComputed ? 'Atualizar Ordem de Serviço' : 'Salvar Ordem de Serviço'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Payment Processing Modal */}
      <AnimatePresence>
        {isPaymentModalOpen && paymentOS && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-2xl border border-zinc-100 shadow-xl overflow-hidden p-6 text-left"
            >
              <div className="flex justify-between items-center pb-4 border-b border-zinc-100">
                <h3 className="text-sm font-bold text-zinc-950 font-sans">Receber Pagamento</h3>
                <button onClick={() => setIsPaymentModalOpen(false)} className="p-1 hover:bg-zinc-100 text-zinc-400 rounded-lg">
                  <X size={18} />
                </button>
              </div>

              <div className="py-4 space-y-4">
                <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">A receber no Caixa</span>
                  <p className="text-2xl font-black text-emerald-700">{formatCurrency(paymentOS.totalAmount)}</p>
                  <p className="text-xs text-emerald-600/90 font-medium">Referente à {paymentOS.osNumber} ({paymentOS.customerName})</p>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider">Forma de Recebimento</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['pix', 'dinheiro', 'debito', 'credito'].map(method => (
                      <button
                        key={method}
                        onClick={() => setSelectedPaymentMethod(method as any)}
                        className={`py-2.5 px-3 border rounded-xl font-bold text-xs cursor-pointer transition-all ${selectedPaymentMethod === method ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 text-zinc-500 bg-white hover:bg-zinc-50'}`}
                      >
                        {method.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t border-zinc-100">
                <button
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="flex-1 py-2.5 px-4 bg-zinc-100 text-zinc-600 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmPayment}
                  className="flex-1 py-2.5 px-4 bg-emerald-600 text-white rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Confirmar Recebimento
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Visualização de Ordem de Serviço (PDF Mirror Layout) */}
      <AnimatePresence>
        {isPrintModalOpen && printOS && (
          <div className="fixed inset-0 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-3xl rounded-2xl border border-zinc-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="flex justify-between items-center bg-zinc-50 px-6 py-4 border-b border-zinc-150">
                <div className="text-left">
                  <h3 className="text-xs font-black text-zinc-900 uppercase tracking-widest">Visualização da Ordem de Serviço</h3>
                  <p className="text-[10px] text-zinc-400 font-bold mt-0.5">O.S. Nº {printOS.osNumber} | Cliente: {printOS.customerName}</p>
                </div>
                <button onClick={() => setIsPrintModalOpen(false)} className="p-1.5 hover:bg-zinc-200 text-zinc-400 hover:text-zinc-700 rounded-xl transition-colors cursor-pointer">
                  <X size={18} />
                </button>
              </div>

              {/* BRANDED PREVIEW CONTAINER (LOOKS LIKE THE PRINTED PDF) */}
              <div className="p-6 overflow-y-auto bg-zinc-50/50 flex-1">
                <div className="bg-white border border-zinc-200 shadow-sm max-w-2xl mx-auto rounded-xl overflow-hidden relative text-left">
                  {/* Top brand line */}
                  <div style={{ backgroundColor: config?.colors?.primary || '#18181b' }} className="h-1.5 w-full" />
                  
                  <div className="p-6 space-y-6">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-4 border-b border-zinc-100">
                      <div className="flex items-start gap-3">
                        {shopLogo ? (
                          <img src={shopLogo} alt="Logo" className="w-12 h-12 object-contain rounded-lg" referrerPolicy="no-referrer" />
                        ) : (
                          <div style={{ backgroundColor: config?.colors?.primary || '#18181b' }} className="w-12 h-12 text-white rounded-xl flex items-center justify-center font-black text-xl">OS</div>
                        )}
                        <div>
                          <h4 className="text-sm font-extrabold text-zinc-900 uppercase tracking-tight">{shopName || 'INFO_CAM TECNOLOGIA'}</h4>
                          <p className="text-[10px] text-zinc-400 font-bold">CNPJ/CPF: {shopCnpjCpf || 'N/A'}</p>
                          <p className="text-[10px] text-zinc-400 font-bold">Contato: {formatPhone(shopPhone || '')} | Email: {shopEmail || 'N/A'}</p>
                        </div>
                      </div>
                      
                      {/* Doc metadata panel */}
                      <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3 w-full sm:w-48 text-left space-y-1">
                        <span className="text-[9px] font-black uppercase text-zinc-400 tracking-wider">Documento Oficial</span>
                        <h5 className="text-xs font-black text-zinc-900 font-sans">ORDEM DE SERVIÇO</h5>
                        <p className="text-sm font-black" style={{ color: config?.colors?.primary || '#18181b' }}>Nº {printOS.osNumber}</p>
                        <p className="text-[9px] text-zinc-400">Abertura: {formatDate(printOS.createdAt)}</p>
                        <p className="text-[9px] text-zinc-400 font-bold uppercase">Status: {STATUS_OPTIONS.find(s => s.value === printOS.status)?.label || printOS.status}</p>
                      </div>
                    </div>

                    {/* Section 1: Cliente */}
                    <div className="space-y-2">
                      <div style={{ backgroundColor: config?.colors?.primary || '#18181b' }} className="px-3 py-1 rounded-xs text-white text-[10px] font-black uppercase tracking-wider">
                        Dados do Cliente
                      </div>
                      <div className="border rounded-xl p-3 bg-white grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="text-zinc-400 font-bold">Nome: <span className="text-zinc-900 font-black">{printOS.customerName}</span></p>
                          {printOS.customerCpfCnpj && (
                            <p className="text-zinc-400 font-bold mt-1">CPF/CNPJ: <span className="text-zinc-900 font-black">{printOS.customerCpfCnpj}</span></p>
                          )}
                          <p className="text-zinc-400 font-bold mt-1">Telefone: <span className="text-zinc-900 font-black">{formatPhone(printOS.customerPhone)}</span></p>
                          <p className="text-zinc-400 font-bold mt-1">Email: <span className="text-zinc-900 font-semibold">{printOS.customerEmail || 'Não informado'}</span></p>
                        </div>
                        <div className="md:border-l md:pl-3">
                          <p className="text-zinc-400 font-bold">Endereço:</p>
                          <p className="text-zinc-800 font-medium mt-0.5">{printOS.customerAddress || 'Não informado'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Section 2: Device */}
                    <div className="space-y-2">
                      <div style={{ backgroundColor: config?.colors?.primary || '#18181b' }} className="px-3 py-1 rounded-xs text-white text-[10px] font-black uppercase tracking-wider">
                        Especificações do Equipamento
                      </div>
                      <div className="border rounded-xl p-3 bg-white grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="text-zinc-400 font-bold">Equipamento: <span className="text-zinc-900 font-black">{printOS.deviceName}</span></p>
                          <p className="text-zinc-400 font-bold mt-1">Tipo de Aparelho: <span className="text-zinc-900 font-semibold">{printOS.deviceType || 'Celular'}</span></p>
                          <p className="text-zinc-400 font-bold mt-1">Nº de Série/IMEI: <span className="text-zinc-900 font-mono font-bold">{printOS.serialNumber || 'N/A'}</span></p>
                        </div>
                        <div className="md:border-l md:pl-3 flex flex-col justify-center">
                          {['celular', 'tablet', 'celulares', 'tablets', 'smartphone', 'smartphones'].includes((printOS.deviceType || '').toLowerCase()) ? (
                            <div>
                              <p className="text-zinc-400 font-bold">Senha de Desbloqueio:</p>
                              <span className="inline-block mt-1 font-black text-rose-600 bg-rose-50 border border-rose-100 px-2.5 py-0.5 rounded text-xs">
                                {(printOS.passwordType === 'padrao' || !printOS.passwordType) 
                                  ? (printOS.patternLock ? `Padrão: ${printOS.patternLock}` : 'Não informada')
                                  : `${printOS.passwordType === 'pin' ? 'PIN' : 'Escrita'}: ${printOS.passwordValue || 'Não informada'}`
                                }
                              </span>
                            </div>
                          ) : (
                            <p className="text-zinc-400 font-bold italic">Senha Ocultada (Dispositivo s/ tela)</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Section 3: Defeito e Diagnostico */}
                    <div className="space-y-2">
                      <div style={{ backgroundColor: config?.colors?.primary || '#18181b' }} className="px-3 py-1 rounded-xs text-white text-[10px] font-black uppercase tracking-wider">
                        Defeito Reclamado & Diagnóstico Técnico
                      </div>
                      <div className="border rounded-xl p-3 bg-white space-y-3 text-xs text-left">
                        <div>
                          <p className="text-zinc-400 font-bold uppercase text-[9px] tracking-wider">Defeito relatado pelo cliente</p>
                          <p className="text-zinc-800 italic font-medium mt-1 bg-zinc-50 p-2 rounded-lg border border-zinc-100">{printOS.reportedDefect || 'Sem defeito relatado.'}</p>
                        </div>
                        <div>
                          <p className="text-zinc-400 font-bold uppercase text-[9px] tracking-wider">Diagnóstico e solução técnica</p>
                          <p className="text-zinc-800 font-bold mt-1 bg-zinc-50 p-2 rounded-lg border border-zinc-100">{printOS.technicalDiagnosis || 'Aguardando avaliação técnica.'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Section 4: Financeiro */}
                    <div className="space-y-2">
                      <div style={{ backgroundColor: config?.colors?.primary || '#18181b' }} className="px-3 py-1 rounded-xs text-white text-[10px] font-black uppercase tracking-wider">
                        Valores e Situação de Faturamento
                      </div>
                      <div className="border rounded-xl p-4 bg-zinc-50/50 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs items-center">
                        <div className="space-y-1.5">
                          <p className="text-zinc-500 font-bold flex justify-between">Mão de Obra / Serviços: <span className="text-zinc-950 font-extrabold">{formatCurrency(printOS.priceLabor)}</span></p>
                          <p className="text-zinc-500 font-bold flex justify-between">Peças / Componentes: <span className="text-zinc-950 font-extrabold">{formatCurrency(printOS.priceParts)}</span></p>
                        </div>
                        <div className="sm:border-l sm:pl-4 space-y-1 text-center sm:text-left">
                          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">Faturamento Total</p>
                          <p className="text-lg font-black" style={{ color: config?.colors?.primary || '#18181b' }}>{formatCurrency(printOS.totalAmount)}</p>
                          <div className="mt-1">
                            {printOS.paymentStatus === 'pago' ? (
                              <span className="inline-block text-[10px] font-black px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200 uppercase">
                                PAGO / RECEBIDO
                              </span>
                            ) : (
                              <span className="inline-block text-[10px] font-black px-2.5 py-0.5 bg-amber-100 text-amber-800 rounded-full border border-amber-200 uppercase">
                                PENDENTE / EM ABERTO
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Section 5: Observacoes e Termos */}
                    <div className="space-y-2">
                      <div style={{ backgroundColor: config?.colors?.primary || '#18181b' }} className="px-3 py-1 rounded-xs text-white text-[10px] font-black uppercase tracking-wider">
                        Termos de Serviço & Observações
                      </div>
                      <div className="border rounded-xl p-3 bg-zinc-50/50 space-y-1.5 text-[8px] leading-relaxed text-zinc-400 font-medium">
                        <p>1. Os serviços prestados possuem garantia legal de 90 dias a contar da data de entrega do equipamento.</p>
                        <p>2. Aparelhos prontos e não retirados em até 90 dias úteis estarão sujeitos à venda pública para custeio dos custos de reparo, insumos e armazenamento.</p>
                        <p>3. A garantia cobre apenas os defeitos reparados descritos no presente laudo técnico, não se aplicando a outros componentes ou avarias futuras.</p>
                        {printOS.deviceObservations && (
                          <div className="pt-2 text-[9px] text-zinc-600 font-bold uppercase">
                            OBSERVAÇÕES ADICIONAIS: {printOS.deviceObservations}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Signatures */}
                    <div className="grid grid-cols-2 gap-6 pt-6 text-[10px] text-zinc-400 font-bold">
                      <div className="text-center">
                        <div className="border-t border-zinc-200 pt-1.5 uppercase">Técnico Responsável</div>
                      </div>
                      <div className="text-center relative">
                        {printOS.signature && printOS.signature.startsWith('data:image') && (
                          <img src={printOS.signature} alt="Assinatura" className="absolute bottom-5 left-1/2 -translate-x-1/2 h-8 object-contain" referrerPolicy="no-referrer" />
                        )}
                        <div className="border-t border-zinc-200 pt-1.5 uppercase">Assinatura do Cliente</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="p-4 bg-zinc-50 border-t border-zinc-150 flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(false)}
                  className="flex-1 py-2.5 px-4 bg-zinc-200 hover:bg-zinc-300 text-zinc-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Fechar
                </button>
                <button
                  type="button"
                  onClick={() => sendWhatsApp(printOS)}
                  className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Share2 size={14} /> Enviar via WhatsApp
                </button>
                <button
                  type="button"
                  onClick={() => generateAndSaveOSPDF(printOS)}
                  className="flex-1 py-2.5 px-4 bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download size={14} /> Baixar PDF Oficial
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FINALIZATION MODAL */}
      <AnimatePresence>
        {isFinalizeModalOpen && finalizingOS && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-2xl border border-zinc-150 shadow-xl overflow-hidden"
            >
              <div className="flex justify-between items-center bg-zinc-50 p-5 border-b border-zinc-100">
                <h3 className="text-sm font-bold text-zinc-950 font-sans flex items-center gap-2">
                  <CheckCircle className="text-emerald-600" size={18} />
                  Finalizar O.S. #{finalizingOS.osNumber}
                </h3>
                <button
                  onClick={() => {
                    setIsFinalizeModalOpen(false);
                    setFinalizingOS(null);
                  }}
                  className="p-1 hover:bg-zinc-200 text-zinc-400 hover:text-zinc-600 rounded-lg transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmitFinalize} className="p-6 space-y-4 text-left">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 mb-1">Como esta O.S. está sendo resolvida?</label>
                  <select
                    value={selectedFinalizationType}
                    onChange={(e) => setSelectedFinalizationType(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-1 focus:ring-zinc-900 bg-white"
                  >
                    {(config?.finalizationOptions || [
                      'Pronto para Retirada',
                      'Retirado Sem Reparo',
                      'Devolvido ao Cliente'
                    ]).map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-500 mb-1">
                    Observações de Finalização / Laudo Técnico
                  </label>
                  <textarea
                    rows={3}
                    value={finalizationObservation}
                    onChange={(e) => setFinalizationObservation(capitalizeSentences(e.target.value))}
                    placeholder="Descreva o motivo da devolução, laudo de não conserto ou observações finais..."
                    className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-zinc-900"
                    required={
                      selectedFinalizationType.toLowerCase().includes('sem reparo') || 
                      selectedFinalizationType.toLowerCase().includes('devol') || 
                      selectedFinalizationType.toLowerCase().includes('cancel')
                    }
                  />
                  <p className="text-[10px] text-zinc-400 mt-1">
                    *Obrigatório para devoluções ou aparelhos retirados sem reparo.
                  </p>
                </div>

                {finalizingOS.paymentStatus !== 'pago' && (
                  <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl space-y-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="finalizeMarkAsPaid"
                        checked={finalizeMarkAsPaid}
                        onChange={(e) => setFinalizeMarkAsPaid(e.target.checked)}
                        className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                      />
                      <label htmlFor="finalizeMarkAsPaid" className="text-xs font-bold text-zinc-700 select-none cursor-pointer">
                        Registrar pagamento como RECEBIDO agora
                      </label>
                    </div>

                    {finalizeMarkAsPaid && (
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                          Forma de Pagamento
                        </label>
                        <select
                          value={finalizePaymentMethod}
                          onChange={(e) => setFinalizePaymentMethod(e.target.value as any)}
                          className="w-full px-2.5 py-1.5 border border-zinc-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-zinc-900 bg-white font-medium"
                        >
                          <option value="pix">PIX</option>
                          <option value="dinheiro">Dinheiro</option>
                          <option value="debito">Cartão de Débito</option>
                          <option value="credito">Cartão de Crédito</option>
                        </select>
                      </div>
                    )}
                  </div>
                )}

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsFinalizeModalOpen(false);
                      setFinalizingOS(null);
                    }}
                    className="flex-1 py-2 px-4 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl cursor-pointer shadow-xs"
                  >
                    Confirmar e Finalizar
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* OS Salva / Finalizada Prompt */}
      <AnimatePresence>
        {isSavedPromptOpen && savedOSForPrompt && (
          <div className="fixed inset-0 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-2xl border border-zinc-150 shadow-2xl overflow-hidden p-6 text-center space-y-5"
            >
              <div className="mx-auto w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center">
                <CheckCircle size={24} />
              </div>
              <div className="space-y-1.5 text-center">
                <h3 className="text-sm font-black text-zinc-950 font-sans">Ordem de Serviço Processada!</h3>
                <p className="text-xs text-zinc-500 font-medium">
                  A O.S. <strong className="text-zinc-900 font-bold">#{savedOSForPrompt.osNumber}</strong> foi salva com sucesso no sistema. O que você deseja fazer agora?
                </p>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsSavedPromptOpen(false);
                    generateAndSaveOSPDF(savedOSForPrompt);
                    setSavedOSForPrompt(null);
                  }}
                  className="w-full py-2.5 px-4 bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download size={14} /> Baixar PDF Oficial
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsSavedPromptOpen(false);
                    setPrintOS(savedOSForPrompt);
                    setIsPrintModalOpen(true);
                    setSavedOSForPrompt(null);
                  }}
                  className="w-full py-2.5 px-4 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ExternalLink size={14} /> Apenas Abrir Visualização
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsSavedPromptOpen(false);
                    setSavedOSForPrompt(null);
                  }}
                  className="w-full py-2.5 px-4 bg-zinc-50 hover:bg-zinc-100 text-zinc-400 hover:text-zinc-500 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmar Impressão OS Modal */}
      <AnimatePresence>
        {isConfirmPrintModalOpen && confirmPrintOS && (
          <div className="fixed inset-0 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-2xl border border-zinc-150 shadow-2xl overflow-hidden p-6 text-center space-y-5"
            >
              <div className="mx-auto w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center">
                <Printer size={24} />
              </div>
              <div className="space-y-1.5 text-center">
                <h3 className="text-sm font-black text-zinc-950 font-sans">Imprimir Ordem de Serviço</h3>
                <p className="text-xs text-zinc-500 font-medium">
                  Deseja baixar o PDF oficial com o design personalizado da O.S. <strong className="text-zinc-900 font-bold">#{confirmPrintOS.osNumber}</strong>?
                </p>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsConfirmPrintModalOpen(false);
                    generateAndSaveOSPDF(confirmPrintOS);
                    setConfirmPrintOS(null);
                  }}
                  className="w-full py-2.5 px-4 bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download size={14} /> Sim, Baixar PDF
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsConfirmPrintModalOpen(false);
                    setPrintOS(confirmPrintOS);
                    setIsPrintModalOpen(true);
                    setConfirmPrintOS(null);
                  }}
                  className="w-full py-2.5 px-4 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ExternalLink size={14} /> Apenas Visualizar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsConfirmPrintModalOpen(false);
                    setConfirmPrintOS(null);
                  }}
                  className="w-full py-2.5 px-4 bg-zinc-50 hover:bg-zinc-100 text-zinc-400 hover:text-zinc-500 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-ticket, #printable-ticket * {
            visibility: visible;
          }
          #printable-ticket {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
