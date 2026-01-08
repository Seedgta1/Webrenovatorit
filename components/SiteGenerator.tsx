
import React, { useEffect, useState, useRef } from 'react';
import { Business, GeneratedSite, SiteCreation, DesignPreferences, AIModelConfig } from '../types';
import { generateSitePreview, regenerateSectionContent, generateNanoImage, getChatbotResponse } from '../services/gemini';
import { 
  Smartphone, Monitor, Code, Edit3, Type, Palette, Save, Download, 
  AlertTriangle, Zap, Share2, MoveUp, MoveDown, Trash, RefreshCw, 
  Layers, Settings, Search, Cpu, Image as ImageIcon, Check, Wand2,
  Columns, Maximize, LayoutTemplate
} from 'lucide-react';

interface SiteGeneratorProps {
  business: Business;
  onBuy: () => void;
  onOpenEmail: (business: Business) => void;
  onSiteGenerated: (creation: SiteCreation) => void;
  publicUrl?: string;
}

export const SiteGenerator: React.FC<SiteGeneratorProps> = ({ business, onBuy, onOpenEmail, onSiteGenerated, publicUrl }) => {
  const [siteData, setSiteData] = useState<GeneratedSite | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deviceView, setDeviceView] = useState<'desktop' | 'mobile'>('desktop');
  const [linkCopied, setLinkCopied] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // --- CMS CONFIGURATION ---
  const [aiConfig, setAiConfig] = useState<AIModelConfig>({
    textModel: 'gemini-3-flash-preview',
    imageModel: 'gemini-2.5-flash-image',
    useGoogleSearch: true
  });

  const [designPrefs, setDesignPrefs] = useState<DesignPreferences>({
    palette: 'modern',
    fontPairing: 'inter-playfair',
    layoutType: 'liquid',
    gridDensity: 'relaxed'
  });

  const startGeneration = async () => {
    setLoading(true);
    setError(null);
    try {
        const data = await generateSitePreview(business, aiConfig, designPrefs);
        setSiteData(data);
        onSiteGenerated({
            id: `gen-${Date.now()}`,
            timestamp: Date.now(),
            html: data.html,
            copywriting: data.copywriting,
            versionLabel: `v${(business.creations?.length || 0) + 1}`,
            brandData: data.brandData,
            contentData: data.contentData,
            designPreferences: designPrefs
        });
    } catch (e: any) {
        setError(e.message || "Errore di generazione AI.");
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    if (business.creations?.length) {
        const last = business.creations[business.creations.length - 1];
        setSiteData({ html: last.html, copywriting: last.copywriting });
    } else {
        startGeneration();
    }
  }, [business.id]);

  const handleRegenSection = async (sectionName: string) => {
      if (!siteData) return;
      const newText = await regenerateSectionContent(business.name, sectionName, "", aiConfig);
      alert(`AI Suggerimento per ${sectionName}: "${newText}"`);
  };

  return (
    <div className="flex h-full gap-0 overflow-hidden bg-slate-100 -m-8">
      
      {/* SIDEBAR CMS CONTROLS */}
      <aside className={`w-80 bg-white border-r border-slate-200 flex flex-col h-full transition-all duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full absolute'}`}>
          <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm uppercase tracking-wider">
                  <Settings className="w-4 h-4 text-blue-600" /> Site Designer
              </h3>
              <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-1 hover:bg-slate-100 rounded">
                  <Trash className="w-4 h-4 text-slate-400" />
              </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-8">
              
              {/* AI MODEL SELECTOR */}
              <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Cpu className="w-3 h-3" /> AI Intelligence
                  </label>
                  <div className="space-y-3">
                      <select 
                        value={aiConfig.textModel} 
                        onChange={(e) => setAiConfig({...aiConfig, textModel: e.target.value as any})}
                        className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
                      >
                          <option value="gemini-3-flash-preview">Gemini 3 Flash (Veloce)</option>
                          <option value="gemini-3-pro-preview">Gemini 3 Pro (Creativo)</option>
                      </select>
                      <select 
                        value={aiConfig.imageModel} 
                        onChange={(e) => setAiConfig({...aiConfig, imageModel: e.target.value as any})}
                        className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
                      >
                          <option value="gemini-2.5-flash-image">Flash Image (Standard)</option>
                          <option value="gemini-3-pro-image-preview">Pro Image (HD Photoreal)</option>
                      </select>
                      <label className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl cursor-pointer border border-blue-100">
                          <input 
                            type="checkbox" 
                            checked={aiConfig.useGoogleSearch} 
                            onChange={(e) => setAiConfig({...aiConfig, useGoogleSearch: e.target.checked})}
                            className="w-4 h-4 rounded text-blue-600" 
                          />
                          <div>
                              <span className="text-xs font-bold text-blue-900 block">External Search Grounding</span>
                              <span className="text-[9px] text-blue-600 block leading-tight">Collega dati reali da Google Maps & Search</span>
                          </div>
                      </label>
                  </div>
              </div>

              {/* DESIGN SYSTEM */}
              <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Palette className="w-3 h-3" /> Visual Styling
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                      {['modern', 'luxury', 'bold', 'minimal'].map(p => (
                          <button 
                            key={p} 
                            onClick={() => setDesignPrefs({...designPrefs, palette: p as any})}
                            className={`p-2 rounded-lg text-[10px] font-bold border transition-all ${designPrefs.palette === p ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-blue-300'}`}
                          >
                              {p.toUpperCase()}
                          </button>
                      ))}
                  </div>
              </div>

              {/* TYPOGRAPHY */}
              <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Type className="w-3 h-3" /> Typography Pairs
                  </label>
                  <div className="space-y-2">
                      {[
                        { id: 'inter-playfair', label: 'Inter + Playfair (Elegant)' },
                        { id: 'montserrat-lato', label: 'Montserrat + Lato (Tech)' },
                        { id: 'fraunces-outfit', label: 'Fraunces + Outfit (Bold)' }
                      ].map(f => (
                          <button 
                            key={f.id} 
                            onClick={() => setDesignPrefs({...designPrefs, fontPairing: f.id as any})}
                            className={`w-full p-2.5 rounded-xl text-left text-xs border transition-all ${designPrefs.fontPairing === f.id ? 'bg-blue-50 border-blue-400 font-bold text-blue-700' : 'bg-white border-slate-200 text-slate-600'}`}
                          >
                              {f.label}
                          </button>
                      ))}
                  </div>
              </div>

              {/* LAYOUT ENGINE */}
              <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <LayoutTemplate className="w-3 h-3" /> Layout Engine
                  </label>
                  <div className="space-y-3">
                      <div className="flex bg-slate-100 p-1 rounded-xl">
                          <button 
                            onClick={() => setDesignPrefs({...designPrefs, layoutType: 'liquid'})}
                            className={`flex-1 py-1.5 rounded-lg text-[9px] font-bold flex items-center justify-center gap-1 ${designPrefs.layoutType === 'liquid' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}
                          >
                              <Maximize className="w-3 h-3" /> LIQUID
                          </button>
                          <button 
                            onClick={() => setDesignPrefs({...designPrefs, layoutType: 'boxed'})}
                            className={`flex-1 py-1.5 rounded-lg text-[9px] font-bold flex items-center justify-center gap-1 ${designPrefs.layoutType === 'boxed' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}
                          >
                              <Columns className="w-3 h-3" /> BOXED
                          </button>
                          <button 
                            onClick={() => setDesignPrefs({...designPrefs, layoutType: 'bento'})}
                            className={`flex-1 py-1.5 rounded-lg text-[9px] font-bold flex items-center justify-center gap-1 ${designPrefs.layoutType === 'bento' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}
                          >
                              <Layers className="w-3 h-3" /> BENTO
                          </button>
                      </div>
                  </div>
              </div>
          </div>

          <div className="p-5 border-t border-slate-100 bg-slate-50/50">
              <button 
                onClick={startGeneration}
                disabled={loading}
                className="w-full bg-slate-900 text-white py-3 rounded-2xl font-bold text-sm shadow-xl shadow-slate-200 hover:bg-black transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4 text-blue-400" />}
                  {loading ? 'Rigenerazione...' : 'Applica & Rigenera'}
              </button>
          </div>
      </aside>

      {/* MAIN VIEWPORT */}
      <div className="flex-1 flex flex-col min-w-0">
          <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-6 z-10 shadow-sm">
              <div className="flex items-center gap-4">
                  {!isSidebarOpen && (
                      <button onClick={() => setIsSidebarOpen(true)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500">
                          <Settings className="w-5 h-5" />
                      </button>
                  )}
                  <div className="h-6 w-px bg-slate-200"></div>
                  <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700 font-black text-xs">AI</div>
                      <span className="text-sm font-bold text-slate-800">{business.name}</span>
                  </div>
              </div>

              <div className="flex items-center gap-3">
                  <div className="flex bg-slate-100 p-1 rounded-xl">
                      <button onClick={() => setDeviceView('desktop')} className={`p-2 rounded-lg ${deviceView === 'desktop' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}><Monitor className="w-4 h-4"/></button>
                      <button onClick={() => setDeviceView('mobile')} className={`p-2 rounded-lg ${deviceView === 'mobile' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}><Smartphone className="w-4 h-4"/></button>
                  </div>
                  <button onClick={() => setLinkCopied(true)} className="p-2 hover:bg-slate-50 rounded-lg border border-slate-200 text-slate-600"><Share2 className="w-4 h-4"/></button>
                  <button onClick={onBuy} className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all">Pubblica Sito</button>
              </div>
          </header>

          <main className="flex-1 p-8 overflow-hidden bg-slate-100 flex justify-center items-start">
             {loading ? (
                 <div className="flex flex-col items-center justify-center h-full w-full animate-in fade-in zoom-in">
                     <div className="w-20 h-20 bg-white rounded-[2rem] shadow-2xl flex items-center justify-center mb-6 animate-bounce">
                         <Cpu className="w-10 h-10 text-blue-600" />
                     </div>
                     <h3 className="text-xl font-bold text-slate-800 mb-2">L'AI sta scolpendo il tuo sito...</h3>
                     <p className="text-slate-400 text-sm">Configurando {designPrefs.palette} palette e {designPrefs.layoutType} layout.</p>
                 </div>
             ) : error ? (
                 <div className="bg-white p-10 rounded-[3rem] shadow-2xl text-center max-w-md border border-red-50">
                     <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                     <h3 className="text-2xl font-bold text-slate-900 mb-2">Ops! Problema Tecnico</h3>
                     <p className="text-slate-500 mb-6">{error}</p>
                     <button onClick={startGeneration} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold">Riprova Generazione</button>
                 </div>
             ) : (
                <div className={`transition-all duration-700 h-full w-full max-w-7xl flex justify-center items-center`}>
                    <div className={`transition-all duration-700 bg-white shadow-[0_32px_128px_-32px_rgba(0,0,0,0.15)] overflow-hidden ${deviceView === 'mobile' ? 'w-[375px] h-[812px] rounded-[3rem] border-[12px] border-slate-900' : 'w-full h-full rounded-2xl border border-slate-200'}`}>
                        <iframe ref={iframeRef} srcDoc={siteData?.html} title="Preview" className="w-full h-full border-none" />
                    </div>
                </div>
             )}
          </main>
      </div>
    </div>
  );
};
