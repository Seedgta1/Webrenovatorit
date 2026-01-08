
import React, { useEffect, useState, useRef } from 'react';
import { Business, GeneratedSite, SiteCreation, AgentBrandOutput, AgentCopyOutput } from '../types';
import { agentReviews, agentUnifiedGenerator, generateNanoImage, generateSitePreview, getChatbotResponse } from '../services/gemini';
import { Smartphone, Monitor, Code, Edit3, Type, Palette, Save, Download, Eye, Send, AlertTriangle, BrainCircuit, History, Plus, Clock, Briefcase, PenTool, Image as ImageIcon, Terminal, CheckCircle2, Layers, Layout, Bot, ExternalLink, Search, Star, Zap } from 'lucide-react';

interface SiteGeneratorProps {
  business: Business;
  onBuy: () => void;
  onOpenEmail: (business: Business) => void;
  onSiteGenerated: (creation: SiteCreation) => void;
}

export const SiteGenerator: React.FC<SiteGeneratorProps> = ({ business, onBuy, onOpenEmail, onSiteGenerated }) => {
  const [siteData, setSiteData] = useState<GeneratedSite | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Real-time Agent State
  const [currentStep, setCurrentStep] = useState(0);
  const [logs, setLogs] = useState<{agent: string, msg: string, data?: any}[]>([]);
  
  // Editor State
  const [isEditMode, setIsEditMode] = useState(false);
  const [deviceView, setDeviceView] = useState<'desktop' | 'mobile'>('desktop');
  
  // Dati intermedi per l'editor
  const [brandData, setBrandData] = useState<AgentBrandOutput | null>(null);
  
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Inietta CSS e Script per Chat e EditMode
  const injectScripts = (html: string) => {
    const editorScript = `
        <script>
        const style = document.createElement('style');
        style.innerHTML = \`
            .chat-visuals { display: flex; gap: 10px; overflow-x: auto; padding: 10px 0; scrollbar-width: none; }
            .chat-visuals::-webkit-scrollbar { display: none; }
            .visual-card { 
                min-width: 140px; width: 140px; 
                background: rgba(255,255,255,0.8); backdrop-filter: blur(8px);
                border-radius: 16px; overflow: hidden; 
                box-shadow: 0 4px 15px rgba(0,0,0,0.05); 
                border: 1px solid rgba(255,255,255,0.5);
                display: flex; flex-direction: column; cursor: pointer;
            }
            .visual-card:hover { transform: translateY(-4px); }
            .visual-card img { width: 100%; height: 90px; object-fit: cover; }
            .visual-card span { padding: 8px; font-size: 10px; font-weight: 700; text-align: center; font-family: 'Plus Jakarta Sans', sans-serif; }
            .ai-msg {
                background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(12px);
                color: #0f172a; padding: 14px 18px; 
                border-radius: 18px 18px 18px 4px;
                max-width: 85%; margin-bottom: 12px; font-size: 14px; line-height: 1.5;
                box-shadow: 0 4px 20px rgba(0,0,0,0.04);
                border: 1px solid rgba(255,255,255,0.8);
                font-family: 'Plus Jakarta Sans', sans-serif;
            }
        \`;
        document.head.appendChild(style);

        window.addEventListener('message', (event) => {
            const data = event.data;
            if (data.type === 'UPDATE_STYLE') {
            const root = document.documentElement;
            if(data.primary) root.style.setProperty('--primary', data.primary);
            if(data.secondary) root.style.setProperty('--secondary', data.secondary);
            if(data.fontHeading) root.style.setProperty('--font-heading', data.fontHeading);
            if(data.fontBody) root.style.setProperty('--font-body', data.fontBody);
            }
            if (data.type === 'TOGGLE_EDIT') {
            document.body.contentEditable = data.enabled;
            document.querySelectorAll('a').forEach(el => el.style.pointerEvents = data.enabled ? 'none' : 'auto');
            if (data.enabled) {
                document.body.classList.add('editing-active');
                const style = document.createElement('style');
                style.id = 'editor-styles';
                style.innerHTML = \`.editing-active [contenteditable] { outline: 2px dashed #3b82f6; cursor: text; } .editing-active [contenteditable]:focus { outline: 2px solid #2563eb; background: rgba(59,130,246,0.05); }\`;
                document.head.appendChild(style);
            } else {
                document.body.classList.remove('editing-active');
                const s = document.getElementById('editor-styles');
                if(s) s.remove();
            }
            }
            if (data.type === 'GET_HTML') {
            window.parent.postMessage({ type: 'SAVE_HTML', html: document.documentElement.outerHTML }, '*');
            }
            if (data.type === 'AI_REPLY') {
                const chatContainer = document.getElementById('chat-messages') || document.querySelector('.chat-messages');
                if (chatContainer) {
                    const msgDiv = document.createElement('div');
                    msgDiv.style.alignSelf = 'flex-start';
                    msgDiv.style.width = '100%';
                    let content = \`<div class="ai-msg">\${data.text}</div>\`;
                    if (data.visual_elements && data.visual_elements.length > 0) {
                        content += \`<div class="chat-visuals">\`;
                        data.visual_elements.forEach(el => {
                            if (el.type === 'image') {
                                const safeKeyword = encodeURIComponent(el.keyword);
                                const imgSrc = \`https://image.pollinations.ai/prompt/\${safeKeyword}?width=280&height=180&nologo=true\`;
                                content += \`<div class="visual-card"><img src="\${imgSrc}" loading="lazy" alt="\${el.caption}" /><span>\${el.caption}</span></div>\`;
                            }
                        });
                        content += \`</div>\`;
                    }
                    msgDiv.innerHTML = content;
                    chatContainer.appendChild(msgDiv);
                    chatContainer.scrollTop = chatContainer.scrollHeight;
                }
            }
        });
        </script>
    `;
    return html.replace('</body>', `${editorScript}</body>`);
  };

  const addLog = (agent: string, msg: string, data?: any) => {
    setLogs(prev => [...prev, { agent, msg, data }]);
  };

  const startGeneration = async () => {
    setLoading(true);
    setError(null);
    setLogs([]);
    setSiteData(null);
    setCurrentStep(1);

    try {
        // STEP 1: REPUTATION
        addLog('Reputation Agent', 'Scansione recensioni reali e contesto...');
        const reviews = await agentReviews(business);
        addLog('Reputation Agent', `Analizzate ${reviews.reviews.length} recensioni. Rating: ${reviews.summary}`);
        setCurrentStep(2);

        // STEP 2: UNIFIED ARCHITECT (Generazione massiva)
        addLog('Unified Architect', 'Generazione Brand, Copy, UX e Codice in corso...');
        // Qui usiamo l'agente unificato per ottenere i dati strutturati per i log e la UI, 
        // anche se generateSitePreview lo richiama internamente. 
        // Per efficienza, chiamiamo direttamente i servizi separati qui nel frontend controller per aggiornare la UI passo-passo
        // MA per stabilità, riusiamo la funzione generateSitePreview che orchestra tutto.
        // Simuliamo i log intermedi per UX.
        
        const unifiedData = await agentUnifiedGenerator(business, reviews);
        
        setBrandData(unifiedData.brand);
        addLog('Unified Architect', `Brand Identity definita: ${unifiedData.brand.vibe}`);
        addLog('Unified Architect', `Copywriting AIDA completato.`);
        setCurrentStep(3);

        // STEP 3: VISUAL ASSETS
        addLog('Visual Engine', 'Generazione asset grafici (Logo, Hero, Gallery)...');
        
        const imgPromises = [
            generateNanoImage(unifiedData.visuals.logoPrompt),
            generateNanoImage(unifiedData.visuals.heroImagePrompt),
            generateNanoImage(unifiedData.visuals.galleryPrompts[0] || "modern interior")
        ];
        const [logoBase64, heroBase64, gallery0] = await Promise.all(imgPromises);
        
        // Sequenziale per il resto per non sovraccaricare
        let gallery1 = gallery0;
        if (unifiedData.visuals.galleryPrompts[1]) {
             gallery1 = await generateNanoImage(unifiedData.visuals.galleryPrompts[1]);
        }
        
        addLog('Visual Engine', 'Asset generati con successo.');
        setCurrentStep(4);

        // STEP 4: ASSEMBLY
        let finalHtml = unifiedData.html;
        finalHtml = finalHtml.replace("[[LOGO_IMG]]", logoBase64);
        finalHtml = finalHtml.replace("[[HERO_IMG]]", heroBase64);
        finalHtml = finalHtml.replace("[[GALLERY_0]]", gallery0);
        finalHtml = finalHtml.replace("[[GALLERY_1]]", gallery1);
        finalHtml = finalHtml.replace("[[GALLERY_2]]", gallery0); // Fallback safe

        addLog('System', 'Deploy completato.');

        const enrichedHtml = injectScripts(finalHtml);
        const finalData = { html: enrichedHtml, copywriting: unifiedData.copy.heroHeadline };
        
        setSiteData(finalData);
        setLoading(false);

        onSiteGenerated({
            id: `gen-${Date.now()}`,
            timestamp: Date.now(),
            html: enrichedHtml,
            copywriting: unifiedData.copy.heroHeadline,
            versionLabel: `Versione ${(business.creations?.length || 0) + 1}`,
            brandData: unifiedData.brand,
            contentData: unifiedData.copy
        });

    } catch (error: any) {
        if (JSON.stringify(error).includes("429")) {
             setError("Server AI momentaneamente occupato. Riprova tra pochi secondi.");
        } else {
             setError(error.message || "Errore sconosciuto.");
        }
        setLoading(false);
    }
  };

  // LOAD EXISTING OR GENERATE NEW
  useEffect(() => {
    if (business.creations && business.creations.length > 0) {
        const lastCreation = business.creations[business.creations.length - 1];
        setSiteData({ html: lastCreation.html, copywriting: lastCreation.copywriting });
        if (lastCreation.brandData) setBrandData(lastCreation.brandData);
        setLoading(false);
    } else {
        startGeneration();
    }
  }, [business.id]);

  const loadCreation = (creation: SiteCreation) => {
      setSiteData({ html: creation.html, copywriting: creation.copywriting });
      if (creation.brandData) setBrandData(creation.brandData);
  };

  const openPreviewInTab = (html: string) => {
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  // ... Messaggi, Edit, Download Logic ...
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.data.type === 'SAVE_HTML') {
          const blob = new Blob([event.data.html], { type: 'text/html' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${business.name.replace(/\s+/g, '-').toLowerCase()}-website.html`;
          a.click();
          URL.revokeObjectURL(url);
      }
      if (event.data.type === 'CHAT_MSG' && siteData) {
        const userText = event.data.text;
        try {
          const aiReply = await getChatbotResponse(business, userText);
          const parsedReply = JSON.parse(aiReply);
          iframeRef.current?.contentWindow?.postMessage({ type: 'AI_REPLY', ...parsedReply }, '*');
        } catch (e) { console.error("Chat error:", e); }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [siteData, business]);

  useEffect(() => {
      if(iframeRef.current?.contentWindow && brandData) {
          iframeRef.current.contentWindow.postMessage({ 
              type: 'UPDATE_STYLE', 
              primary: brandData.primaryColor, 
              secondary: brandData.secondaryColor, 
              fontHeading: brandData.fontHeading, 
              fontBody: brandData.fontBody 
          }, '*');
      }
  }, [brandData]);

  const toggleEditMode = () => {
      const newState = !isEditMode;
      setIsEditMode(newState);
      iframeRef.current?.contentWindow?.postMessage({ type: 'TOGGLE_EDIT', enabled: newState }, '*');
  };

  const handleDownload = () => {
      iframeRef.current?.contentWindow?.postMessage({ type: 'GET_HTML' }, '*');
  };

  if (loading) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center min-h-[600px] bg-slate-950 rounded-3xl shadow-2xl border border-slate-800 p-8 relative overflow-hidden">
        {/* Background Animation */}
        <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-[radial-gradient(circle_at_center,_rgba(99,102,241,0.05),_transparent_60%)] animate-[spin_60s_linear_infinite]"></div>
        </div>

        <div className="relative z-10 w-full max-w-2xl flex flex-col items-center">
            
            <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 bg-slate-900 rounded-2xl border border-slate-700 flex items-center justify-center shadow-[0_0_30px_rgba(99,102,241,0.2)]">
                    <Zap className="w-8 h-8 text-yellow-400 animate-pulse" />
                </div>
                <div>
                    <h3 className="text-2xl font-bold text-white tracking-tight">AI Agency Flash</h3>
                    <p className="text-slate-400 text-sm">Unified Generation Protocol v3.0</p>
                </div>
            </div>

            {/* LIVE AGENT LOGS */}
            <div className="w-full bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 p-6 shadow-2xl overflow-hidden min-h-[250px] flex flex-col">
                <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-2">
                    <span className="text-xs font-mono text-slate-500 uppercase tracking-widest">Fast Logs</span>
                    <div className="flex gap-1">
                        <div className="w-2 h-2 rounded-full bg-red-500/20"></div>
                        <div className="w-2 h-2 rounded-full bg-amber-500/20"></div>
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    </div>
                </div>
                
                <div className="space-y-4 flex-grow font-mono text-sm overflow-y-auto max-h-[200px] pr-2 scrollbar-hide">
                    {logs.map((log, idx) => (
                        <div key={idx} className="animate-in slide-in-from-left-4 fade-in duration-300">
                            <div className="flex items-center gap-2 mb-1">
                                <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold ${
                                    log.agent.includes('Reputation') ? 'bg-orange-900/30 text-orange-400' :
                                    log.agent.includes('Unified') ? 'bg-purple-900/30 text-purple-400' :
                                    log.agent.includes('Visual') ? 'bg-pink-900/30 text-pink-400' :
                                    'bg-green-900/30 text-green-400'
                                }`}>
                                    {log.agent}
                                </span>
                                <span className="text-slate-300">{log.msg}</span>
                            </div>
                        </div>
                    ))}
                    <div className="flex items-center gap-2 animate-pulse text-slate-500">
                        <Terminal className="w-3 h-3" />
                        <span>_</span>
                    </div>
                </div>
            </div>

            {/* Steps Indicator (Reduced to 4) */}
            <div className="flex justify-between w-full mt-6 px-4">
                {[1, 2, 3, 4].map((step) => (
                    <div key={step} className="flex flex-col items-center gap-2">
                        <div className={`w-3 h-3 rounded-full transition-all duration-500 ${currentStep >= step ? 'bg-yellow-400 shadow-[0_0_15px_#facc15]' : 'bg-slate-800'}`}></div>
                    </div>
                ))}
            </div>
            <div className="text-xs text-slate-500 mt-2 font-mono uppercase tracking-wider">Flash Process: Step {currentStep}/4</div>

        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center min-h-[500px] bg-white rounded-3xl shadow-lg border border-red-100 p-8">
          <div className="bg-red-50 p-4 rounded-full mb-4">
              <AlertTriangle className="w-10 h-10 text-red-500" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">Generazione Interrotta</h3>
          <p className="text-slate-500 text-center max-w-md mb-6">{error}</p>
          <button 
            onClick={startGeneration} 
            className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-black transition-all"
          >
              Riprova
          </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-5">
      {/* Top Action Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-lg border border-slate-100 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl text-white shadow-md shadow-indigo-500/20">
              <Code className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-slate-800 text-sm leading-tight">{business.name}</h2>
            <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">Live Preview</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
               <button onClick={() => setDeviceView('desktop')} className={`p-2 rounded-lg transition-all duration-200 ${deviceView === 'desktop' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}><Monitor className="w-4 h-4"/></button>
               <button onClick={() => setDeviceView('mobile')} className={`p-2 rounded-lg transition-all duration-200 ${deviceView === 'mobile' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}><Smartphone className="w-4 h-4"/></button>
            </div>
            <div className="h-8 w-px bg-slate-200"></div>
            <div className="flex items-center gap-2">
               <button onClick={toggleEditMode} className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all border ${isEditMode ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
                    {isEditMode ? <><Eye className="w-4 h-4" /> Anteprima</> : <><Edit3 className="w-4 h-4" /> Modifica</>}
               </button>
               <button onClick={handleDownload} className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition-colors" title="Scarica HTML">
                 <Download className="w-4 h-4" />
               </button>
               <button onClick={() => onOpenEmail(business)} className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-500/20 flex items-center gap-2 transition-all transform hover:-translate-y-0.5">
                 <Send className="w-4 h-4" /> Invia Proposta
               </button>
               <button onClick={onBuy} className="px-5 py-2.5 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-900 border border-slate-700 transition-all">
                 Vendi (299€)
               </button>
            </div>
        </div>
      </div>

      <div className="flex gap-6 h-full min-h-0">
          <div className={`transition-all duration-500 flex-grow relative bg-slate-200/50 shadow-inner flex flex-col items-center justify-start overflow-hidden ${deviceView === 'mobile' ? 'py-8 rounded-3xl' : 'rounded-2xl border border-slate-200'}`}>
            <div className={`transition-all duration-500 bg-white shadow-2xl overflow-hidden relative ${deviceView === 'mobile' ? 'w-[375px] h-[812px] rounded-[3rem] border-[12px] border-slate-800 ring-4 ring-slate-900/10' : 'w-full h-full'}`}>
                {deviceView === 'desktop' && (
                    <div className="bg-slate-50 border-b border-slate-200 p-3 flex items-center gap-3">
                        <div className="flex gap-1.5 ml-1"><div className="w-2.5 h-2.5 rounded-full bg-red-400 border border-red-500/50"></div><div className="w-2.5 h-2.5 rounded-full bg-amber-400 border border-amber-500/50"></div><div className="w-2.5 h-2.5 rounded-full bg-green-400 border border-green-500/50"></div></div>
                        <div className="flex-grow max-w-2xl bg-white border border-slate-200 rounded-md py-1.5 px-3 text-[11px] text-slate-500 flex items-center gap-2 shadow-sm">
                            <Layers className="w-3 h-3 text-blue-500" /> 
                            <span className="font-mono">https://preview.webrenovator.it/v/{business.id}</span>
                        </div>
                    </div>
                )}
                <iframe ref={iframeRef} srcDoc={siteData?.html} title="Preview" className="w-full h-full border-none bg-white" sandbox="allow-scripts allow-forms allow-same-origin allow-modals allow-popups" />
            </div>
          </div>

          {/* RIGHT SIDEBAR: Editor OR History */}
          <div className="w-80 flex flex-col gap-4 h-full">
            
            {/* 1. Time Machine / History Card */}
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden flex-shrink-0">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2 text-xs uppercase tracking-wider"><History className="w-4 h-4 text-purple-600"/> Version History</h3>
                    <span className="text-[10px] bg-slate-200 px-2 py-0.5 rounded-full font-bold text-slate-600">{business.creations?.length || 0}/3</span>
                </div>
                <div className="p-3 space-y-2">
                    {business.creations?.map((creation, idx) => (
                        <div key={creation.id} className="w-full flex items-center gap-2">
                            <button 
                                onClick={() => loadCreation(creation)}
                                className="flex-grow flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-purple-200 hover:bg-purple-50 transition-all group text-left"
                            >
                                <div>
                                    <div className="font-bold text-slate-700 text-xs">{creation.versionLabel || `Draft ${idx + 1}`}</div>
                                    <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5"><Clock className="w-3 h-3"/> {new Date(creation.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                                </div>
                                <div className="w-2 h-2 rounded-full bg-purple-400 opacity-0 group-hover:opacity-100"></div>
                            </button>
                            <button 
                                onClick={() => openPreviewInTab(creation.html)}
                                className="p-3 bg-white border border-slate-100 rounded-xl hover:bg-blue-50 hover:text-blue-600 hover:border-blue-100 transition-all text-slate-400"
                                title="Apri in nuova scheda"
                            >
                                <ExternalLink className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                    <button 
                        onClick={startGeneration}
                        className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-500 text-xs font-bold hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
                    >
                        <Plus className="w-4 h-4" /> Genera Nuova Versione
                    </button>
                </div>
            </div>

            {/* 2. Visual Editor (Only in edit mode) */}
            {isEditMode && brandData && (
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 flex flex-col overflow-hidden animate-in slide-in-from-right-10 duration-300 flex-grow">
                  <div className="p-4 border-b border-slate-100 bg-slate-50/50 backdrop-blur-sm">
                      <h3 className="font-bold text-slate-800 flex items-center gap-2"><Edit3 className="w-4 h-4 text-blue-600"/> Visual Editor</h3>
                  </div>
                  <div className="flex-grow overflow-y-auto p-5 space-y-8">
                      <div className="space-y-4">
                          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2"><Palette className="w-3 h-3"/> Colori Brand</h4>
                          <div className="space-y-3">
                              <div>
                                  <label className="text-xs font-medium text-slate-600 mb-1 block">Primario</label>
                                  <div className="flex items-center gap-2">
                                      <input type="color" value={brandData.primaryColor} onChange={(e) => setBrandData({...brandData, primaryColor: e.target.value})} className="w-9 h-9 rounded-lg cursor-pointer border border-slate-200 p-0.5 shadow-sm" />
                                      <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-1.5 rounded-md border border-slate-200">{brandData.primaryColor}</span>
                                  </div>
                              </div>
                              <div>
                                  <label className="text-xs font-medium text-slate-600 mb-1 block">Secondario</label>
                                  <div className="flex items-center gap-2">
                                      <input type="color" value={brandData.secondaryColor} onChange={(e) => setBrandData({...brandData, secondaryColor: e.target.value})} className="w-9 h-9 rounded-lg cursor-pointer border border-slate-200 p-0.5 shadow-sm" />
                                      <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-1.5 rounded-md border border-slate-200">{brandData.secondaryColor}</span>
                                  </div>
                              </div>
                          </div>
                      </div>
                      <div className="space-y-4">
                          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2"><Type className="w-3 h-3"/> Tipografia</h4>
                          <div className="space-y-3">
                              <div>
                                  <label className="text-xs font-medium text-slate-600 mb-1 block">Titoli (H1, H2)</label>
                                  <div className="relative">
                                      <select value={brandData.fontHeading} onChange={(e) => setBrandData({...brandData, fontHeading: e.target.value})} className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 appearance-none">
                                          <option value="'Outfit', sans-serif">Outfit</option>
                                          <option value="'Playfair Display', serif">Playfair Display</option>
                                          <option value="'Space Grotesk', sans-serif">Space Grotesk</option>
                                          <option value="'Inter', sans-serif">Inter</option>
                                      </select>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>
                  <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                      <button onClick={handleDownload} className="w-full py-3 bg-slate-900 text-white text-xs font-bold rounded-xl shadow-lg shadow-slate-900/10 hover:bg-black transition-all flex items-center justify-center gap-2">
                          <Save className="w-4 h-4" /> Salva Definitivo
                      </button>
                  </div>
                </div>
            )}
          </div>
      </div>
    </div>
  );
};
