import React, { useState, useRef, useEffect } from 'react';
import { 
  Cloud, 
  CloudLightning, 
  RefreshCw, 
  CheckCircle2, 
  FileJson, 
  Upload, 
  Download, 
  Database, 
  AlertCircle,
  HelpCircle,
  User,
  LogOut,
  Clock,
  Laptop
} from 'lucide-react';
import { Transaction, ServiceOrder, BackupHistory } from '../types';
import { formatDate } from '../utils';
import { motion } from 'motion/react';
import { User as FirebaseUser } from 'firebase/auth';

interface SettingsBackupProps {
  user: FirebaseUser | null;
  token: string | null;
  needsAuth: boolean;
  isLoggingIn: boolean;
  onLogin: () => Promise<void>;
  onLogout: () => Promise<void>;
  transactions: Transaction[];
  serviceOrders: ServiceOrder[];
  backupHistory: BackupHistory[];
  onAddBackupLog: (log: Omit<BackupHistory, 'id'>) => Promise<void>;
  onRestoreData: (backupData: { transactions: Transaction[]; serviceOrders: ServiceOrder[] }) => Promise<void>;
}

export default function SettingsBackup({
  user,
  token,
  needsAuth,
  isLoggingIn,
  onLogin,
  onLogout,
  transactions,
  serviceOrders,
  backupHistory,
  onAddBackupLog,
  onRestoreData
}: SettingsBackupProps) {
  const [backingUp, setBackingUp] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [backupMessage, setBackupMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isElectron, setIsElectron] = useState(false);
  const [electronBackupPath, setElectronBackupPath] = useState<string | null>(null);

  useEffect(() => {
    const hasElectron = typeof window !== 'undefined' && (window as any).electronAPI !== undefined;
    setIsElectron(hasElectron);

    if (hasElectron) {
      const api = (window as any).electronAPI;
      const unsubscribe = api.onBackupStatus((status: { success: boolean; path?: string; fileName?: string; error?: string }) => {
        if (status.success) {
          setElectronBackupPath(status.path || null);
          setBackupMessage({
            type: 'success',
            text: `Backup local automático salvo em: ${status.path}`
          });
        } else {
          setBackupMessage({
            type: 'error',
            text: `Erro no backup local: ${status.error}`
          });
        }
      });

      // Periodic automatic backup every 10 minutes when transactions or orders exist
      const interval = setInterval(() => {
        triggerElectronBackup();
      }, 10 * 60 * 1000);

      // Trigger once on load
      const timeout = setTimeout(() => {
        triggerElectronBackup();
      }, 3000);

      return () => {
        unsubscribe();
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
  }, [transactions.length, serviceOrders.length]);

  const triggerElectronBackup = () => {
    const hasElectron = typeof window !== 'undefined' && (window as any).electronAPI !== undefined;
    if (hasElectron) {
      const backupPayload = {
        app: "Controle de Caixa - Assistência Técnica",
        version: "1.0.0",
        backupDate: new Date().toISOString(),
        transactions,
        serviceOrders
      };
      (window as any).electronAPI.saveLocalBackup(backupPayload);
    }
  };

  // Manual trigger to backup on Google Drive
  const handleDriveBackup = async () => {
    if (!token) {
      setBackupMessage({ type: 'error', text: 'Você precisa estar conectado com a conta Google para salvar no Drive.' });
      return;
    }

    setBackingUp(true);
    setBackupMessage(null);

    try {
      const fileName = `ControleCaixa_Backup_${new Date().toISOString().substring(0, 10)}.json`;
      const backupPayload = {
        app: "Controle de Caixa - Assistência Técnica",
        version: "1.0.0",
        backupDate: new Date().toISOString(),
        transactions,
        serviceOrders
      };

      const fileContent = JSON.stringify(backupPayload, null, 2);
      const metadata = {
        name: fileName,
        mimeType: 'application/json',
        description: 'Backup automático do sistema de fluxo de caixa e ordens de serviço'
      };

      const boundary = 'ax_boundary_999';
      const delimiter = `\r\n--${boundary}\r\n`;
      const closeDelim = `\r\n--${boundary}--`;

      const multipartRequestBody =
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        fileContent +
        closeDelim;

      // Call Google Drive Files Create API
      const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': `multipart/related; boundary=${boundary}`
        },
        body: multipartRequestBody
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Google Drive API error: ${response.statusText} - ${errorText}`);
      }

      const driveFile = await response.json();
      
      // Calculate file size formatted
      const sizeKB = Math.round(fileContent.length / 1024);
      const sizeText = sizeKB > 1024 ? `${(sizeKB / 1024).toFixed(1)} MB` : `${sizeKB} KB`;

      // Save log in Firestore
      await onAddBackupLog({
        fileName,
        fileId: driveFile.id || 'N/A',
        date: new Date().toISOString(),
        size: sizeText,
        status: 'success'
      });

      setBackupMessage({ 
        type: 'success', 
        text: `Backup enviado ao Google Drive com sucesso! Nome: ${fileName}` 
      });

    } catch (err: any) {
      console.error(err);
      setBackupMessage({ 
        type: 'error', 
        text: `Falha ao realizar backup: ${err.message || 'Erro desconhecido'}` 
      });

      // Log failure if possible
      try {
        await onAddBackupLog({
          fileName: `Backup_Falhou_${new Date().toISOString().substring(0, 10)}.json`,
          fileId: 'N/A',
          date: new Date().toISOString(),
          size: '0 KB',
          status: 'failed'
        });
      } catch (logErr) {
        console.error('Failed to log backup error to firestore', logErr);
      }
    } finally {
      setBackingUp(false);
    }
  };

  // Local JSON Export Backup
  const handleLocalExport = () => {
    const backupPayload = {
      app: "Controle de Caixa - Assistência Técnica",
      version: "1.0.0",
      backupDate: new Date().toISOString(),
      transactions,
      serviceOrders
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupPayload, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `ControleCaixa_LocalBackup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);
  };

  // Restore Backup from local JSON
  const handleLocalImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const file = e.target.files?.[0];
    if (!file) return;

    setRestoring(true);
    setBackupMessage(null);

    fileReader.onload = async (event) => {
      try {
        const parsedData = JSON.parse(event.target?.result as string);
        
        // Validation check
        if (!parsedData.transactions || !parsedData.serviceOrders) {
          throw new Error('Arquivo de backup inválido. Chaves "transactions" ou "serviceOrders" não encontradas.');
        }

        const confirmRestore = window.confirm(
          `Atenção: Você está prestes a restaurar um backup de ${formatDate(parsedData.backupDate)}.\n` +
          `Isso substituirá todos os seus dados atuais (${transactions.length} lançamentos e ${serviceOrders.length} O.S.).\n` +
          `Deseja prosseguir com a restauração?`
        );

        if (!confirmRestore) {
          setRestoring(false);
          return;
        }

        await onRestoreData({
          transactions: parsedData.transactions,
          serviceOrders: parsedData.serviceOrders
        });

        setBackupMessage({ 
          type: 'success', 
          text: 'Backup restaurado com sucesso! Todos os dados foram atualizados.' 
        });

      } catch (err: any) {
        console.error(err);
        setBackupMessage({ 
          type: 'error', 
          text: `Falha ao importar backup: ${err.message || 'Formato inválido'}` 
        });
      } finally {
        setRestoring(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    fileReader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold text-zinc-950 font-sans">Drive & Backup Automático</h2>
        <p className="text-xs text-zinc-400">Garanta a segurança dos dados da sua assistência com backups automáticos e integrados no Google Drive</p>
      </div>

      {/* Account Info and Google OAuth Integration */}
      <div className="bg-white p-6 rounded-2xl border border-zinc-100 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          <div>
            <h3 className="text-base font-bold text-zinc-950">Integração Google Drive</h3>
            <p className="text-xs text-zinc-500 mt-1">Conecte sua conta do Google para permitir que o sistema faça o upload e download de arquivos de backup diretamente na sua pasta do Drive.</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            {token ? (
              <div className="flex items-center gap-3 bg-zinc-50 border border-zinc-200 p-3 rounded-xl w-full sm:w-auto">
                <div className="w-10 h-10 bg-zinc-200 rounded-full flex items-center justify-center text-zinc-600 font-bold uppercase overflow-hidden">
                  {user?.photoURL ? (
                    <img src={user.photoURL} alt={user.displayName || 'User'} referrerPolicy="no-referrer" />
                  ) : (
                    user?.displayName?.substring(0, 2) || <User />
                  )}
                </div>
                <div>
                  <p className="text-sm font-bold text-zinc-900">{user?.displayName || 'Conectado'}</p>
                  <p className="text-xs text-zinc-400">{user?.email || 'Sem email cadastrado'}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-600 bg-amber-50 px-3 py-2 rounded-xl border border-amber-200">
                <AlertCircle size={14} />
                Drive não conectado. Conecte sua conta abaixo para habilitar o backup em nuvem.
              </div>
            )}
          </div>

          <div className="pt-2">
            {token ? (
              <button
                onClick={onLogout}
                className="flex items-center gap-2 px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                <LogOut size={14} />
                Desconectar Conta Google
              </button>
            ) : (
              /* Official Google Sign-In button structure styled with Tailwind */
              <button
                onClick={onLogin}
                disabled={isLoggingIn}
                className="gsi-material-button flex items-center justify-center gap-3 px-5 py-3 border border-zinc-200 hover:bg-zinc-50 bg-white rounded-xl text-sm font-semibold transition-all cursor-pointer shadow-xs disabled:opacity-50"
              >
                <div className="gsi-material-button-icon shrink-0">
                  <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: 'block', width: '20px', height: '20px' }}>
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                    <path fill="none" d="M0 0h48v48H0z"></path>
                  </svg>
                </div>
                <span className="gsi-material-button-contents text-zinc-700">Conectar com o Google</span>
              </button>
            )}
          </div>
        </div>

        {/* Database Status */}
        <div className="bg-zinc-50 border border-zinc-200/60 rounded-2xl p-5 flex flex-col justify-between">
          <div className="space-y-1.5">
            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Estado do Banco de Dados</h4>
            <div className="flex items-center gap-2 text-emerald-600 font-extrabold text-sm pt-2">
              <CheckCircle2 size={16} /> Sincronizado com Firebase
            </div>
            <p className="text-[11px] text-zinc-400 mt-2">Os dados locais estão salvos na nuvem Firestore de forma resiliente.</p>
          </div>

          <div className="border-t border-zinc-200/60 pt-4 mt-4 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-zinc-500 font-medium">Lançamentos de Caixa:</span>
              <span className="font-bold text-zinc-800">{transactions.length}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-zinc-500 font-medium">Ordens de Serviço:</span>
              <span className="font-bold text-zinc-800">{serviceOrders.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Backup and Restore Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Cloud/Desktop backup */}
        <div className="bg-white p-6 rounded-2xl border border-zinc-100 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              {isElectron ? <Laptop size={24} /> : <Cloud size={24} />}
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-950 font-sans">
                {isElectron ? 'Backup do Sistema (.exe)' : 'Gerar Novo Backup'}
              </h3>
              <p className="text-xs text-zinc-400">
                {isElectron ? 'Backup local automático na sua máquina' : 'Salve as tabelas atuais e ordens de serviço'}
              </p>
            </div>
          </div>

          {isElectron ? (
            <div className="p-3.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs space-y-1 text-zinc-600">
              <p className="font-semibold text-zinc-800">📁 Pasta de Backups:</p>
              <p className="font-mono text-[10px] break-all text-zinc-500 bg-white p-2 rounded border border-zinc-100">
                Este Computador \ Documentos \ Backup_InfoCam
              </p>
              <p className="text-[10px] text-zinc-400 mt-1">O programa salva um backup nesta pasta automaticamente a cada 10 minutos para garantir total resiliência!</p>
            </div>
          ) : (
            <p className="text-xs text-zinc-500">Ao clicar, geramos um arquivo compactado `.json` e enviamos diretamente ao seu Google Drive, mantendo uma trilha protegida.</p>
          )}

          {backupMessage && (
            <div className={`p-3.5 rounded-xl border flex gap-2.5 text-xs font-medium ${backupMessage.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
              <AlertCircle size={16} className="shrink-0" />
              <span>{backupMessage.text}</span>
            </div>
          )}

          <div className="flex flex-col gap-2 pt-2">
            {isElectron && (
              <button
                onClick={triggerElectronBackup}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                <RefreshCw size={14} />
                Forçar Backup Local Agora
              </button>
            )}

            <div className="flex gap-2 w-full">
              <button
                onClick={handleDriveBackup}
                disabled={backingUp || !token}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold disabled:opacity-40 transition-all cursor-pointer"
              >
                <Cloud size={14} className={backingUp ? 'animate-spin' : ''} />
                {backingUp ? 'Enviando ao Drive...' : 'Salvar no Google Drive'}
              </button>
              <button
                onClick={handleLocalExport}
                className="px-4 py-3 bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border border-zinc-200 rounded-xl text-xs font-bold cursor-pointer"
                title="Baixar arquivo JSON localmente"
              >
                <Download size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Restore backup */}
        <div className="bg-white p-6 rounded-2xl border border-zinc-100 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
              <Database size={24} />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-950 font-sans">Restaurar Dados / Importar</h3>
              <p className="text-xs text-zinc-400">Restaure arquivos de backups anteriores</p>
            </div>
          </div>

          <p className="text-xs text-zinc-500">Selecione um arquivo de backup `.json` (gerado localmente ou baixado do Drive) para substituir os dados do banco de dados.</p>

          <div className="pt-2">
            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={handleLocalImport}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={restoring}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-zinc-50 border border-dashed border-zinc-300 hover:bg-zinc-100/60 hover:border-zinc-400 rounded-xl text-xs font-bold text-zinc-600 transition-all cursor-pointer disabled:opacity-40"
            >
              <Upload size={14} />
              {restoring ? 'Carregando backup...' : 'Selecionar Arquivo de Backup (.json)'}
            </button>
          </div>
        </div>

      </div>

      {/* History log */}
      <div className="bg-white p-6 rounded-2xl border border-zinc-100 space-y-4">
        <div>
          <h3 className="text-base font-bold text-zinc-950">Histórico de Backups no Drive</h3>
          <p className="text-xs text-zinc-400">Trilha de auditoria das últimas sincronizações bem-sucedidas no Google Drive</p>
        </div>

        <div className="divide-y divide-zinc-100 border border-zinc-100 rounded-xl overflow-hidden">
          {backupHistory.length === 0 ? (
            <div className="p-6 text-center text-xs text-zinc-400">
              Nenhum backup registrado no histórico do Firebase ainda.
            </div>
          ) : (
            [...backupHistory]
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map((log) => (
                <div key={log.id} className="p-3 flex justify-between items-center bg-zinc-50/20 text-xs hover:bg-zinc-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <Clock size={14} className="text-zinc-400" />
                    <div>
                      <p className="font-semibold text-zinc-800">{log.fileName}</p>
                      <p className="text-[10px] text-zinc-400 mt-0.5">ID Arquivo Drive: {log.fileId}</p>
                    </div>
                  </div>

                  <div className="text-right flex items-center gap-4">
                    <div>
                      <p className="font-bold text-zinc-800">{log.size}</p>
                      <p className="text-[10px] text-zinc-400 mt-0.5">{formatDate(log.date)}</p>
                    </div>
                    <span className={`px-2 py-0.5 font-bold uppercase text-[9px] rounded-full ${log.status === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                      {log.status === 'success' ? 'Sucesso' : 'Falhou'}
                    </span>
                  </div>
                </div>
              ))
          )}
        </div>
      </div>

    </div>
  );
}
