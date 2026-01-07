
import React, { useEffect, useState, useRef } from 'react';
import { Business, GeneratedSite } from '../types';
import { generateSitePreview, getChatbotResponse } from '../services/gemini';
import { Loader2, Smartphone, Monitor, Code, RefreshCw, ShoppingCart, Share2, ShieldCheck, Bot, Mail, CheckCircle, ExternalLink, MessageCircle, Brain, LayoutTemplate, PenTool, Wand2, Edit3, Type, Palette, Save, Download, Eye, Image as ImageIcon } from 'lucide-react';

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
                // INIEZIONE SCRIPT DI EDITING NELL'HTML GENERATO
                const editorScript = `
                  <script>
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
                        // Disabilita link in edit mode
                        document.querySelectorAll('a').forEach(el => {
                            el.style.pointerEvents = data.enabled ? 'none' : 'auto';
                        });
                        // Visual cues
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
                          // Dispatch custom event for the chatbot widget code to pick up
                          window.postMessage({ type: 'AI_REPLY', ...data }, '*');
                      }
                    });
                  </script>
                `;
                // Inserisce lo script prima della chiusura del body
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

  // Gestione messaggi dall'iframe (Chatbot & Salvataggio)
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      // Salvataggio HTML modificato
      if (event.data.type === 'SAVE_HTML') {
          const blob = new Blob([event.data.html], { type: 'text/html' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${business.name.replace(/\s+/g, '-').toLowerCase()}-website.html`;
          a.click();
          URL.revokeObjectURL(url);
      }
      
      // Chatbot logic
      if (event.data.type === 'CHAT_MSG' && siteData) {
        const userText = event.data.text;
        try {
          const aiReply = await getChatbotResponse(business, userText);
          iframeRef.current?.contentWindow?.postMessage(JSON.parse(aiReply), '*');
        } catch (e) { console.error("Chat error:", e); }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [siteData, business]);

  // Invio aggiornamenti stile all'iframe
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

  // Toggle Edit Mode
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
      // Richiede l'HTML corrente all'iframe (che include le modifiche al testo)
      if(iframeRef.current?.contentWindow) {
          iframeRef.current.contentWindow.postMessage({ type: 'GET_HTML' }, '*');
      }
  };

  const handleWhatsApp = () => {
    const phone = business.phoneNumber?.replace(/\D/g, '') || '';
    const text = `Ciao! Ho creato un'anteprima del vostro nuovo sito web: https://preview.webrenovator.it/v/${business.id}`;
    const url = phone 
      ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
      : `https://web.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const openInNewTab = () => {
    if (!siteData) return;
    const blob = new Blob([siteData.html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  if (loading) {
    const CurrentIcon = loadingSteps[generationStep].icon;

    return (
      <div className="flex-grow flex flex-col items-center justify-center min-h-[600px] bg-white rounded-3xl shadow-xl border border-slate-100 p-12 relative overflow-hidden">
        {/* Background Decorations */}
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
    <div className="flex flex-col h-full gap-4">
      {/* Top Bar */}
      <div className="bg-white/90 backdrop-blur-md p-3 rounded-2xl shadow-md border border-slate-200 flex flex-wrap items-center justify-between gap-4 sticky top-20 z-40">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600"><Bot className="w-5 h-5" /></div>
          <div>
            <h2 className="font-bold text-slate-800 text-sm">{business.name}</h2>
            <div className="flex gap-2">
                <span className="text-[10px] text-green-700 font-bold bg-green-100 px-1.5 rounded uppercase">Online</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
           <button onClick={() => setDeviceView('desktop')} className={`p-2 rounded-md transition-all ${deviceView === 'desktop' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}><Monitor className="w-4 h-4"/></button>
           <button onClick={() => setDeviceView('mobile')} className={`p-2 rounded-md transition-all ${deviceView === 'mobile' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}><Smartphone className="w-4 h-4"/></button>
        </div>

        <div className="flex items-center gap-2">
           <button onClick={toggleEditMode} className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${isEditMode ? 'bg-amber-100 text-amber-700 shadow-inner' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                {isEditMode ? <><Eye className="w-4 h-4" /> Anteprima</> : <><Edit3 className="w-4 h-4" /> Modifica</>}
           </button>
           
           <div className="h-6 w-px bg-slate-300 mx-1"></div>

           <button onClick={handleDownload} className="p-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl" title="Scarica HTML">
             <Download className="w-4 h-4" />
           </button>
           <button onClick={onBuy} className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold shadow-lg hover:bg-slate-800">
             Vendi a 299€
           </button>
        </div>
      </div>

      <div className="flex gap-6 h-[80vh]">
          {/* Main Preview Area */}
          <div className={`transition-all duration-500 flex-grow relative bg-white shadow-xl flex flex-col items-center justify-start overflow-hidden ${deviceView === 'mobile' ? 'py-10 bg-slate-100/50 rounded-3xl' : 'rounded-2xl border border-slate-200'}`}>
            <div className={`transition-all duration-500 bg-white shadow-2xl overflow-hidden relative ${deviceView === 'mobile' ? 'w-[375px] h-[812px] rounded-[3rem] border-[12px] border-slate-800' : 'w-full h-full'}`}>
                {deviceView === 'desktop' && (
                    <div className="bg-slate-50 border-b border-slate-200 p-2 flex items-center gap-2">
                        <div className="flex gap-1.5 ml-2"><div className="w-2.5 h-2.5 rounded-full bg-red-400"></div><div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div><div className="w-2.5 h-2.5 rounded-full bg-green-400"></div></div>
                        <div className="flex-grow mx-4 bg-white border border-slate-200 rounded py-1 px-3 text-[10px] text-slate-400 flex items-center gap-2">
                            <ShieldCheck className="w-3 h-3 text-green-500" /> secure-preview.com
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
                  <div className="p-4 border-b border-slate-100 bg-slate-50">
                      <h3 className="font-bold text-slate-800 flex items-center gap-2"><Edit3 className="w-4 h-4 text-blue-600"/> Visual Editor</h3>
                  </div>
                  
                  <div className="flex-grow overflow-y-auto p-5 space-y-8">
                      {/* Colors */}
                      <div className="space-y-4">
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2"><Palette className="w-3 h-3"/> Colori Brand</h4>
                          <div className="space-y-3">
                              <div>
                                  <label className="text-xs font-medium text-slate-600 mb-1 block">Primario (Bottoni, Link)</label>
                                  <div className="flex items-center gap-2">
                                      <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-none p-0" />
                                      <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-1 rounded">{primaryColor}</span>
                                  </div>
                              </div>
                              <div>
                                  <label className="text-xs font-medium text-slate-600 mb-1 block">Secondario (Footer, Sfondi)</label>
                                  <div className="flex items-center gap-2">
                                      <input type="color" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-none p-0" />
                                      <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-1 rounded">{secondaryColor}</span>
                                  </div>
                              </div>
                          </div>
                      </div>

                      {/* Typography */}
                      <div className="space-y-4">
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2"><Type className="w-3 h-3"/> Tipografia</h4>
                          <div className="space-y-3">
                              <div>
                                  <label className="text-xs font-medium text-slate-600 mb-1 block">Titoli (H1, H2)</label>
                                  <select value={fontHeading} onChange={(e) => setFontHeading(e.target.value)} className="w-full text-xs p-2 border border-slate-200 rounded-lg outline-none focus:border-blue-500">
                                      <option value="'Playfair Display', serif">Playfair Display (Lusso/Ristoranti)</option>
                                      <option value="'Outfit', sans-serif">Outfit (Moderno/Tech)</option>
                                      <option value="'Inter', sans-serif">Inter (Clean/Business)</option>
                                      <option value="'Lora', serif">Lora (Elegante)</option>
                                  </select>
                              </div>
                              <div>
                                  <label className="text-xs font-medium text-slate-600 mb-1 block">Testo Corpo</label>
                                  <select value={fontBody} onChange={(e) => setFontBody(e.target.value)} className="w-full text-xs p-2 border border-slate-200 rounded-lg outline-none focus:border-blue-500">
                                      <option value="'Lato', sans-serif">Lato</option>
                                      <option value="'Open Sans', sans-serif">Open Sans</option>
                                      <option value="'Roboto', sans-serif">Roboto</option>
                                  </select>
                              </div>
                          </div>
                      </div>
                      
                      {/* Hint Box */}
                      <div className="bg-amber-50 p-3 rounded-xl border border-amber-100">
                          <p className="text-[10px] text-amber-800 leading-relaxed">
                              <strong>Modifica Testo:</strong> Clicca direttamente sui testi nell'anteprima per modificarli. Le modifiche verranno salvate nel file scaricato.
                          </p>
                      </div>
                  </div>

                  <div className="p-4 border-t border-slate-100 bg-slate-50">
                      <button onClick={handleDownload} className="w-full py-2.5 bg-blue-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
                          <Save className="w-4 h-4" /> Salva e Scarica Sito
                      </button>
                  </div>
              </div>
          )}
      </div>
    </div>
  );
};
