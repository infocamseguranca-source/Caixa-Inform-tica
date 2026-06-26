export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'entrada' | 'saida' | 'abertura_caixa' | 'fechamento_caixa';
  category: string;
  paymentMethod: 'dinheiro' | 'pix' | 'debito' | 'credito';
  date: string;
  osId?: string;
  productId?: string;
  cost?: number;
  sellerId?: string;
  technicianId?: string;
  items?: { product: Product; qty: number; unitPrice?: number }[];
}

export type OSStatus = 
  | 'aguardando' // Aguardando Orçamento
  | 'aprovado'   // Orçamento Aprovado
  | 'em_reparo'  // Em Manutenção
  | 'pronto'     // Pronto para Retirada
  | 'entregue'   // Entregue / Finalizado
  | 'cancelado'; // Cancelado

export interface PartOrder {
  name: string;
  costPrice: number;
  clientPrice: number;
  supplierLink: string;
}

export interface ServiceOrder {
  id: string;
  osNumber: string;
  customerName: string;
  customerCpfCnpj?: string;
  customerPhone: string;
  customerEmail?: string;
  customerBirthDate?: string;
  customerAddress?: string;
  deviceName: string;
  deviceType: 'Celular' | 'Tablet' | 'Notebook' | 'Computador' | 'Console' | 'Impressora' | string;
  serialNumber?: string;
  reportedDefect: string;
  deviceObservations?: string;
  technicalDiagnosis?: string;
  status: OSStatus;
  priceLabor: number;
  priceParts: number;
  totalAmount: number;
  paymentStatus: 'pendente' | 'pago';
  paymentMethod?: 'dinheiro' | 'pix' | 'debito' | 'credito';
  patternLock?: string; // Legacy: String representation of grid pattern dots, e.g., "1-2-3"
  passwordType?: 'pin' | 'padrao' | 'escrita';
  passwordValue?: string;
  signature?: string; // Base64 dataURL of signature
  photos?: string[]; // Array of Base64 image strings
  partOrder?: PartOrder;
  technicianId?: string;
  sellerId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  cpfCnpj?: string;
  birthDate?: string;
  ownerId?: string; // Google account user.uid
  createdAt: string;
  updatedAt: string;
}

export interface BackupHistory {
  id: string;
  fileName: string;
  fileId: string;
  date: string;
  size: string;
  status: 'success' | 'failed';
}

export interface Product {
  id: string;
  name: string;
  price: number;
  costPrice?: number;
  stock: number;
  type?: string;
  condition?: 'novo' | 'semi-novo';
  usageTime?: string;
  description?: string;
  createdAt?: string;
  isPromotion?: boolean;
  promotionPrice?: number;
}

export interface Staff {
  id: string;
  name: string;
  role: 'tecnico' | 'vendedor' | 'ambos' | string;
  isSeller?: boolean;
  isTechnician?: boolean;
  commission: number; // Legacy or general
  salesCommissionRate?: number;
  salesCommissionMinLimit?: number;
  techCommissionRate?: number;
  techCommissionByType?: { type: string; rate: number }[];
  targetAmount?: number;
  targetCommission?: number;
  password?: string;
}

export interface Appointment {
  id: string;
  customerName: string;
  customerPhone: string;
  address: string;
  service: string;
  date: string; // ISO DateTime
  technicianId: string;
  notified: boolean;
}

export interface ShopConfig {
  name: string;
  cnpjCpf: string;
  phone: string;
  email: string;
  logo: string; // Base64 image
  colors: {
    primary: string; // HEX code
    accent: string; // HEX code
  };
  categories: string[];
  osStartNumber: number;
  menuOrder: string[]; // List of tab IDs
  autoSaveOSToDrive?: boolean;
  commissionPassword?: string;
  finalizationOptions?: string[];
  purchaseCategories?: string[];
  purchaseEquipmentTypes?: string[];
  productTypes?: string[];
  enablePurchaseSignature?: boolean;
  whatsappMessages?: {
    aguardando?: string;
    aprovado?: string;
    em_reparo?: string;
    pronto?: string;
    entregue?: string;
    default?: string;
    appointment?: string;
  };
  whatsappApiToken?: string;
  whatsappPhoneNumberId?: string;
  nonFiscalPrinterType?: 'none' | 'bluetooth' | 'usb' | 'network';
  nonFiscalPrinterName?: string;
  commonPrinterType?: 'none' | 'system' | 'network';
  commonPrinterName?: string;
}

export interface EquipmentPurchase {
  id: string;
  customerName: string;
  customerPhone: string;
  customerCpf: string;
  documentPhoto?: string; // Base64 dataURL
  purchaseCategory: string; // Informatica, Celulares, etc.
  equipmentType: string; // computador, notebook, celular, tablet, monitor, impressora, outros
  hasPassword?: boolean;
  passwordType?: 'padrao' | 'pin' | 'escrita' | 'nenhuma';
  passwordValue?: string;
  googleAccount?: string;
  googlePassword?: string;
  imei?: string;
  imeiChecked?: boolean;
  amountPaid: number;
  paymentMethod: 'dinheiro' | 'pix' | 'debito' | 'credito';
  signature?: string; // Base64 signature
  date: string;
  additionalPasswords?: { type: 'padrao' | 'pin' | 'escrita' | 'nenhuma'; value: string }[];
}

export interface CashRegisterState {
  saldo: number;
  entradas: number;
  saidas: number;
}
