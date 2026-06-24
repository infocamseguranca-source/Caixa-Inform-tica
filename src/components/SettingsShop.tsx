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
  FileSpreadsheet
} from 'lucide-react';
import { ShopConfig, Staff } from '../types';
import { motion } from 'motion/react';

interface SettingsShopProps {
  config: ShopConfig;
  onSaveConfig: (config: ShopConfig) => Promise<void>;
  staffList: Staff[];
  onAddStaff: (staff: Omit<Staff, 'id'>) => Promise<void>;
  onDeleteStaff: (id: string) => Promise<void>;
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
  onDeleteStaff
}: SettingsShopProps) {
  const [activeSubTab, setActiveSubTab] = useState<'geral' | 'cores' | 'equipe' | 'categorias' | 'menus'>('geral');
  
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

  // Staff fields
  const [staffName, setStaffName] = useState('');
  const [staffRole, setStaffRole] = useState<'tecnico' | 'vendedor'>('tecnico');
  const [staffCommission, setStaffCommission] = useState('5');

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
        role: staffRole,
        commission: parseFloat(staffCommission) || 0
      });
      setStaffName('');
      setStaffCommission('5');
      alert('Membro da equipe cadastrado com sucesso!');
    } catch (err) {
      console.error(err);
    }
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
            <h3 className="text-sm font-bold text-zinc-900 border-b border-zinc-100 pb-2">Gerenciamento de Equipe & Comissões</h3>
            <p className="text-xs text-zinc-400">Cadastre técnicos e vendedores. O sistema calculará comissões individuais automaticamente quando os atendimentos ou vendas forem realizados.</p>

            <form onSubmit={handleAddStaffSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-zinc-50/50 p-4 rounded-xl border border-zinc-100">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-zinc-500 mb-1">Nome Completo</label>
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
                <label className="block text-xs font-bold text-zinc-500 mb-1">Cargo / Função</label>
                <select
                  value={staffRole}
                  onChange={(e) => setStaffRole(e.target.value as any)}
                  className="w-full px-3 py-1.5 border border-zinc-200 rounded-xl text-xs bg-white"
                >
                  <option value="tecnico">Técnico em Hardware</option>
                  <option value="vendedor">Vendedor / Caixa</option>
                </select>
              </div>

              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-zinc-500 mb-1">Comissão (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    required
                    value={staffCommission}
                    onChange={(e) => setStaffCommission(e.target.value)}
                    className="w-full px-3 py-1.5 border border-zinc-200 rounded-xl text-xs bg-white"
                    placeholder="5"
                  />
                </div>
                <button
                  type="submit"
                  className="p-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl transition-all cursor-pointer"
                  title="Cadastrar na Equipe"
                >
                  <Plus size={16} />
                </button>
              </div>
            </form>

            <div className="border border-zinc-100 rounded-xl overflow-hidden divide-y divide-zinc-100">
              <div className="grid grid-cols-3 bg-zinc-50 py-2.5 px-4 text-xs font-extrabold text-zinc-400 uppercase tracking-wider">
                <span>Colaborador</span>
                <span>Função</span>
                <span className="text-center">Ações / Comissões</span>
              </div>
              
              {staffList.length === 0 ? (
                <div className="p-6 text-center text-xs text-zinc-400 bg-white">
                  Nenhum funcionário ou colaborador cadastrado ainda.
                </div>
              ) : (
                staffList.map((st) => (
                  <div key={st.id} className="grid grid-cols-3 py-3 px-4 items-center bg-white text-xs text-zinc-800 hover:bg-zinc-50/50">
                    <span className="font-bold">{st.name}</span>
                    <span className="capitalize text-zinc-500">
                      {st.role === 'tecnico' ? '⚙️ Técnico' : '🛒 Vendedor'}
                    </span>
                    <div className="flex items-center justify-between pl-4">
                      <span className="font-bold text-zinc-900 bg-zinc-50 border border-zinc-150 py-0.5 px-2.5 rounded-full inline-flex items-center gap-0.5">
                        <Percent size={10} /> {st.commission}%
                      </span>
                      <button
                        onClick={() => onDeleteStaff(st.id)}
                        className="p-1 hover:bg-rose-50 text-zinc-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
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
                  <div key={menuId} className="flex justify-between items-center p-3.5 bg-zinc-50/40 text-xs text-zinc-800 hover:bg-zinc-50 transition-colors">
                    <span className="font-bold">{idx + 1}. {label}</span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => moveMenu(idx, 'up')}
                        disabled={idx === 0}
                        className="py-1 px-2.5 border border-zinc-200 rounded bg-white hover:bg-zinc-100 text-zinc-600 text-[10px] font-bold disabled:opacity-30 cursor-pointer"
                      >
                        ▲ Subir
                      </button>
                      <button
                        onClick={() => moveMenu(idx, 'down')}
                        disabled={idx === menuOrder.length - 1}
                        className="py-1 px-2.5 border border-zinc-200 rounded bg-white hover:bg-zinc-100 text-zinc-600 text-[10px] font-bold disabled:opacity-30 cursor-pointer"
                      >
                        ▼ Descer
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
