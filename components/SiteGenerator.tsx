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
  const [currentStep, setCurrentStep] = useState(0);
  const [logs, setLogs] = useState<{agent: string, msg: string}[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [deviceView, setDeviceView] = useState<'desktop' | 'mobile'>('desktop');
  const [brandData, setBrandData] = useState<AgentBrandOutput | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // --- CHATBOT & EDITOR INJECTION ---
  // Questa funzione inserisce HARD-CODED il widget della chat, così non dipende dall'IA.
  const injectScripts = (html: string) => {
    // 1. CSS per il Widget Chat
    const css = `
      <style>
        /* Chat Widget Styles */
        #wr-chat-widget { position: fixed; bottom: 20px; right: 20px; z-index: 9999; font-family: 'Inter', sans-serif; display: flex; flex-direction: column; align-items: flex-end; }
        #wr-chat-btn { width: 60px; height: 60px; border-radius: 50%; background: #2563eb; color: white; display: flex; align-items: center; justify-content: center; box-shadow: 0 10px 25px rgba(37,99,235,0.4); cursor: pointer; transition: transform 0.2s; border: none; }
        #wr-chat-btn:hover { transform: scale(1.1); }
        #wr-chat-window { width: 350px; height: 450px; background: white; border-radius: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.1); margin-bottom: 20px; display: none; flex-direction: column; overflow: hidden; border: 1px solid #e2e8f0; animation: slideUp 0.3s ease-out; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .chat-header { background: #2563eb; padding: 15px; color: white; font-weight: bold; display: flex; justify-content: space-between; align-items: center; }
        .chat-messages { flex: 1; padding: 15px; overflow-y: auto; background: #f8fafc; display: flex; flex-direction: column; gap: 10px; }
        .msg { max-width: 80%; padding: 10px 14px; border-radius: 14px; font-size: 14px; line-height: 1.4; }
        .msg.bot { align-self: flex-start; background: white; border: 1px solid #e2e8f0; color: #1e293b; border-bottom-left-radius: 2px; }
        .msg.user { align-self: flex-end; background: #2563eb; color: white; border-bottom-right-radius: 2px; }
        .chat-input { padding: 15px; border-top: 1px solid #e2e8f0; display: flex; gap: 10px; background: white; }
        .chat-input input { flex: 1; border: 1px solid #e2e8f0; padding: 8px 12px; border-radius: 8px; outline: none; font-size: 14px; }
        .chat-input button { background: #2563eb; color: white; border: none; padding: 8px 12px; border-radius: 8px; cursor: pointer; }
      </style>
    `;

    // 2. HTML del Widget
    const widgetHtml = `
      <div id="wr-chat-widget">
        <div id="wr-chat-window">
          <div class="chat-header">
            <span>Assistente ${business.name}</span>
            <button onclick="toggleChat()" style="background:none;border:none;color:white;cursor:pointer;">✕</button>
          </div>
          <div class="chat-messages" id="chat-messages">
            <div class="msg bot">Ciao! Come posso aiutarti oggi?</div>
          </div>
          <form class="chat-input" onsubmit="sendMessage(event)">
            <input type="text" id="chat-input-field" placeholder="Scrivi un messaggio..." required autocomplete="off" />
            <button type="submit">Invia</button>
          </form>
        </div>
        <button id="wr-chat-btn" onclick="toggleChat()">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
        </button>
      </div>
    `;

    // 3. Script Logica
    const script = `
      <script>
        function toggleChat() {
          const w = document.getElementById('wr-chat-window');
          w.style.display = w.style.display === 'flex' ? 'none' : 'flex';
          if(w.style.display === 'flex') document.getElementById('chat-input-field').focus();
        }

        function sendMessage(e) {
          e.preventDefault();
          const input = document.getElementById('chat-input-field');
          const text = input.value.trim();
          if(!text) return;

          // Add User Message
          const container = document.getElementById('chat-messages');
          const userMsg = document.createElement('div');
          userMsg.className = 'msg user';
          userMsg.textContent = text;
          container.appendChild(userMsg);
          input.value = '';
          container.scrollTop = container.scrollHeight;

          // Send to Parent
          window.parent.postMessage({ type: 'CHAT_MSG', text: text }, '*');
        }

        // Listen for AI Reply from Parent
        window.addEventListener('message', (event) => {
           if(event.data.type === 'AI_REPLY') {
             const container = document.getElementById('chat-messages');
             const botMsg = document.createElement('div');
             botMsg.className = 'msg bot';
             botMsg.textContent = event.data.text;
             container.appendChild(botMsg);
             container.scrollTop = container.scrollHeight;
           }
           if (event.data.type === 'TOGGLE_EDIT') {
              document.body.contentEditable = event.data.enabled;
              document.querySelectorAll('a').forEach(el => el.style.pointerEvents = event.data.enabled ? 'none' : 'auto');
           }
           if (event.data.type === 'GET_HTML') {
              window.parent.postMessage({ type: 'SAVE_HTML', html: document.documentElement.outerHTML }, '*');
           }
        });
      </script>
    `;

    return html.replace('</body>', `${css}${widgetHtml}${script}</body>`);
  };

  const addLog = (agent: string, msg: string) => setLogs(prev => [...prev, { agent, msg }]);

  const startGeneration = async () => {
    setLoading(true);
    setError(null);
    setLogs([]);
    setCurrentStep(1);

    try {
        addLog('Reputation', 'Analisi recensioni e contesto...');
        const reviews = await agentReviews(business);
        setCurrentStep(2);

        addLog('Architect', 'Progettazione struttura UX e Design System...');
        const data = await generateSitePreview(business);
        
        setCurrentStep(3);
        addLog('Visual', 'Rendering asset grafici e montaggio...');
        
        // Finalize
        const enrichedHtml = injectScripts(data.html);
        const finalData = { ...data, html: enrichedHtml };
        
        setSiteData(finalData);
        setBrandData(data.brandData || null);
        setLoading(false);
        
        onSiteGenerated({
            id: `gen-${Date.now()}`,
            timestamp: Date.now(),
            html: enrichedHtml,
            copywriting: data.copywriting,
            versionLabel: `v${(business.creations?.length || 0) + 1}`,
            brandData: data.brandData,
            contentData: data.contentData
        });

    } catch (error: any) {
        setError(error.message || "Errore sconosciuto.");
        setLoading(false);
    }
  };

  useEffect(() => {
    if (business.creations && business.creations.length > 0) {
        const last = business.creations[business.creations.length - 1];
        setSiteData({ html: last.html, copywriting: last.copywriting });
        setBrandData(last.brandData || null);
    } else {
        startGeneration();
    }
  }, [business.id]);

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.data.type === 'CHAT_MSG') {
        try {
          const aiReplyJson = await getChatbotResponse(business, event.data.text);
          const aiReply = JSON.parse(aiReplyJson);
          iframeRef.current?.contentWindow?.postMessage({ type: 'AI_REPLY', text: aiReply.text }, '*');
        } catch (e) { console.error(e); }
      }
      if (event.data.type === 'SAVE_HTML') {
          const blob = new Blob([event.data.html], { type: 'text/html' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${business.name.replace(/\s+/g, '-').toLowerCase()}.html`;
          a.click();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [business]);

  const toggleEditMode = () => {
      setIsEditMode(!isEditMode);
      iframeRef.current?.contentWindow?.postMessage({ type: 'TOGGLE_EDIT', enabled: !isEditMode }, '*');
  };

  if (loading) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center min-h-[600px] bg-slate-900 rounded-3xl p-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900 via-slate-900 to-black opacity-80"></div>
        <div className="relative z-10 w-full max-w-lg">
            <div className="flex items-center gap-4 mb-8 justify-center">
                <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center animate-bounce shadow-lg shadow-blue-500/50">
                    <Zap className="w-8 h-8 text-white" />
                </div>
            </div>
            <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl p-6 border border-slate-700">
                <h3 className="text-white font-bold mb-4 flex justify-between">Generating... <span className="text-blue-400">{currentStep}/3</span></h3>
                <div className="space-y-3 font-mono text-sm max-h-[200px] overflow-y-auto">
                    {logs.map((log, i) => (
                        <div key={i} className="flex gap-2 animate-in fade-in slide-in-from-left-2">
                            <span className="text-blue-500 font-bold">[{log.agent}]</span>
                            <span className="text-slate-300">{log.msg}</span>
                        </div>
                    ))}
                    <div className="animate-pulse text-slate-500">_</div>
                </div>
            </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center bg-white rounded-3xl border border-red-100 p-8">
          <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
          <h3 className="text-xl font-bold text-slate-900">Errore Generazione</h3>
          <p className="text-slate-500 mb-6">{error}</p>
          <button onClick={startGeneration} className="px-6 py-2 bg-slate-900 text-white rounded-lg">Riprova</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-5">
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex justify-between items-center sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 rounded-lg text-indigo-700"><Code className="w-5 h-5" /></div>
          <div>
            <h2 className="font-bold text-slate-800 text-sm">{business.name}</h2>
            <div className="text-[10px] text-green-600 font-bold flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> ONLINE PREVIEW</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <div className="flex bg-slate-100 p-1 rounded-lg mr-2">
               <button onClick={() => setDeviceView('desktop')} className={`p-2 rounded-md ${deviceView === 'desktop' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}><Monitor className="w-4 h-4"/></button>
               <button onClick={() => setDeviceView('mobile')} className={`p-2 rounded-md ${deviceView === 'mobile' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}><Smartphone className="w-4 h-4"/></button>
           </div>
           <button onClick={toggleEditMode} className={`px-4 py-2 rounded-lg text-xs font-bold border transition-colors ${isEditMode ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
               {isEditMode ? 'Salva Modifiche' : 'Modifica Testi'}
           </button>
           <button onClick={() => iframeRef.current?.contentWindow?.postMessage({type:'GET_HTML'}, '*')} className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50"><Download className="w-4 h-4 text-slate-600"/></button>
           <button onClick={onBuy} className="px-5 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-black">Vendi (299€)</button>
        </div>
      </div>

      <div className="flex-grow bg-slate-100 rounded-2xl border border-slate-200 relative overflow-hidden flex justify-center py-8">
         <div className={`transition-all duration-500 bg-white shadow-2xl overflow-hidden ${deviceView === 'mobile' ? 'w-[375px] h-[812px] rounded-[3rem] border-[8px] border-slate-800' : 'w-full h-full'}`}>
             <iframe ref={iframeRef} srcDoc={siteData?.html} title="Preview" className="w-full h-full border-none" sandbox="allow-scripts allow-forms allow-same-origin" />
         </div>
      </div>
    </div>
  );
};
