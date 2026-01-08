
import React, { useState, useEffect } from 'react';
import { Business, AppConfig, MarketingAudit, PRICING } from '../types';
import { generateColdEmail, generateSalesAudit } from '../services/gemini';
import { X, Send, Loader2, CheckCircle, AlertTriangle, TrendingDown, Zap, ShieldAlert, RefreshCw, Pencil, Target } from 'lucide-react';

interface EmailModalProps {
  business: Business;
  onClose: () => void;
  onSent: () => void;
  config: AppConfig;
}

export const EmailModal: React.FC<EmailModalProps> = ({ business, onClose, onSent, config }) => {
  const [loading, setLoading] = useState(true);
  const [auditLoading, setAuditLoading] = useState(true);
  const [emailContent, setEmailContent] = useState<{subject: string, body: string} | null>(null);
  const [audit, setAudit] = useState<MarketingAudit | null>(null);
  const [useIrresistibleOffer, setUseIrresistibleOffer] = useState(true); // DEFAULT TRUE per "Caso Studio"
  
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Determina l'URL base: usa quello delle impostazioni, altrimenti l'origine attuale del browser
  const baseUrl = config.publicUrl || (typeof window !== 'undefined' ? window.location.origin : 'https://webrenovator.it');

  // 1. Genera Audit Iniziale
  useEffect(() => {
      const init = async () => {
          try {
              const auditResult = await generateSalesAudit(business);
              setAudit(auditResult);
              setAuditLoading(false);
              
              // Genera prima email con modalità Caso Studio ATTIVA (true)
              const content = await generateColdEmail(business, auditResult, true, baseUrl);
              setEmailContent(content);
              setLoading(false);
          } catch (e) {
              console.error(e);
              setLoading(false);
              setAuditLoading(false);
          }
      };
      init();
  }, [business, baseUrl]);

  // 2. Rigenera email se cambia la strategia o su richiesta utente
  const handleRegenerate = async () => {
      if (!audit) return;
      setLoading(true);
      try {
          // Usa la strategia corrente
          const content = await generateColdEmail(business, audit, useIrresistibleOffer, baseUrl);
          setEmailContent(content);
      } catch (e) { console.error(e); } 
      finally { setLoading(false); }
  };

  const toggleStrategy = async () => {
      if (!audit) return;
      setLoading(true);
      const newMode = !useIrresistibleOffer;
      setUseIrresistibleOffer(newMode);
      
      try {
          const content = await generateColdEmail(business, audit, newMode, baseUrl);
          setEmailContent(content);
      } catch (e) { console.error(e); } 
      finally { setLoading(false); }
  };

  const handleRealSend = async () => {
    if (!config.resendApiKey || !config.senderEmail) {
        setError("Devi configurare Resend nel tab Setup prima di inviare.");
        return;
    }

    setSending(true);
    setError(null);

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.resendApiKey}`
        },
        body: JSON.stringify({
          from: `${config.senderName} <${config.senderEmail}>`,
          to: [business.name.toLowerCase().replace(/\s/g, '') + '@gmail.com'], 
          reply_to: config.senderEmail,
          subject: emailContent?.subject,
          html: emailContent?.body.replace(/\n/g, '<br>'),
        })
      });

      if (response.ok) {
        setSent(true);
        onSent();
      } else {
        const errData = await response.json();
        throw new Error(errData.message || "Errore durante l'invio");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center">
          <div className="flex items-center gap-2 text-slate-700 font-bold uppercase text-[10px] tracking-widest">
            <Target className="w-4 h-4 text-blue-600" /> Conversion Suite AI
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors"><X className="w-6 h-6" /></button>
        </div>

        <div className="flex-grow overflow-hidden flex flex-col md:flex-row">
            
            {/* LEFT: STRATEGY & AUDIT */}
            <div className="w-full md:w-1/3 bg-slate-50 border-r border-slate-200 p-6 overflow-y-auto hidden md:block">
                <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2"><TrendingDown className="w-5 h-5 text-red-500"/> Analisi Perdite</h3>
                
                {auditLoading ? (
                    <div className="space-y-3 opacity-50">
                        <div className="h-20 bg-slate-200 rounded-xl animate-pulse"></div>
                        <div className="h-10 bg-slate-200 rounded-xl animate-pulse"></div>
                    </div>
                ) : audit ? (
                    <div className="space-y-4">
                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                            <p className="text-xs text-slate-500 font-medium uppercase mb-1">Perdita Stimata</p>
                            <p className="text-2xl font-black text-red-600 tracking-tight">{audit.monthlyLostRevenue}<span className="text-sm text-slate-400 font-normal">/mese</span></p>
                        </div>

                        <div className="space-y-2">
                             <p className="text-xs text-slate-500 font-medium uppercase">Problemi Critici Rilevati</p>
                             {audit.criticalIssues?.map((issue, i) => (
                                 <div key={i} className="flex items-start gap-2 text-xs text-slate-700 bg-white p-2 rounded-lg border border-slate-100">
                                     <ShieldAlert className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" /> {issue}
                                 </div>
                             ))}
                        </div>

                        <div className="pt-4 border-t border-slate-200">
                             <div 
                                onClick={toggleStrategy}
                                className={`cursor-pointer p-4 rounded-2xl border-2 transition-all duration-300 relative overflow-hidden group ${useIrresistibleOffer ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-white hover:border-indigo-300'}`}
                             >
                                 <div className="flex justify-between items-center mb-2 relative z-10">
                                     <span className={`text-xs font-black uppercase tracking-wider ${useIrresistibleOffer ? 'text-indigo-700' : 'text-slate-500'}`}>Strategia Dedicata</span>
                                     <div className={`w-10 h-6 rounded-full p-1 transition-colors ${useIrresistibleOffer ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                                         <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${useIrresistibleOffer ? 'translate-x-4' : 'translate-x-0'}`}></div>
                                     </div>
                                 </div>
                                 <p className="text-[11px] text-slate-600 relative z-10 leading-relaxed">
                                     Attiva la narrativa <strong>"Impegno Settimanale"</strong>. L'AI scriverà che hai lavorato per una settimana intera su questo brand per creare l'anteprima.
                                 </p>
                                 {useIrresistibleOffer && <Zap className="absolute -bottom-2 -right-2 w-16 h-16 text-indigo-100 rotate-12" />}
                             </div>
                        </div>
                    </div>
                ) : null}
            </div>

            {/* RIGHT: EMAIL EDITOR */}
            <div className="w-full md:w-2/3 p-6 md:p-8 flex flex-col bg-white">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-full space-y-4">
                        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                        <p className="text-slate-400 text-sm font-medium">L'IA sta scrivendo la proposta perfetta...</p>
                    </div>
                ) : sent ? (
                    <div className="flex flex-col items-center justify-center h-full text-center animate-in zoom-in duration-300">
                        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle className="w-8 h-8" />
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900">Inviata con successo!</h3>
                        <p className="text-slate-500 mt-2 max-w-xs mx-auto">Se il cliente risponde, riceverai una notifica su {config.senderEmail}.</p>
                        <button onClick={onClose} className="mt-6 px-8 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm">Chiudi</button>
                    </div>
                ) : (
                    <div className="flex flex-col h-full">
                        {error && (
                            <div className="mb-4 bg-red-50 border border-red-200 p-3 rounded-xl flex items-start gap-3">
                                <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                                <p className="text-xs text-red-700 font-medium">{error}</p>
                            </div>
                        )}

                        <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-blue-50 rounded-lg text-blue-600">
                                    <Pencil className="w-4 h-4" />
                                </div>
                                <span className="text-sm font-bold text-slate-700">Editor Messaggio</span>
                            </div>
                            <button 
                                onClick={handleRegenerate} 
                                className="text-xs font-bold text-slate-500 hover:text-blue-600 flex items-center gap-1 transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200"
                            >
                                <RefreshCw className="w-3.5 h-3.5" />
                                Rigenera con AI
                            </button>
                        </div>
                        
                        <div className="flex-grow flex flex-col border border-slate-200 rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500/20 transition-all bg-white shadow-sm">
                             <input 
                                type="text" 
                                value={emailContent?.subject || ''} 
                                onChange={(e) => setEmailContent(prev => prev ? {...prev, subject: e.target.value} : null)} 
                                placeholder="Oggetto email..."
                                className="w-full px-5 py-4 bg-white border-b border-slate-100 outline-none font-bold text-slate-800 text-sm placeholder:text-slate-300" 
                             />
                            
                            <div className="relative flex-grow">
                                <textarea 
                                    value={emailContent?.body || ''} 
                                    onChange={(e) => setEmailContent(prev => prev ? {...prev, body: e.target.value} : null)} 
                                    placeholder="Scrivi qui il corpo del messaggio..."
                                    className="w-full h-full p-5 outline-none bg-white text-slate-700 leading-relaxed resize-none text-sm font-medium placeholder:text-slate-300" 
                                />
                                {useIrresistibleOffer && (
                                    <div className="absolute bottom-4 right-4 bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-[10px] font-bold shadow-sm flex items-center gap-1 pointer-events-none">
                                        <Zap className="w-3 h-3" /> STRATEGIA ATTIVA
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="mt-4 flex justify-end gap-3 pt-4 border-t border-slate-100">
                             <button onClick={onClose} className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-all text-sm">Annulla</button>
                             <button 
                                onClick={handleRealSend}
                                disabled={sending || !config.resendApiKey}
                                className={`px-8 py-3 text-white font-bold rounded-xl shadow-xl flex items-center gap-2 transition-all disabled:opacity-50 text-sm ${useIrresistibleOffer ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'}`}
                             >
                                 {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                 {useIrresistibleOffer ? "Invia Proposta Dedicata" : "Invia Proposta Standard"}
                             </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};
