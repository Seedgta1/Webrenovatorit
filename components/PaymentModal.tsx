import React, { useState } from 'react';
import { Business, PRICING, GeneratedSite } from '../types';
import { generateSitePreview } from '../services/gemini';
import { X, CreditCard, Lock, Check, Globe, Download, Server, Loader2, ArrowRight } from 'lucide-react';

interface PaymentModalProps {
  business: Business | null;
  onClose: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ business, onClose }) => {
  const [step, setStep] = useState<'payment' | 'config' | 'success'>('payment');
  const [processing, setProcessing] = useState(false);
  const [domainName, setDomainName] = useState('');
  const [configStatus, setConfigStatus] = useState(0); // 0 to 100
  const [siteCode, setSiteCode] = useState<string | null>(null);

  const handlePay = (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    // Simulate Stripe API call
    setTimeout(() => {
      setProcessing(false);
      setStep('config');
      // Pre-fill a likely domain
      if (business) {
          setDomainName(`www.${business.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.it`);
      }
    }, 2000);
  };

  const handleDomainConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    
    // Simulate DNS and Provisioning steps
    const interval = setInterval(() => {
        setConfigStatus(prev => {
            if (prev >= 100) {
                clearInterval(interval);
                return 100;
            }
            return prev + 10;
        });
    }, 300);

    // Fetch the code again to ensure we have it for download (or assume it's passed, but regenerating is safer for fresh content)
    if (business) {
        try {
            const data = await generateSitePreview(business);
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
        
        {/* Header */}
        <div className="bg-slate-50 p-4 border-b border-slate-100 flex justify-between items-center">
          <div className="flex items-center gap-2 text-slate-700 font-semibold">
            {step === 'payment' && <><Lock className="w-4 h-4" /> Checkout Sicuro</>}
            {step === 'config' && <><Globe className="w-4 h-4" /> Configurazione Dominio</>}
            {step === 'success' && <><Check className="w-4 h-4" /> Setup Completato</>}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {step === 'payment' && (
             <>
                <div className="mb-6">
                <h3 className="text-xl font-bold text-slate-900">Setup Sito Web + Hosting</h3>
                <p className="text-sm text-slate-500">Pacchetto "Chiavi in mano" per {business.name}</p>
                <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-blue-600">€{PRICING.setupFee}</span>
                    <span className="text-slate-400">/una tantum</span>
                </div>
                </div>

                <form onSubmit={handlePay} className="space-y-4">
                <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Intestatario Carta</label>
                    <input required type="text" placeholder="Mario Rossi" className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                
                <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Numero Carta</label>
                    <div className="relative">
                    <CreditCard className="absolute left-3 top-2.5 text-slate-400 w-5 h-5" />
                    <input required type="text" placeholder="0000 0000 0000 0000" className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono" />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Scadenza</label>
                    <input required type="text" placeholder="MM/YY" className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-center" />
                    </div>
                    <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">CVC</label>
                    <input required type="text" placeholder="123" className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-center" />
                    </div>
                </div>

                <div className="pt-4">
                    <button 
                    type="submit" 
                    disabled={processing}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                    {processing ? (
                        <>Processing...</>
                    ) : (
                        <>Paga €{PRICING.setupFee} con Stripe</>
                    )}
                    </button>
                    <p className="text-xs text-center text-slate-400 mt-3 flex items-center justify-center gap-1">
                    <Lock className="w-3 h-3" /> Transazione criptata SSL a 256-bit
                    </p>
                </div>
                </form>
             </>
          )}

          {step === 'config' && (
              <div className="space-y-6">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Globe className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900">Configura Dominio</h3>
                    <p className="text-slate-500 text-sm">Il pagamento è stato ricevuto. Scegli il dominio su cui pubblicare il sito.</p>
                  </div>

                  {processing ? (
                      <div className="space-y-4 py-4">
                          <div className="flex justify-between text-sm font-medium text-slate-700">
                              <span>Setup in corso...</span>
                              <span>{configStatus}%</span>
                          </div>
                          <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-blue-600 transition-all duration-300" style={{width: `${configStatus}%`}}></div>
                          </div>
                          <div className="grid gap-2">
                              <div className={`flex items-center gap-2 text-sm ${configStatus > 20 ? 'text-green-600' : 'text-slate-400'}`}>
                                  {configStatus > 20 ? <Check className="w-4 h-4"/> : <Loader2 className="w-4 h-4 animate-spin"/>}
                                  Registrazione DNS
                              </div>
                              <div className={`flex items-center gap-2 text-sm ${configStatus > 50 ? 'text-green-600' : 'text-slate-400'}`}>
                                  {configStatus > 50 ? <Check className="w-4 h-4"/> : <div className="w-4 h-4 border border-slate-300 rounded-full"/>}
                                  Generazione Certificato SSL
                              </div>
                              <div className={`flex items-center gap-2 text-sm ${configStatus > 80 ? 'text-green-600' : 'text-slate-400'}`}>
                                  {configStatus > 80 ? <Check className="w-4 h-4"/> : <div className="w-4 h-4 border border-slate-300 rounded-full"/>}
                                  Deploy Codice Sorgente
                              </div>
                          </div>
                      </div>
                  ) : (
                    <form onSubmit={handleDomainConfig} className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Dominio Desiderato</label>
                            <div className="flex">
                                <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-slate-200 bg-slate-50 text-slate-500 text-sm">
                                    https://
                                </span>
                                <input 
                                    type="text" 
                                    value={domainName} 
                                    onChange={(e) => setDomainName(e.target.value)}
                                    className="flex-1 min-w-0 block w-full px-3 py-2 rounded-r-lg border border-slate-200 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                />
                            </div>
                        </div>
                        <button 
                            type="submit"
                            className="w-full py-3 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                        >
                            <Server className="w-4 h-4" /> Avvia Provisioning
                        </button>
                    </form>
                  )}
              </div>
          )}

          {step === 'success' && (
              <div className="text-center space-y-6">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                    <Check className="w-8 h-8" />
                </div>
                <div>
                    <h3 className="text-2xl font-bold text-slate-900">Tutto Pronto!</h3>
                    <p className="text-slate-600 mt-2">
                        Il sito è attivo su <span className="font-mono bg-slate-100 px-1 rounded text-blue-600">{domainName}</span>.
                    </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-left space-y-3">
                    <h4 className="font-bold text-slate-800 text-sm uppercase">Prossimi step</h4>
                    <ul className="space-y-2 text-sm text-slate-600">
                        <li className="flex items-start gap-2">
                            <Check className="w-4 h-4 text-green-500 mt-0.5" />
                            Hosting AWS attivato per 12 mesi
                        </li>
                        <li className="flex items-start gap-2">
                            <Check className="w-4 h-4 text-green-500 mt-0.5" />
                            Email aziendale configurata
                        </li>
                        <li className="flex items-start gap-2">
                            <Check className="w-4 h-4 text-green-500 mt-0.5" />
                            Pannello AI Assistant accessibile
                        </li>
                    </ul>
                </div>

                <div className="flex flex-col gap-3">
                    <button 
                        onClick={downloadSource}
                        className="w-full py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                    >
                        <Download className="w-4 h-4" /> Scarica Codice Sorgente (.html)
                    </button>
                    <button 
                        onClick={onClose}
                        className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                    >
                        Vai alla Dashboard <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
              </div>
          )}
        </div>
      </div>
    </div>
  );
};