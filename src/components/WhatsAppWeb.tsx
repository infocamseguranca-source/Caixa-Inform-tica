import React, { useState } from 'react';
import { motion } from 'motion/react';
import { MessageCircle, ExternalLink, Info, AlertTriangle, Settings, Key, Phone, Save } from 'lucide-react';
import { ShopConfig } from '../types';

export default function WhatsAppWeb({ config, onSaveConfig }: { config?: ShopConfig, onSaveConfig?: (c: ShopConfig) => void }) {
  const [activeTab, setActiveTab] = useState<'web' | 'api'>('api');
  
  const [apiToken, setApiToken] = useState(config?.whatsappApiToken || '');
  const [phoneId, setPhoneId] = useState(config?.whatsappPhoneNumberId || '');

  const handleSaveApi = () => {
    if (onSaveConfig && config) {
      onSaveConfig({
        ...config,
        whatsappApiToken: apiToken,
        whatsappPhoneNumberId: phoneId
      });
      alert('Configurações da API do WhatsApp salvas com sucesso!');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="h-[calc(100vh-6rem)] w-full flex flex-col space-y-4"
    >
      <div className="flex items-center justify-between px-6 pt-4 shrink-0">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-zinc-950 flex items-center gap-2">
            <MessageCircle className="text-green-500" size={28} /> WhatsApp Integration
          </h1>
          <p className="text-sm font-medium text-zinc-500 mt-1">
            Integre seu WhatsApp via Web ou API Oficial da Meta
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-zinc-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('api')}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-colors ${activeTab === 'api' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
            >
              API Business (Meta)
            </button>
            <button
              onClick={() => setActiveTab('web')}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-colors ${activeTab === 'web' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
            >
              WhatsApp Web
            </button>
          </div>
          
          <a
            href="https://web.whatsapp.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-bold rounded-xl transition-all shadow-sm ml-2"
          >
            <span>Abrir Externa</span>
            <ExternalLink size={14} />
          </a>
        </div>
      </div>

      <div className="px-6 flex-1 flex flex-col pb-6">
        {activeTab === 'web' ? (
          <>
            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-[10px] p-2 rounded-lg mb-3 flex items-start gap-2 shrink-0">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <p>
                <strong>Nota:</strong> Alguns navegadores podem bloquear a exibição do WhatsApp dentro do sistema por questões de segurança do próprio WhatsApp. Se a tela abaixo ficar cinza/branca ou apresentar erro, utilize o botão <strong>"Abrir Externa"</strong> acima.
              </p>
            </div>

            <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm overflow-hidden flex-1 relative w-full">
              <iframe 
                src="https://web.whatsapp.com/"
                className="absolute top-0 left-0 w-full h-full border-0 bg-zinc-50"
                title="WhatsApp Web"
                allow="camera; microphone"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              />
            </div>
          </>
        ) : (
          <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm p-6 overflow-y-auto">
            <div className="max-w-3xl">
              <div className="flex items-center gap-3 mb-6 pb-6 border-b border-zinc-100">
                <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center text-green-600 shrink-0">
                  <Settings size={24} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-zinc-900">Configuração da API Oficial (Meta)</h2>
                  <p className="text-xs text-zinc-500">Envie mensagens automatizadas através da API Cloud do WhatsApp Business.</p>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 text-blue-800 text-xs p-4 rounded-xl mb-6 flex gap-3">
                <Info className="shrink-0 mt-0.5" size={18} />
                <div className="space-y-2">
                  <p className="font-bold">Como funciona a API Oficial:</p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>Você precisa criar um app no <a href="https://developers.facebook.com/" target="_blank" rel="noreferrer" className="underline font-bold">Portal de Desenvolvedores da Meta</a>.</li>
                    <li>As mensagens de notificação (fora da janela de 24h de interação do cliente) <strong>precisam ser templates aprovados</strong> pela Meta.</li>
                    <li>Se o cliente enviou uma mensagem para você nas últimas 24h, a API enviará mensagens de texto livre normalmente.</li>
                    <li>Se não houver interação nas últimas 24h e a mensagem não for um template aprovado, o envio via API falhará. Neste sistema, usamos o WhatsApp Web (abertura de aba) como fallback automático em caso de falha.</li>
                  </ul>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1 flex items-center gap-2">
                    <Key size={14} className="text-zinc-400" /> Token de Acesso Permanente (Permanent Token)
                  </label>
                  <input
                    type="password"
                    value={apiToken}
                    onChange={(e) => setApiToken(e.target.value)}
                    placeholder="EAAGm0..."
                    className="w-full px-3 py-2.5 border border-zinc-200 rounded-xl text-sm bg-zinc-50 focus:bg-white transition-colors focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                  />
                  <p className="text-[10px] text-zinc-500 mt-1">Gerado nas configurações de sistema do Facebook Business ou painel do App.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1 flex items-center gap-2">
                    <Phone size={14} className="text-zinc-400" /> ID do Número de Telefone (Phone Number ID)
                  </label>
                  <input
                    type="text"
                    value={phoneId}
                    onChange={(e) => setPhoneId(e.target.value)}
                    placeholder="Ex: 104568912345678"
                    className="w-full px-3 py-2.5 border border-zinc-200 rounded-xl text-sm bg-zinc-50 focus:bg-white transition-colors focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                  />
                  <p className="text-[10px] text-zinc-500 mt-1">Encontrado no painel da Meta em WhatsApp &gt; Configuração da API.</p>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    onClick={handleSaveApi}
                    className="flex items-center gap-2 px-6 py-2.5 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl transition-all shadow-md shadow-green-500/20 active:scale-95"
                  >
                    <Save size={18} />
                    <span>Salvar Credenciais</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
