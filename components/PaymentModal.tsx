
import React, { useState } from 'react';
import { Business, PRICING, AIModelConfig, DesignPreferences } from '../types';
import { generateSitePreview } from '../services/gemini';
import { X, CreditCard, Lock, Check, Globe, Download, RefreshCw } from 'lucide-react';

interface PaymentModalProps {
  business: Business | null;
  onClose: () => void;
}

const Loader2 = ({ className }: { className?: string }) => <RefreshCw className={className} />;

export const PaymentModal: React.FC<PaymentModalProps> = ({ business, onClose }) => {
  const [step, setStep] = useState<'payment' | 'config' | 'success'>('payment');
  const [processing, setProcessing] = useState(false);
  const [domainName, setDomainName] = useState('');
  const [configStatus, setConfigStatus] = useState(0); 
  const [siteCode, setSiteCode] = useState<string | null>(null);

  const handlePay = (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
      setStep('config');
      if (business) {
          setDomainName(`www.${business.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.it`);
      }
    }, 2000);
  };

  const handleDomainConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    
    const interval = setInterval(() => {
        setConfigStatus(prev => {
            if (prev >= 100) {
                clearInterval(interval);
                return 100;
            }
            return prev + 10;
        });
    }, 300);

    if (business) {
        try {
            const lastCreation = business.creations?.[business.creations.length - 1];
            const aiConfig: AIModelConfig = {
                textModel: 'gemini-3-flash-preview',
                imageModel: 'gemini-2.5-flash-image',
                useGoogleSearch: true
            };
            const designPrefs: DesignPreferences = lastCreation?.designPreferences || {
                palette: 'luxury',
                fontPairing: 'inter-playfair',
                layoutType: 'liquid',
                gridDensity: 'relaxed'
            };
            
            // Fixed call: passing images instead of sectionsOrder to match the service signature
            const data = await generateSitePreview(business, aiConfig, designPrefs, lastCreation?.brandData ? {} : undefined);
            setSiteCode(data.html);
        } catch(e) { console.error(e); }
    }

    setTimeout(() => {
        clearInterval(interval);
        setConfigStatus(100);
        setProcessing(false);
        setStep('success');
    }, 3500);
  };

  const downloadSource = () => {
    if (!siteCode) return;
    const blob = new Blob([siteCode], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${domainName.replace('www.', '') || 'website'}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!business) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
        
        <div className="bg-slate-50 p-4 border-b border-slate-100 flex justify-between items-center">
          <div className="flex items-center gap-2 text-slate-700 font-semibold text-sm">
            {step === 'payment' && <><Lock className="w-4 h-4 text-blue-600" /> Checkout Sicuro</>}
            {step === 'config' && <><Globe className="w-4 h-4 text-blue-600" /> Configurazione Dominio</>}
            {step === 'success' && <><Check className="w-4 h-4 text-green-600" /> Setup Completato</>}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 overflow-y-auto">
          {step === 'payment' && (
             <form onSubmit={handlePay} className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Setup Completo</h3>
                  <p className="text-sm text-slate-500">Pacchetto Hosting + Dominio + Sito AI</p>
                  <div className="mt-4 flex items-baseline gap-1">
                      <span className="text-3xl font-extrabold text-blue-600">€{PRICING.setupFee}</span>
                      <span className="text-slate-400 text-xs font-bold">/UNA TANTUM</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <input required type="text" placeholder="Intestatario Carta" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" />
                  <div className="relative">
                    <CreditCard className="absolute left-4 top-3.5 text-slate-400 w-5 h-5" />
                    <input required type="text" placeholder="Numero Carta" className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <input required type="text" placeholder="MM/YY" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" />
                    <input required type="text" placeholder="CVC" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" />
                  </div>
                </div>

                <button type="submit" disabled={processing} className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700 flex items-center justify-center gap-2">
                    {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Paga Ora'}
                </button>
             </form>
          )}

          {step === 'config' && (
              <form onSubmit={handleDomainConfig} className="space-y-6 text-center">
                  <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Globe className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">Scegli il tuo dominio</h3>
                  <div className="relative">
                      <input value={domainName} onChange={(e) => setDomainName(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-center font-bold text-blue-600" />
                  </div>
                  <button type="submit" disabled={processing} className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2">
                      {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Configura e Pubblica'}
                  </button>
                  {processing && (
                      <div className="mt-4">
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div className="bg-blue-600 h-full transition-all duration-300" style={{ width: `${configStatus}%` }} />
                          </div>
                          <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-widest">Provisioning in corso...</p>
                      </div>
                  )}
              </form>
          )}

          {step === 'success' && (
              <div className="text-center space-y-6">
                  <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                      <Check className="w-10 h-10" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900">Sito Online!</h3>
                  <p className="text-slate-500 text-sm">Il tuo sito è ora raggiungibile su <span className="text-blue-600 font-bold">{domainName}</span></p>
                  <div className="flex flex-col gap-3">
                      <button onClick={downloadSource} className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl flex items-center justify-center gap-2">
                          <Download className="w-5 h-5" /> Scarica Codice Sorgente
                      </button>
                      <button onClick={onClose} className="w-full py-4 bg-slate-100 text-slate-600 font-bold rounded-xl">Chiudi</button>
                  </div>
              </div>
          )}
        </div>
      </div>
    </div>
  );
};
