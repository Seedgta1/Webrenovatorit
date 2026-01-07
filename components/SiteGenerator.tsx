import React, { useEffect, useState, useRef } from 'react';
import { Business, GeneratedSite } from '../types';
import { generateSitePreview, getChatbotResponse } from '../services/gemini';
import { Smartphone, Monitor, Code, Edit3, Type, Palette, Save, Download, Eye, Send, AlertTriangle, Terminal, Cpu, Check, Zap, Layers } from 'lucide-react';

interface SiteGeneratorProps {
  business: Business;
  onBuy: () => void;
  onOpenEmail: (business: Business) => void;
}

export const SiteGenerator: React.FC<SiteGeneratorProps> = ({ business, onBuy, onOpenEmail }) => {
  const [siteData, setSiteData] = useState<GeneratedSite | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // New Loading UI States
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  
  // Editor State
  const [isEditMode, setIsEditMode] = useState(false);
  const [deviceView, setDeviceView] = useState<'desktop' | 'mobile'>('desktop');
  const [primaryColor, setPrimaryColor] = useState('#2563eb');
  const [secondaryColor, setSecondaryColor] = useState('#1e293b');
  const [fontHeading, setFontHeading] = useState('Playfair Display');
  const [fontBody, setFontBody] = useState('Lato');
  
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    let mounted = true;
    setError(null);
    setLoading(true);
    setProgress(0);
    setLogs([]);
    
    // Fake logs animation
    const logMessages = [
        "Inizializzazione Neural Engine Gemini 2.5...",
        `Analisi Brand Identity: ${business.name}...`,
        `Rilevamento settore: ${business.type}...`,
        "Generazione Palette Colori Ottimizzata...",
        "Costruzione Wireframe UX Mobile-First...",
        "Scrittura Copywriting Persuasivo (A.I.D.A.)...",
        "Compilazione Codice HTML5 Semantico...",
        "Integrazione Framework TailwindCSS...",
        "Ottimizzazione SEO & Performance...",
        "Rendering Anteprima Finale..."
    ];

    let currentLogIndex = 0;
    const logInterval = setInterval(() => {
        if (currentLogIndex < logMessages.length) {
            setLogs(prev => [...prev.slice(-4), logMessages[currentLogIndex]]);
            currentLogIndex++;
            setProgress(prev => Math.min(prev + 10, 95));
        }
    }, 800);

    const generate = async () => {
      try {
        const result = await generateSitePreview(business);
        if (mounted) {
            clearInterval(logInterval);
            setProgress(100);
            setLogs(prev => [...prev.slice(-4), "COMPLETATO: Sito Generato con Successo."]);
            
            setTimeout(() => {
                const editorScript = `
                  <script>
                    // Add styles for rich messages
                    const style = document.createElement('style');
                    style.innerHTML = \`
                        .chat-visuals { display: flex; gap: 10px; overflow-x: auto; padding: 10px 0; scrollbar-width: none; }
                        .visual-card { 
                            min-width: 140px; 
                            width: 140px; 
                            background: white; 
                            border-radius: 12px; 
                            overflow: hidden; 
                            box-shadow: 0 4px 12px rgba(0,0,0,0.1); 
                            transition: transform 0.2s;
                            border: 1px solid #eee;
                            display: flex;
                            flex-direction: column;
                        }
                        .visual-card:hover { transform: translateY(-2px); }
                        .visual-card img { width: 100%; height: 90px; object-fit: cover; }
                        .visual-card span { 
                            padding: 8px; 
                            font-size: 11px; 
                            font-weight: 600; 
                            color: #333; 
                            text-align: center;
                            line-height: 1.3;
                        }
                        .ai-msg {
                           background: #f1f5f9; 
                           color: #1e293b; 
                           padding: 12px; 
                           border-radius: 12px 12px 12px 2px;
                           max-width: 85%;
                           margin-bottom: 8px;
                           font-size: 14px;
                           line-height: 1.5;
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
                        document.querySelectorAll('a').forEach(el => {
                            el.style.pointerEvents = data.enabled ? 'none' : 'auto';
                        });
                        if (data.enabled) {
                           document.body.classList.add('editing-active');
                           const style = document.createElement('style');
                           style.id = 'editor-styles';
                           style.innerHTML = \`
                             .editing-active [contenteditable] { outline: 2px dashed #3b82f6; cursor: text; }
                             .editing-active [contenteditable]:focus { outline: 2px solid #2563eb; background: rgba(59,130,246,0.05); }
                           \`;
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
                          // Find chat messages container (standardized ID from prompt)
                          const chatContainer = document.getElementById('chat-messages') || document.querySelector('.chat-messages');
                          
                          if (chatContainer) {
                              const msgDiv = document.createElement('div');
                              msgDiv.style.alignSelf = 'flex-start';
                              msgDiv.style.width = '100%';
                              
                              let content = \`<div class="ai-msg">\${data.text}</div>\`;
                              
                              // Render Visual Elements (Images/Cards)
                              if (data.visual_elements && data.visual_elements.length > 0) {
                                  content += \`<div class="chat-visuals">\`;
                                  data.visual_elements.forEach(el => {
                                      if (el.type === 'image') {
                                          // Use Pollinations AI for consistent generated images matching description
                                          const safeKeyword = encodeURIComponent(el.keyword);
                                          const imgSrc = \`https://image.pollinations.ai/prompt/\${safeKeyword}?width=280&height=180&nologo=true\`;
                                          content += \`
                                            <div class="visual-card">
                                               <img src="\${imgSrc}" loading="lazy" alt="\${el.caption}" />
                                               <span>\${el.caption}</span>
                                            </div>\`;
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
                result.html = result.html.replace('</body>', `${editorScript}</body>`);
                setSiteData(result);
                setLoading(false);
            }, 800);
        }
      } catch (error: any) {
        console.error(error);
        if (mounted) {
            clearInterval(logInterval);
            // Gestione specifica errore Quota (429)
            if (JSON.stringify(error).includes("429") || error.message?.includes("Quota")) {
                 setError("Server AI sovraccarico (Quota Exceeded). Attendi 10 secondi e riprova.");
            } else {
                 setError(error.message || "Errore sconosciuto durante la generazione.");
            }
            setLoading(false);
        }
      }
    };
    
    generate();
    
    return () => { 
        mounted = false; 
        clearInterval(logInterval);
    };
  }, [business]);

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
          iframeRef.current?.contentWindow?.postMessage({
              type: 'AI_REPLY',
              ...parsedReply
          }, '*');
        } catch (e) { console.error("Chat error:", e); }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [siteData, business]);

  useEffect(() => {
      if(iframeRef.current?.contentWindow) {
          iframeRef.current.contentWindow.postMessage({
              type: 'UPDATE_STYLE',
              primary: primaryColor,
              secondary: secondaryColor,
              fontHeading: fontHeading,
              fontBody: fontBody
          }, '*');
      }
  }, [primaryColor, secondaryColor, fontHeading, fontBody]);

  const toggleEditMode = () => {
      const newState = !isEditMode;
      setIsEditMode(newState);
      if(iframeRef.current?.contentWindow) {
          iframeRef.current.contentWindow.postMessage({
              type: 'TOGGLE_EDIT',
              enabled: newState
          }, '*');
      }
  };

  const handleDownload = () => {
      if(iframeRef.current?.contentWindow) {
          iframeRef.current.contentWindow.postMessage({ type: 'GET_HTML' }, '*');
      }
  };

  if (loading) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center min-h-[600px] bg-slate-900 rounded-3xl shadow-2xl border border-slate-800 p-8 relative overflow-hidden">
        {/* Abstract Background */}
        <div className="absolute inset-0 overflow-hidden opacity-20">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,_rgba(59,130,246,0.3),_transparent_70%)]"></div>
        </div>

        <div className="relative z-10 w-full max-w-lg">
            {/* Header Card */}
            <div className="flex items-center justify-between mb-8 text-slate-300">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/20 rounded-lg border border-blue-500/30 text-blue-400">
                        <Cpu className="w-6 h-6 animate-pulse" />
                    </div>
                    <div>
                        <h3 className="font-mono font-bold text-white tracking-wide">AI ARCHITECT</h3>
                        <p className="text-xs text-slate-400 font-mono">v2.5.0-flash build</p>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-2xl font-black text-white tabular-nums">{progress}%</div>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden mb-8 relative">
                <div 
                    className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 transition-all duration-300 ease-out relative shadow-[0_0_15px_rgba(59,130,246,0.5)]" 
                    style={{ width: `${progress}%` }}
                >
                    <div className="absolute right-0 top-0 h-full w-1 bg-white shadow-[0_0_10px_white]"></div>
                </div>
            </div>

            {/* Terminal Logs */}
            <div className="bg-black/40 rounded-xl border border-slate-700/50 p-4 font-mono text-xs h-40 overflow-hidden flex flex-col justify-end backdrop-blur-sm shadow-inner">
                {logs.map((log, i) => (
                    <div key={i} className="mb-1.5 flex items-start gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
                        <span className="text-green-500 mt-0.5">➜</span>
                        <span className={i === logs.length - 1 ? "text-white font-bold" : "text-slate-400"}>
                            {log}
                        </span>
                    </div>
                ))}
                <div className="w-2 h-4 bg-blue-500 animate-pulse mt-1"></div>
            </div>

            <div className="mt-6 flex items-center justify-center gap-2 text-slate-500 text-xs font-medium">
                <Zap className="w-3 h-3 text-yellow-500" />
                <span>Powered by Google Gemini</span>
            </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center min-h-[500px] bg-white rounded-3xl shadow-lg border border-red-100 p-8">
          <div className="bg-red-50 p-4 rounded-full mb-4 animate-bounce">
              <AlertTriangle className="w-10 h-10 text-red-500" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">Generazione Interrotta</h3>
          <p className="text-slate-500 text-center max-w-md mb-6">{error}</p>
          <button 
            onClick={() => { setError(null); setLoading(true); }} 
            className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-black transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
              Riprova Generazione
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
            {/* View Toggle */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
               <button onClick={() => setDeviceView('desktop')} className={`p-2 rounded-lg transition-all duration-200 ${deviceView === 'desktop' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}><Monitor className="w-4 h-4"/></button>
               <button onClick={() => setDeviceView('mobile')} className={`p-2 rounded-lg transition-all duration-200 ${deviceView === 'mobile' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}><Smartphone className="w-4 h-4"/></button>
            </div>

            <div className="h-8 w-px bg-slate-200"></div>

            {/* Actions */}
            <div className="flex items-center gap-2">
               <button onClick={toggleEditMode} className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all border ${isEditMode ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
                    {isEditMode ? <><Eye className="w-4 h-4" /> Anteprima</> : <><Edit3 className="w-4 h-4" /> Modifica</>}
               </button>
               
               <button onClick={handleDownload} className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition-colors" title="Scarica HTML">
                 <Download className="w-4 h-4" />
               </button>

               {/* PULSANTE INVIA PROPOSTA */}
               <button 
                onClick={() => onOpenEmail(business)}
                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-500/20 flex items-center gap-2 transition-all transform hover:-translate-y-0.5"
               >
                 <Send className="w-4 h-4" /> Invia Proposta
               </button>

               <button onClick={onBuy} className="px-5 py-2.5 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-900 border border-slate-700 transition-all">
                 Vendi (299€)
               </button>
            </div>
        </div>
      </div>

      <div className="flex gap-6 h-full min-h-0">
          {/* Main Preview Area */}
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
                <iframe 
                    ref={iframeRef}
                    srcDoc={siteData?.html}
                    title="Preview"
                    className="w-full h-full border-none bg-white"
                    sandbox="allow-scripts allow-forms allow-same-origin allow-modals allow-popups"
                />
            </div>
          </div>

          {/* Editor Sidebar (Visible only in Edit Mode) */}
          {isEditMode && (
              <div className="w-80 bg-white rounded-2xl shadow-xl border border-slate-200 flex flex-col overflow-hidden animate-in slide-in-from-right-10 duration-300">
                  <div className="p-4 border-b border-slate-100 bg-slate-50/50 backdrop-blur-sm">
                      <h3 className="font-bold text-slate-800 flex items-center gap-2"><Edit3 className="w-4 h-4 text-blue-600"/> Visual Editor</h3>
                  </div>
                  
                  <div className="flex-grow overflow-y-auto p-5 space-y-8">
                      {/* Colors */}
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

                      {/* Typography */}
                      <div className="space-y-4">
                          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2"><Type className="w-3 h-3"/> Tipografia</h4>
                          <div className="space-y-3">
                              <div>
                                  <label className="text-xs font-medium text-slate-600 mb-1 block">Titoli (H1, H2)</label>
                                  <div className="relative">
                                      <select value={fontHeading} onChange={(e) => setFontHeading(e.target.value)} className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 appearance-none">
                                          <option value="'Playfair Display', serif">Playfair Display</option>
                                          <option value="'Outfit', sans-serif">Outfit</option>
                                          <option value="'Inter', sans-serif">Inter</option>
                                          <option value="'Lora', serif">Lora</option>
                                      </select>
                                  </div>
                              </div>
                              <div>
                                  <label className="text-xs font-medium text-slate-600 mb-1 block">Testo Corpo</label>
                                   <div className="relative">
                                      <select value={fontBody} onChange={(e) => setFontBody(e.target.value)} className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 appearance-none">
                                          <option value="'Lato', sans-serif">Lato</option>
                                          <option value="'Open Sans', sans-serif">Open Sans</option>
                                          <option value="'Roboto', sans-serif">Roboto</option>
                                      </select>
                                   </div>
                              </div>
                          </div>
                      </div>
                      
                      <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-4 rounded-xl border border-amber-100/50">
                          <p className="text-[10px] text-amber-800 leading-relaxed font-medium">
                              <span className="font-bold flex items-center gap-1 mb-1"><Edit3 className="w-3 h-3"/> Modalità Modifica</span>
                              Clicca su qualsiasi testo nell'anteprima (titoli, paragrafi, prezzi) per scriverci direttamente sopra.
                          </p>
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
  );
};