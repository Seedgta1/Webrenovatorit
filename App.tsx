
import React, { useState, useEffect } from 'react';
import { LeadScout } from './components/LeadScout';
import { SiteGenerator } from './components/SiteGenerator';
import { PaymentModal } from './components/PaymentModal';
import { EmailModal } from './components/EmailModal';
import { Inbox } from './components/Inbox';
import { Settings } from './components/Settings';
import { Business, Message, AppConfig } from './types';
import { Globe, ChevronRight, Settings as SettingsIcon, Sparkles, Inbox as InboxIcon, Users, Database } from 'lucide-react';
import { simulateBusinessReply } from './services/gemini';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'scout' | 'generator' | 'inbox' | 'settings'>('scout');
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [emailModalBusiness, setEmailModalBusiness] = useState<Business | null>(null);
  
  // Persisted State
  const [leads, setLeads] = useState<Business[]>(() => {
    try {
      const saved = localStorage.getItem('wr_leads');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem('wr_messages');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [config, setConfig] = useState<AppConfig>(() => {
    try {
      const saved = localStorage.getItem('wr_config');
      const parsed = saved ? JSON.parse(saved) : {};
      // Assicura che la struttura sia corretta per i nuovi tipi
      return {
        resendApiKey: parsed.resendApiKey || '',
        senderEmail: parsed.senderEmail || '',
        senderName: parsed.senderName || 'Riccardo C.',
        stripeSecretKey: parsed.stripeSecretKey || '',
        stripePublishableKey: parsed.stripePublishableKey || ''
      };
    } catch {
      return {
        resendApiKey: '',
        senderEmail: '',
        senderName: 'Riccardo C.',
        stripeSecretKey: '',
        stripePublishableKey: ''
      };
    }
  });

  // Persist to localStorage
  useEffect(() => localStorage.setItem('wr_leads', JSON.stringify(leads)), [leads]);
  useEffect(() => localStorage.setItem('wr_messages', JSON.stringify(messages)), [messages]);
  useEffect(() => localStorage.setItem('wr_config', JSON.stringify(config)), [config]);

  const handleBusinessSelect = (business: Business) => {
    setSelectedBusiness(business);
    setCurrentView('generator');
  };

  const handleEmailSent = async (business: Business) => {
    const updatedLeads = leads.map(l => l.id === business.id ? { ...l, leadStatus: 'CONTACTED' as const } : l);
    setLeads(updatedLeads);
    
    // Simula una risposta dopo un tempo realistico (8 secondi) solo per feedback UI
    setTimeout(async () => {
        try {
            const replyContent = await simulateBusinessReply(business);
            const newMessage: Message = {
                id: `msg-${Date.now()}`,
                businessId: business.id,
                businessName: business.name,
                sender: 'BUSINESS',
                content: replyContent,
                timestamp: new Date()
            };
            setMessages(prev => [newMessage, ...prev]);
            setLeads(prevLeads => prevLeads.map(l => l.id === business.id ? { ...l, leadStatus: 'REPLIED' as const } : l));
        } catch (e) { console.error("Simulated reply error:", e); }
    }, 8000);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans selection:bg-blue-100">
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer group" onClick={() => setCurrentView('scout')}>
            <div className="bg-blue-600 p-2 rounded-xl text-white"><Globe className="w-5 h-5" /></div>
            <span className="font-bold text-xl text-slate-800 tracking-tight">WebRenovator<span className="text-blue-600">IT</span></span>
          </div>
          
          <nav className="flex gap-1 text-sm font-medium text-slate-500 bg-slate-100 p-1 rounded-full">
            <button onClick={() => setCurrentView('scout')} className={`px-4 py-1.5 rounded-full transition-all ${currentView === 'scout' ? 'bg-white text-slate-900 shadow-sm' : 'hover:bg-white/50'}`}>
              <Users className="w-4 h-4 inline mr-2"/> Scout
            </button>
            <button onClick={() => setCurrentView('inbox')} className={`px-4 py-1.5 rounded-full transition-all flex items-center ${currentView === 'inbox' ? 'bg-white text-slate-900 shadow-sm' : 'hover:bg-white/50'}`}>
              <InboxIcon className="w-4 h-4 mr-2"/> Inbox
              {messages.length > 0 && <span className="ml-2 px-1.5 py-0.5 bg-blue-600 text-white text-[10px] rounded-full">{messages.length}</span>}
            </button>
            <button onClick={() => setCurrentView('settings')} className={`px-4 py-1.5 rounded-full transition-all flex items-center ${currentView === 'settings' ? 'bg-white text-slate-900 shadow-sm' : 'hover:bg-white/50'}`}>
              <SettingsIcon className="w-4 h-4 mr-2"/> Setup
            </button>
          </nav>

          <div className="hidden sm:flex items-center gap-2 text-[10px] font-bold text-slate-400">
              <Database className="w-3.5 h-3.5" /> AGENTE LOCALE ATTIVO
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-7xl mx-auto px-4 py-8 w-full overflow-x-hidden">
        {currentView === 'scout' && (
          <div className="space-y-6">
            <div className="text-center py-8">
              <h1 className="text-4xl font-extrabold text-slate-900 mb-2">Automazione <span className="text-blue-600">Lead & Sales</span></h1>
              <p className="text-slate-500 max-w-xl mx-auto text-sm">Identifica, contatta e converti lead locali in modo autonomo con l'intelligenza artificiale.</p>
            </div>
            <LeadScout 
                onSelectBusiness={handleBusinessSelect} 
                onOpenEmail={setEmailModalBusiness}
                leads={leads}
                setLeads={setLeads}
            />
          </div>
        )}

        {currentView === 'generator' && selectedBusiness && (
          <div className="h-full flex flex-col">
            <button onClick={() => setCurrentView('scout')} className="self-start mb-4 text-sm font-semibold text-slate-500 hover:text-blue-600 flex items-center">
              <ChevronRight className="w-3 h-3 rotate-180 mr-1" /> Torna allo Scout
            </button>
            <div className="bg-blue-50 border border-blue-100 p-3 rounded-2xl mb-6 text-xs text-blue-800 flex items-center gap-3">
                <Sparkles className="w-4 h-4 text-blue-500" />
                L'IA ha creato un'anteprima personalizzata per <strong>{selectedBusiness.name}</strong> basata sui loro dati pubblici.
            </div>
            <SiteGenerator 
              business={selectedBusiness} 
              onBuy={() => setShowPayment(true)} 
              onOpenEmail={setEmailModalBusiness}
            />
          </div>
        )}

        {currentView === 'inbox' && (
            <Inbox messages={messages} leads={leads} onContactWhatsApp={(bId) => {
                const b = leads.find(l => l.id === bId);
                if (b) window.open(`https://wa.me/${b.phoneNumber?.replace(/\D/g,'')}`, '_blank');
            }} />
        )}

        {currentView === 'settings' && (
            <Settings config={config} setConfig={setConfig} />
        )}
      </main>

      {showPayment && <PaymentModal business={selectedBusiness} onClose={() => setShowPayment(false)} />}
      {emailModalBusiness && (
          <EmailModal 
            business={emailModalBusiness} 
            onClose={() => setEmailModalBusiness(null)}
            onSent={() => handleEmailSent(emailModalBusiness)}
            config={config}
          />
      )}
    </div>
  );
};

export default App;
