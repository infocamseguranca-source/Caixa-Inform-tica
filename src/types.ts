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
}

export interface CashRegisterState {
  saldo: number;
  entradas: number;
  saidas: number;
}
