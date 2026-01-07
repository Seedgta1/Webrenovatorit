
import React from 'react';
import { AppConfig } from '../types';
import { Save, ShieldCheck, Mail, CreditCard, Info, ExternalLink, Key, CheckCircle, Globe } from 'lucide-react';

interface SettingsProps {
  config: AppConfig;
  setConfig: React.Dispatch<React.SetStateAction<AppConfig>>;
}

export const Settings: React.FC<SettingsProps> = ({ config, setConfig }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setConfig(prev => ({ ...prev, [name]: value }));
  };

  const isConfigured = config.resendApiKey && config.senderEmail;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3 mb-8">
            <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600"><Key className="w-6 h-6" /></div>
            <div>
                <h2 className="text-2xl font-bold text-slate-800">Setup Cloud & API</h2>
                <p className="text-slate-500 text-sm">Configura i motori per l'invio email e la ricezione dei pagamenti.</p>
            </div>
            {isConfigured && (
              <div className="ml-auto bg-green-50 text-green-600 px-3 py-1.5 rounded-full text-[10px] font-bold flex items-center gap-2 border border-green-100">
                <CheckCircle className="w-3.5 h-3.5" /> PRONTO ALL'USO
              </div>
            )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {/* Email Section */}
            <div className="space-y-6">
                <div className="flex items-center gap-2 text-slate-800 font-bold border-b border-slate-100 pb-2">
                    <Mail className="w-4 h-4 text-blue-600" /> Email Reali (Resend API)
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Resend API Key</label>
                        <input name="resendApiKey" type="password" value={config.resendApiKey} onChange={handleChange} placeholder="re_..." className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm" />
                        <a href="https://resend.com" target="_blank" className="text-[10px] text-blue-600 font-bold mt-2 flex items-center gap-1 hover:underline">
                            <ExternalLink className="w-3 h-3" /> Crea account gratuito su Resend.com
                        </a>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Email Mittente Verificata</label>
                        <input name="senderEmail" value={config.senderEmail} onChange={handleChange} placeholder="info@tuodominio.it" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                        <p className="text-[10px] text-slate-400 mt-2">Deve essere un dominio verificato su Resend.</p>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Tuo Nome (Mittente)</label>
                        <input name="senderName" value={config.senderName} onChange={handleChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">URL Base Anteprima (Hosting)</label>
                        <div className="relative">
                            <input name="publicUrl" value={config.publicUrl || ''} onChange={handleChange} placeholder={typeof window !== 'undefined' ? window.location.origin : 'https://tuo-dominio.com'} className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                            <Globe className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                        </div>
                        <p className="text-[10px] text-slate-400 mt-2">L'URL dove è ospitata questa webapp (es. Vercel). Serve per generare link validi nelle email.</p>
                    </div>
                </div>
            </div>

            {/* Stripe Section */}
            <div className="space-y-6">
                <div className="flex items-center gap-2 text-slate-800 font-bold border-b border-slate-100 pb-2">
                    <CreditCard className="w-4 h-4 text-indigo-600" /> Pagamenti (Stripe)
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Stripe Secret Key</label>
                        <input name="stripeSecretKey" type="password" value={config.stripeSecretKey} onChange={handleChange} placeholder="sk_live_..." className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm" />
                    </div>
                    <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100 space-y-3">
                        <div className="flex items-center gap-2 text-blue-800 font-bold text-[10px] uppercase">
                            <Info className="w-4 h-4" /> Perché Resend e non SMTP?
                        </div>
                        <p className="text-[11px] text-blue-700 leading-relaxed">
                            I browser bloccano l'invio diretto via SMTP (Gmail) per sicurezza. Resend è il gateway professionale che permette di spedire email reali con un tasso di consegna del 99%.
                        </p>
                    </div>
                </div>
            </div>
        </div>

        <div className="mt-10 pt-6 border-t border-slate-100 flex justify-end">
            <div className="flex items-center gap-2 px-8 py-4 bg-slate-900 text-white font-bold rounded-2xl shadow-xl transition-all cursor-default">
                <Save className="w-4 h-4" /> Dati criptati localmente
            </div>
        </div>
      </div>
    </div>
  );
};
