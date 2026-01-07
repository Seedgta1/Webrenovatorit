
import React, { useEffect, useState, useRef } from 'react';
import { Business, GeneratedSite, SiteCreation } from '../types';
import { generateSitePreview, getChatbotResponse } from '../services/gemini';
import { Smartphone, Monitor, Code, Edit3, Type, Palette, Save, Download, Eye, Send, AlertTriangle, Cpu, Zap, Layers, Activity, BrainCircuit, History, Plus, Clock, Briefcase, PenTool, Image as ImageIcon, CalendarCheck, Terminal } from 'lucide-react';

interface SiteGeneratorProps {
  business: Business;
  onBuy: () => void;
  onOpenEmail: (business: Business) => void;
  onSiteGenerated: (creation: SiteCreation) => void;
}

// Definizione precisa del Workflow degli Agenti
const AGENT_WORKFLOW = [
  { id: 'brand', name: 'BrandIdentity', label: 'Analisi Settore & Psicologia Colore', icon: Palette, duration: 2500, startPct: 0, endPct: 15 },
  { id: 'logo', name: 'LogoGen', label: 'Creazione Prompt Logo Vettoriale', icon: PenTool, duration: 2000, startPct: 15, endPct: 30 },
  { id: 'copy', name: 'PersuasionMaster', label: 'Scrittura Copywriting A.I.D.A.', icon: Briefcase, duration: 3500, startPct: 30, endPct: 55 },
  { id: 'booking', name: 'SmartBooking', label: 'Configurazione Logica Prenotazioni', icon: CalendarCheck, duration: 2500, startPct: 55, endPct: 70 },
  { id: 'media', name: 'IconSelector', label: 'Selezione Asset & Icone Lucide', icon: ImageIcon, duration: 2000, startPct: 70, endPct: 85 },
  { id: 'code', name: 'SeniorCoder', label: 'Compilazione HTML5 & Tailwind', icon: Terminal, duration: 4000, startPct: 85, endPct: 98 },
];

export const SiteGenerator: React.FC<SiteGeneratorProps> = ({ business, onBuy, onOpenEmail, onSiteGenerated }) => {
  const [siteData, setSiteData] = useState<GeneratedSite | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Advanced Progress State
  const [progress, setProgress] = useState(0);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isAccelerating, setIsAccelerating] = useState(false); // Per il fast-forward finale
  
  // Editor State
  const [isEditMode, setIsEditMode] = useState(false);
  const [deviceView, setDeviceView] = useState<'desktop' | 'mobile'>('desktop');
  const [primaryColor, setPrimaryColor] = useState('#2563eb');
  const [secondaryColor, setSecondaryColor] = useState('#1e293b');
  const [fontHeading, setFontHeading] = useState('Outfit');
  const [fontBody, setFontBody] = useState('Plus Jakarta Sans');
  
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Helper: Current Agent Info
  const currentAgent = AGENT_WORKFLOW[currentStepIndex] || AGENT_WORKFLOW[AGENT_WORKFLOW.length - 1];
  const CurrentIcon = currentAgent.icon;

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

  const startGeneration = async () => {
    setLoading(true);
    setError(null);
    setProgress(0);
    setCurrentStepIndex(0);
    setIsAccelerating(false);
    setSiteData(null);
    
    // Timer Refs
    let animationFrameId: number;
    let startTime = Date.now();
    let isApiDone = false;
    let apiResult: GeneratedSite | null = null;
    let apiError: any = null;

    // 1. Start API Call in Background
    generateSitePreview(business)
        .then(res => {
            isApiDone = true;
            apiResult = res;
        })
        .catch(err => {
            isApiDone = true;
            apiError = err;
        });

    // 2. Start Animation Loop (The Heart of Granularity)
    const animate = () => {
        const now = Date.now();
        const elapsedTotal = now - startTime;

        if (isApiDone && !isAccelerating && !apiError) {
             // API Finished: Trigger Acceleration to 100%
             setIsAccelerating(true);
        }

        if (apiError) {
            cancelAnimationFrame(animationFrameId);
            if (JSON.stringify(apiError).includes("429") || apiError.message?.includes("Quota")) {
                setError("Server AI sovraccarico. Riprova tra 10 secondi.");
            } else {
                setError(apiError.message || "Errore sconosciuto.");
            }
            setLoading(false);
            return;
        }

        // Calculate Target Progress
        let targetProgress = 0;
        
        if (isAccelerating) {
            // Fast Forward Mode
            const current = progress;
            const step = 4; // Fast increment
            const next = Math.min(100, current + step);
            setProgress(next);
            
            // Update Text to "Finalizing" if we are zooming past steps
            if (next > 90) setCurrentStepIndex(AGENT_WORKFLOW.length - 1);

            if (next >= 100 && apiResult) {
                // DONE
                cancelAnimationFrame(animationFrameId);
                setTimeout(() => {
                    const enrichedHtml = injectScripts(apiResult!.html);
                    const finalData = { ...apiResult!, html: enrichedHtml };
                    setSiteData(finalData);
                    setLoading(false);
                    onSiteGenerated({
                        id: `gen-${Date.now()}`,
                        timestamp: Date.now(),
                        html: enrichedHtml,
                        copywriting: apiResult!.copywriting,
                        versionLabel: `Versione ${(business.creations?.length || 0) + 1}`
                    });
                }, 500);
                return;
            }
        } else {
            // Normal Simulation Mode based on Agent Workflow
            let cumulativeTime = 0;
            let activeStepIdx = 0;

            for (let i = 0; i < AGENT_WORKFLOW.length; i++) {
                const step = AGENT_WORKFLOW[i];
                if (elapsedTotal < cumulativeTime + step.duration) {
                    activeStepIdx = i;
                    // Interpolate within this step
                    const stepElapsed = elapsedTotal - cumulativeTime;
                    const pctInStep = stepElapsed / step.duration;
                    const pctRange = step.endPct - step.startPct;
                    targetProgress = step.startPct + (pctRange * pctInStep);
                    break;
                }
                cumulativeTime += step.duration;
            }
            
            // If we exceeded total time but API isn't done, hold at 99%
            if (elapsedTotal >= cumulativeTime) {
                activeStepIdx = AGENT_WORKFLOW.length - 1;
                targetProgress = 99;
            }

            setCurrentStepIndex(activeStepIdx);
            setProgress(targetProgress);
        }

        animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);
  };

  // LOAD EXISTING OR GENERATE NEW ON MOUNT
  useEffect(() => {
    if (business.creations && business.creations.length > 0) {
        // Carica l'ultima creazione disponibile
        const lastCreation = business.creations[business.creations.length - 1];
        setSiteData({ html: lastCreation.html, copywriting: lastCreation.copywriting });
        setLoading(false);
    } else {
        // Genera nuova se non esiste nulla
        startGeneration();
    }
  }, [business.id]); // Solo se cambia ID business

  // Function to load a specific creation
  const loadCreation = (creation: SiteCreation) => {
      setSiteData({ html: creation.html, copywriting: creation.copywriting });
  };

  // ... Messaggi, Edit, Download Logic invariata ...
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
      if(iframeRef.current?.contentWindow) {
          iframeRef.current.contentWindow.postMessage({ type: 'UPDATE_STYLE', primary: primaryColor, secondary: secondaryColor, fontHeading: fontHeading, fontBody: fontBody }, '*');
      }
  }, [primaryColor, secondaryColor, fontHeading, fontBody]);

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
        {/* Deep Space Background */}
        <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-[radial-gradient(circle_at_center,_rgba(99,102,241,0.15),_transparent_60%)] animate-[spin_30s_linear_infinite]"></div>
            <div className="absolute bottom-0 right-0 w-full h-1/2 bg-gradient-to-t from-slate-900 to-transparent"></div>
        </div>

        <div className="relative z-10 w-full max-w-lg flex flex-col items-center">
            {/* Multi-Agent Visualizer */}
            <div className="w-24 h-24 mb-8 relative">
                <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-xl animate-pulse"></div>
                <div className="w-full h-full bg-slate-900 rounded-2xl border border-slate-700 flex items-center justify-center relative z-10 shadow-[0_0_40px_rgba(99,102,241,0.3)]">
                    <BrainCircuit className="w-12 h-12 text-indigo-400 animate-[pulse_3s_infinite]" />
                </div>
                {/* Orbiting Agents */}
                <div className="absolute inset-0 animate-[spin_4s_linear_infinite]">
                    <div className="absolute -top-2 left-1/2 w-4 h-4 bg-blue-500 rounded-full shadow-[0_0_10px_#3b82f6]"></div>
                </div>
                <div className="absolute inset-0 animate-[spin_6s_linear_infinite_reverse]">
                    <div className="absolute -bottom-2 left-1/2 w-3 h-3 bg-purple-500 rounded-full shadow-[0_0_10px_#a855f7]"></div>
                </div>
            </div>

            <h3 className="text-3xl font-bold text-white mb-2 tracking-tight">Multi-Agent System</h3>
            
            {/* Active Agent Status */}
            <div className="flex items-center gap-3 bg-slate-900/80 border border-slate-700 px-5 py-3 rounded-full mb-8 backdrop-blur-md transition-all duration-300">
                <div className="p-1.5 bg-indigo-500/20 rounded-full mr-1">
                    <CurrentIcon className="w-4 h-4 text-indigo-400 animate-pulse" />
                </div>
                <div className="flex flex-col">
                    <span className="text-indigo-300 font-mono font-bold text-xs uppercase tracking-wider leading-none mb-1">@{currentAgent.name}</span>
                    <span className="text-slate-300 text-sm font-medium leading-none">{currentAgent.label}</span>
                </div>
            </div>

            {/* Granular Progress Bar */}
            <div className="w-full relative h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-800 shadow-inner">
                {/* Background Segments */}
                <div className="absolute inset-0 flex">
                   {AGENT_WORKFLOW.map((step, idx) => (
                       <div key={step.id} style={{width: `${step.endPct - step.startPct}%`}} className={`h-full border-r border-slate-800/50 ${currentStepIndex > idx ? 'bg-indigo-900/20' : ''}`}></div>
                   ))}
                </div>

                <div 
                    className="h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 relative transition-all duration-100 ease-linear"
                    style={{ width: `${Math.min(progress, 100)}%` }}
                >
                    <div className="absolute inset-0 bg-white/30 w-full h-full animate-[shimmer_1.5s_infinite]"></div>
                </div>
            </div>
            <div className="w-full flex justify-between mt-2 px-1">
                <span className="text-slate-500 font-mono text-xs">{progress.toFixed(0)}%</span>
                <span className="text-slate-600 font-mono text-[10px] uppercase">{isAccelerating ? 'Finalizing Deploy...' : 'Processing...'}</span>
            </div>
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
                        <button 
                            key={creation.id}
                            onClick={() => loadCreation(creation)}
                            className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-purple-200 hover:bg-purple-50 transition-all group text-left"
                        >
                            <div>
                                <div className="font-bold text-slate-700 text-xs">{creation.versionLabel || `Draft ${idx + 1}`}</div>
                                <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5"><Clock className="w-3 h-3"/> {new Date(creation.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                            </div>
                            <div className="w-2 h-2 rounded-full bg-purple-400 opacity-0 group-hover:opacity-100"></div>
                        </button>
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
            {isEditMode && (
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
                                      <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="w-9 h-9 rounded-lg cursor-pointer border border-slate-200 p-0.5 shadow-sm" />
                                      <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-1.5 rounded-md border border-slate-200">{primaryColor}</span>
                                  </div>
                              </div>
                              <div>
                                  <label className="text-xs font-medium text-slate-600 mb-1 block">Secondario</label>
                                  <div className="flex items-center gap-2">
                                      <input type="color" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} className="w-9 h-9 rounded-lg cursor-pointer border border-slate-200 p-0.5 shadow-sm" />
                                      <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-1.5 rounded-md border border-slate-200">{secondaryColor}</span>
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
                                      <select value={fontHeading} onChange={(e) => setFontHeading(e.target.value)} className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 appearance-none">
                                          <option value="'Outfit', sans-serif">Outfit</option>
                                          <option value="'Playfair Display', serif">Playfair Display</option>
                                          <option value="'Space Grotesk', sans-serif">Space Grotesk</option>
                                          <option value="'Inter', sans-serif">Inter</option>
                                      </select>
                                  </div>
                              </div>
                              <div>
                                  <label className="text-xs font-medium text-slate-600 mb-1 block">Testo Corpo</label>
                                   <div className="relative">
                                      <select value={fontBody} onChange={(e) => setFontBody(e.target.value)} className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 appearance-none">
                                          <option value="'Plus Jakarta Sans', sans-serif">Plus Jakarta Sans</option>
                                          <option value="'Lato', sans-serif">Lato</option>
                                          <option value="'Roboto', sans-serif">Roboto</option>
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
