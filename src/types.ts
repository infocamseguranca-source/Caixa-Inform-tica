export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'entrada' | 'saida';
  category: string;
  paymentMethod: 'dinheiro' | 'pix' | 'debito' | 'credito';
  date: string;
  osId?: string;
  productId?: string;
  sellerId?: string;
  technicianId?: string;
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
  customerPhone: string;
  customerEmail?: string;
  customerBirthDate?: string;
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
  patternLock?: string; // String representation of grid pattern dots, e.g., "1-2-3"
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
  cpf?: string;
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
  stock: number;
}

export interface Staff {
  id: string;
  name: string;
  role: 'tecnico' | 'vendedor';
  commission: number; // Percentage, e.g., 5 for 5%
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
  enablePurchaseSignature?: boolean;
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
