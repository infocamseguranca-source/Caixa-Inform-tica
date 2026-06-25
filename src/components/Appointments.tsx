import React, { useState } from 'react';
import { 
  Calendar, 
  Clock, 
  User, 
  MapPin, 
  Wrench, 
  Plus, 
  Trash2, 
  Check, 
  AlertTriangle, 
  Smartphone, 
  Sparkles,
  CheckCircle,
  BellRing,
  X
} from 'lucide-react';
import { Appointment, Staff, Customer } from '../types';
import { formatDate } from '../utils';
import { motion, AnimatePresence } from 'motion/react';
import CustomerAutocomplete from './CustomerAutocomplete';

interface AppointmentsProps {
  appointments: Appointment[];
  staffList: Staff[];
  onAddAppointment: (appointment: Omit<Appointment, 'id' | 'notified'>) => Promise<void>;
  onDeleteAppointment: (id: string) => Promise<void>;
  user: any | null;
  customers: Customer[];
}

export default function Appointments({
  appointments,
  staffList,
  onAddAppointment,
  onDeleteAppointment,
  user,
  customers
}: AppointmentsProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [address, setAddress] = useState('');
  const [service, setService] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [selectedTechnician, setSelectedTechnician] = useState('');

  // Simulated notifications feed for demonstration
  const [simulatedAlerts, setSimulatedAlerts] = useState<{
    id: string;
    type: 'whatsapp_tecnico' | 'whatsapp_cliente_2h' | 'whatsapp_tecnico_2h';
    recipient: string;
    message: string;
    timestamp: string;
  }[]>([]);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !dateTime || !selectedTechnician) {
      alert('Preencha os campos obrigatórios!');
      return;
    }

    const tech = staffList.find(s => s.id === selectedTechnician);
    const techName = tech ? tech.name : 'Técnico';

    try {
      await onAddAppointment({
        customerName,
        customerPhone,
        address,
        service,
        date: dateTime,
        technicianId: selectedTechnician
      });

      // Simulation: Add WhatsApp notification log for the technician
      const techAlertMessage = `📢 *AGENDAMENTO TÉCNICO INFO*:\n` +
        `Olá ${techName},\nvocê possui um novo atendimento agendado:\n` +
        `👤 *Cliente:* ${customerName}\n` +
        `📞 *Contato:* ${customerPhone}\n` +
        `📍 *Endereço:* ${address}\n` +
        `🔧 *Serviço:* ${service}\n` +
        `📅 *Data/Hora:* ${new Date(dateTime).toLocaleString('pt-BR')}`;

      // Simulate sending WhatsApp to technician
      const newAlert = {
        id: Math.random().toString(),
        type: 'whatsapp_tecnico' as const,
        recipient: techName,
        message: techAlertMessage,
        timestamp: new Date().toLocaleTimeString('pt-BR')
      };

      // Proximity simulation (2 hours before)
      const customerAlertMessage = `⏰ *SEU ATENDIMENTO ESTÁ PRÓXIMO!*:\n` +
        `Olá ${customerName}, avisamos que seu técnico está a caminho para o atendimento nas próximas 2 horas.\n` +
        `⚙️ *Técnico:* ${techName}\n` +
        `📱 *Contato do Técnico:* (11) 98765-4321\n` +
        `Obrigado por escolher nossa assistência técnica!`;

      const techProximityAlert = `⏰ *ALERTA DE PROXIMIDADE 2 HORAS*:\n` +
        `Olá ${techName}, seu atendimento com o cliente ${customerName} no endereço ${address} será daqui a 2 horas. Prepare suas ferramentas!`;

      const proximityAlertCustomer = {
        id: Math.random().toString(),
        type: 'whatsapp_cliente_2h' as const,
        recipient: customerName,
        message: customerAlertMessage,
        timestamp: 'Enviará 2h antes do atendimento'
      };

      const proximityAlertTech = {
        id: Math.random().toString(),
        type: 'whatsapp_tecnico_2h' as const,
        recipient: techName,
        message: techProximityAlert,
        timestamp: 'Enviará 2h antes do atendimento'
      };

      setSimulatedAlerts(prev => [newAlert, proximityAlertCustomer, proximityAlertTech, ...prev]);

      // Clear form
      setCustomerName('');
      setCustomerPhone('');
      setAddress('');
      setService('');
      setDateTime('');
      setSelectedTechnician('');
      setIsModalOpen(false);

      alert('Agendamento salvo com sucesso! WhatsApp de confirmação simulado para o técnico.');

    } catch (err) {
      console.error(err);
      alert('Erro ao agendar atendimento.');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Excluir este agendamento?')) {
      try {
        await onDeleteAppointment(id);
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-950 font-sans">Agendamento de Visitas Técnicas</h2>
          <p className="text-xs text-zinc-400">Gerencie atendimentos domiciliares ou empresariais agendados, com notificações automáticas</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="w-full md:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
        >
          <Plus size={16} />
          Agendar Atendimento
        </button>
      </div>

      {/* Grid of details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Appointments Schedule List */}
        <div className="lg:col-span-7 bg-white border border-zinc-150 rounded-2xl p-5 space-y-4">
          <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider border-b border-zinc-100 pb-2">Próximas Visitas Agendadas</h3>

          {appointments.length === 0 ? (
            <div className="py-12 text-center text-zinc-400 text-xs">
              <Calendar className="mx-auto text-zinc-200 mb-2" size={32} />
              Nenhuma visita agendada no momento.
            </div>
          ) : (
            <div className="space-y-3">
              {[...appointments]
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .map((app) => {
                  const tech = staffList.find(s => s.id === app.technicianId);
                  return (
                    <div key={app.id} className="p-4 border border-zinc-100 rounded-xl bg-zinc-50/30 flex justify-between items-start relative hover:bg-zinc-50 transition-colors">
                      <div className="space-y-1.5 text-xs text-zinc-700">
                        <div className="flex items-center gap-2 font-bold text-zinc-950 text-sm">
                          <User size={14} className="text-zinc-400" />
                          <span>{app.customerName}</span>
                          <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-100 font-extrabold px-2 py-0.5 rounded-full">
                            {tech ? tech.name : 'Sem Técnico'}
                          </span>
                        </div>

                        <p className="flex items-center gap-1.5 text-zinc-500 font-medium">
                          <Smartphone size={12} className="text-zinc-400" /> {app.customerPhone}
                        </p>

                        <p className="flex items-center gap-1.5 text-zinc-500 font-medium">
                          <MapPin size={12} className="text-zinc-400" /> {app.address}
                        </p>

                        <p className="flex items-center gap-1.5 text-zinc-600 font-bold bg-white border border-zinc-150 py-1 px-2.5 rounded-lg max-w-max">
                          <Wrench size={12} className="text-zinc-500 animate-pulse" /> {app.service}
                        </p>
                      </div>

                      <div className="text-right space-y-2 flex flex-col items-end">
                        <div className="text-xs font-extrabold text-zinc-900 bg-zinc-100 border border-zinc-200 px-3 py-1 rounded-lg flex items-center gap-1.5">
                          <Clock size={12} />
                          {new Date(app.date).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </div>

                        <button
                          onClick={() => handleDelete(app.id)}
                          className="p-1 hover:bg-rose-50 text-zinc-400 hover:text-rose-600 rounded transition-colors mt-2 cursor-pointer"
                          title="Remover Agendamento"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* Real-time automated notifications feed */}
        <div className="lg:col-span-5 bg-white border border-zinc-150 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Avisos e WhatsApp (Automatizados)</h3>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </div>

          <p className="text-[10px] text-zinc-400">Log de simulação do envio automático de lembretes ao técnico e ao cliente para as visitas agendadas.</p>

          <div className="space-y-3.5 max-h-[420px] overflow-y-auto pr-1">
            {simulatedAlerts.length === 0 ? (
              <div className="py-12 text-center text-zinc-400 text-xs">
                <BellRing className="mx-auto text-zinc-200 mb-2" size={32} />
                Nenhum aviso disparado nas últimas horas. Agende um atendimento para visualizar a automação de mensagens.
              </div>
            ) : (
              simulatedAlerts.map((alert) => (
                <div key={alert.id} className="p-3 bg-zinc-50 rounded-xl border border-zinc-150 text-[11px] space-y-1.5">
                  <div className="flex justify-between items-center text-[10px] font-bold text-zinc-400 uppercase tracking-wider border-b border-zinc-200 pb-1">
                    <span>Destinatário: {alert.recipient}</span>
                    <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-150 text-[8px] font-black uppercase">
                      {alert.type === 'whatsapp_tecnico' ? 'WhatsApp Confirmação' : alert.type === 'whatsapp_cliente_2h' ? 'WhatsApp Cliente (2h)' : 'WhatsApp Técnico (2h)'}
                    </span>
                  </div>
                  <pre className="font-mono text-[10px] whitespace-pre-wrap text-zinc-700 leading-normal font-medium">{alert.message}</pre>
                  <p className="text-[9px] text-zinc-400 text-right italic font-semibold pt-0.5">Status: Enviado em {alert.timestamp}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* CREATE APPOINTMENT MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-2xl border border-zinc-100 shadow-xl overflow-hidden"
            >
              <div className="flex justify-between items-center bg-zinc-50 p-5 border-b border-zinc-100">
                <h3 className="text-sm font-bold text-zinc-950 font-sans">Agendar Novo Atendimento Externo</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-zinc-200 text-zinc-400 hover:text-zinc-600 rounded-lg">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 mb-1">Nome Completo do Cliente</label>
                    <CustomerAutocomplete
                      required
                      value={customerName}
                      onChange={setCustomerName}
                      onSelect={(client) => {
                        setCustomerName(client.name);
                        if (client.phone) setCustomerPhone(client.phone);
                        if (client.address) setAddress(client.address);
                      }}
                      user={user}
                      customers={customers}
                      placeholder="Ex: Amanda Gouveia"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-500 mb-1">Telefone WhatsApp</label>
                    <input
                      type="tel"
                      required
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-xs"
                      placeholder="Ex: (11) 98888-8888"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-500 mb-1">Endereço da Visita</label>
                    <input
                      type="text"
                      required
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-xs"
                      placeholder="Ex: Av. Paulista, 1000 - Apto 51"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-500 mb-1">Serviço Técnico Solicitado</label>
                    <textarea
                      required
                      rows={2}
                      value={service}
                      onChange={(e) => setService(e.target.value)}
                      className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-xs resize-none"
                      placeholder="Ex: Instalar rede Wi-Fi corporativa e testar cabeamento de rede."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 mb-1">Data & Horário</label>
                      <input
                        type="datetime-local"
                        required
                        value={dateTime}
                        onChange={(e) => setDateTime(e.target.value)}
                        className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 mb-1">Técnico Escalado</label>
                      <select
                        value={selectedTechnician}
                        onChange={(e) => setSelectedTechnician(e.target.value)}
                        required
                        className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-xs bg-white"
                      >
                        <option value="">Selecione...</option>
                        {staffList.filter(s => s.role === 'tecnico').map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-4 border-t border-zinc-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-2 px-4 bg-zinc-100 text-zinc-600 text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 px-4 bg-zinc-900 text-white text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Agendar & Notificar Técnico
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
