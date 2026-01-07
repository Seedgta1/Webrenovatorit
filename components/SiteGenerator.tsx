
import React, { useEffect, useState, useRef } from 'react';
import { Business, GeneratedSite } from '../types';
import { generateSitePreview, getChatbotResponse } from '../services/gemini';
import { Loader2, Smartphone, Monitor, Code, RefreshCw, ShoppingCart, Share2, ShieldCheck, Bot, Mail, CheckCircle, ExternalLink, MessageCircle, Brain, LayoutTemplate, PenTool, Wand2, Edit3, Type, Palette, Save, Download, Eye, Send } from 'lucide-react';

interface SiteGeneratorProps {
  business: Business;
  onBuy: () => void;
  onOpenEmail: (business: Business) => void;
}

export const SiteGenerator: React.FC<SiteGeneratorProps> = ({ business, onBuy, onOpenEmail }) => {
  const [siteData, setSiteData] = useState<GeneratedSite | null>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [generationStep, setGenerationStep] = useState(0);
  
  // Editor State
  const [isEditMode, setIsEditMode] = useState(false);
  const [deviceView, setDeviceView] = useState<'desktop' | 'mobile'>('desktop');
  const [primaryColor, setPrimaryColor] = useState('#2563eb');
  const [secondaryColor, setSecondaryColor] = useState('#1e293b');
  const [fontHeading, setFontHeading] = useState('Playfair Display');
  const [fontBody, setFontBody] = useState('Lato');
  
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Simulazione stati di caricamento
  const loadingSteps = [
    { text: "Analisi Identità Brand e Settore...", icon: Brain, color: "text-purple-600", bg: "bg-purple-50" },
    { text: "Costruzione Architettura UX/UI...", icon: LayoutTemplate, color: "text-blue-600", bg: "bg-blue-50" },
    { text: "Scrittura Copywriting Persuasivo...", icon: PenTool, color: "text-amber-600", bg: "bg-amber-50" },
    { text: "Ottimizzazione Codice e SEO...", icon: Wand2, color: "text-emerald-600", bg: "bg-emerald-50" }
  ];

  useEffect(() => {
    let mounted = true;
    
    const progressInterval = setInterval(() => {
        setProgress(prev => {
            if (prev >= 95) return 95;
            const increment = Math.max(0.5, (95 - prev) / 20); 
            return prev + increment;
        });
    }, 200);

    const stepInterval = setInterval(() => {
        setGenerationStep(prev => (prev < 3 ? prev + 1 : prev));
    }, 2500);

    const generate = async () => {
      setLoading(true);
      try {
        const result = await generateSitePreview(business);
        if (mounted) {
            setProgress(100);
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
            }, 500);
        }
      } catch (error) { console.error(error); }
    };
    
    generate();
    
    return () => { 
        mounted = false; 
        clearInterval(progressInterval);
        clearInterval(stepInterval);
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
    const CurrentIcon = loadingSteps[generationStep].icon;

    return (
      <div className="flex-grow flex flex-col items-center justify-center min-h-[600px] bg-white rounded-3xl shadow-xl border border-slate-100 p-12 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500"></div>
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-blue-50 rounded-full blur-3xl opacity-50"></div>
        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-purple-50 rounded-full blur-3xl opacity-50"></div>

        <div className="relative z-10 flex flex-col items-center max-w-md w-full">
            <div className={`mb-8 p-6 rounded-3xl shadow-lg transition-all duration-500 ${loadingSteps[generationStep].bg}`}>
                <CurrentIcon className={`w-12 h-12 transition-all duration-500 ${loadingSteps[generationStep].color} animate-pulse`} />
            </div>
            <h2 className="text-2xl font-black text-slate-800 mb-2 tracking-tight text-center">Generazione AI in corso</h2>
            <div className="h-8 mb-8 flex items-center justify-center">
                <p className="text-slate-500 font-medium text-center animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {loadingSteps[generationStep].text}
                </p>
            </div>
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden shadow-inner relative">
                <div className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-300 ease-out relative" style={{ width: `${progress}%` }}>
                    <div className="absolute top-0 left-0 w-full h-full bg-white/20 animate-[shimmer_2s_infinite]"></div>
                </div>
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-5">
      {/* Top Action Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-lg border border-slate-100 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl text-white shadow-md shadow-indigo-500/20">
              <Bot className="w-5 h-5" />
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
                            <ShieldCheck className="w-3 h-3 text-green-500" /> 
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
