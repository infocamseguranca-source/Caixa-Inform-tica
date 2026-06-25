import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Plus, 
  Phone, 
  MapPin, 
  User, 
  Mail, 
  Calendar, 
  Trash2, 
  Edit, 
  ChevronLeft, 
  ChevronRight, 
  CreditCard,
  Lock,
  Database,
  FileSpreadsheet,
  X,
  ArrowUpDown
} from 'lucide-react';
import { Customer } from '../types';
import importedClientsRaw from '../data/imported_clients.json';
import { motion, AnimatePresence } from 'motion/react';

// Cast imported clients
const IMPORTED_CLIENTS: any[] = importedClientsRaw;

interface CustomersProps {
  user: any | null;
  customers: Customer[];
  onAddCustomer: (customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onEditCustomer: (id: string, updatedFields: Partial<Customer>) => Promise<void>;
  onDeleteCustomer: (id: string) => Promise<void>;
  onLogin: () => void;
}

export default function Customers({
  user,
  customers,
  onAddCustomer,
  onEditCustomer,
  onDeleteCustomer,
  onLogin
}: CustomersProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<'name-asc' | 'name-desc' | 'source-custom' | 'source-imported'>('name-asc');
  const itemsPerPage = 15;

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [cpf, setCpf] = useState('');
  const [birthDate, setBirthDate] = useState('');

  // Is company account?
  const isCompanyAccount = user?.email?.toLowerCase() === 'infocamseguranca@gmail.com';

  // Memoized combination of Custom and Imported clients
  const allClients = useMemo(() => {
    // If not logged in, we only show standard sample clients or custom local ones.
    // If logged in but NOT the company email, we only show their custom/saved clients.
    // If logged in as infocamseguranca@gmail.com, we show BOTH custom and the 2,148 imported clients.
    const customList = customers.map(c => ({
      ...c,
      source: 'custom' as const
    }));

    if (isCompanyAccount) {
      const importedList = IMPORTED_CLIENTS.map(c => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        address: c.address,
        cpf: c.cpf,
        email: '',
        birthDate: '',
        source: 'importado' as const
      }));
      // Merge: unique names preferred, or custom list first
      const seenNames = new Set(customList.map(c => c.name.toLowerCase()));
      const filteredImported = importedList.filter(c => !seenNames.has(c.name.toLowerCase()));
      return [...customList, ...filteredImported];
    }

    return customList;
  }, [customers, isCompanyAccount]);

  // Search filter
  const filteredClients = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return allClients;

    return allClients.filter(c => 
      c.name.toLowerCase().includes(term) ||
      (c.phone && c.phone.replace(/\D/g, '').includes(term.replace(/\D/g, ''))) ||
      (c.phone && c.phone.toLowerCase().includes(term)) ||
      (c.cpf && c.cpf.replace(/\D/g, '').includes(term.replace(/\D/g, ''))) ||
      (c.address && c.address.toLowerCase().includes(term))
    );
  }, [allClients, searchTerm]);

  // Sorting filter
  const sortedClients = useMemo(() => {
    const list = [...filteredClients];
    list.sort((a, b) => {
      if (sortBy === 'name-asc') {
        return a.name.localeCompare(b.name, 'pt-BR');
      } else if (sortBy === 'name-desc') {
        return b.name.localeCompare(a.name, 'pt-BR');
      } else if (sortBy === 'source-custom') {
        // 'custom' first, then 'importado'
        if (a.source === 'custom' && b.source === 'importado') return -1;
        if (a.source === 'importado' && b.source === 'custom') return 1;
        // if same, sort by name asc
        return a.name.localeCompare(b.name, 'pt-BR');
      } else if (sortBy === 'source-imported') {
        // 'importado' first, then 'custom'
        if (a.source === 'importado' && b.source === 'custom') return -1;
        if (a.source === 'custom' && b.source === 'importado') return 1;
        return a.name.localeCompare(b.name, 'pt-BR');
      }
      return 0;
    });
    return list;
  }, [filteredClients, sortBy]);

  // Pagination calculations
  const totalPages = Math.ceil(sortedClients.length / itemsPerPage) || 1;
  const paginatedClients = useMemo(() => {
    // Clamp current page
    const page = Math.min(Math.max(1, currentPage), totalPages);
    const start = (page - 1) * itemsPerPage;
    return sortedClients.slice(start, start + itemsPerPage);
  }, [sortedClients, currentPage, totalPages]);

  // Handle open modal
  const handleOpenAddModal = () => {
    setEditingCustomer(null);
    setName('');
    setPhone('');
    setEmail('');
    setAddress('');
    setCpf('');
    setBirthDate('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (client: any) => {
    setEditingCustomer(client);
    setName(client.name);
    setPhone(client.phone || '');
    setEmail(client.email || '');
    setAddress(client.address || '');
    setCpf(client.cpf || '');
    setBirthDate(client.birthDate || '');
    setIsModalOpen(true);
  };

  // Submit Modal
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      if (editingCustomer && editingCustomer.source !== 'importado') {
        await onEditCustomer(editingCustomer.id, {
          name,
          phone,
          email,
          address,
          cpf,
          birthDate
        });
      } else {
        // Adding new customer OR duplicating an edited imported customer
        await onAddCustomer({
          name,
          phone,
          email,
          address,
          cpf,
          birthDate
        });
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar cliente.');
    }
  };

  // Delete
  const handleDelete = async (client: any) => {
    if (client.source === 'importado') {
      alert('Clientes do banco de dados importado original do sistema não podem ser excluídos, apenas os novos adicionados.');
      return;
    }
    if (confirm(`Tem certeza que deseja excluir o cliente ${client.name}?`)) {
      try {
        await onDeleteCustomer(client.id);
        // Reset page if it empty
        if (paginatedClients.length === 1 && currentPage > 1) {
          setCurrentPage(prev => prev - 1);
        }
      } catch (err) {
        console.error(err);
        alert('Erro ao excluir cliente.');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Banco de Dados de Clientes</h2>
          <p className="text-xs text-zinc-500 mt-1">
            {isCompanyAccount 
              ? `Visualizando todos os clientes da InfoCam (${IMPORTED_CLIENTS.length} importados + ${customers.length} salvos nesta conta).`
              : user 
                ? `Visualizando clientes salvos na sua conta (${customers.length} clientes).`
                : 'Modo de Demonstração (faça login para acessar seus clientes reais).'
            }
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            <Plus size={14} />
            Novo Cliente
          </button>
        </div>
      </div>

      {/* Security alert / demo banner if applicable */}
      {!user && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex gap-3">
            <div className="p-2 bg-amber-100 text-amber-800 rounded-xl mt-0.5 md:mt-0">
              <Lock size={16} />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-950">Modo de Demonstração Ativo</p>
              <p className="text-[11px] text-amber-800 mt-0.5">
                Os dados reais de clientes (incluindo os 2.148 clientes importados do sistema anterior) só estão disponíveis após fazer login com a conta Google corporativa da empresa.
              </p>
            </div>
          </div>
          <button
            onClick={onLogin}
            className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-950 rounded-xl text-[11px] font-bold transition-all border border-amber-300 whitespace-nowrap"
          >
            Conectar Google
          </button>
        </div>
      )}

      {user && !isCompanyAccount && (
        <div className="p-4 bg-zinc-100 border border-zinc-200 rounded-2xl flex gap-3">
          <div className="p-2 bg-zinc-200 text-zinc-700 rounded-xl">
            <Lock size={16} />
          </div>
          <div>
            <p className="text-xs font-bold text-zinc-950">Acesso Restrito ao Banco de Dados Principal</p>
            <p className="text-[11px] text-zinc-600 mt-0.5">
              Você está logado com a conta <strong className="text-zinc-800">{user.email}</strong>. Por motivos de segurança, os 2.148 clientes importados da InfoCam estão disponíveis exclusivamente ao logar com o e-mail corporativo: <strong className="text-zinc-900">infocamseguranca@gmail.com</strong>.
            </p>
          </div>
        </div>
      )}

      {isCompanyAccount && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex gap-3">
          <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
            <Database size={16} />
          </div>
          <div>
            <p className="text-xs font-bold text-emerald-950">Banco de Dados Corporativo Carregado com Sucesso!</p>
            <p className="text-[11px] text-emerald-800 mt-0.5">
              Bem-vindo, <strong className="text-emerald-950">InfoCam Segurança</strong>! Todos os {IMPORTED_CLIENTS.length} clientes do backup DBF/FPT foram extraídos com endereço e telefone, e estão disponíveis para autocomplete nas ordens de serviço, agendamentos e compras.
            </p>
          </div>
        </div>
      )}

      {/* Main search and table card */}
      <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-zinc-100 bg-zinc-50/50 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-3 items-center w-full sm:flex-1 md:max-w-xl">
            <div className="relative w-full sm:flex-1">
              <Search className="absolute left-3 top-2.5 text-zinc-400" size={14} />
              <input
                type="text"
                placeholder="Buscar por nome, celular, endereço ou CPF..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1); // reset to first page on search
                }}
                className="w-full pl-9 pr-4 py-2 bg-white border border-zinc-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-zinc-950"
              />
            </div>

            <div className="relative w-full sm:w-48 shrink-0">
              <ArrowUpDown className="absolute left-3 top-2.5 text-zinc-400 pointer-events-none" size={14} />
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value as any);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-8 py-2 bg-white border border-zinc-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-zinc-950 appearance-none cursor-pointer text-zinc-700"
              >
                <option value="name-asc">Nome (A - Z)</option>
                <option value="name-desc">Nome (Z - A)</option>
                <option value="source-custom">Salvos no App</option>
                <option value="source-imported">Importados (DBF)</option>
              </select>
              <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-zinc-400">
                <ChevronRight className="rotate-90" size={12} />
              </div>
            </div>
          </div>

          <div className="text-[11px] text-zinc-500 font-medium">
            Total de registros: <span className="font-bold text-zinc-900">{filteredClients.length}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                <th className="px-5 py-3">Cliente</th>
                <th className="px-5 py-3">Contato</th>
                <th className="px-5 py-3">Endereço</th>
                <th className="px-5 py-3">CPF/Documento</th>
                <th className="px-5 py-3">Origem</th>
                <th className="px-5 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-xs">
              {paginatedClients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-zinc-400">
                    Nenhum cliente encontrado.
                  </td>
                </tr>
              ) : (
                paginatedClients.map((client) => (
                  <tr key={client.id} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-zinc-100 text-zinc-700 flex items-center justify-center font-bold text-xs shrink-0">
                          {client.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-zinc-900">{client.name}</p>
                          {client.birthDate && (
                            <p className="text-[10px] text-zinc-400 mt-0.5 flex items-center gap-1">
                              <Calendar size={10} />
                              Nasc: {new Date(client.birthDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="space-y-0.5">
                        {client.phone && (
                          <p className="text-zinc-700 flex items-center gap-1">
                            <Phone size={10} className="text-zinc-400" />
                            {client.phone}
                          </p>
                        )}
                        {client.email && (
                          <p className="text-zinc-500 flex items-center gap-1 text-[10px]">
                            <Mail size={10} className="text-zinc-400" />
                            {client.email}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 max-w-xs truncate" title={client.address}>
                      {client.address ? (
                        <p className="text-zinc-600 flex items-center gap-1 truncate">
                          <MapPin size={10} className="text-zinc-400 shrink-0" />
                          {client.address}
                        </p>
                      ) : (
                        <span className="text-zinc-300 text-[10px]">Não informado</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {client.cpf ? (
                        <p className="text-zinc-600 font-mono flex items-center gap-1">
                          <CreditCard size={10} className="text-zinc-400" />
                          {client.cpf}
                        </p>
                      ) : (
                        <span className="text-zinc-300 text-[10px]">Não informado</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {client.source === 'importado' ? (
                        <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-700 text-[9px] font-bold rounded-full">
                          Importado (DBF)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-100 text-emerald-700 text-[9px] font-bold rounded-full">
                          Salvo no App
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEditModal(client)}
                          className="p-1.5 hover:bg-zinc-100 text-zinc-600 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit size={13} />
                        </button>
                        {client.source !== 'importado' && (
                          <button
                            onClick={() => handleDelete(client)}
                            className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                            title="Excluir"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination bar */}
        <div className="p-4 border-t border-zinc-100 bg-zinc-50/50 flex items-center justify-between">
          <div className="text-[11px] text-zinc-500">
            Página <span className="font-bold text-zinc-900">{currentPage}</span> de <span className="font-bold text-zinc-900">{totalPages}</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-1.5 border border-zinc-200 rounded-lg bg-white text-zinc-600 disabled:opacity-40 hover:bg-zinc-50 transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            
            {/* Direct Page Jump Buttons */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum = currentPage;
              if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }

              // Clamp pageNum
              if (pageNum < 1 || pageNum > totalPages) return null;

              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-7 h-7 text-xs font-bold rounded-lg transition-colors ${
                    currentPage === pageNum 
                      ? 'bg-zinc-900 text-white' 
                      : 'border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 border border-zinc-200 rounded-lg bg-white text-zinc-600 disabled:opacity-40 hover:bg-zinc-50 transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Add / Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-lg bg-white border border-zinc-200 rounded-2xl shadow-xl overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50">
                <h3 className="text-sm font-bold text-zinc-950">
                  {editingCustomer ? 'Editar Cliente' : 'Adicionar Novo Cliente'}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 hover:bg-zinc-150 text-zinc-500 rounded-lg"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {editingCustomer?.source === 'importado' && (
                  <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl text-[11px] text-indigo-950 leading-relaxed space-y-1">
                    <p className="font-bold flex items-center gap-1.5 text-indigo-900">
                      <Database size={12} className="text-indigo-600" />
                      Cliente Importado (DBF)
                    </p>
                    <p>
                      Para preservar a base original, as alterações deste cliente serão salvas como um novo registro sincronizado com a sua conta Google Cloud em tempo real.
                    </p>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Nome Completo</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-zinc-950"
                    placeholder="Ex: João da Silva"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider">WhatsApp / Celular</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-zinc-950"
                      placeholder="Ex: (24) 99999-9999"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider">CPF / CNPJ (Opcional)</label>
                    <input
                      type="text"
                      value={cpf}
                      onChange={(e) => setCpf(e.target.value)}
                      className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-zinc-950"
                      placeholder="Ex: 111.222.333-44"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider">E-mail (Opcional)</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-zinc-950"
                      placeholder="Ex: joao@email.com"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Nascimento (Opcional)</label>
                    <input
                      type="date"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-zinc-950 text-zinc-600 bg-white"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Endereço Completo</label>
                  <textarea
                    rows={2}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-zinc-950 resize-none"
                    placeholder="Ex: Rua do Imperador, 123 - Centro - Petrópolis/RJ"
                  />
                </div>

                <div className="pt-2 border-t border-zinc-100 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-zinc-200 hover:bg-zinc-50 text-zinc-600 rounded-xl text-xs font-bold transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold transition-all"
                  >
                    {editingCustomer ? 'Salvar Alterações' : 'Cadastrar Cliente'}
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
