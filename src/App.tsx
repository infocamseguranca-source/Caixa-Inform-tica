import React, { useState, useEffect, useMemo } from 'react';
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
  FileSpreadsheet,
  Lock,
  MessageCircle,
  ClipboardList
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
  getDocs,
  setDoc,
  where
} from 'firebase/firestore';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { db, auth, googleSignIn, logout, getAccessToken } from './firebase';
import { Transaction, ServiceOrder, BackupHistory, Product, Staff, Appointment, ShopConfig, EquipmentPurchase, Customer, CustomerPartOrder } from './types';
import { generateOSNumber, exportToExcel } from './utils';
import { motion, AnimatePresence } from 'motion/react';
import seedData from './seed.json';

// Import components
import Dashboard from './components/Dashboard';
import CashRegister from './components/CashRegister';
import ServiceOrders from './components/ServiceOrders';
import SettingsBackup from './components/SettingsBackup';
import Products from './components/Products';
import PDV from './components/PDV';
import Appointments from './components/Appointments';
import SettingsShop from './components/SettingsShop';
import WhatsAppWeb from './components/WhatsAppWeb';
import EquipmentPurchases from './components/EquipmentPurchases';
import Customers from './components/Customers';
import PartOrders from './components/PartOrders';

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
  menuOrder: ['dashboard', 'caixa', 'vendas', 'produtos', 'os', 'clientes', 'compras', 'agendamentos', 'backup', 'encomendas', 'settings_shop'],
  autoSaveOSToDrive: false,
  finalizationOptions: ['Pronto para Retirada', 'Retirado Sem Reparo', 'Devolvido ao Cliente', 'Entregue para outra Assistência', 'Sem Conserto / Descarte'],
  purchaseCategories: ['Informatica', 'Celulares'],
  purchaseEquipmentTypes: ['Computador', 'Notebook', 'Celular', 'Tablet', 'Monitor', 'Impressora', 'Outros'],
  productTypes: ['Capa', 'Película', 'Carregador', 'Cabo', 'Fone', 'Aparelho', 'Outros'],
  enablePurchaseSignature: true,
  whatsappMessages: {
    aguardando: 'Olá, {nome}. A sua OS {os} está atualizada como *{status}*. Estamos aguardando a sua autorização para o serviço. Obrigado pela preferência!!!',
    aprovado: 'Olá, {nome}. A sua OS {os} está atualizada como *{status}*. Seu orçamento foi aprovado. Obrigado pela preferência!!!',
    em_reparo: 'Olá, {nome}. A sua OS {os} está atualizada como *{status}*. Seu equipamento está em manutenção. Obrigado pela preferência!!!',
    pronto: 'Olá, {nome}. A sua OS {os} está atualizada como *{status}*. O seu aparelho já está pronto para a entrega. Obrigado pela preferência!!!',
    entregue: 'Olá, {nome}. A sua OS {os} está atualizada como *{status}*. Esperamos que tenha tido uma ótima experiência. Obrigado pela preferência!!!',
    default: 'Olá, {nome}. A sua OS {os} está atualizada como *{status}*. Obrigado pela preferência!!!',
    appointment: 'Olá, {nome}. Aqui é da Assistência Técnica.\n\nEste é um lembrete do seu agendamento para o serviço de *{servico}*.\n\n📅 *Data/Hora:* {data}\n⚙️ *Técnico:* {tecnico}\n\nObrigado por escolher nossa assistência!'
  }
};

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  
  // Auth state
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  // Auth Modal Reminder
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMessage, setAuthModalMessage] = useState('');

  // Data state
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
  const [backupHistory, setBackupHistory] = useState<BackupHistory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [equipmentPurchases, setEquipmentPurchases] = useState<EquipmentPurchase[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [partsOrders, setPartsOrders] = useState<CustomerPartOrder[]>([]);
  const [shopConfig, setShopConfig] = useState<ShopConfig>(DEFAULT_CONFIG);
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && seedData && seedData.length > 0 && !localStorage.getItem('seeded_xlsx_v3')) {
      const seedIt = async () => {
        try {
          const q = query(collection(db, 'transactions'), where('ownerId', '==', user.uid));
          const snapshot = await getDocs(q);
          const batchDelete = writeBatch(db);
          let countDel = 0;
          snapshot.forEach(doc => {
             if (doc.data().category === '') {
               batchDelete.delete(doc.ref);
               countDel++;
             }
          });
          if (countDel > 0) {
            await batchDelete.commit();
            console.log(`Deleted ${countDel} old seed transactions.`);
          }

          const batch = writeBatch(db);
          let countAdd = 0;
          seedData.forEach((item) => {
             const transRef = doc(collection(db, 'transactions'));
             batch.set(transRef, { 
               ...item, 
               ownerId: user.uid,
               amount: Number(item.amount),
               date: item.date
             });
             countAdd++;
             // Firestore limit is 500 writes per batch. 
             // We have around 305 elements so it fits in a single batch.
          });
          await batch.commit();
          localStorage.setItem('seeded_xlsx_v3', 'true');
          console.log(`Seeded ${countAdd} XLSX transactions successfully!`);
        } catch (e) {
          console.error(e);
        }
      };
      seedIt();
    }
  }, [user]);

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
      const localPurchases = localStorage.getItem('infocam_purchases');
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

      if (localPurchases) {
        setEquipmentPurchases(JSON.parse(localPurchases));
      } else {
        setEquipmentPurchases([]);
      }

      const localCustomers = localStorage.getItem('infocam_customers');
      if (localCustomers) {
        setCustomers(JSON.parse(localCustomers));
      } else {
        setCustomers([]);
      }

      const localPartsOrders = localStorage.getItem('infocam_parts_orders');
      if (localPartsOrders) {
        setPartsOrders(JSON.parse(localPartsOrders));
      } else {
        setPartsOrders([]);
      }

      if (localConfig) {
        setShopConfig(JSON.parse(localConfig));
      } else {
        setShopConfig(DEFAULT_CONFIG);
      }
      return;
    }

    // Subscribe to transactions collection
    const unsubTransactions = onSnapshot(
      query(collection(db, 'transactions'), where('ownerId', '==', user.uid)), 
      (snapshot) => {
        const data: Transaction[] = [];
        snapshot.forEach((doc) => {
          data.push({ id: doc.id, ...doc.data() } as Transaction);
        });
        setTransactions(data);
      }
    );

    // Subscribe to service orders collection
    const unsubOS = onSnapshot(
      query(collection(db, 'service_orders'), where('ownerId', '==', user.uid)), 
      (snapshot) => {
        const data: ServiceOrder[] = [];
        snapshot.forEach((doc) => {
          data.push({ id: doc.id, ...doc.data() } as ServiceOrder);
        });
        setServiceOrders(data);
      }
    );

    // Subscribe to backup history collection
    const unsubBackups = onSnapshot(
      query(collection(db, 'backup_history'), where('ownerId', '==', user.uid)), 
      (snapshot) => {
        const data: BackupHistory[] = [];
        snapshot.forEach((doc) => {
          data.push({ id: doc.id, ...doc.data() } as BackupHistory);
        });
        setBackupHistory(data);
      }
    );

    // Subscribe to products collection
    const unsubProducts = onSnapshot(
      query(collection(db, 'products'), where('ownerId', '==', user.uid)), 
      (snapshot) => {
        const data: Product[] = [];
        snapshot.forEach((doc) => {
          data.push({ id: doc.id, ...doc.data() } as Product);
        });
        setProducts(data);
      }
    );

    // Subscribe to staff collection
    const unsubStaff = onSnapshot(
      query(collection(db, 'staff'), where('ownerId', '==', user.uid)), 
      (snapshot) => {
        const data: Staff[] = [];
        snapshot.forEach((doc) => {
          data.push({ id: doc.id, ...doc.data() } as Staff);
        });
        setStaffList(data);
      }
    );

    // Subscribe to appointments collection
    const unsubAppointments = onSnapshot(
      query(collection(db, 'appointments'), where('ownerId', '==', user.uid)), 
      (snapshot) => {
        const data: Appointment[] = [];
        snapshot.forEach((doc) => {
          data.push({ id: doc.id, ...doc.data() } as Appointment);
        });
        setAppointments(data);
      }
    );

    // Subscribe to customers collection
    const unsubCustomers = onSnapshot(
      query(collection(db, 'customers'), where('ownerId', '==', user.uid)), 
      (snapshot) => {
        const data: Customer[] = [];
        snapshot.forEach((doc) => {
          data.push({ id: doc.id, ...doc.data() } as Customer);
        });
        setCustomers(data);
      }
    );

    // Subscribe to shop configuration document (per user.uid)
    const unsubConfig = onSnapshot(doc(db, 'shop_config', user.uid), (docSnap) => {
      if (docSnap.exists()) {
        setShopConfig(docSnap.data() as ShopConfig);
      } else {
        // Automatically save initial shop config to Firestore
        setDoc(doc(db, 'shop_config', user.uid), DEFAULT_CONFIG).catch(err => {
          console.error('Failed to write initial shop config:', err);
        });
        setShopConfig(DEFAULT_CONFIG);
      }
    });

    // Subscribe to equipment purchases collection
    const unsubPurchases = onSnapshot(
      query(collection(db, 'equipment_purchases'), where('ownerId', '==', user.uid)), 
      (snapshot) => {
        const data: EquipmentPurchase[] = [];
        snapshot.forEach((doc) => {
          data.push({ id: doc.id, ...doc.data() } as EquipmentPurchase);
        });
        setEquipmentPurchases(data);
      }
    );

    // Subscribe to parts orders collection
    const unsubPartsOrders = onSnapshot(
      query(collection(db, 'parts_orders'), where('ownerId', '==', user.uid)), 
      (snapshot) => {
        const data: CustomerPartOrder[] = [];
        snapshot.forEach((doc) => {
          data.push({ id: doc.id, ...doc.data() } as CustomerPartOrder);
        });
        setPartsOrders(data);
      },
      (error) => {
        handleFirestoreError(error, 'get', 'parts_orders');
      }
    );

    return () => {
      unsubTransactions();
      unsubOS();
      unsubBackups();
      unsubProducts();
      unsubStaff();
      unsubAppointments();
      unsubCustomers();
      unsubConfig();
      unsubPurchases();
      unsubPartsOrders();
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
    localStorage.setItem('infocam_purchases', JSON.stringify(equipmentPurchases));
  }, [equipmentPurchases, loading]);

  useEffect(() => {
    if (loading) return;
    localStorage.setItem('infocam_config', JSON.stringify(shopConfig));
  }, [shopConfig, loading]);

  useEffect(() => {
    if (loading) return;
    localStorage.setItem('infocam_parts_orders', JSON.stringify(partsOrders));
  }, [partsOrders, loading]);

  useEffect(() => {
    if (loading) return;
    localStorage.setItem('infocam_customers', JSON.stringify(customers));
  }, [customers, loading]);

  // Seeding sample template data
  const handleSeedSamples = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const batch = writeBatch(db);

      // Seed Transactions
      SAMPLE_TRANSACTIONS.forEach((item) => {
        const transRef = doc(collection(db, 'transactions'));
        batch.set(transRef, cleanPayload({ ...item, ownerId: user.uid }));
      });

      // Seed OSs
      SAMPLE_SERVICE_ORDERS.forEach((item) => {
        const osRef = doc(collection(db, 'service_orders'));
        batch.set(osRef, cleanPayload({
          ...item,
          ownerId: user.uid,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }));
      });

      // Seed Products
      SAMPLE_PRODUCTS.forEach((item) => {
        const prodRef = doc(collection(db, 'products'));
        batch.set(prodRef, cleanPayload({ ...item, ownerId: user.uid }));
      });

      // Seed Staff members
      SAMPLE_STAFF.forEach((item) => {
        const staffRef = doc(collection(db, 'staff'));
        batch.set(staffRef, cleanPayload({ ...item, ownerId: user.uid }));
      });

      // Seed dynamic config
      const configRef = doc(db, 'shop_config', user.uid);
      batch.set(configRef, cleanPayload(DEFAULT_CONFIG));

      await batch.commit();
      alert('Dados de demonstração populados com sucesso no Firebase!');
    } catch (err) {
      console.error('Failed to seed samples:', err);
      alert('Erro ao popular dados de demonstração.');
      handleFirestoreError(err, 'write', 'batch_seed');
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
          batchWrite.set(doc(collection(db, 'transactions')), cleanPayload({ ...cleanT, ownerId: user.uid }));
        });
      }

      if (backupData.serviceOrders) {
        backupData.serviceOrders.forEach((os) => {
          const { id, ...cleanOS } = os;
          batchWrite.set(doc(collection(db, 'service_orders')), cleanPayload({ ...cleanOS, ownerId: user.uid }));
        });
      }

      if (backupData.products) {
        backupData.products.forEach((p) => {
          const { id, ...cleanP } = p;
          batchWrite.set(doc(collection(db, 'products')), cleanPayload({ ...cleanP, ownerId: user.uid }));
        });
      }

      if (backupData.staff) {
        backupData.staff.forEach((st) => {
          const { id, ...cleanSt } = st;
          batchWrite.set(doc(collection(db, 'staff')), cleanPayload({ ...cleanSt, ownerId: user.uid }));
        });
      }

      if (backupData.appointments) {
        backupData.appointments.forEach((app) => {
          const { id, ...cleanApp } = app;
          batchWrite.set(doc(collection(db, 'appointments')), cleanPayload({ ...cleanApp, ownerId: user.uid }));
        });
      }

      if (backupData.config) {
        batchWrite.set(doc(db, 'shop_config', user.uid), cleanPayload(backupData.config));
      }

      await batchWrite.commit();
    } catch (err) {
      console.error(err);
      handleFirestoreError(err, 'write', 'batch_restore');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Authentication Guard for Write Actions (Strictly enforces Google Login)
  const checkAuth = (message: string): boolean => {
    if (!user) {
      setAuthModalMessage(message);
      setShowAuthModal(true);
      return false;
    }
    return true;
  };

  // CRUD Transaction Operations
  const handleAddTransaction = async (item: Omit<Transaction, 'id'>) => {
    if (!user) {
      setAuthModalMessage('Para realizar novos lançamentos no fluxo de caixa real, conecte sua conta do Google.');
      setShowAuthModal(true);
      const newTx = { ...item, id: `local-${Date.now()}` } as Transaction;
      setTransactions(prev => [...prev, newTx]);
      return;
    }
    await addDoc(collection(db, 'transactions'), cleanPayload({ ...item, ownerId: user.uid }));
  };

  const handleEditTransaction = async (id: string, updatedFields: Partial<Transaction>) => {
    if (!user) {
      setAuthModalMessage('Para editar lançamentos no fluxo de caixa real, conecte sua conta do Google.');
      setShowAuthModal(true);
      setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...updatedFields } : t));
      return;
    }
    await updateDoc(doc(db, 'transactions', id), cleanPayload(updatedFields));
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!user) {
      setAuthModalMessage('Para excluir lançamentos no fluxo de caixa real, conecte sua conta do Google.');
      setShowAuthModal(true);
      setTransactions(prev => prev.filter(t => t.id !== id));
      return;
    }
    await deleteDoc(doc(db, 'transactions', id));
  };

  // Standardized Firestore Error Handler for Zero-Trust and Security Auditing
  const handleFirestoreError = (error: unknown, operationType: 'create' | 'update' | 'delete' | 'list' | 'get' | 'write', path: string | null) => {
    const errInfo = {
      error: error instanceof Error ? error.message : String(error),
      operationType,
      path,
      authInfo: {
        userId: user?.uid || null,
        email: user?.email || null,
        emailVerified: user?.emailVerified || null,
      }
    };
    console.error('Firestore Error Info: ', JSON.stringify(errInfo));
    throw new Error(JSON.stringify(errInfo));
  };

  // Utility to remove undefined values recursively for safe Firestore updates
  const cleanPayload = (obj: any): any => {
    if (obj === undefined) return null;
    if (obj === null) return null;
    if (Array.isArray(obj)) {
      return obj.map(item => cleanPayload(item));
    }
    if (typeof obj === 'object') {
      const cleaned: any = {};
      Object.keys(obj).forEach(key => {
        const val = obj[key];
        if (val !== undefined) {
          cleaned[key] = cleanPayload(val);
        }
      });
      return cleaned;
    }
    return obj;
  };

  // CRUD OS Operations
  const handleAddOS = async (item: Omit<ServiceOrder, 'id' | 'osNumber' | 'createdAt' | 'updatedAt'>): Promise<ServiceOrder> => {
    // Find the max OS number from existing ones to ensure sequential numbering
    let maxOSNum = 0;
    serviceOrders.forEach(os => {
      const match = os.osNumber?.match(/^OS-(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxOSNum) maxOSNum = num;
      }
    });

    // Get starting number from shopConfig (defaults to 1001 if not set)
    const startNum = typeof shopConfig?.osStartNumber === 'number'
      ? shopConfig.osStartNumber
      : parseInt(shopConfig?.osStartNumber as any, 10) || 1001;

    // Use the max existing OS number or the configured start number
    let nextNum = startNum;
    if (maxOSNum >= startNum) {
      nextNum = maxOSNum + 1;
    }

    const osNumber = `OS-${nextNum.toString().padStart(4, '0')}`;
    const osPayload = {
      ...item,
      osNumber,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (!user) {
      setAuthModalMessage('Para abrir ordens de serviço reais, conecte sua conta do Google.');
      setShowAuthModal(true);
      const fakeOS = { id: `local-${Date.now()}`, ...osPayload } as ServiceOrder;
      setServiceOrders(prev => [...prev, fakeOS]);

      // Auto-create transaction in Cashier (Caixa/PDV) if paid (local state)
      if (osPayload.paymentStatus === 'pago') {
        const transactionPayload = {
          id: `local-tx-${Date.now()}`,
          description: `Recebimento O.S. ${osNumber} - Cliente: ${osPayload.customerName}`,
          amount: osPayload.priceLabor + osPayload.priceParts,
          type: 'entrada',
          category: 'Serviço de Assistência',
          paymentMethod: (osPayload as any).paymentMethod || 'pix',
          date: new Date().toISOString(),
          osId: fakeOS.id
        };
        setTransactions(prev => [...prev, transactionPayload]);
      }

      return fakeOS;
    }

    const docRef = await addDoc(collection(db, 'service_orders'), cleanPayload({ ...osPayload, ownerId: user.uid }));

    // Auto-create transaction in Cashier (Caixa/PDV) if paid
    if (osPayload.paymentStatus === 'pago') {
      const transactionPayload = {
        description: `Recebimento O.S. ${osNumber} - Cliente: ${osPayload.customerName}`,
        amount: osPayload.priceLabor + osPayload.priceParts,
        type: 'entrada',
        category: 'Serviço de Assistência',
        paymentMethod: (osPayload as any).paymentMethod || 'pix',
        date: new Date().toISOString(),
        osId: docRef.id,
        ownerId: user.uid
      };
      await addDoc(collection(db, 'transactions'), cleanPayload(transactionPayload));
    }

    return { id: docRef.id, ...osPayload };
  };

  const handleEditOS = async (id: string, updatedFields: Partial<ServiceOrder>): Promise<ServiceOrder> => {
    const now = new Date().toISOString();
    const existing = serviceOrders.find(o => o.id === id);

    if (!user) {
      setAuthModalMessage('Para salvar alterações em ordens de serviço reais, conecte sua conta do Google.');
      setShowAuthModal(true);
      
      const isTransitioningToPaid = existing && existing.paymentStatus !== 'pago' && updatedFields.paymentStatus === 'pago';
      const updatedOS = { ...existing, ...updatedFields, id, updatedAt: now } as ServiceOrder;
      
      setServiceOrders(prev => prev.map(o => o.id === id ? updatedOS : o));

      if (isTransitioningToPaid) {
        const labor = updatedFields.priceLabor !== undefined ? updatedFields.priceLabor : (existing?.priceLabor || 0);
        const parts = updatedFields.priceParts !== undefined ? updatedFields.priceParts : (existing?.priceParts || 0);
        const total = labor + parts;
        const method = updatedFields.paymentMethod || existing?.paymentMethod || 'pix';
        const customerName = updatedFields.customerName || existing?.customerName || '';
        const osNumber = existing?.osNumber || '';

        const transactionPayload = {
          id: `local-tx-${Date.now()}`,
          description: `Recebimento O.S. ${osNumber} - Cliente: ${customerName}`,
          amount: total,
          type: 'entrada',
          category: 'Serviço de Assistência',
          paymentMethod: method,
          date: new Date().toISOString(),
          osId: id
        };
        setTransactions(prev => [...prev, transactionPayload]);
      }

      return updatedOS;
    }

    // Auto-create transaction in Cashier (Caixa/PDV) if transitioned to paid
    const isTransitioningToPaid = existing && existing.paymentStatus !== 'pago' && updatedFields.paymentStatus === 'pago';

    await updateDoc(doc(db, 'service_orders', id), cleanPayload({
      ...updatedFields,
      updatedAt: now
    }));

    if (isTransitioningToPaid) {
      const labor = updatedFields.priceLabor !== undefined ? updatedFields.priceLabor : (existing?.priceLabor || 0);
      const parts = updatedFields.priceParts !== undefined ? updatedFields.priceParts : (existing?.priceParts || 0);
      const total = labor + parts;
      const method = updatedFields.paymentMethod || existing?.paymentMethod || 'pix';
      const customerName = updatedFields.customerName || existing?.customerName || '';
      const osNumber = existing?.osNumber || '';

      const transactionPayload = {
        description: `Recebimento O.S. ${osNumber} - Cliente: ${customerName}`,
        amount: total,
        type: 'entrada',
        category: 'Serviço de Assistência',
        paymentMethod: method,
        date: new Date().toISOString(),
        osId: id,
        ownerId: user.uid
      };
      await addDoc(collection(db, 'transactions'), cleanPayload(transactionPayload));
    }

    return { ...existing, ...updatedFields, id, updatedAt: now } as ServiceOrder;
  };

  const handleDeleteOS = async (id: string) => {
    if (!user) {
      setAuthModalMessage('Para deletar ordens de serviço reais, conecte sua conta do Google.');
      setShowAuthModal(true);
      setServiceOrders(prev => prev.filter(o => o.id !== id));
      return;
    }
    await deleteDoc(doc(db, 'service_orders', id));
  };

  // CRUD Customer Operations
  const handleAddCustomer = async (item: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) => {
    const customerPayload = {
      ...item,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Always update local state immediately (optimistic)
    const tempId = `local-${Date.now()}`;
    const newCust = { ...customerPayload, id: tempId } as Customer;
    setCustomers(prev => [...prev, newCust]);

    if (!user) {
      setAuthModalMessage('Para cadastrar novos clientes no banco de dados real, conecte sua conta do Google.');
      setShowAuthModal(true);
      return;
    }
    
    try {
      const docRef = await addDoc(collection(db, 'customers'), cleanPayload({ ...customerPayload, ownerId: user.uid }));
      // Replace temp ID with actual Firestore ID once written
      setCustomers(prev => prev.map(c => c.id === tempId ? { ...c, id: docRef.id } : c));
    } catch (err) {
      console.error('Erro ao cadastrar cliente:', err);
    }
  };

  const handleEditCustomer = async (id: string, updatedFields: Partial<Customer>) => {
    const now = new Date().toISOString();
    
    // Always update local state immediately (optimistic)
    setCustomers(prev => prev.map(c => c.id === id ? { ...c, ...updatedFields, updatedAt: now } : c));

    if (!user) {
      setAuthModalMessage('Para editar detalhes de clientes no banco de dados real, conecte sua conta do Google.');
      setShowAuthModal(true);
      return;
    }
    const updated = {
      ...updatedFields,
      updatedAt: now
    };
    try {
      await updateDoc(doc(db, 'customers', id), cleanPayload(updated));
    } catch (err) {
      console.error('Erro ao editar cliente:', err);
    }
  };

  const handleDeleteCustomer = async (id: string) => {
    // Always update local state immediately (optimistic)
    setCustomers(prev => prev.filter(c => c.id !== id));

    if (!user) {
      setAuthModalMessage('Para excluir clientes do banco de dados real, conecte sua conta do Google.');
      setShowAuthModal(true);
      return;
    }
    try {
      await deleteDoc(doc(db, 'customers', id));
    } catch (err) {
      console.error('Erro ao excluir cliente:', err);
    }
  };

  // CRUD Parts Orders Operations
  const handleAddPartOrder = async (item: Omit<CustomerPartOrder, 'id' | 'orderNumber' | 'createdAt' | 'updatedAt'>): Promise<CustomerPartOrder | null> => {
    // Generate orderNumber
    let maxNum = 1000;
    partsOrders.forEach((o) => {
      const match = o.orderNumber?.match(/^EP-(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    const orderNumber = `EP-${maxNum + 1}`;
    
    const now = new Date().toISOString();
    const payload = {
      ...item,
      orderNumber,
      createdAt: now,
      updatedAt: now
    };

    if (!user) {
      setAuthModalMessage('Para registrar encomendas reais no banco de dados, conecte sua conta do Google.');
      setShowAuthModal(true);
      const localId = `local-${Date.now()}`;
      const newOrder = { ...payload, id: localId } as CustomerPartOrder;
      setPartsOrders(prev => [...prev, newOrder]);

      // If paymentType is 'pago_antecipado', automatically create a cash register transaction entry
      if (item.paymentType === 'pago_antecipado') {
        const transactionPayload = {
          id: `local-tx-${Date.now()}`,
          description: `encomenda nº ${orderNumber}`,
          amount: item.clientPrice,
          type: 'entrada',
          category: 'Encomenda',
          paymentMethod: item.paymentMethod || 'pix',
          date: now,
          cost: item.costPrice || 0
        };
        setTransactions(prev => [...prev, transactionPayload]);
      }

      return newOrder;
    }

    try {
      const docRef = await addDoc(collection(db, 'parts_orders'), cleanPayload({ ...payload, ownerId: user.uid }));
      const newOrder = { ...payload, id: docRef.id } as CustomerPartOrder;
      
      // Update state locally immediately (optimistic)
      setPartsOrders(prev => {
        if (prev.some(o => o.id === newOrder.id)) return prev;
        return [...prev, newOrder];
      });
      
      // If paymentType is 'pago_antecipado', automatically create a cash register transaction entry
      if (item.paymentType === 'pago_antecipado') {
        const transactionPayload = {
          description: `encomenda nº ${orderNumber}`,
          amount: item.clientPrice,
          type: 'entrada',
          category: 'Encomenda',
          paymentMethod: item.paymentMethod || 'pix',
          date: now,
          cost: item.costPrice || 0,
          ownerId: user.uid
        };
        const txDoc = await addDoc(collection(db, 'transactions'), cleanPayload(transactionPayload));
        
        // Optimistically update transactions
        setTransactions(prev => {
          if (prev.some(t => t.id === txDoc.id)) return prev;
          return [...prev, { ...transactionPayload, id: txDoc.id } as Transaction];
        });
      }

      return newOrder;
    } catch (err) {
      console.error('Erro ao adicionar encomenda:', err);
      handleFirestoreError(err, 'write', 'parts_orders');
      return null;
    }
  };

  const handleEditPartOrder = async (id: string, updatedFields: Partial<CustomerPartOrder>) => {
    const now = new Date().toISOString();
    
    // Always update local state immediately (optimistic)
    setPartsOrders(prev => prev.map(o => o.id === id ? { ...o, ...updatedFields, updatedAt: now } : o));

    if (!user) {
      setAuthModalMessage('Para editar detalhes de encomendas, conecte sua conta do Google.');
      setShowAuthModal(true);
      return;
    }
    const updated = {
      ...updatedFields,
      updatedAt: now
    };
    try {
      await updateDoc(doc(db, 'parts_orders', id), cleanPayload(updated));
    } catch (err) {
      console.error('Erro ao editar encomenda:', err);
      handleFirestoreError(err, 'write', 'parts_orders');
    }
  };

  const handleDeletePartOrder = async (id: string) => {
    // Always update local state immediately (optimistic)
    setPartsOrders(prev => prev.filter(o => o.id !== id));

    if (!user) {
      setAuthModalMessage('Para excluir encomendas do banco de dados real, conecte sua conta do Google.');
      setShowAuthModal(true);
      return;
    }
    try {
      await deleteDoc(doc(db, 'parts_orders', id));
    } catch (err) {
      console.error('Erro ao excluir encomenda:', err);
      handleFirestoreError(err, 'write', 'parts_orders');
    }
  };

  // CRUD Equipment Purchase Operations
  const handleAddPurchase = async (item: Omit<EquipmentPurchase, 'id' | 'date'>) => {
    if (!checkAuth('Para registrar compras de equipamentos reais, conecte sua conta do Google.')) return;
    const purchasePayload = {
      ...item,
      date: new Date().toISOString()
    };
    await addDoc(collection(db, 'equipment_purchases'), cleanPayload({ ...purchasePayload, ownerId: user.uid }));
  };

  // CRUD Product Operations
  const handleAddProduct = async (item: Omit<Product, 'id'>) => {
    if (!checkAuth('Para cadastrar novos produtos no estoque real, conecte sua conta do Google.')) return;
    await addDoc(collection(db, 'products'), cleanPayload({ ...item, createdAt: new Date().toISOString(), ownerId: user.uid }));
  };

  const handleEditProduct = async (id: string, updatedFields: Partial<Product>) => {
    if (!checkAuth('Para editar produtos no estoque real, conecte sua conta do Google.')) return;
    await updateDoc(doc(db, 'products', id), cleanPayload(updatedFields));
  };

  const handleDeleteProduct = async (id: string) => {
    if (!checkAuth('Para excluir produtos do estoque real, conecte sua conta do Google.')) return;
    await deleteDoc(doc(db, 'products', id));
  };

  // CRUD Staff Operations
  const handleAddStaff = async (item: Omit<Staff, 'id'>) => {
    if (!checkAuth('Para cadastrar novos membros da equipe real, conecte sua conta do Google.')) return;
    await addDoc(collection(db, 'staff'), cleanPayload({ ...item, ownerId: user.uid }));
  };

  const handleEditStaff = async (id: string, updatedFields: Partial<Staff>) => {
    if (!checkAuth('Para editar membros da equipe real, conecte sua conta do Google.')) return;
    await updateDoc(doc(db, 'staff', id), cleanPayload(updatedFields));
  };

  const handleDeleteStaff = async (id: string) => {
    if (!checkAuth('Para remover membros da equipe real, conecte sua conta do Google.')) return;
    await deleteDoc(doc(db, 'staff', id));
  };

  // CRUD Appointment Operations
  const handleAddAppointment = async (item: Omit<Appointment, 'id' | 'notified'>) => {
    if (!checkAuth('Para agendar atendimentos externos reais, conecte sua conta do Google.')) return;
    const payload = { ...item, notified: false };
    await addDoc(collection(db, 'appointments'), cleanPayload({ ...payload, ownerId: user.uid }));
  };

  const handleDeleteAppointment = async (id: string) => {
    if (!checkAuth('Para cancelar agendamentos externos reais, conecte sua conta do Google.')) return;
    await deleteDoc(doc(db, 'appointments', id));
  };

  // Save Shop Configuration
  const handleSaveShopConfig = async (updatedConfig: ShopConfig) => {
    if (!checkAuth('Para salvar configurações reais do sistema, conecte sua conta do Google.')) return;
    await setDoc(doc(db, 'shop_config', user.uid), cleanPayload(updatedConfig));
    setShopConfig(updatedConfig);
  };

  // INTEGRATED RECEIVING FLOW: OS paid and cash register synchronized
  const handleReceiveOSPayment = async (os: ServiceOrder, paymentMethod: 'dinheiro' | 'pix' | 'debito' | 'credito') => {
    if (!checkAuth('Para receber pagamentos de O.S. no caixa real, conecte sua conta do Google.')) return;
    const transactionPayload: Omit<Transaction, 'id'> = {
      description: `Recebimento O.S. ${os.osNumber} - Cliente: ${os.customerName}`,
      amount: os.totalAmount,
      type: 'entrada',
      category: 'Serviço de Assistência',
      paymentMethod,
      date: new Date().toISOString(),
      osId: os.id
    };

    try {
      await addDoc(collection(db, 'transactions'), cleanPayload({ ...transactionPayload, ownerId: user.uid }));
      await updateDoc(doc(db, 'service_orders', os.id), cleanPayload({
        status: 'entregue',
        paymentStatus: 'pago',
        paymentMethod,
        updatedAt: new Date().toISOString()
      }));
      alert(`Pagamento de ${os.osNumber} recebido com sucesso no Caixa!`);
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const handleAddBackupLog = async (log: Omit<BackupHistory, 'id'>) => {
    if (!checkAuth('Para registrar logs de backup, conecte sua conta do Google.')) return;
    await addDoc(collection(db, 'backup_history'), cleanPayload({ ...log, ownerId: user.uid }));
  };

  // PDV sale registration logic that decreases product stock automatically
  const handleRegisterSale = async (saleData: {
    items: { product: Product; qty: number }[];
    sellerId?: string;
    technicianId?: string;
    paymentMethod: 'dinheiro' | 'pix' | 'debito' | 'credito';
    total: number;
  }) => {
    if (!checkAuth('Para registrar vendas reais no PDV, conecte sua conta do Google.')) return;
    const desc = `Venda PDV - ${saleData.items.map(i => `${i.qty}x ${i.product.name}`).join(', ')}`;
    
    // Calculate total cost from items that have a cost price
    const totalCost = saleData.items.reduce((sum, i) => {
      return sum + (i.product.costPrice ? i.product.costPrice * i.qty : 0);
    }, 0);

    const transactionPayload = {
      description: desc.substring(0, 150) + (desc.length > 150 ? '...' : ''),
      amount: saleData.total,
      type: 'entrada' as const,
      category: 'Venda de Equipamento',
      paymentMethod: saleData.paymentMethod,
      date: new Date().toISOString(),
      sellerId: saleData.sellerId || null,
      technicianId: saleData.technicianId || null,
      cost: totalCost > 0 ? totalCost : undefined,
      items: saleData.items.map(i => ({ 
        product: { id: i.product.id, name: i.product.name, price: i.product.price, costPrice: i.product.costPrice }, 
        qty: i.qty 
      }))
    };

    try {
      const batch = writeBatch(db);
      const transRef = doc(collection(db, 'transactions'));
      batch.set(transRef, cleanPayload({ ...transactionPayload, ownerId: user.uid }));
      
      saleData.items.forEach(item => {
        // Only update stock in Firestore for real products that belong to the user and exist in Firestore
        const existsInFirestore = products.some(p => p.id === item.product.id);
        if (existsInFirestore && item.product.id) {
          const prodRef = doc(db, 'products', item.product.id);
          const newStock = Math.max(0, (item.product.stock || 0) - item.qty);
          batch.update(prodRef, { stock: newStock });
        }
      });
      
      await batch.commit();
      alert('Venda registrada no PDV com sucesso!');
    } catch (err) {
      console.error('Erro ao processar venda no PDV:', err);
      handleFirestoreError(err, 'write', 'vendas_pdv');
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
      case 'clientes': return <User size={size} />;
      case 'compras': return <Computer size={size} />;
      case 'agendamentos': return <Calendar size={size} />;
      case 'backup': return <Cloud size={size} />;
      case 'encomendas': return (
        <div className="relative">
          <ClipboardList size={size} />
          {partsOrders.some(o => {
            if (o.status === 'finalizado') return false;
            const createdDate = new Date(o.createdAt);
            const targetDate = new Date(createdDate.getTime() + o.daysToArrive * 24 * 60 * 60 * 1000);
            const today = new Date();
            targetDate.setHours(0, 0, 0, 0);
            today.setHours(0, 0, 0, 0);
            const diffTime = targetDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays <= 1;
          }) && (
            <span className="absolute -top-1.5 -right-1.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-white animate-pulse" />
          )}
        </div>
      );
      case 'settings_shop': return <Settings size={size} />;
      case 'whatsapp': return <MessageCircle size={size} />;
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
      case 'clientes': return 'Meus Clientes';
      case 'compras': return 'Compra de Equipamentos';
      case 'agendamentos': return 'Agendamentos';
      case 'encomendas': return 'Encomenda de Peças';
      case 'backup': return 'Drive & Backup';
      case 'settings_shop': return 'Configurações';
      case 'whatsapp': return 'WhatsApp Web';
      default: return id;
    }
  };

  // Ensure current tab is valid or fallback to dashboard
  const validTabs = shopConfig.menuOrder || DEFAULT_CONFIG.menuOrder;
  const rawMenuOrder = validTabs.includes('whatsapp') ? validTabs : [...validTabs, 'whatsapp'];
  
  // Dynamically place 'encomendas' above 'settings_shop'
  const currentMenuOrder = useMemo(() => {
    const list = [...rawMenuOrder];
    const filtered = list.filter(m => m !== 'encomendas');
    const settingsIndex = filtered.indexOf('settings_shop');
    if (settingsIndex !== -1) {
      filtered.splice(settingsIndex, 0, 'encomendas');
    } else {
      filtered.push('encomendas');
    }
    return filtered;
  }, [rawMenuOrder]);

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
        {!user && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm animate-fade-in">
            <div className="flex items-center gap-3 text-left">
              <div className="p-2 bg-amber-100 text-amber-800 rounded-xl shrink-0">
                <Sparkles size={16} />
              </div>
              <div>
                <p className="text-xs font-bold text-amber-950">Você está no Modo de Demonstração (Sem Conta)</p>
                <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                  Conecte sua conta do Google para carregar o sistema principal, visualizar clientes reais e salvar novos dados de forma integrada.
                </p>
              </div>
            </div>
            <button
              onClick={handleGoogleSignIn}
              className="flex items-center gap-2 px-3.5 py-1.5 bg-zinc-950 hover:bg-zinc-850 text-white rounded-xl text-xs font-bold transition-all shadow-sm shrink-0 cursor-pointer"
            >
              Conectar Google
            </button>
          </div>
        )}
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
                config={shopConfig}
                staffList={staffList}
              />
            )}

            {currentTab === 'vendas' && (
              <PDV 
                products={products}
                staffList={staffList}
                transactions={transactions}
                onAddProduct={handleAddProduct}
                onAddTransaction={handleAddTransaction}
                onDeleteTransaction={handleDeleteTransaction}
                onRegisterSale={handleRegisterSale}
                shopName={shopConfig.name}
                shopPhone={shopConfig.phone}
                shopCnpjCpf={shopConfig.cnpjCpf}
                config={shopConfig}
                shopLogo={shopConfig.logo}
                customers={customers}
                onAddCustomer={handleAddCustomer}
                user={user}
              />
            )}

            {currentTab === 'produtos' && (
              <Products 
                products={products}
                onAddProduct={handleAddProduct}
                onEditProduct={handleEditProduct}
                onDeleteProduct={handleDeleteProduct}
                onExportExcel={exportToExcel}
                config={shopConfig}
                onSaveConfig={handleSaveShopConfig}
                shopName={shopConfig.name}
                shopPhone={shopConfig.phone}
              />
            )}

            {currentTab === 'os' && (
              <ServiceOrders 
                serviceOrders={serviceOrders}
                onAddOS={handleAddOS}
                onEditOS={handleEditOS}
                onDeleteOS={handleDeleteOS}
                onReceivePayment={handleReceiveOSPayment}
                onAddCustomer={handleAddCustomer}
                shopName={shopConfig.name}
                shopPhone={shopConfig.phone}
                shopCnpjCpf={shopConfig.cnpjCpf}
                shopEmail={shopConfig.email}
                shopLogo={shopConfig.logo}
                autoSaveOSToDrive={shopConfig.autoSaveOSToDrive}
                googleToken={token}
                config={shopConfig}
                user={user}
                customers={customers}
                staffList={staffList}
              />
            )}

            {currentTab === 'clientes' && (
              <Customers
                user={user}
                customers={customers}
                serviceOrders={serviceOrders}
                onAddCustomer={handleAddCustomer}
                onEditCustomer={handleEditCustomer}
                onDeleteCustomer={handleDeleteCustomer}
                onLogin={handleGoogleSignIn}
              />
            )}

            {currentTab === 'compras' && (
              <EquipmentPurchases 
                purchases={equipmentPurchases}
                onAddPurchase={handleAddPurchase}
                onAddTransaction={handleAddTransaction}
                config={shopConfig}
                user={user}
                customers={customers}
              />
            )}

            {currentTab === 'agendamentos' && (
              <Appointments 
                appointments={appointments}
                staffList={staffList}
                onAddAppointment={handleAddAppointment}
                onDeleteAppointment={handleDeleteAppointment}
                user={user}
                customers={customers}
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

            {currentTab === 'encomendas' && (
              <PartOrders 
                partOrders={partsOrders}
                customers={customers}
                config={shopConfig}
                onAddPartOrder={handleAddPartOrder}
                onEditPartOrder={handleEditPartOrder}
                onDeletePartOrder={handleDeletePartOrder}
                onAddCustomer={handleAddCustomer}
              />
            )}

            {currentTab === 'settings_shop' && (
              <SettingsShop 
                config={shopConfig}
                onSaveConfig={handleSaveShopConfig}
                staffList={staffList}
                onAddStaff={handleAddStaff}
                onEditStaff={handleEditStaff}
                onDeleteStaff={handleDeleteStaff}
                transactions={transactions}
                serviceOrders={serviceOrders}
              />
            )}

            {currentTab === 'whatsapp' && (
              <WhatsAppWeb 
                config={shopConfig} 
                onSaveConfig={handleSaveShopConfig} 
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Google Login Restrict Modal */}
      <AnimatePresence>
        {showAuthModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-sm animate-fade-in">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-sm bg-white border border-zinc-200 rounded-2xl shadow-xl overflow-hidden p-6 text-center space-y-4"
            >
              <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                <Lock size={22} />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-zinc-950">Acesso Restrito</h3>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  {authModalMessage || 'Você precisa conectar sua conta do Google para utilizar este recurso e salvar os seus dados.'}
                </p>
              </div>
              <div className="pt-2 flex flex-col gap-2">
                <button
                  onClick={() => {
                    setShowAuthModal(false);
                    handleGoogleSignIn();
                  }}
                  className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-850 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                >
                  Conectar Conta Google
                </button>
                <button
                  onClick={() => setShowAuthModal(false)}
                  className="w-full py-2.5 border border-zinc-200 hover:bg-zinc-50 text-zinc-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Continuar como Demonstração
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
