import React, { useState, useRef, useEffect } from 'react';
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
  Grid
} from 'lucide-react';
import { ServiceOrder, OSStatus, PartOrder, ShopConfig, Customer } from '../types';
import { formatCurrency, formatDate, generateOSNumber, formatPhone } from '../utils';
import CustomerAutocomplete from './CustomerAutocomplete';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';

interface ServiceOrdersProps {
  serviceOrders: ServiceOrder[];
  onAddOS: (os: Omit<ServiceOrder, 'id' | 'osNumber' | 'createdAt' | 'updatedAt'>) => Promise<ServiceOrder>;
  onEditOS: (id: string, os: Partial<ServiceOrder>) => Promise<ServiceOrder>;
  onDeleteOS: (id: string) => Promise<void>;
  onReceivePayment: (os: ServiceOrder, paymentMethod: 'dinheiro' | 'pix' | 'debito' | 'credito') => Promise<void>;
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
}

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
  shopName,
  shopPhone,
  shopCnpjCpf,
  shopEmail,
  shopLogo,
  autoSaveOSToDrive,
  googleToken,
  config,
  user,
  customers
}: ServiceOrdersProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'todas' | OSStatus>('todas');
  
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
        await onReceivePayment(finalizingOS, finalizePaymentMethod);
      }

      const updatedOS = await onEditOS(finalizingOS.id, updatedFields);
      
      setIsFinalizeModalOpen(false);
      setFinalizingOS(null);
      
      try {
        await generateAndSaveOSPDF(updatedOS);
      } catch (pdfErr) {
        console.error('Erro ao gerar/salvar PDF:', pdfErr);
      }
      
      alert('Ordem de Serviço finalizada com sucesso!');
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

  // Form Fields
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerBirthDate, setCustomerBirthDate] = useState('');
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

  // New Fields: Pattern Lock sequence
  const [patternLock, setPatternLock] = useState<string>('');
  
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
      console.log('Starting automated PDF generation and local save for O.S. #', os.osNumber);

      // 1. Create a beautiful A4 PDF using jsPDF
      const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
      });

      // Simple elegant black and white high-contrast header styling for standard business receipt
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(16);
      doc.text(shopName || 'INFO_CAM ASSISTENCIA TECNICA', 14, 20);

      doc.setFontSize(9);
      doc.setFont('Helvetica', 'normal');
      doc.text(`Contato: ${shopPhone || ''} | CNPJ/CPF: ${shopCnpjCpf || ''}`, 14, 26);
      doc.text(`Email: ${shopEmail || ''}`, 14, 31);

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(14);
      doc.text(`O.S. NUMERO: ${os.osNumber}`, 130, 20);
      doc.setFontSize(9);
      doc.setFont('Helvetica', 'normal');
      doc.text(`Abertura: ${formatDate(os.createdAt)}`, 130, 26);
      doc.text(`Status: ${os.status.toUpperCase()}`, 130, 31);

      doc.setDrawColor(220, 220, 224);
      doc.line(14, 35, 196, 35);

      // Customer section
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('DADOS DO CLIENTE', 14, 42);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`Nome: ${os.customerName}`, 14, 48);
      doc.text(`Telefone: ${formatPhone(os.customerPhone)}`, 14, 53);
      doc.text(`Email: ${os.customerEmail || 'Não cadastrado'}`, 14, 58);

      // Equipment section
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('DADOS DO APARELHO', 110, 42);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`Equipamento: ${os.deviceName}`, 110, 48);
      doc.text(`Tipo: ${os.deviceType || 'N/A'}`, 110, 53);
      doc.text(`N/S Série: ${os.serialNumber || 'N/A'}`, 110, 58);

      doc.line(14, 64, 196, 64);

      // Technical descriptions
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('DEFEITO RECLAMADO', 14, 71);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(os.reportedDefect || 'Sem informações.', 14, 77, { maxWidth: 180 });

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('LAUDO E DIAGNOSTICO TECNICO', 14, 93);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(os.technicalDiagnosis || 'Aguardando diagnóstico do técnico.', 14, 99, { maxWidth: 180 });

      doc.line(14, 115, 196, 115);

      // Pricing & details
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('RESUMO DE VALORES E FATURAMENTO', 14, 122);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`Mão de Obra / Serviços: ${formatCurrency(os.priceLabor)}`, 14, 128);
      doc.text(`Materiais / Peças de Reposição: ${formatCurrency(os.priceParts)}`, 14, 133);
      
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(`VALOR TOTAL: ${formatCurrency(os.totalAmount)}`, 14, 142);
      doc.text(`SITUACAO FINANCEIRA: ${os.paymentStatus === 'pago' ? 'RECEBIDO / PAGO' : 'PAGAMENTO PENDENTE'}`, 110, 142);

      doc.line(14, 150, 196, 150);

      // Observations
      if (os.deviceObservations) {
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(9);
        doc.text('OBSERVACOES INTERNAS:', 14, 156);
        doc.setFont('Helvetica', 'normal');
        doc.text(os.deviceObservations, 14, 161, { maxWidth: 180 });
        doc.line(14, 172, 196, 172);
      }

      // Legal disclaimer terms
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);
      doc.text('1. Os serviços prestados possuem garantia legal de 90 dias a contar da entrega do aparelho.', 14, 180);
      doc.text('2. Aparelhos não retirados em até 90 dias após a notificação de finalização estarão sujeitos a venda para custeio do reparo.', 14, 184);

      // Signature lines
      doc.setDrawColor(180, 180, 180);
      doc.line(30, 215, 90, 215);
      doc.text('Assinatura do Técnico', 45, 219);

      doc.line(120, 215, 180, 215);
      doc.text('Assinatura do Cliente', 135, 219);

      // Always save/download PDF locally first
      const cleanCustomerName = os.customerName.replace(/[^a-zA-Z0-9]/g, '_');
      doc.save(`OS_${os.osNumber}_${cleanCustomerName}.pdf`);

      // Generate the raw PDF Blob
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
    
    // Get mouse or touch coordinates
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
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
    setCustomerPhone('');
    setCustomerEmail('');
    setCustomerBirthDate('');
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
    setPatternLock('');
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
    setCustomerPhone(os.customerPhone);
    setCustomerEmail(os.customerEmail || '');
    setCustomerBirthDate(os.customerBirthDate || '');
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
    setPatternLock(os.patternLock || '');
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
      let savedOS: ServiceOrder | null = null;
      if (editingOS) {
        savedOS = await onEditOS(editingOS.id, {
          customerName,
          customerPhone,
          customerEmail,
          customerBirthDate,
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
          patternLock,
          signature: signatureData || undefined,
          photos,
          partOrder
        });
      } else {
        savedOS = await onAddOS({
          customerName,
          customerPhone,
          customerEmail,
          customerBirthDate,
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
          patternLock,
          signature: signatureData || undefined,
          photos,
          partOrder
        });
      }
      setIsModalOpen(false);
      
      if (savedOS) {
        generateAndSaveOSPDF(savedOS);
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar Ordem de Serviço.');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Excluir esta ordem de serviço? Isso removerá o registro permanentemente.')) {
      try {
        await onDeleteOS(id);
      } catch (err) {
        console.error(err);
        alert('Erro ao excluir.');
      }
    }
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

    return matchesSearch && matchesTab;
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
                            onClick={() => openPrintPreview(os)}
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
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-zinc-500 mb-1">Nome Completo</label>
                      <CustomerAutocomplete
                        required
                        value={customerName}
                        onChange={setCustomerName}
                        onSelect={(client) => {
                          setCustomerName(client.name);
                          if (client.phone) setCustomerPhone(client.phone);
                          if (client.email) setCustomerEmail(client.email);
                          if (client.birthDate) setCustomerBirthDate(client.birthDate);
                        }}
                        user={user}
                        customers={customers}
                      />
                    </div>
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
                        className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-xs"
                        placeholder="Ex: joao@email.com"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 mb-1">Data de Nascimento (Opcional)</label>
                      <input
                        type="date"
                        value={customerBirthDate}
                        onChange={(e) => setCustomerBirthDate(e.target.value)}
                        className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-xs text-zinc-600 bg-white"
                      />
                    </div>
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

                  {/* Pattern Lock for Cellphones */}
                  {deviceType === 'Celular' && (
                    <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-150 grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-zinc-700 flex items-center gap-1">
                          <Lock size={14} className="text-zinc-500" /> Senha Padrão (9 Pontos)
                        </span>
                        <p className="text-[10px] text-zinc-400">Clique nos pontos sequencialmente para registrar a senha padrão do celular do cliente.</p>
                        <div className="pt-2 text-[10px] font-mono text-zinc-600">
                          Sequência desenhada: <span className="font-bold text-zinc-950 bg-white border border-zinc-200 px-2.5 py-1 rounded">{patternLock || 'Nenhuma'}</span>
                        </div>
                        {patternLock && (
                          <button
                            type="button"
                            onClick={() => setPatternLock('')}
                            className="text-[9px] text-rose-600 font-extrabold hover:underline block pt-2 cursor-pointer"
                          >
                            Limpar Sequência
                          </button>
                        )}
                      </div>
                      
                      {/* Grid representation */}
                      <div className="flex justify-center">
                        <div className="grid grid-cols-3 gap-3 p-3 bg-white border border-zinc-200 rounded-xl w-32 justify-items-center">
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((dot) => {
                            const sequenceList = patternLock ? patternLock.split('-') : [];
                            const order = sequenceList.indexOf(dot.toString());
                            const isActive = order !== -1;
                            return (
                              <button
                                key={dot}
                                type="button"
                                onClick={() => togglePatternDot(dot)}
                                className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-[9px] transition-all cursor-pointer ${isActive ? 'bg-zinc-900 text-white scale-110 shadow-sm' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-400'}`}
                              >
                                {isActive ? order + 1 : dot}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 mb-1">Defeito Relatado</label>
                      <textarea
                        required
                        rows={2}
                        value={reportedDefect}
                        onChange={(e) => setReportedDefect(e.target.value)}
                        className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-xs resize-none"
                        placeholder="Ex: Não liga após queda."
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 mb-1">Observações Estéticas do Aparelho</label>
                      <textarea
                        rows={2}
                        value={deviceObservations}
                        onChange={(e) => setDeviceObservations(e.target.value)}
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
                        onChange={(e) => setTechnicalDiagnosis(e.target.value)}
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
                            onChange={(e) => setPartName(e.target.value)}
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

                    <div className="bg-zinc-50 p-4 rounded-xl flex items-center justify-between border border-zinc-100">
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
                    Salvar Ordem de Serviço
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

      {/* Recibo / Print OS Modal (TWO VIAS FITTING ON A SINGLE A4 SHEET) */}
      <AnimatePresence>
        {isPrintModalOpen && printOS && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-3xl rounded-2xl border border-zinc-100 shadow-xl overflow-hidden"
            >
              <div className="flex justify-between items-center bg-zinc-50 p-5 border-b border-zinc-100">
                <h3 className="text-xs font-bold text-zinc-950 uppercase tracking-wider">Comprovante de Ordem de Serviço (A4 Duas Vias)</h3>
                <button onClick={() => setIsPrintModalOpen(false)} className="p-1 hover:bg-zinc-200 text-zinc-400 hover:text-zinc-600 rounded-lg">
                  <X size={20} />
                </button>
              </div>

              {/* TWO VIAS PRINT CONTAINER */}
              <div className="p-6 overflow-y-auto max-h-[60vh] text-left" id="printable-ticket">
                {/* VIA 1: CLIENT VIA */}
                <div className="space-y-4 border-b-2 border-dashed border-zinc-300 pb-6 mb-6">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      {shopLogo ? (
                        <img src={shopLogo} alt="Logo" className="w-10 h-10 object-contain" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-10 h-10 bg-zinc-950 text-white rounded-lg flex items-center justify-center font-bold">OS</div>
                      )}
                      <div>
                        <h4 className="text-xs font-black uppercase tracking-wider">{shopName || 'ASSISTÊNCIA TÉCNICA'}</h4>
                        <p className="text-[8px] text-zinc-500">Contato: {shopPhone} | CNPJ/CPF: {shopCnpjCpf}</p>
                        <p className="text-[8px] text-zinc-500">Email: {shopEmail || 'contato@suaempresa.com'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] font-black bg-zinc-100 border border-zinc-300 text-zinc-800 px-2 py-0.5 rounded-full uppercase tracking-wider">Via do Cliente</span>
                      <p className="text-xs font-black text-zinc-950 mt-1">{printOS.osNumber}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-[10px] text-zinc-700 bg-zinc-50 p-2.5 rounded-lg border border-zinc-150">
                    <div>
                      <span className="font-extrabold text-zinc-400 block text-[8px] uppercase">Cliente</span>
                      <p className="font-bold text-zinc-900">{printOS.customerName}</p>
                      <p className="text-[9px]">{formatPhone(printOS.customerPhone)}</p>
                    </div>
                    <div>
                      <span className="font-extrabold text-zinc-400 block text-[8px] uppercase">Equipamento</span>
                      <p className="font-bold text-zinc-900">{printOS.deviceName}</p>
                      <p className="text-[9px] uppercase font-black">Tipo: {printOS.deviceType || 'Celular'}</p>
                    </div>
                    <div>
                      <span className="font-extrabold text-zinc-400 block text-[8px] uppercase">Abertura</span>
                      <p className="font-bold text-zinc-900">{formatDate(printOS.createdAt)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-[10px] leading-relaxed">
                    <div className="border border-zinc-200 p-2 rounded-lg">
                      <span className="font-extrabold text-zinc-400 block text-[8px] uppercase">Defeito Relatado</span>
                      <p className="text-zinc-800 italic">{printOS.reportedDefect}</p>
                    </div>
                    <div className="border border-zinc-200 p-2 rounded-lg">
                      <span className="font-extrabold text-zinc-400 block text-[8px] uppercase">Laudo Técnico</span>
                      <p className="text-zinc-800 font-medium">{printOS.technicalDiagnosis || 'Aguardando diagnóstico detalhado.'}</p>
                    </div>
                  </div>

                  {/* Pricing / Payment & Signature */}
                  <div className="grid grid-cols-3 gap-4 items-center pt-2">
                    <div>
                      <span className="font-extrabold text-zinc-400 block text-[8px] uppercase">Faturamento</span>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${printOS.paymentStatus === 'pago' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                          {printOS.paymentStatus === 'pago' ? 'PAGO / RECEBIDO' : 'PAGAMENTO PENDENTE'}
                        </span>
                      </div>
                    </div>

                    <div>
                      <span className="font-extrabold text-zinc-400 block text-[8px] uppercase">Total da O.S.</span>
                      <p className="text-sm font-black text-zinc-950 mt-0.5">{formatCurrency(printOS.totalAmount)}</p>
                    </div>

                    <div className="text-right">
                      <span className="font-extrabold text-zinc-400 block text-[8px] uppercase">Acompanhe Online</span>
                      <div className="flex items-center justify-end gap-1.5 mt-1">
                        <span className="text-[9px] font-mono text-zinc-500 font-bold">{printOS.osNumber}</span>
                        <QrCode size={18} className="text-zinc-400" />
                      </div>
                    </div>
                  </div>

                  {/* Legal Terms & Warranty */}
                  <div className="border border-zinc-150 rounded-lg p-2 bg-zinc-50/50 text-[6px] leading-tight text-zinc-500 font-medium">
                    <p className="font-extrabold text-zinc-700 uppercase mb-0.5">Termos de Garantia & Condições de Atendimento</p>
                    <ul className="list-disc list-inside space-y-0.5">
                      <li><strong>Garantia Legal:</strong> Garantia de 90 dias sobre serviços realizados (Art. 26, II do Código de Defesa do Consumidor - Lei 8078/90).</li>
                      <li><strong>Abandono de Equipamento:</strong> Conforme legislação civil, aparelhos prontos e não retirados após 90 dias serão considerados abandonados, podendo ser alienados pela oficina para custear peças e mão de obra.</li>
                      <li><strong>Responsabilidade sobre Dados:</strong> Não nos responsabilizamos pela integridade de fotos, contatos, conversas e mídias do aparelho. É dever do cliente efetuar backup completo antes do início do reparo técnico.</li>
                    </ul>
                  </div>

                  {/* Signatures placeholder */}
                  <div className="grid grid-cols-2 gap-8 pt-4">
                    <div className="border-t border-zinc-300 text-center pt-1 text-[8px] font-bold text-zinc-400 uppercase">
                      Assinatura do Técnico
                    </div>
                    <div className="text-center pt-1 text-[8px] font-bold text-zinc-400 uppercase relative">
                      {printOS.signature ? (
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 max-h-10">
                          <img src={printOS.signature} alt="Assinatura" className="h-8 object-contain" referrerPolicy="no-referrer" />
                        </div>
                      ) : (
                        <div className="border-t border-zinc-300 w-full mb-1"></div>
                      )}
                      Assinatura do Cliente
                    </div>
                  </div>
                </div>

                {/* VIA 2: SHOP VIA (VIA DA LOJA) */}
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      {shopLogo ? (
                        <img src={shopLogo} alt="Logo" className="w-10 h-10 object-contain" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-10 h-10 bg-zinc-950 text-white rounded-lg flex items-center justify-center font-bold">OS</div>
                      )}
                      <div>
                        <h4 className="text-xs font-black uppercase tracking-wider">{shopName || 'ASSISTÊNCIA TÉCNICA'}</h4>
                        <p className="text-[8px] text-zinc-500">Contato: {shopPhone} | CNPJ/CPF: {shopCnpjCpf}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] font-black bg-zinc-100 border border-zinc-300 text-zinc-800 px-2 py-0.5 rounded-full uppercase tracking-wider">Via da Oficina</span>
                      <p className="text-xs font-black text-zinc-950 mt-1">{printOS.osNumber}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-[10px] text-zinc-700 bg-zinc-50 p-2.5 rounded-lg border border-zinc-150">
                    <div>
                      <span className="font-extrabold text-zinc-400 block text-[8px] uppercase">Cliente</span>
                      <p className="font-bold text-zinc-900">{printOS.customerName}</p>
                      <p className="text-[9px]">{formatPhone(printOS.customerPhone)}</p>
                    </div>
                    <div>
                      <span className="font-extrabold text-zinc-400 block text-[8px] uppercase">Aparelho</span>
                      <p className="font-bold text-zinc-900">{printOS.deviceName}</p>
                      <p className="text-[9px] font-mono text-zinc-500">SN: {printOS.serialNumber || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="font-extrabold text-zinc-400 block text-[8px] uppercase">Senha do Aparelho</span>
                      <p className="font-bold text-zinc-950 bg-white border px-1.5 py-0.5 rounded max-w-max text-[9px]">
                        {printOS.patternLock ? `Padrão: ${printOS.patternLock}` : 'Sem senha'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-[10px]">
                    <div className="border border-zinc-200 p-2 rounded-lg">
                      <span className="font-extrabold text-zinc-400 block text-[8px] uppercase">Defeito e Diagnóstico</span>
                      <p className="font-bold text-zinc-900">Defeito: <span className="font-normal italic text-zinc-700">{printOS.reportedDefect}</span></p>
                      <p className="font-bold text-zinc-900 mt-1">Solução: <span className="font-normal text-zinc-700">{printOS.technicalDiagnosis || 'Não informado.'}</span></p>
                    </div>
                    <div className="border border-zinc-200 p-2 rounded-lg space-y-1 bg-zinc-50/50">
                      <span className="font-extrabold text-zinc-400 block text-[8px] uppercase">Custos & Internos</span>
                      <p className="text-zinc-600">Serviço/Mão de obra: <span className="font-bold text-zinc-800">{formatCurrency(printOS.priceLabor)}</span></p>
                      <p className="text-zinc-600">Peças aplicadas: <span className="font-bold text-zinc-800">{formatCurrency(printOS.priceParts)}</span></p>
                      <p className="text-[9px] text-zinc-500 italic mt-1 bg-white p-1 rounded border border-zinc-100">Obs: {printOS.deviceObservations || 'Nenhuma observação estática cadastrada.'}</p>
                    </div>
                  </div>

                  {/* Legal Terms & Warranty */}
                  <div className="border border-zinc-150 rounded-lg p-2 bg-zinc-50/50 text-[6px] leading-tight text-zinc-500 font-medium">
                    <p className="font-extrabold text-zinc-700 uppercase mb-0.5">Termos de Garantia & Condições de Atendimento</p>
                    <ul className="list-disc list-inside space-y-0.5">
                      <li><strong>Garantia Legal:</strong> Garantia de 90 dias sobre serviços realizados (Art. 26, II do Código de Defesa do Consumidor - Lei 8078/90).</li>
                      <li><strong>Abandono de Equipamento:</strong> Conforme legislação civil, aparelhos prontos e não retirados após 90 dias serão considerados abandonados, podendo ser alienados pela oficina para custear peças e mão de obra.</li>
                      <li><strong>Responsabilidade sobre Dados:</strong> Não nos responsabilizamos pela integridade de fotos, contatos, conversas e mídias do aparelho. É dever do cliente efetuar backup completo antes do início do reparo técnico.</li>
                    </ul>
                  </div>

                  {/* Signatures placeholder */}
                  <div className="grid grid-cols-2 gap-8 pt-4">
                    <div className="border-t border-zinc-300 text-center pt-1 text-[8px] font-bold text-zinc-400 uppercase">
                      Técnico Responsável
                    </div>
                    <div className="text-center pt-1 text-[8px] font-bold text-zinc-400 uppercase relative">
                      {printOS.signature ? (
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 max-h-10">
                          <img src={printOS.signature} alt="Assinatura" className="h-8 object-contain" referrerPolicy="no-referrer" />
                        </div>
                      ) : (
                        <div className="border-t border-zinc-300 w-full mb-1"></div>
                      )}
                      Autorização do Cliente
                    </div>
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="p-4 bg-zinc-50 border-t border-zinc-100 flex gap-2">
                <button
                  onClick={() => setIsPrintModalOpen(false)}
                  className="flex-1 py-2 px-4 bg-zinc-200 hover:bg-zinc-300 text-zinc-700 text-xs font-bold rounded-lg cursor-pointer"
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
                    onChange={(e) => setFinalizationObservation(e.target.value)}
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
