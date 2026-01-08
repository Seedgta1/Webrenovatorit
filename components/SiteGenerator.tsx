
import React, { useEffect, useState, useRef } from 'react';
import { Business, SiteCreation, DesignPreferences, AIModelConfig } from '../types';
import { generateSitePreview, generateNanoImage, getChatbotResponse } from '../services/gemini';
import { 
  Smartphone, Monitor, Palette, Download, Share2, RefreshCw, Layers, 
  Cpu, Image as ImageIcon, Sparkles, MessageSquare, Wand2, MousePointer2, Mail, ExternalLink
} from 'lucide-react';

interface SiteGeneratorProps {
  business: Business;
  onBuy: () => void;
  onOpenEmail: (business: Business) => void;
  onSiteGenerated: (creation: SiteCreation) => void;
  publicUrl?: string;
  isReadOnly?: boolean;
}

export const SiteGenerator: React.FC<SiteGeneratorProps> = ({ business, onBuy, onOpenEmail, onSiteGenerated, publicUrl, isReadOnly }) => {
  const [siteData, setSiteData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [deviceView, setDeviceView] = useState<'desktop' | 'mobile'>('desktop');
  const [activeTab, setActiveTab] = useState<'design' | 'media'>('design');
  const [currentImages, setCurrentImages] = useState<Record<string, string>>({});
  const [isMobileScreen, setIsMobileScreen] = useState(false);
  
  const [aiConfig, setAiConfig] = useState<AIModelConfig>({
    textModel: 'gemini-3-flash-preview',
    imageModel: 'gemini-2.5-flash-image',
    useGoogleSearch: true
  });

  const [designPrefs, setDesignPrefs] = useState<DesignPreferences>({
    palette: 'luxury',
    fontPairing: 'inter-playfair',
    layoutType: 'liquid',
    gridDensity: 'relaxed'
  });

  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Detect screen size for responsive preview layout
  useEffect(() => {
      const checkScreen = () => setIsMobileScreen(window.innerWidth < 768);
      checkScreen();
      window.addEventListener('resize', checkScreen);
      return () => window.removeEventListener('resize', checkScreen);
  }, []);

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
        if (event.data?.type === 'CHAT_REQUEST') {
            const reply = await getChatbotResponse(event.data.message, { 
                businessName: business.name, 
                copy: siteData?.contentData 
            });
            iframeRef.current?.contentWindow?.postMessage({ type: 'CHAT_RESPONSE', message: reply }, '*');
        }
        if (event.data?.type === 'ELEMENT_CLICKED' && !isReadOnly) {
            setActiveTab('media');
        }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [siteData, business, isReadOnly]);

  const runFullGeneration = async (useCustomImages = false) => {
    setLoading(true);
    try {
        const data = await generateSitePreview(business, aiConfig, designPrefs, useCustomImages ? currentImages : undefined);
        setSiteData(data);
        if (!useCustomImages) setCurrentImages(data.images || {});
        
        onSiteGenerated({
            id: `site-${Date.now()}`,
            timestamp: Date.now(),
            html: data.html,
            copywriting: data.copywriting,
            versionLabel: '2026-Vision',
            brandData: data.brandData!,
            contentData: data.contentData!,
            designPreferences: designPrefs,
            sectionsOrder: [],
            images: data.images || {}
        });
    } catch (e) {
        console.error("Generation error:", e);
    } finally {
        setLoading(false);
    }
  };

  const updateSingleImage = async (key: string) => {
      setLoading(true);
      try {
          const keyword = key === 'logo' ? business.name : (siteData?.contentData?.heroHeadline || business.type);
          const newImg = await generateNanoImage(keyword, key === 'logo', aiConfig.imageModel);
          const updated = { ...currentImages, [key]: newImg };
          setCurrentImages(updated);
          const data = await generateSitePreview(business, aiConfig, designPrefs, updated);
          setSiteData(data);
          
          onSiteGenerated({
              id: `site-${Date.now()}`,
              timestamp: Date.now(),
              html: data.html,
              copywriting: data.copywriting,
              versionLabel: '2026-Vision',
              brandData: data.brandData!,
              contentData: data.contentData!,
              designPreferences: designPrefs,
              sectionsOrder: [],
              images: updated
          });
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
  };

  useEffect(() => {
    // AUTO RECOVERY: If in preview mode but no data (DB lag or race condition), regenerate immediately.
    if (business.creations && business.creations.length > 0) {
        const last = business.creations[business.creations.length - 1];
        setSiteData({
            html: last.html,
            copywriting: last.copywriting,
            brandData: last.brandData,
            contentData: last.contentData,
            images: last.images || {} 
        });
        setCurrentImages(last.images || {});
        setDesignPrefs(last.designPreferences || designPrefs);
    } else {
        // If no data exists, generate it! (Even in read only mode to prevent black screen)
        if (!siteData) runFullGeneration();
    }
  }, [business.id]);

  const safePublicUrl = (publicUrl && publicUrl.trim() !== '') ? publicUrl : window.location.origin;
  const previewLink = `${safePublicUrl.replace(/\/$/, '')}?preview=${business.id}`;

  // If in read-only mode on mobile, render just the iframe to maximize space
  if (isReadOnly && isMobileScreen) {
      if (loading || !siteData) return <div className="flex h-screen items-center justify-center bg-black text-white"><Sparkles className="animate-spin w-8 h-8 mr-2"/> Generazione Anteprima...</div>;
      return <iframe ref={iframeRef} srcDoc={siteData?.html} className="w-full h-screen border-none" />;
  }

  return (
    <div className={`flex h-full bg-[#0a0a0b] overflow-hidden text-white ${isReadOnly ? '' : '-m-8'}`}>
      {!isReadOnly && (
      <aside className="w-80 bg-[#141417] border-r border-white/5 flex flex-col z-20 shadow-2xl">
          <div className="p-8 border-b border-white/5">
              <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/30"><Cpu className="w-6 h-6"/></div>
                  <div>
                      <h2 className="font-black text-sm tracking-widest uppercase">AI Vision 2026</h2>
                      <p className="text-[10px] text-slate-500 font-bold tracking-widest">{aiConfig.textModel.split('-')[1].toUpperCase()} CORE</p>
                  </div>
              </div>
          </div>

          <div className="flex border-b border-white/5 bg-black/20">
              <button onClick={() => setActiveTab('design')} className={`flex-1 py-5 flex flex-col items-center gap-1 transition-all ${activeTab === 'design' ? 'text-blue-500 bg-blue-500/5' : 'text-slate-500'}`}><Palette className="w-5 h-5"/><span className="text-[9px] font-black uppercase tracking-widest">Estetica</span></button>
              <button onClick={() => setActiveTab('media')} className={`flex-1 py-5 flex flex-col items-center gap-1 transition-all ${activeTab === 'media' ? 'text-blue-500 bg-blue-500/5' : 'text-slate-500'}`}><ImageIcon className="w-5 h-5"/><span className="text-[9px] font-black uppercase tracking-widest">Media</span></button>
          </div>

          <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
              {activeTab === 'design' && (
                  <div className="space-y-8 animate-in fade-in duration-500">
                      <div className="space-y-4">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Intelligenza</label>
                          <select value={aiConfig.textModel} onChange={(e)=>setAiConfig({...aiConfig, textModel: e.target.value as any})} className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-xs font-black outline-none focus:border-blue-500 transition-colors">
                              <option value="gemini-3-flash-preview">Gemini 3 Flash (Fast)</option>
                              <option value="gemini-3-pro-preview">Gemini 3 Pro (Creative)</option>
                          </select>
                      </div>

                      <div className="space-y-4">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Stile Grafico</label>
                          <div className="grid grid-cols-2 gap-4">
                              {['luxury', 'modern', 'cyber', 'minimal'].map(p => (
                                  <button key={p} onClick={()=>setDesignPrefs({...designPrefs, palette: p as any})} className={`p-4 rounded-2xl border transition-all text-[10px] font-black ${designPrefs.palette === p ? 'border-blue-500 bg-blue-500/10 text-blue-500' : 'border-white/5 bg-white/5'}`}>
                                      {p.toUpperCase()}
                                  </button>
                              ))}
                          </div>
                      </div>

                      <button onClick={()=>runFullGeneration(true)} className="w-full bg-white text-black py-5 rounded-2xl font-black text-xs shadow-2xl flex items-center justify-center gap-3 hover:scale-105 transition-all">
                          <Wand2 className="w-5 h-5" /> Rigenera Vision
                      </button>
                  </div>
              )}

              {activeTab === 'media' && (
                  <div className="space-y-6 animate-in slide-in-from-right-4">
                      <div className="p-5 bg-blue-600/10 border border-blue-500/20 rounded-2xl flex items-start gap-3">
                          <MousePointer2 className="w-5 h-5 text-blue-500 mt-1" />
                          <p className="text-[10px] text-blue-300 leading-relaxed font-bold">Clicca le immagini nell'anteprima per rigenerarle con un nuovo prompt AI.</p>
                      </div>
                      <div className="space-y-4">
                          {Object.entries(currentImages).map(([key, url]) => (
                              <div key={key} className="relative group rounded-3xl overflow-hidden border border-white/5 shadow-xl">
                                  <img src={url} className="w-full h-40 object-cover transition-all group-hover:scale-110" />
                                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                                      <button onClick={()=>updateSingleImage(key)} className="p-4 bg-white text-black rounded-full shadow-2xl hover:scale-110 transition-transform"><RefreshCw className="w-6 h-6"/></button>
                                  </div>
                                  <span className="absolute bottom-3 left-3 bg-black/80 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">{key}</span>
                              </div>
                          ))}
                      </div>
                  </div>
              )}
          </div>
      </aside>
      )}

      <div className="flex-1 flex flex-col min-w-0 relative">
          <header className="h-24 bg-[#0a0a0b]/80 backdrop-blur-3xl border-b border-white/5 flex items-center justify-between px-4 md:px-10 z-30">
              <div className="flex items-center gap-4 md:gap-10">
                  <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-lg shadow-green-500/50"></div>
                      <span className="text-sm font-black tracking-tight truncate max-w-[150px] md:max-w-none">{business.name}</span>
                  </div>
                  {!isReadOnly && (
                      <div className="hidden md:flex bg-white/5 p-1.5 rounded-2xl">
                          <button onClick={() => setDeviceView('desktop')} className={`p-2.5 rounded-xl ${deviceView === 'desktop' ? 'bg-white/10 text-white shadow-xl' : 'text-slate-500'}`}><Monitor className="w-5 h-5"/></button>
                          <button onClick={() => setDeviceView('mobile')} className={`p-2.5 rounded-xl ${deviceView === 'mobile' ? 'bg-white/10 text-white shadow-xl' : 'text-slate-500'}`}><Smartphone className="w-5 h-5"/></button>
                      </div>
                  )}
              </div>

              <div className="flex items-center gap-3 md:gap-5">
                  <button onClick={() => {
                      navigator.clipboard.writeText(previewLink);
                      window.open(previewLink, '_blank');
                  }} className="px-4 py-3 border border-white/10 rounded-2xl text-xs font-black hover:bg-white/5 transition-all flex items-center gap-2">
                      <Share2 className="w-4 h-4" /> <span className="hidden md:inline">Preview Link</span>
                  </button>
                  
                  {!isReadOnly && (
                      <button onClick={() => onOpenEmail(business)} className="px-4 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs hover:bg-indigo-500 shadow-2xl shadow-indigo-600/20 flex items-center gap-2 transition-all">
                          <Mail className="w-4 h-4" /> <span className="hidden md:inline">Email</span>
                      </button>
                  )}

                  <button onClick={onBuy} className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-black text-xs hover:bg-blue-500 shadow-2xl shadow-blue-600/20 flex items-center gap-2 transition-all">
                      <Download className="w-4 h-4" /> <span className="hidden md:inline">{isReadOnly ? "Conferma" : "Pubblica"}</span>
                  </button>
              </div>
          </header>

          {/* RESPONSIVE CONTAINER: No heavy padding on ReadOnly/Mobile */}
          <main className={`flex-1 overflow-hidden flex justify-center items-start bg-[radial-gradient(circle_at_50%_0%,#141417,0,#0a0a0b_100%)] ${isReadOnly ? 'p-0 md:p-8' : 'p-8 md:p-16'}`}>
              {loading && (
                  <div className="absolute inset-0 bg-black/80 backdrop-blur-2xl z-[60] flex flex-col items-center justify-center animate-in fade-in duration-300">
                      <div className="w-20 h-20 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-8 shadow-2xl shadow-blue-600/40"></div>
                      <p className="font-black text-2xl tracking-tighter italic animate-pulse">VISION ARCHITECTING...</p>
                      <p className="text-slate-500 text-sm mt-3 font-bold tracking-widest uppercase">Generazione SPA Multi-Pagina + Chatbot AI</p>
                  </div>
              )}
              
              <div className={`transition-all duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)] shadow-[0_60px_120px_rgba(0,0,0,0.9)] overflow-hidden ${deviceView === 'mobile' ? 'w-[375px] h-[812px] rounded-[4rem] border-[16px] border-[#141417]' : (isReadOnly ? 'w-full h-full rounded-none md:rounded-[2rem]' : 'w-full h-full rounded-[3rem]')}`}>
                  <iframe ref={iframeRef} srcDoc={siteData?.html} className="w-full h-full border-none" />
              </div>
          </main>
      </div>
    </div>
  );
};
