
import React, { useState, useEffect } from 'react';
import { LeadScout } from './components/LeadScout';
import { SiteGenerator } from './components/SiteGenerator';
import { PaymentModal } from './components/PaymentModal';
import { EmailModal } from './components/EmailModal';
import { Inbox } from './components/Inbox';
import { Settings } from './components/Settings';
import { Business, Message, AppConfig, SiteCreation } from './types';
import { Globe, ChevronRight, Settings as SettingsIcon, Sparkles, Inbox as InboxIcon, Users, Database, LayoutDashboard, Zap, LogOut } from 'lucide-react';
import { simulateBusinessReply } from './services/gemini';
import { dbService } from './services/database';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'scout' | 'generator' | 'inbox' | 'settings'>('scout');
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [emailModalBusiness, setEmailModalBusiness] = useState<Business | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  
  // State
  const [leads, setLeads] = useState<Business[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);

  const [config, setConfig] = useState<AppConfig>(() => {
    try {
      const saved = localStorage.getItem('wr_config');
      const parsed = saved ? JSON.parse(saved) : {};
      return {
        resendApiKey: parsed.resendApiKey || '',
        senderEmail: parsed.senderEmail || '',
        senderName: parsed.senderName || 'Riccardo C.',
        stripeSecretKey: parsed.stripeSecretKey || '',
        stripePublishableKey: parsed.stripePublishableKey || '',
        publicUrl: parsed.publicUrl || (typeof window !== 'undefined' ? window.location.origin : '')
      };
    } catch {
      return {
        resendApiKey: '',
        senderEmail: '',
        senderName: 'Riccardo C.',
        stripeSecretKey: '',
        stripePublishableKey: '',
        publicUrl: typeof window !== 'undefined' ? window.location.origin : ''
      };
    }
  });

  // INITIAL DATA LOAD
  useEffect(() => {
    // Check for preview mode in URL immediately
    const params = new URLSearchParams(window.location.search);
    const previewId = params.get('preview');

    if (previewId) {
        setIsPreviewMode(true);
        setIsPreviewLoading(true);
        
        // Fetch specific business data directly from DB for the client
        const fetchPreview = async () => {
            try {
                const business = await dbService.getLeadById(previewId);
                if (business) {
                    setSelectedBusiness(business);
                } else {
                    alert("Link di anteprima scaduto o non valido.");
                }
            } catch (e) {
                console.error("Error loading preview:", e);
            } finally {
                setIsPreviewLoading(false);
            }
        };
        fetchPreview();
    } else {
        // Normal Dashboard Load
        const loadData = async () => {
            try {
                const dbLeads = await dbService.getLeads();
                setLeads(dbLeads);
                const dbMsgs = await dbService.getMessages();
                setMessages(dbMsgs);
            } catch (e) {
                console.error("Errore caricamento DB:", e);
            }
        };
        loadData();
    }
  }, []);

  // Save config locally
  useEffect(() => localStorage.setItem('wr_config', JSON.stringify(config)), [config]);

  const handleBusinessSelect = (business: Business) => {
    setSelectedBusiness(business);
    setCurrentView('generator');
  };

  // Logic to save creation to history (Max 3) AND PERSIST TO DB
  const handleSiteGenerated = async (creation: SiteCreation) => {
    if (!selectedBusiness) return;

    // 1. Update Local State
    const updatedLeads = leads.map(l => {
        if (l.id === selectedBusiness.id) {
            const currentCreations = l.creations || [];
            const newCreations = [...currentCreations, creation];
            if (newCreations.length > 3) newCreations.shift(); // Keep last 3
            return { ...l, creations: newCreations };
        }
        return l;
    });
    setLeads(updatedLeads);

    // 2. Update Selected Business State
    const updatedBusiness = updatedLeads.find(l => l.id === selectedBusiness.id);
    if (updatedBusiness) {
        setSelectedBusiness(updatedBusiness);
        
        // 3. PERSIST TO DB (CRITICAL FOR LINK TO WORK)
        // We use the updated business object which contains the new creations array
        if (updatedBusiness.creations) {
            await dbService.saveCreations(updatedBusiness.id, updatedBusiness.creations);
        }
    }
  };

  const handleEmailSent = async (business: Business) => {
    // 1. Update UI
    const updatedLeads = leads.map(l => l.id === business.id ? { ...l, leadStatus: 'CONTACTED' as const } : l);
    setLeads(updatedLeads);
    
    // 2. Update DB
    await dbService.updateLeadStatus(business.id, 'CONTACTED');
    
    // 3. Simulate Reply
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
            
            await dbService.addMessage(newMessage);
            await dbService.updateLeadStatus(business.id, 'REPLIED');

            setMessages(prev => [newMessage, ...prev]);
            setLeads(prevLeads => prevLeads.map(l => l.id === business.id ? { ...l, leadStatus: 'REPLIED' as const } : l));
        } catch (e) { console.error("Simulated reply error:", e); }
    }, 15000); // 15 seconds delay for realism
  };

  const handleLeadsFound = async (newLeads: Business[]) => {
      setLeads(prev => [...newLeads, ...prev]);
      await dbService.addLeads(newLeads);
  };

  const NavItem = ({ view, icon: Icon, label, count }: { view: typeof currentView, icon: any, label: string, count?: number }) => (
      <button 
        onClick={() => setCurrentView(view)}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
            currentView === view 
            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' 
            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
        }`}
      >
        <Icon className={`w-5 h-5 ${currentView === view ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'}`} />
        <span className="font-medium text-sm">{label}</span>
        {count !== undefined && count > 0 && (
            <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${
                currentView === view ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-600'
            }`}>
                {count}
            </span>
        )}
      </button>
  );

  // --- PREVIEW MODE RENDER (CLIENT VIEW) ---
  if (isPreviewMode) {
      if (isPreviewLoading) {
          return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-400 font-medium animate-pulse">Caricamento anteprima...</div>;
      }
      
      if (!selectedBusiness) {
          return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">Impossibile caricare il progetto. Contatta l'agenzia.</div>;
      }

      return (
          <div className="min-h-screen bg-slate-50 flex flex-col">
              <div className="bg-white p-4 shadow-sm border-b border-slate-200 flex justify-between items-center sticky top-0 z-50">
                  <div className="font-bold text-slate-800 flex items-center gap-2">
                      <Globe className="w-5 h-5 text-blue-600" />
                      Proposta Sito Web: <span className="text-blue-600">{selectedBusiness.name}</span>
                  </div>
                  <div className="text-xs text-slate-400">Anteprima Sola Lettura</div>
              </div>
              <div className="flex-1 p-0 md:p-4 overflow-hidden">
                  <SiteGenerator 
                    business={selectedBusiness} 
                    onBuy={() => { 
                        // In preview mode for clients, this might just open a mailto or alert
                        alert("Per confermare il progetto, rispondi all'email che hai ricevuto."); 
                    }} 
                    onOpenEmail={() => {}} 
                    onSiteGenerated={() => {}} // No-op in preview
                    publicUrl={config.publicUrl}
                  />
              </div>
          </div>
      );
  }

  // --- DASHBOARD MODE RENDER (AGENCY VIEW) ---
  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans selection:bg-blue-100 overflow-hidden">
      
      {/* SIDEBAR NAVIGATION */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-full z-20 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)]">
          <div className="p-6">
            <div className="flex items-center gap-2 mb-8">
                <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-2.5 rounded-xl text-white shadow-lg shadow-blue-500/20">
                    <Globe className="w-5 h-5" />
                </div>
                <div>
                    <h1 className="font-bold text-lg text-slate-800 leading-tight">WebRenovator</h1>
                    <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">AI Agency OS</span>
                </div>
            </div>

            <nav className="space-y-2">
                <NavItem view="scout" icon={Users} label="Scout Lead" />
                <NavItem view="inbox" icon={InboxIcon} label="Inbox" count={messages.length} />
                <NavItem view="settings" icon={SettingsIcon} label="Configurazione" />
            </nav>
          </div>

          <div className="mt-auto p-6 border-t border-slate-100">
             <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                 <div className="flex items-center gap-2 text-xs font-bold text-slate-500 mb-2">
                     <Database className="w-3.5 h-3.5 text-green-500" /> STATUS SERVER
                 </div>
                 <div className="flex items-center gap-2">
                     <span className="relative flex h-2 w-2">
                       <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                       <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                     </span>
                     <span className="text-xs font-medium text-slate-700">Database Connesso</span>
                 </div>
             </div>
          </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 h-full overflow-hidden flex flex-col relative">
        <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-white to-transparent pointer-events-none z-10"></div>
        
        <div className="flex-1 overflow-y-auto p-8 z-0 scroll-smooth">
            <div className="max-w-7xl mx-auto h-full">
                
                <header className="flex justify-between items-center mb-8">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900">
                            {currentView === 'scout' && 'Ricerca Opportunità'}
                            {currentView === 'inbox' && 'Messaggi & Trattative'}
                            {currentView === 'settings' && 'Impostazioni Sistema'}
                            {currentView === 'generator' && 'Studio Creativo AI'}
                        </h2>
                        <p className="text-slate-500 text-sm mt-1">
                            {currentView === 'scout' && 'Trova aziende locali senza sito web e genera lead qualificati.'}
                            {currentView === 'inbox' && 'Monitora le conversioni e i pagamenti.'}
                            {currentView === 'settings' && 'Configura le API di invio e i metodi di pagamento.'}
                            {currentView === 'generator' && `Progetto in corso per: ${selectedBusiness?.name}`}
                        </p>
                    </div>
                </header>

                {currentView === 'scout' && (
                    <LeadScout 
                        onSelectBusiness={handleBusinessSelect} 
                        onOpenEmail={setEmailModalBusiness}
                        leads={leads}
                        setLeads={handleLeadsFound}
                    />
                )}

                {currentView === 'generator' && selectedBusiness && (
                    <div className="h-[calc(100vh-140px)] flex flex-col">
                        <button onClick={() => setCurrentView('scout')} className="self-start mb-4 text-sm font-semibold text-slate-500 hover:text-blue-600 flex items-center transition-colors">
                            <ChevronRight className="w-4 h-4 rotate-180 mr-1" /> Torna alla lista
                        </button>
                        <SiteGenerator 
                            business={selectedBusiness} 
                            onBuy={() => setShowPayment(true)} 
                            onOpenEmail={setEmailModalBusiness}
                            onSiteGenerated={handleSiteGenerated}
                            publicUrl={config.publicUrl}
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
            </div>
        </div>
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
