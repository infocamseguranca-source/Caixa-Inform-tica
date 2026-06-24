import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  DollarSign, 
  Wrench, 
  Cloud, 
  LogOut, 
  Menu, 
  X, 
  Database, 
  Sparkles,
  User,
  Computer,
  ShoppingBag,
  Package,
  Calendar,
  Settings,
  Download,
  FileSpreadsheet
} from 'lucide-react';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  deleteDoc, 
  writeBatch, 
  query,
  setDoc
} from 'firebase/firestore';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { db, auth, googleSignIn, logout, getAccessToken } from './firebase';
import { Transaction, ServiceOrder, BackupHistory, Product, Staff, Appointment, ShopConfig } from './types';
import { generateOSNumber, exportToExcel } from './utils';
import { motion, AnimatePresence } from 'motion/react';

// Import components
import Dashboard from './components/Dashboard';
import CashRegister from './components/CashRegister';
import ServiceOrders from './components/ServiceOrders';
import SettingsBackup from './components/SettingsBackup';
import Products from './components/Products';
import PDV from './components/PDV';
import Appointments from './components/Appointments';
import SettingsShop from './components/SettingsShop';

const SAMPLE_TRANSACTIONS = [
  {
    description: 'Serviço de Formatação de SSD e Instalação OS',
    amount: 180,
    type: 'entrada' as const,
    category: 'Serviço de Assistência',
    paymentMethod: 'pix' as const,
    date: new Date(Date.now() - 4 * 3600000).toISOString()
  },
  {
    description: 'Venda de Roteador TP-Link Archer C6',
    amount: 289,
    type: 'entrada' as const,
    category: 'Venda de Equipamento',
    paymentMethod: 'pix' as const,
    date: new Date(Date.now() - 28 * 3600000).toISOString()
  },
  {
    description: 'Compra de 2 SSDs Kingston 480GB para Estoque',
    amount: 340,
    type: 'saida' as const,
    category: 'Compra de Peças',
    paymentMethod: 'credito' as const,
    date: new Date(Date.now() - 50 * 3600000).toISOString()
  },
  {
    description: 'Venda de Cabo HDMI 2.0 Ultra HD 2m',
    amount: 45,
    type: 'entrada' as const,
    category: 'Venda de Acessórios',
    paymentMethod: 'dinheiro' as const,
    date: new Date(Date.now() - 72 * 3600000).toISOString()
  },
  {
    description: 'Pagamento de Energia Comercial + Link Fibra',
    amount: 230,
    type: 'saida' as const,
    category: 'Luz / Internet / Telefone',
    paymentMethod: 'pix' as const,
    date: new Date(Date.now() - 96 * 3600000).toISOString()
  }
];

const SAMPLE_SERVICE_ORDERS = [
  {
    osNumber: 'OS-83748',
    customerName: 'Renato Mendes',
    customerPhone: '11988776655',
    customerEmail: 'renato@mendes.com',
    customerBirthDate: '1990-05-15',
    deviceName: 'Notebook Dell G15 RTX 3050',
    deviceType: 'Notebook',
    serialNumber: 'SN-G15-D84294',
    reportedDefect: 'Superaquecimento jogando e desligando sozinho após 15 minutos.',
    technicalDiagnosis: 'Pasta térmica original ressecada. Efetuada limpeza interna das ventoinhas e troca de pasta térmica por Noctua de Prata.',
    deviceObservations: 'Marcas de uso leves na carcaça superior.',
    status: 'pronto' as const,
    priceLabor: 180,
    priceParts: 50,
    totalAmount: 230,
    paymentStatus: 'pendente' as const
  },
  {
    osNumber: 'OS-10982',
    customerName: 'Clara Vasconcelos',
    customerPhone: '21976543210',
    deviceName: 'iPad Air 4ª Geração',
    deviceType: 'Tablet',
    serialNumber: 'SN-IPAD-472948',
    reportedDefect: 'Tela quebrada após queda, touch parou de funcionar na parte inferior.',
    technicalDiagnosis: 'Aguardando chegada da nova tela frontal para efetuar a substituição.',
    deviceObservations: 'Canto inferior esquerdo amassado devido ao impacto.',
    status: 'em_reparo' as const,
    priceLabor: 250,
    priceParts: 480,
    totalAmount: 730,
    paymentStatus: 'pendente' as const
  },
  {
    osNumber: 'OS-49382',
    customerName: 'Bruno Ribeiro',
    customerPhone: '19992345678',
    customerEmail: 'bruno@ribeiro.dev',
    deviceName: 'MacBook Air M1',
    deviceType: 'Notebook',
    serialNumber: 'SN-APPLE-M1-837',
    reportedDefect: 'Teclado com teclas travando e bateria com aviso de manutenção.',
    technicalDiagnosis: 'Aguardando aprovação do cliente sobre o custo da bateria e teclado original Apple.',
    deviceObservations: 'Sem riscos aparentes.',
    status: 'aguardando' as const,
    priceLabor: 300,
    priceParts: 850,
    totalAmount: 1150,
    paymentStatus: 'pendente' as const
  }
];

const SAMPLE_PRODUCTS = [
  { name: 'SSD Kingston NV2 500GB NVMe M.2', price: 249.90, stock: 12 },
  { name: 'Memória RAM Kingston Fury 8GB DDR4 3200MHz', price: 169.00, stock: 8 },
  { name: 'Roteador Wi-Fi 6 TP-Link Archer AX12', price: 329.90, stock: 5 },
  { name: 'Cabo de Rede Patch Cord CAT6 2.5m', price: 18.00, stock: 35 },
  { name: 'Pasta Térmica Noctua NT-H1 3.5g', price: 69.90, stock: 4 },
  { name: 'Mouse Gamer Logitech G203 Black', price: 149.90, stock: 2 }
];

const SAMPLE_STAFF = [
  { name: 'Carlos Oliveira', role: 'tecnico' as const, commission: 10 },
  { name: 'Amanda Gouveia', role: 'vendedor' as const, commission: 5 },
  { name: 'Roberto Santos', role: 'tecnico' as const, commission: 8 }
];

const DEFAULT_CONFIG: ShopConfig = {
  name: 'InfoCam Assistência Técnica',
  cnpjCpf: '12.345.678/0001-90',
  phone: '(11) 98888-7777',
  email: 'contato@infocam.com.br',
  logo: '',
  colors: {
    primary: '#18181b',
    accent: '#10b981'
  },
  categories: [
    'Serviço de Assistência',
    'Venda de Equipamento',
    'Compra de Peças',
    'Venda de Acessórios',
    'Retirada Pro-labore',
    'Aluguel / Condomínio',
    'Luz / Internet / Telefone',
    'Outros'
  ],
  osStartNumber: 1001,
  menuOrder: ['dashboard', 'caixa', 'vendas', 'produtos', 'os', 'agendamentos', 'backup', 'settings_shop'],
  autoSaveOSToDrive: false
};

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  
  // Auth state
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  // Data state
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
  const [backupHistory, setBackupHistory] = useState<BackupHistory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [shopConfig, setShopConfig] = useState<ShopConfig>(DEFAULT_CONFIG);
  
  const [loading, setLoading] = useState(true);

  // Mobile sidebar toggle
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Desktop hover layout toggle
  const [isHovered, setIsHovered] = useState(false);

  // Initialize auth
  useEffect(() => {
    // Listen to Firebase auth changes
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Attempt to get active token
        try {
          const accessToken = await getAccessToken();
          setToken(accessToken);
          setNeedsAuth(false); // Do not force login block, allow hybrid use
        } catch (error) {
          console.error('Error getting auth token:', error);
          setNeedsAuth(false);
        }
      } else {
        setToken(null);
        setNeedsAuth(false); // Completely offline by default
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Set up real-time listeners or load from localStorage
  useEffect(() => {
    if (!user) {
      // Offline Mode: Load from localStorage
      const localTx = localStorage.getItem('infocam_transactions');
      const localOS = localStorage.getItem('infocam_service_orders');
      const localBackup = localStorage.getItem('infocam_backup_history');
      const localProducts = localStorage.getItem('infocam_products');
      const localStaff = localStorage.getItem('infocam_staff');
      const localAppts = localStorage.getItem('infocam_appointments');
      const localConfig = localStorage.getItem('infocam_config');

      if (localTx) {
        setTransactions(JSON.parse(localTx));
      } else {
        setTransactions(SAMPLE_TRANSACTIONS.map((t, i) => ({ id: `tx-${i}-${Date.now()}`, ...t })));
      }

      if (localOS) {
        setServiceOrders(JSON.parse(localOS));
      } else {
        setServiceOrders(SAMPLE_SERVICE_ORDERS.map((o, i) => ({ 
          id: `os-${i}-${Date.now()}`, 
          ...o,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })));
      }

      if (localBackup) {
        setBackupHistory(JSON.parse(localBackup));
      } else {
        setBackupHistory([]);
      }

      if (localProducts) {
        setProducts(JSON.parse(localProducts));
      } else {
        setProducts(SAMPLE_PRODUCTS.map((p, i) => ({ id: `p-${i}`, ...p })));
      }

      if (localStaff) {
        setStaffList(JSON.parse(localStaff));
      } else {
        setStaffList(SAMPLE_STAFF.map((s, i) => ({ id: `s-${i}`, ...s })));
      }

      if (localAppts) {
        setAppointments(JSON.parse(localAppts));
      } else {
        setAppointments([]);
      }

      if (localConfig) {
        setShopConfig(JSON.parse(localConfig));
      } else {
        setShopConfig(DEFAULT_CONFIG);
      }
      return;
    }

    // Subscribe to transactions collection
    const unsubTransactions = onSnapshot(collection(db, 'transactions'), (snapshot) => {
      const data: Transaction[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as Transaction);
      });
      setTransactions(data);
    });

    // Subscribe to service orders collection
    const unsubOS = onSnapshot(collection(db, 'service_orders'), (snapshot) => {
      const data: ServiceOrder[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as ServiceOrder);
      });
      setServiceOrders(data);
    });

    // Subscribe to backup history collection
    const unsubBackups = onSnapshot(collection(db, 'backup_history'), (snapshot) => {
      const data: BackupHistory[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as BackupHistory);
      });
      setBackupHistory(data);
    });

    // Subscribe to products collection
    const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      const data: Product[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as Product);
      });
      setProducts(data);
    });

    // Subscribe to staff collection
    const unsubStaff = onSnapshot(collection(db, 'staff'), (snapshot) => {
      const data: Staff[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as Staff);
      });
      setStaffList(data);
    });

    // Subscribe to appointments collection
    const unsubAppointments = onSnapshot(collection(db, 'appointments'), (snapshot) => {
      const data: Appointment[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as Appointment);
      });
      setAppointments(data);
    });

    // Subscribe to shop configuration document
    const unsubConfig = onSnapshot(doc(db, 'shop_config', 'config'), (docSnap) => {
      if (docSnap.exists()) {
        setShopConfig(docSnap.data() as ShopConfig);
      } else {
        // Automatically save initial shop config to Firestore
        setDoc(doc(db, 'shop_config', 'config'), DEFAULT_CONFIG).catch(err => {
          console.error('Failed to write initial shop config:', err);
        });
        setShopConfig(DEFAULT_CONFIG);
      }
    });

    return () => {
      unsubTransactions();
      unsubOS();
      unsubBackups();
      unsubProducts();
      unsubStaff();
      unsubAppointments();
      unsubConfig();
    };
  }, [user]);

  // Handle Sign-In Flow
  const handleGoogleSignIn = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setToken(result.accessToken);
        setUser(result.user);
        setNeedsAuth(false);
      }
    } catch (err) {
      console.error('Falha ao autenticar:', err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await logout();
      setUser(null);
      setToken(null);
      setNeedsAuth(false); // Do not force login on logout
    } catch (err) {
      console.error('Erro ao deslogar:', err);
    }
  };

  // Persistent caching to localStorage for seamless offline access and updates
  useEffect(() => {
    if (loading) return;
    localStorage.setItem('infocam_transactions', JSON.stringify(transactions));
  }, [transactions, loading]);

  useEffect(() => {
    if (loading) return;
    localStorage.setItem('infocam_service_orders', JSON.stringify(serviceOrders));
  }, [serviceOrders, loading]);

  useEffect(() => {
    if (loading) return;
    localStorage.setItem('infocam_backup_history', JSON.stringify(backupHistory));
  }, [backupHistory, loading]);

  useEffect(() => {
    if (loading) return;
    localStorage.setItem('infocam_products', JSON.stringify(products));
  }, [products, loading]);

  useEffect(() => {
    if (loading) return;
    localStorage.setItem('infocam_staff', JSON.stringify(staffList));
  }, [staffList, loading]);

  useEffect(() => {
    if (loading) return;
    localStorage.setItem('infocam_appointments', JSON.stringify(appointments));
  }, [appointments, loading]);

  useEffect(() => {
    if (loading) return;
    localStorage.setItem('infocam_config', JSON.stringify(shopConfig));
  }, [shopConfig, loading]);

  // Seeding sample template data
  const handleSeedSamples = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const batch = writeBatch(db);

      // Seed Transactions
      SAMPLE_TRANSACTIONS.forEach((item) => {
        const transRef = doc(collection(db, 'transactions'));
        batch.set(transRef, item);
      });

      // Seed OSs
      SAMPLE_SERVICE_ORDERS.forEach((item) => {
        const osRef = doc(collection(db, 'service_orders'));
        batch.set(osRef, {
          ...item,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      });

      // Seed Products
      SAMPLE_PRODUCTS.forEach((item) => {
        const prodRef = doc(collection(db, 'products'));
        batch.set(prodRef, item);
      });

      // Seed Staff members
      SAMPLE_STAFF.forEach((item) => {
        const staffRef = doc(collection(db, 'staff'));
        batch.set(staffRef, item);
      });

      // Seed dynamic config
      const configRef = doc(db, 'shop_config', 'config');
      batch.set(configRef, DEFAULT_CONFIG);

      await batch.commit();
      alert('Dados de demonstração populados com sucesso no Firebase!');
    } catch (err) {
      console.error('Failed to seed samples:', err);
      alert('Erro ao popular dados de demonstração.');
    } finally {
      setLoading(false);
    }
  };

  // RESTORE backup from JSON
  const handleRestoreBackup = async (backupData: { 
    transactions?: Transaction[]; 
    serviceOrders?: ServiceOrder[];
    products?: Product[];
    staff?: Staff[];
    appointments?: Appointment[];
    config?: ShopConfig;
  }) => {
    if (!user) return;
    setLoading(true);
    try {
      // 1. Clear current database docs
      const batchDelete = writeBatch(db);
      
      transactions.forEach((t) => {
        batchDelete.delete(doc(db, 'transactions', t.id));
      });
      serviceOrders.forEach((os) => {
        batchDelete.delete(doc(db, 'service_orders', os.id));
      });
      products.forEach((p) => {
        batchDelete.delete(doc(db, 'products', p.id));
      });
      staffList.forEach((st) => {
        batchDelete.delete(doc(db, 'staff', st.id));
      });
      appointments.forEach((app) => {
        batchDelete.delete(doc(db, 'appointments', app.id));
      });
      
      await batchDelete.commit();

      // 2. Write backup data
      const batchWrite = writeBatch(db);
      
      if (backupData.transactions) {
        backupData.transactions.forEach((t) => {
          const { id, ...cleanT } = t;
          batchWrite.set(doc(collection(db, 'transactions')), cleanT);
        });
      }

      if (backupData.serviceOrders) {
        backupData.serviceOrders.forEach((os) => {
          const { id, ...cleanOS } = os;
          batchWrite.set(doc(collection(db, 'service_orders')), cleanOS);
        });
      }

      if (backupData.products) {
        backupData.products.forEach((p) => {
          const { id, ...cleanP } = p;
          batchWrite.set(doc(collection(db, 'products')), cleanP);
        });
      }

      if (backupData.staff) {
        backupData.staff.forEach((st) => {
          const { id, ...cleanSt } = st;
          batchWrite.set(doc(collection(db, 'staff')), cleanSt);
        });
      }

      if (backupData.appointments) {
        backupData.appointments.forEach((app) => {
          const { id, ...cleanApp } = app;
          batchWrite.set(doc(collection(db, 'appointments')), cleanApp);
        });
      }

      if (backupData.config) {
        batchWrite.set(doc(db, 'shop_config', 'config'), backupData.config);
      }

      await batchWrite.commit();
    } catch (err) {
      console.error(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // CRUD Transaction Operations
  const handleAddTransaction = async (item: Omit<Transaction, 'id'>) => {
    if (user) {
      await addDoc(collection(db, 'transactions'), item);
    } else {
      const newTx: Transaction = { id: `tx-${Date.now()}`, ...item };
      setTransactions(prev => [newTx, ...prev]);
    }
  };

  const handleEditTransaction = async (id: string, updatedFields: Partial<Transaction>) => {
    if (user) {
      await updateDoc(doc(db, 'transactions', id), updatedFields);
    } else {
      setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...updatedFields } : t));
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (user) {
      await deleteDoc(doc(db, 'transactions', id));
    } else {
      setTransactions(prev => prev.filter(t => t.id !== id));
    }
  };

  // CRUD OS Operations
  const handleAddOS = async (item: Omit<ServiceOrder, 'id' | 'osNumber' | 'createdAt' | 'updatedAt'>): Promise<ServiceOrder> => {
    const osNumber = generateOSNumber();
    const osPayload = {
      ...item,
      osNumber,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    if (user) {
      const docRef = await addDoc(collection(db, 'service_orders'), osPayload);
      return { id: docRef.id, ...osPayload };
    } else {
      const id = `os-${Date.now()}`;
      const newOS: ServiceOrder = { id, ...osPayload };
      setServiceOrders(prev => [newOS, ...prev]);
      return newOS;
    }
  };

  const handleEditOS = async (id: string, updatedFields: Partial<ServiceOrder>): Promise<ServiceOrder> => {
    const now = new Date().toISOString();
    if (user) {
      await updateDoc(doc(db, 'service_orders', id), {
        ...updatedFields,
        updatedAt: now
      });
      const existing = serviceOrders.find(o => o.id === id);
      return { ...existing, ...updatedFields, id, updatedAt: now } as ServiceOrder;
    } else {
      let updatedOS: ServiceOrder | null = null;
      setServiceOrders(prev => prev.map(os => {
        if (os.id === id) {
          updatedOS = { ...os, ...updatedFields, updatedAt: now };
          return updatedOS;
        }
        return os;
      }));
      return updatedOS || ({ ...updatedFields, id, updatedAt: now } as ServiceOrder);
    }
  };

  const handleDeleteOS = async (id: string) => {
    if (user) {
      await deleteDoc(doc(db, 'service_orders', id));
    } else {
      setServiceOrders(prev => prev.filter(os => os.id !== id));
    }
  };

  // CRUD Product Operations
  const handleAddProduct = async (item: Omit<Product, 'id'>) => {
    if (user) {
      await addDoc(collection(db, 'products'), item);
    } else {
      const newProd: Product = { id: `p-${Date.now()}`, ...item };
      setProducts(prev => [newProd, ...prev]);
    }
  };

  const handleEditProduct = async (id: string, updatedFields: Partial<Product>) => {
    if (user) {
      await updateDoc(doc(db, 'products', id), updatedFields);
    } else {
      setProducts(prev => prev.map(p => p.id === id ? { ...p, ...updatedFields } : p));
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (user) {
      await deleteDoc(doc(db, 'products', id));
    } else {
      setProducts(prev => prev.filter(p => p.id !== id));
    }
  };

  // CRUD Staff Operations
  const handleAddStaff = async (item: Omit<Staff, 'id'>) => {
    if (user) {
      await addDoc(collection(db, 'staff'), item);
    } else {
      const newStaff: Staff = { id: `s-${Date.now()}`, ...item };
      setStaffList(prev => [newStaff, ...prev]);
    }
  };

  const handleDeleteStaff = async (id: string) => {
    if (user) {
      await deleteDoc(doc(db, 'staff', id));
    } else {
      setStaffList(prev => prev.filter(s => s.id !== id));
    }
  };

  // CRUD Appointment Operations
  const handleAddAppointment = async (item: Omit<Appointment, 'id' | 'notified'>) => {
    const payload = { ...item, notified: false };
    if (user) {
      await addDoc(collection(db, 'appointments'), payload);
    } else {
      const newAppt: Appointment = { id: `appt-${Date.now()}`, ...payload };
      setAppointments(prev => [newAppt, ...prev]);
    }
  };

  const handleDeleteAppointment = async (id: string) => {
    if (user) {
      await deleteDoc(doc(db, 'appointments', id));
    } else {
      setAppointments(prev => prev.filter(app => app.id !== id));
    }
  };

  // Save Shop Configuration
  const handleSaveShopConfig = async (updatedConfig: ShopConfig) => {
    if (user) {
      await setDoc(doc(db, 'shop_config', 'config'), updatedConfig);
    } else {
      localStorage.setItem('infocam_config', JSON.stringify(updatedConfig));
    }
    setShopConfig(updatedConfig);
  };

  // INTEGRATED RECEIVING FLOW: OS paid and cash register synchronized
  const handleReceiveOSPayment = async (os: ServiceOrder, paymentMethod: 'dinheiro' | 'pix' | 'debito' | 'credito') => {
    const transactionPayload: Omit<Transaction, 'id'> = {
      description: `Recebimento O.S. ${os.osNumber} - Cliente: ${os.customerName}`,
      amount: os.totalAmount,
      type: 'entrada',
      category: 'Serviço de Assistência',
      paymentMethod,
      date: new Date().toISOString(),
      osId: os.id
    };

    if (user) {
      try {
        await addDoc(collection(db, 'transactions'), transactionPayload);
        await updateDoc(doc(db, 'service_orders', os.id), {
          status: 'entregue',
          paymentStatus: 'pago',
          updatedAt: new Date().toISOString()
        });
        alert(`Pagamento de ${os.osNumber} recebido com sucesso no Caixa!`);
      } catch (err) {
        console.error(err);
        throw err;
      }
    } else {
      const newTx: Transaction = { id: `tx-${Date.now()}`, ...transactionPayload };
      setTransactions(prev => [newTx, ...prev]);
      setServiceOrders(prev => prev.map(item => item.id === os.id ? {
        ...item,
        status: 'entregue',
        paymentStatus: 'pago',
        updatedAt: new Date().toISOString()
      } : item));
      alert(`Pagamento de ${os.osNumber} recebido com sucesso no Caixa Local!`);
    }
  };

  const handleAddBackupLog = async (log: Omit<BackupHistory, 'id'>) => {
    if (user) {
      await addDoc(collection(db, 'backup_history'), log);
    } else {
      const newLog: BackupHistory = { id: `bk-${Date.now()}`, ...log };
      setBackupHistory(prev => [newLog, ...prev]);
    }
  };

  // PDV sale registration logic that decreases product stock automatically
  const handleRegisterSale = async (saleData: {
    items: { product: Product; qty: number }[];
    sellerId?: string;
    technicianId?: string;
    paymentMethod: 'dinheiro' | 'pix' | 'debito' | 'credito';
    total: number;
  }) => {
    const desc = `Venda PDV - ${saleData.items.map(i => `${i.qty}x ${i.product.name}`).join(', ')}`;
    const transactionPayload = {
      description: desc.substring(0, 150) + (desc.length > 150 ? '...' : ''),
      amount: saleData.total,
      type: 'entrada' as const,
      category: 'Venda de Equipamento',
      paymentMethod: saleData.paymentMethod,
      date: new Date().toISOString(),
      sellerId: saleData.sellerId || null,
      technicianId: saleData.technicianId || null
    };

    if (user) {
      try {
        const batch = writeBatch(db);
        const transRef = doc(collection(db, 'transactions'));
        batch.set(transRef, transactionPayload);
        saleData.items.forEach(item => {
          const prodRef = doc(db, 'products', item.product.id);
          const newStock = Math.max(0, item.product.stock - item.qty);
          batch.update(prodRef, { stock: newStock });
        });
        await batch.commit();
      } catch (err) {
        console.error('Erro ao processar venda no PDV:', err);
        throw err;
      }
    } else {
      const newTx: Transaction = { id: `tx-${Date.now()}`, ...transactionPayload };
      setTransactions(prev => [newTx, ...prev]);
      setProducts(prev => prev.map(p => {
        const saleItem = saleData.items.find(item => item.product.id === p.id);
        if (saleItem) {
          return { ...p, stock: Math.max(0, p.stock - saleItem.qty) };
        }
        return p;
      }));
      alert('Venda registrada localmente com sucesso!');
    }
  };

  // Dynamic menu mapper based on shop configuration preference order
  const getMenuIcon = (id: string, size = 18) => {
    switch (id) {
      case 'dashboard': return <LayoutDashboard size={size} />;
      case 'caixa': return <DollarSign size={size} />;
      case 'vendas': return <ShoppingBag size={size} />;
      case 'produtos': return <Package size={size} />;
      case 'os': return <Wrench size={size} />;
      case 'agendamentos': return <Calendar size={size} />;
      case 'backup': return <Cloud size={size} />;
      case 'settings_shop': return <Settings size={size} />;
      default: return <Computer size={size} />;
    }
  };

  const getMenuLabel = (id: string) => {
    switch (id) {
      case 'dashboard': return 'Painel Geral';
      case 'caixa': return 'Fluxo de Caixa';
      case 'vendas': return 'Vendas (PDV)';
      case 'produtos': return 'Estoque / Produtos';
      case 'os': return 'Ordens de Serviço';
      case 'agendamentos': return 'Agendamentos';
      case 'backup': return 'Drive & Backup';
      case 'settings_shop': return 'Configurações';
      default: return id;
    }
  };

  // Ensure current tab is valid or fallback to dashboard
  const validTabs = shopConfig.menuOrder || DEFAULT_CONFIG.menuOrder;
  const currentMenuOrder = validTabs;

  // Loading indicator on auth initialize
  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4">
          <Computer className="text-zinc-900 animate-pulse" size={48} />
          <p className="text-sm font-bold text-zinc-500 animate-pulse">Conectando ao Firebase de forma segura...</p>
        </div>
      </div>
    );
  }

  // No blocking login screen on startup. Allow fully offline/local use by default.
  // The user can authenticate when they visit the "Drive & Backup" tab or via the sidebar.

  // Active custom palette from settings
  const primaryThemeColor = shopConfig.colors?.primary || '#18181b';
  const accentThemeColor = shopConfig.colors?.accent || '#10b981';

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col md:flex-row font-sans">
      
      {/* Dynamic Theme Color Injection */}
      <style>{`
        :root {
          --primary-color: ${primaryThemeColor};
          --accent-color: ${accentThemeColor};
        }
        .theme-bg-primary {
          background-color: ${primaryThemeColor} !important;
        }
        .theme-text-primary {
          color: ${primaryThemeColor} !important;
        }
        .theme-bg-accent {
          background-color: ${accentThemeColor} !important;
        }
        .theme-text-accent {
          color: ${accentThemeColor} !important;
        }
        .theme-border-accent {
          border-color: ${accentThemeColor} !important;
        }
      `}</style>

      {/* Sidebar - Desktop collapsible on hover */}
      <aside 
        className="hidden md:flex flex-col bg-white border-r border-zinc-150 p-6 space-y-8 justify-between transition-all duration-300 relative shrink-0"
        style={{ width: isHovered ? '270px' : '88px' }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        
        {/* Brand */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 overflow-hidden">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md shrink-0 text-white"
              style={{ backgroundColor: primaryThemeColor }}
            >
              {shopConfig.logo ? (
                <img src={shopConfig.logo} alt="Logo" className="w-8 h-8 object-contain rounded-lg" referrerPolicy="no-referrer" />
              ) : (
                <Computer size={22} />
              )}
            </div>
            {isHovered && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="min-w-0"
              >
                <h1 className="font-extrabold text-xs text-zinc-950 tracking-tight leading-none truncate max-w-[150px]">
                  {shopConfig.name || 'Controle de Caixa'}
                </h1>
                <span className="text-[9px] text-zinc-400 font-bold tracking-wider uppercase">Assistência Técnica</span>
              </motion.div>
            )}
          </div>

          {/* Dynamic Nav list based on Custom Settings Order */}
          <nav className="space-y-1.5 pt-4">
            {currentMenuOrder.map((menuId) => {
              const isActive = currentTab === menuId;
              return (
                <button
                  key={menuId}
                  onClick={() => setCurrentTab(menuId)}
                  className={`w-full flex items-center rounded-xl text-xs font-bold transition-all cursor-pointer ${isHovered ? 'px-4 py-3 gap-3 justify-start' : 'p-3 justify-center'}`}
                  style={{
                    backgroundColor: isActive ? primaryThemeColor : 'transparent',
                    color: isActive ? '#ffffff' : '#71717a'
                  }}
                  title={getMenuLabel(menuId)}
                >
                  <div className="shrink-0">{getMenuIcon(menuId)}</div>
                  {isHovered && (
                    <motion.span 
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="truncate"
                    >
                      {getMenuLabel(menuId)}
                    </motion.span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Info / Seeding */}
        <div className="space-y-4 border-t border-zinc-150 pt-4 overflow-hidden">
          
          {transactions.length === 0 && serviceOrders.length === 0 && products.length === 0 && (
            <button
              onClick={handleSeedSamples}
              className={`w-full flex items-center justify-center gap-2 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-xl text-[10px] font-bold cursor-pointer transition-colors ${isHovered ? 'px-3 py-2' : 'p-2'}`}
              title="Popular Dados de Exemplo"
            >
              <Sparkles size={12} className="shrink-0 animate-pulse" />
              {isHovered && <span>Popular Demonstração</span>}
            </button>
          )}

          <div className="flex items-center gap-3 bg-zinc-50 p-2.5 rounded-xl border border-zinc-150">
            <div className="w-8 h-8 rounded-full bg-zinc-200 flex items-center justify-center font-bold text-zinc-600 overflow-hidden text-xs shrink-0 border border-zinc-200">
              {user?.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || 'User'} referrerPolicy="no-referrer" />
              ) : (
                user?.displayName?.substring(0, 2) || <User size={14} />
              )}
            </div>
            {isHovered && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="min-w-0 flex-1"
              >
                {user ? (
                  <>
                    <p className="text-[11px] font-extrabold text-zinc-900 truncate">{user.displayName || 'Usuário'}</p>
                    <button 
                      onClick={handleSignOut}
                      className="text-[9px] font-bold text-rose-500 hover:text-rose-600 hover:underline flex items-center gap-0.5 cursor-pointer mt-0.5"
                    >
                      <LogOut size={9} /> Sair
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-[11px] font-bold text-zinc-400 truncate">Modo Local</p>
                    <button 
                      onClick={handleGoogleSignIn}
                      className="text-[9px] font-extrabold text-zinc-900 hover:underline flex items-center gap-0.5 cursor-pointer mt-0.5"
                    >
                      Conectar Google
                    </button>
                  </>
                )}
              </motion.div>
            )}
          </div>
        </div>

      </aside>

      {/* Header - Mobile */}
      <header className="md:hidden bg-white border-b border-zinc-150 px-6 py-4 flex items-center justify-between sticky top-0 z-40 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div 
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
            style={{ backgroundColor: primaryThemeColor }}
          >
            {shopConfig.logo ? (
              <img src={shopConfig.logo} alt="Logo" className="w-6 h-6 object-contain rounded" referrerPolicy="no-referrer" />
            ) : (
              <Computer size={18} />
            )}
          </div>
          <span className="font-black text-zinc-950 text-sm tracking-tight">{shopConfig.name || 'Controle de Caixa'}</span>
        </div>
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-1.5 hover:bg-zinc-100 rounded-lg text-zinc-700 cursor-pointer"
        >
          {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* Sidebar - Mobile drawer */}
      <AnimatePresence>
        {isSidebarOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 md:hidden flex justify-end">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.25 }}
              className="bg-white w-72 h-full p-6 flex flex-col justify-between"
            >
              <div className="space-y-6">
                <div className="flex justify-between items-center pb-4 border-b border-zinc-100">
                  <div className="flex items-center gap-2.5">
                    <div 
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
                      style={{ backgroundColor: primaryThemeColor }}
                    >
                      <Computer size={18} />
                    </div>
                    <span className="font-extrabold text-zinc-950 text-xs">Menu Navegação</span>
                  </div>
                  <button onClick={() => setIsSidebarOpen(false)} className="p-1.5 hover:bg-zinc-100 rounded-lg text-zinc-400 cursor-pointer">
                    <X size={18} />
                  </button>
                </div>

                <nav className="space-y-1.5">
                  {currentMenuOrder.map((menuId) => {
                    const isActive = currentTab === menuId;
                    return (
                      <button
                        key={menuId}
                        onClick={() => { setCurrentTab(menuId); setIsSidebarOpen(false); }}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer"
                        style={{
                          backgroundColor: isActive ? primaryThemeColor : 'transparent',
                          color: isActive ? '#ffffff' : '#71717a'
                        }}
                      >
                        {getMenuIcon(menuId)}
                        {getMenuLabel(menuId)}
                      </button>
                    );
                  })}
                </nav>
              </div>

              <div className="space-y-4 border-t border-zinc-150 pt-4">
                {transactions.length === 0 && serviceOrders.length === 0 && products.length === 0 && (
                  <button
                    onClick={handleSeedSamples}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-[10px] font-bold cursor-pointer"
                  >
                    <Sparkles size={12} />
                    Popular Dados de Exemplo
                  </button>
                )}

                <div className="flex items-center gap-3 bg-zinc-50 p-3 rounded-xl border border-zinc-150">
                  <div className="w-8 h-8 rounded-full bg-zinc-200 flex items-center justify-center font-bold text-zinc-600 overflow-hidden text-xs shrink-0">
                    {user?.photoURL ? (
                      <img src={user.photoURL} alt={user.displayName || 'User'} referrerPolicy="no-referrer" />
                    ) : (
                      user?.displayName?.substring(0, 2) || <User size={14} />
                    )}
                  </div>
                  <div>
                    {user ? (
                      <>
                        <p className="text-xs font-bold text-zinc-900">{user.displayName || 'Usuário'}</p>
                        <button 
                          onClick={handleSignOut}
                          className="text-[10px] font-bold text-rose-500 flex items-center gap-0.5 cursor-pointer mt-0.5"
                        >
                          <LogOut size={10} /> Sair
                        </button>
                      </>
                    ) : (
                      <>
                        <p className="text-xs font-bold text-zinc-500">Modo Local</p>
                        <button 
                          onClick={handleGoogleSignIn}
                          className="text-[10px] font-bold text-zinc-900 flex items-center gap-0.5 cursor-pointer mt-0.5"
                        >
                          Conectar Google
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {currentTab === 'dashboard' && (
              <Dashboard 
                transactions={transactions} 
                serviceOrders={serviceOrders}
                onNavigate={(tab) => setCurrentTab(tab)}
                onQuickTransaction={(type) => {
                  setCurrentTab('caixa');
                  setTimeout(() => {
                    const addBtn = document.querySelector('button[title="Novo Lançamento"]');
                    if (addBtn) (addBtn as HTMLButtonElement).click();
                  }, 150);
                }}
                onQuickOS={() => {
                  setCurrentTab('os');
                  setTimeout(() => {
                    const addBtn = document.querySelector('button[title="Nova Ordem de Serviço"]');
                    if (addBtn) (addBtn as HTMLButtonElement).click();
                  }, 150);
                }}
              />
            )}

            {currentTab === 'caixa' && (
              <CashRegister 
                transactions={transactions}
                onAddTransaction={handleAddTransaction}
                onEditTransaction={handleEditTransaction}
                onDeleteTransaction={handleDeleteTransaction}
                categories={shopConfig.categories}
                onExportExcel={exportToExcel}
              />
            )}

            {currentTab === 'vendas' && (
              <PDV 
                products={products}
                staffList={staffList}
                onAddProduct={handleAddProduct}
                onRegisterSale={handleRegisterSale}
                shopName={shopConfig.name}
                shopPhone={shopConfig.phone}
                shopCnpjCpf={shopConfig.cnpjCpf}
              />
            )}

            {currentTab === 'produtos' && (
              <Products 
                products={products}
                onAddProduct={handleAddProduct}
                onEditProduct={handleEditProduct}
                onDeleteProduct={handleDeleteProduct}
                onExportExcel={exportToExcel}
              />
            )}

            {currentTab === 'os' && (
              <ServiceOrders 
                serviceOrders={serviceOrders}
                onAddOS={handleAddOS}
                onEditOS={handleEditOS}
                onDeleteOS={handleDeleteOS}
                onReceivePayment={handleReceiveOSPayment}
                shopName={shopConfig.name}
                shopPhone={shopConfig.phone}
                shopCnpjCpf={shopConfig.cnpjCpf}
                shopEmail={shopConfig.email}
                shopLogo={shopConfig.logo}
                autoSaveOSToDrive={shopConfig.autoSaveOSToDrive}
                googleToken={token}
              />
            )}

            {currentTab === 'agendamentos' && (
              <Appointments 
                appointments={appointments}
                staffList={staffList}
                onAddAppointment={handleAddAppointment}
                onDeleteAppointment={handleDeleteAppointment}
              />
            )}

            {currentTab === 'backup' && (
              <SettingsBackup 
                user={user}
                token={token}
                needsAuth={needsAuth}
                isLoggingIn={isLoggingIn}
                onLogin={handleGoogleSignIn}
                onLogout={handleSignOut}
                transactions={transactions}
                serviceOrders={serviceOrders}
                backupHistory={backupHistory}
                onAddBackupLog={handleAddBackupLog}
                onRestoreData={handleRestoreBackup}
              />
            )}

            {currentTab === 'settings_shop' && (
              <SettingsShop 
                config={shopConfig}
                onSaveConfig={handleSaveShopConfig}
                staffList={staffList}
                onAddStaff={handleAddStaff}
                onDeleteStaff={handleDeleteStaff}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

    </div>
  );
}
