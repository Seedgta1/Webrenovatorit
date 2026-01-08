
import React, { useState, useEffect } from 'react';
import { LeadScout } from './components/LeadScout';
import { SiteGenerator } from './components/SiteGenerator';
import { PaymentModal } from './components/PaymentModal';
import { EmailModal } from './components/EmailModal';
import { Inbox } from './components/Inbox';
import { Settings } from './components/Settings';
import { Business, Message, AppConfig, SiteCreation } from './types';
import { Globe, ChevronRight, Settings as SettingsIcon, Sparkles, Inbox as InboxIcon, Users, Menu, X, Database, LayoutDashboard, Zap, LogOut } from 'lucide-react';
import { simulateBusinessReply } from './services/gemini';
import { dbService } from './services/database';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'scout' | 'generator' | 'inbox' | 'settings'>('scout');
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [emailModalBusiness, setEmailModalBusiness] = useState<Business | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [leads, setLeads] = useState<Business[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);

  const [config, setConfig] = useState<AppConfig>(() => {
    try {
      const saved = localStorage.getItem('wr_config');
      const parsed = saved ? JSON.parse(saved) : {};
      return {
        resendApiKey: parsed.resendApiKey || '',
        senderEmail: parsed.senderEmail || '',
        senderName: parsed.senderName || 'Studio Creativo',
        stripeSecretKey: parsed.stripeSecretKey || '',
        stripePublishableKey: parsed.stripePublishableKey || '',
        publicUrl: parsed.publicUrl || (typeof window !== 'undefined' ? window.location.origin : '')
      };
    } catch {
      return {
        resendApiKey: '',
        senderEmail: '',
        senderName: 'Studio Creativo',
        stripeSecretKey: '',
        stripePublishableKey: '',
        publicUrl: typeof window !== 'undefined' ? window.location.origin : ''
      };
    }
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const previewId = params.get('preview');

    if (previewId) {
        setIsPreviewMode(true);
        setIsPreviewLoading(true);
        const fetchPreview = async () => {
            let business = await dbService.getLeadById(previewId);
            if (!business) {
                try {
                    const local = localStorage.getItem(`wr_preview_${previewId}`);
                    if (local) business = JSON.parse(local);
                } catch(e) {}
            }
            if (business) setSelectedBusiness(business);
            setIsPreviewLoading(false);
        };
        fetchPreview();
    } else {
        const loadData = async () => {
            try {
                const dbLeads = await dbService.getLeads();
                setLeads(dbLeads);
                const dbMsgs = await dbService.getMessages();
                setMessages(dbMsgs);
            } catch (e) { console.error(e); }
        };
        loadData();
    }
  }, []);

  useEffect(() => localStorage.setItem('wr_config', JSON.stringify(config)), [config]);

  const handleBusinessSelect = (business: Business) => {
    setSelectedBusiness(business);
    setCurrentView('generator');
    setIsSidebarOpen(false);
  };

  const handleSiteGenerated = async (creation: SiteCreation) => {
    if (!selectedBusiness) return;
    const updatedLeads = leads.map(l => {
        if (l.id === selectedBusiness.id) {
            const currentCreations = l.creations || [];
            const newCreations = [...currentCreations, creation];
            if (newCreations.length > 3) newCreations.shift();
            return { ...l, creations: newCreations };
        }
        return l;
    });
    setLeads(updatedLeads);

    const updatedBusiness = updatedLeads.find(l => l.id === selectedBusiness.id);
    if (updatedBusiness) {
        setSelectedBusiness(updatedBusiness);
        if (updatedBusiness.creations) {
            await dbService.saveCreations(updatedBusiness.id, updatedBusiness.creations);
        }
        localStorage.setItem(`wr_preview_${updatedBusiness.id}`, JSON.stringify(updatedBusiness));
    }
  };

  const handleEmailSent = async (business: Business) => {
    const updatedLeads = leads.map(l => l.id === business.id ? { ...l, leadStatus: 'CONTACTED' as const } : l);
    setLeads(updatedLeads);
    await dbService.updateLeadStatus(business.id, 'CONTACTED');
    
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
        } catch (e) { console.error(e); }
    }, 15000);
  };

  const NavItem = ({ view, icon: Icon, label, count }: { view: typeof currentView, icon: any, label: string, count?: number }) => (
      <button 
        onClick={() => {
            setCurrentView(view);
            setIsSidebarOpen(false);
        }}
        className={`w-full flex items-center gap-4 px-6 py-4 rounded-3xl transition-all duration-300 group ${
            currentView === view 
            ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/30' 
            : 'text-slate-500 hover:bg-slate-100'
        }`}
      >
        <Icon className={`w-5 h-5 ${currentView === view ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'}`} />
        <span className="font-bold text-[11px] uppercase tracking-[0.2em]">{label}</span>
        {count !== undefined && count > 0 && (
            <span className={`ml-auto text-[10px] font-black px-2 py-0.5 rounded-full ${
                currentView === view ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-600'
            }`}>
                {count}
            </span>
        )}
      </button>
  );

  if (isPreviewMode) {
      if (isPreviewLoading) return <div className="min-h-screen flex items-center justify-center bg-white text-slate-400 font-bold tracking-widest uppercase">Digitalizing Vision...</div>;
      if (!selectedBusiness) return <div className="min-h-screen flex items-center justify-center bg-white text-slate-500">Impossibile caricare il progetto.</div>;

      return (
          <div className="min-h-screen bg-white flex flex-col">
              <div className="bg-white/80 backdrop-blur-md p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 z-50">
                  <div className="font-bold text-xs uppercase tracking-widest flex items-center gap-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      Proposta Esclusiva: <span className="text-indigo-600">{selectedBusiness.name}</span>
                  </div>
                  <div className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Sola Lettura</div>
              </div>
              <div className="flex-1">
                  <SiteGenerator business={selectedBusiness} onBuy={() => alert("Per confermare, rispondi all'email.")} onOpenEmail={() => {}} onSiteGenerated={() => {}} publicUrl={config.publicUrl} isReadOnly={true} />
              </div>
          </div>
      );
  }

  return (
    <div className="flex h-screen bg-[#FDFDFD] selection:bg-indigo-100 overflow-hidden font-sans relative">
      
      {/* SIDEBAR OVERLAY */}
      {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 transition-opacity duration-500"
            onClick={() => setIsSidebarOpen(false)}
          />
      )}

      {/* DRAWER SIDEBAR */}
      <aside className={`fixed top-0 left-0 bottom-0 w-80 bg-white border-r border-slate-100 flex flex-col z-50 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] shadow-2xl ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="p-10 flex flex-col h-full">
            <div className="flex items-center justify-between mb-16">
                <div className="flex items-center gap-4">
                    <div className="bg-black p-3 rounded-2xl text-white shadow-2xl">
                        <Globe className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="font-black text-sm tracking-tighter uppercase">Agency OS</h1>
                        <span className="text-[9px] font-bold text-indigo-500 tracking-[0.2em] uppercase">Vision 2026</span>
                    </div>
                </div>
                <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <X className="w-5 h-5 text-slate-400" />
                </button>
            </div>
            
            <nav className="space-y-4">
                <NavItem view="scout" icon={Users} label="Discovery" />
                <NavItem view="inbox" icon={InboxIcon} label="Conversazioni" count={messages.length} />
                <NavItem view="settings" icon={SettingsIcon} label="Configurazione" />
            </nav>

            <div className="mt-auto pt-8 border-t border-slate-50">
                <div className="flex items-center gap-3 bg-slate-50 p-6 rounded-[2rem]">
                    <div className="w-2.5 h-2.5 bg-green-500 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Sistemi Attivi</span>
                </div>
            </div>
          </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 h-full flex flex-col relative overflow-hidden">
        
        {/* HEADER CON HAMBURGER */}
        <header className="px-12 py-8 flex items-center justify-between bg-white/50 backdrop-blur-xl border-b border-slate-50 sticky top-0 z-30">
            <div className="flex items-center gap-8">
                <button 
                    onClick={() => setIsSidebarOpen(true)}
                    className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-xl hover:scale-105 active:scale-95 transition-all text-slate-600 group"
                >
                    <Menu className="w-6 h-6 group-hover:text-indigo-600 transition-colors" />
                </button>
                <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase flex items-center gap-3">
                        {currentView === 'scout' && <><Users className="w-6 h-6 text-indigo-600" /> Discovery Engine</>}
                        {currentView === 'inbox' && <><InboxIcon className="w-6 h-6 text-indigo-600" /> Conversazioni</>}
                        {currentView === 'settings' && <><SettingsIcon className="w-6 h-6 text-indigo-600" /> Asset & API</>}
                        {currentView === 'generator' && <><Sparkles className="w-6 h-6 text-indigo-600" /> Design Studio AI</>}
                    </h2>
                </div>
            </div>

            <div className="hidden md:flex items-center gap-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <span>V. 3.4.0</span>
                <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                <span className="text-indigo-500">PRO MODE</span>
            </div>
        </header>

        <div className="flex-1 overflow-y-auto p-12 z-0">
            <div className="max-w-7xl mx-auto h-full animate-in fade-in slide-in-from-bottom-4 duration-700">
                {currentView === 'scout' && (
                    <LeadScout onSelectBusiness={handleBusinessSelect} onOpenEmail={setEmailModalBusiness} leads={leads} setLeads={(ls: any) => { setLeads(prev => [...ls, ...prev]); dbService.addLeads(ls); }} />
                )}

                {currentView === 'generator' && selectedBusiness && (
                    <div className="h-[calc(100vh-220px)]">
                        <button onClick={() => setCurrentView('scout')} className="mb-8 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-indigo-600 flex items-center transition-all group">
                            <ChevronRight className="w-4 h-4 rotate-180 mr-3 group-hover:-translate-x-1 transition-transform" /> Torna alla Discovery
                        </button>
                        <SiteGenerator business={selectedBusiness} onBuy={() => setShowPayment(true)} onOpenEmail={setEmailModalBusiness} onSiteGenerated={handleSiteGenerated} publicUrl={config.publicUrl} />
                    </div>
                )}

                {currentView === 'inbox' && (
                    <Inbox messages={messages} leads={leads} onContactWhatsApp={(bId) => {
                        const b = leads.find(l => l.id === bId);
                        if (b) window.open(`https://wa.me/${b.phoneNumber?.replace(/\D/g,'')}`, '_blank');
                    }} />
                )}

                {currentView === 'settings' && <Settings config={config} setConfig={setConfig} />}
            </div>
        </div>
      </main>

      {showPayment && <PaymentModal business={selectedBusiness} onClose={() => setShowPayment(false)} />}
      {emailModalBusiness && <EmailModal business={emailModalBusiness} onClose={() => setEmailModalBusiness(null)} onSent={() => handleEmailSent(emailModalBusiness)} config={config} />}
    </div>
  );
};

export default App;
