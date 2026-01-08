
import { GoogleGenAI, Type } from "@google/genai";
import { Business, GeneratedSite, MarketingAudit, AIModelConfig, DesignPreferences } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const extractJSON = (text: string) => {
    if (!text) return null;
    try {
        let cleanText = text.replace(/```json/gi, '').replace(/```/g, '').trim();
        const firstOpen = cleanText.indexOf('{');
        const firstArrOpen = cleanText.indexOf('[');
        const lastClose = cleanText.lastIndexOf('}');
        const lastArrClose = cleanText.lastIndexOf(']');
        
        let startIndex = -1;
        let endIndex = -1;

        if (firstOpen !== -1 && (firstArrOpen === -1 || firstOpen < firstArrOpen)) {
            startIndex = firstOpen;
            endIndex = lastClose;
        } else if (firstArrOpen !== -1) {
            startIndex = firstArrOpen;
            endIndex = lastArrClose;
        }

        if (startIndex !== -1 && endIndex !== -1) {
            cleanText = cleanText.substring(startIndex, endIndex + 1);
            return JSON.parse(cleanText);
        }
        return null;
    } catch (e) { return null; }
};

export const searchLeads = async (niche: string, location: string): Promise<Business[]> => {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Trova 5 attività reali a ${location} nel settore "${niche}". 
        Identifica specificamente quelle che NON hanno un sito web o hanno un sito molto vecchio (non responsive).
        Usa Google Search per verificare se esiste un dominio.
        
        Importante: Cerca sul web (directory, social, recensioni) se esistono URL di immagini REALI dell'attività (interni, esterni, lavori).
        
        Restituisci ESCLUSIVAMENTE un array JSON con questa struttura: 
        [{
          "id": "uuid", 
          "name": "nome attività", 
          "address": "indirizzo", 
          "type": "tipologia", 
          "website": "url o null", 
          "phoneNumber": "telefono", 
          "status": "NO_SITE o OLD_SITE", 
          "leadStatus": "NEW", 
          "reasoning": "motivo scelta",
          "photos": ["url_img1", "url_img2"] 
        }]
        
        Nota: Se non trovi foto reali, lascia l'array "photos" vuoto.`,
        config: { 
            tools: [{ googleMaps: {} }, { googleSearch: {} }],
            systemInstruction: "Sei un agente esperto in lead generation. Restituisci solo codice JSON valido, senza testo introduttivo."
        }
    });
    
    const results = extractJSON(response.text || "");
    return Array.isArray(results) ? results : [];
};

export const generateSalesAudit = async (business: Business): Promise<MarketingAudit> => {
    const prompt = `Esegui un audit di marketing per "${business.name}" (${business.type}) a ${business.address}. 
    Motivazione contatto: ${business.reasoning}. 
    Calcola il fatturato mensile perso stimato e identifica problemi critici. 
    Restituisci JSON.`;

    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    seoScore: { type: Type.NUMBER },
                    monthlyLostRevenue: { type: Type.STRING },
                    criticalIssues: { type: Type.ARRAY, items: { type: Type.STRING } },
                    competitorAdvantage: { type: Type.STRING }
                },
                required: ["seoScore", "monthlyLostRevenue", "criticalIssues", "competitorAdvantage"]
            }
        }
    });

    const text = response.text || "{}";
    return JSON.parse(text) as MarketingAudit;
};

export const generateColdEmail = async (business: Business, audit: MarketingAudit, useIrresistibleOffer: boolean, baseUrl: string): Promise<{subject: string, body: string}> => {
    const strategy = useIrresistibleOffer 
        ? "Strategia 'High Effort': Dì esplicitamente che hai lavorato su questo progetto per un'intera settimana dedicandoti al loro brand per creare qualcosa di unico. Usa la leva della reciprocità: 'Visto l'impegno che ci ho messo, ti chiedo solo un parere'." 
        : "Strategia Standard: Focus sui dati dell'audit e professionalità.";

    const prompt = `Scrivi una cold email in italiano per ${business.name}. 
    Audit: Perdita mensile ${audit.monthlyLostRevenue}, Problemi: ${audit.criticalIssues.join(', ')}.
    Strategia: ${strategy}. 
    Link anteprima: ${baseUrl}?preview=${business.id}.
    Restituisci JSON con subject e body.`;

    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    subject: { type: Type.STRING },
                    body: { type: Type.STRING }
                },
                required: ["subject", "body"]
            }
        }
    });

    const text = response.text || "{}";
    return JSON.parse(text) as {subject: string, body: string};
};

export const generateNanoImage = async (keyword: string, isLogo: boolean = false, model: string = 'gemini-2.5-flash-image'): Promise<string> => {
    try {
        const prompt = `${keyword}. ${isLogo ? "modern minimalist vector logo, professional branding, white background" : "high-end commercial photography, depth of field, 8k resolution, cinematic lighting"}`;
        const response = await ai.models.generateContent({
            model: model,
            contents: { parts: [{ text: prompt }] },
            config: { imageConfig: { aspectRatio: isLogo ? "1:1" : "16:9" } }
        });
        const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        return part?.inlineData ? `data:image/png;base64,${part.inlineData.data}` : `https://image.pollinations.ai/prompt/${encodeURIComponent(keyword)}`;
    } catch {
        return `https://image.pollinations.ai/prompt/${encodeURIComponent(keyword)}?seed=${Math.random()}`;
    }
};

export const simulateBusinessReply = async (business: Business): Promise<string> => {
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Simula una risposta entusiasta di ${business.name} interessato a un nuovo sito web. Sii breve e professionale.`
    });
    return response.text || "Interessante, vorrei approfondire.";
};

export const getChatbotResponse = async (message: string, context: any): Promise<string> => {
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Sei l'assistente virtuale del sito di "${context.businessName}". 
        Dati sito: ${JSON.stringify(context.copy)}. 
        Rispondi al cliente: ${message}`,
        config: { systemInstruction: "Risposta breve, cordiale, focalizzata sulla conversione." }
    });
    return response.text || "Siamo a tua disposizione per ogni chiarimento!";
};

export const render2026HTML = (data: any, business: Business, images: any) => {
    const { brand, copy } = data;
    
    // Fallback data if API misses something
    const testimonials = copy.testimonials || [
        { name: "Marco Rossi", text: "Servizio eccellente, ha trasformato la mia attività." },
        { name: "Giulia Bianchi", text: "Professionalità e competenza uniche." }
    ];
    const faq = copy.faq || [
        { q: "Quali sono i tempi?", a: "Operativi in 24/48 ore." },
        { q: "Offrite supporto?", a: "Sì, assistenza dedicata 7/7." }
    ];

    return `<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;600;800&display=swap" rel="stylesheet">
    <style>
        :root { --primary: ${brand.primaryColor}; --secondary: ${brand.secondaryColor}; }
        body { font-family: 'Plus Jakarta Sans', sans-serif; scroll-behavior: smooth; background: #fff; color: #1a1a1a; }
        .glass { background: rgba(255, 255, 255, 0.8); backdrop-filter: blur(12px); border: 1px solid rgba(0,0,0,0.05); }
        .nav-link { position: relative; font-weight: 600; transition: color 0.3s; }
        .nav-link::after { content: ''; position: absolute; bottom: -4px; left: 0; width: 0; height: 2px; background: var(--primary); transition: width 0.3s; }
        .nav-link:hover::after { width: 100%; }
        .page-content { display: none; }
        .page-active { display: block; animation: fadeIn 0.5s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    </style>
</head>
<body>
    <nav class="fixed top-0 left-0 w-full z-50 glass py-4 px-8 flex justify-between items-center">
        <div class="flex items-center gap-3 cursor-pointer" onclick="showPage('home')">
            <img src="${images.logo}" data-key="logo" class="w-10 h-10 rounded-xl shadow-lg">
            <span class="font-extrabold text-xl tracking-tighter">${business.name}</span>
        </div>
        <div class="hidden md:flex gap-10">
            <a href="#" onclick="showPage('home')" class="nav-link">Home</a>
            <a href="#" onclick="showPage('servizi')" class="nav-link">Servizi</a>
            <a href="#" onclick="showPage('chi-siamo')" class="nav-link">Chi Siamo</a>
            <a href="#" onclick="showPage('contatti')" class="nav-link">Contatti</a>
        </div>
        <button class="bg-black text-white px-6 py-2.5 rounded-full font-bold text-sm" onclick="showPage('contatti')">Richiedi Info</button>
    </nav>

    <!-- HOME -->
    <main id="home" class="page-content page-active pt-32">
        <div class="max-w-7xl mx-auto px-8 grid lg:grid-cols-2 gap-16 items-center py-20">
            <div class="space-y-8">
                <h1 class="text-7xl font-extrabold leading-[1.05] tracking-tight" style="color: var(--secondary)">${copy.heroHeadline}</h1>
                <p class="text-xl text-slate-500 leading-relaxed">${copy.heroSubheadline}</p>
                <div class="flex gap-4">
                    <button onclick="showPage('contatti')" class="px-8 py-4 rounded-2xl font-bold text-white shadow-xl hover:scale-105 transition-transform" style="background: var(--primary)">${copy.heroCta}</button>
                    <button onclick="showPage('servizi')" class="px-8 py-4 rounded-2xl font-bold border border-slate-200 hover:bg-slate-50 transition-colors">Scopri di più</button>
                </div>
            </div>
            <img src="${images.hero}" data-key="hero" class="rounded-[3rem] shadow-2xl w-full aspect-[4/3] object-cover cursor-pointer hover:ring-4 hover:ring-blue-500">
        </div>
        
        <!-- Social Proof Strip -->
        <div class="bg-slate-50 py-12 border-y border-slate-100">
            <div class="max-w-7xl mx-auto px-8 flex flex-wrap justify-center gap-12 opacity-60 grayscale hover:grayscale-0 transition-all">
               <span class="text-2xl font-black text-slate-300">TRUSTED BY LOCALS</span>
            </div>
        </div>

        <!-- Reviews Preview -->
        <div class="max-w-7xl mx-auto px-8 py-20">
            <h3 class="text-center text-3xl font-bold mb-12">Dicono di noi</h3>
            <div class="grid md:grid-cols-2 gap-8">
                ${testimonials.map((t: any) => `
                <div class="p-8 bg-white rounded-3xl border border-slate-100 shadow-lg">
                    <div class="flex text-amber-400 mb-4">★★★★★</div>
                    <p class="text-slate-600 mb-4 italic">"${t.text}"</p>
                    <p class="font-bold text-slate-900">— ${t.name}</p>
                </div>
                `).join('')}
            </div>
        </div>
    </main>

    <!-- SERVIZI -->
    <main id="servizi" class="page-content pt-32">
        <div class="max-w-7xl mx-auto px-8 py-20 text-center">
            <h2 class="text-5xl font-extrabold mb-16">I Nostri Servizi</h2>
            <div class="grid md:grid-cols-3 gap-8 text-left">
                ${copy.features.map((f:any, i:number) => `
                    <div class="p-10 glass rounded-[2.5rem] border border-slate-100 hover:shadow-2xl transition-all">
                        <img src="${images[`feature${i+1}`] || ''}" data-key="feature${i+1}" class="w-16 h-16 mb-6 rounded-2xl object-cover">
                        <h3 class="text-2xl font-bold mb-4">${f.title}</h3>
                        <p class="text-slate-500 leading-relaxed">${f.desc}</p>
                    </div>
                `).join('')}
            </div>
            
            <div class="mt-20 bg-slate-900 text-white rounded-[3rem] p-12 text-left grid md:grid-cols-2 gap-12 items-center">
                <div>
                    <h3 class="text-3xl font-bold mb-4">Hai esigenze specifiche?</h3>
                    <p class="text-slate-400">Offriamo soluzioni su misura per ogni necessità. Contattaci per un preventivo personalizzato.</p>
                </div>
                <div class="text-right">
                    <button onclick="showPage('contatti')" class="px-8 py-4 bg-white text-black rounded-2xl font-bold hover:scale-105 transition-transform">Parla con noi</button>
                </div>
            </div>
        </div>
    </main>

    <!-- CHI SIAMO -->
    <main id="chi-siamo" class="page-content pt-32">
        <div class="max-w-7xl mx-auto px-8 py-20 grid md:grid-cols-2 gap-20 items-center">
            <img src="${images.about}" data-key="about" class="rounded-[4rem] shadow-2xl cursor-pointer w-full object-cover h-[600px]">
            <div class="space-y-8">
                <span class="text-blue-600 font-bold tracking-widest uppercase text-sm">La Nostra Storia</span>
                <h2 class="text-6xl font-extrabold leading-tight">${copy.aboutTitle || 'Eccellenza e Passione'}</h2>
                <p class="text-xl text-slate-600 leading-relaxed">${copy.aboutText || 'Da anni ci impegniamo per offrire il meglio ai nostri clienti, combinando tradizione e innovazione.'}</p>
                
                <div class="grid grid-cols-2 gap-8 pt-8 border-t border-slate-100">
                    <div>
                        <p class="text-4xl font-black text-slate-900">100%</p>
                        <p class="text-slate-500 text-sm font-bold uppercase">Clienti Soddisfatti</p>
                    </div>
                    <div>
                        <p class="text-4xl font-black text-slate-900">24/7</p>
                        <p class="text-slate-500 text-sm font-bold uppercase">Supporto Attivo</p>
                    </div>
                </div>
            </div>
        </div>
    </main>

    <!-- CONTATTI -->
    <main id="contatti" class="page-content pt-32">
        <div class="max-w-6xl mx-auto px-8 py-20 text-center space-y-12">
            <h2 class="text-6xl font-extrabold">Inizia il tuo progetto</h2>
            <div class="glass p-12 rounded-[3.5rem] grid md:grid-cols-2 gap-16 text-left shadow-2xl">
                <div class="space-y-8">
                    <div>
                        <p class="text-slate-400 font-bold uppercase text-xs tracking-widest mb-2">Dove Siamo</p>
                        <p class="text-2xl font-bold">${business.address}</p>
                    </div>
                    <div>
                        <p class="text-slate-400 font-bold uppercase text-xs tracking-widest mb-2">Telefono</p>
                        <p class="text-2xl font-bold">${business.phoneNumber || 'Disponibile su richiesta'}</p>
                    </div>
                    <div>
                        <p class="text-slate-400 font-bold uppercase text-xs tracking-widest mb-2">Email</p>
                        <p class="text-2xl font-bold">info@${business.name.toLowerCase().replace(/\s/g, '')}.it</p>
                    </div>
                </div>
                
                <div class="space-y-8">
                    <h3 class="text-2xl font-bold">Domande Frequenti</h3>
                    <div class="space-y-4">
                        ${faq.map((f:any) => `
                        <div class="border-b border-slate-200 pb-4">
                            <p class="font-bold text-slate-800 mb-1">${f.q}</p>
                            <p class="text-slate-500 text-sm">${f.a}</p>
                        </div>
                        `).join('')}
                    </div>
                    
                    <form onsubmit="event.preventDefault(); alert('Messaggio inviato! Ti risponderemo a breve.')" class="space-y-4 pt-8">
                        <input type="text" placeholder="Il tuo nome" class="w-full p-4 bg-slate-100 rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-500">
                        <input type="email" placeholder="La tua email" class="w-full p-4 bg-slate-100 rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-500">
                        <textarea placeholder="Come possiamo aiutarti?" rows="3" class="w-full p-4 bg-slate-100 rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-500"></textarea>
                        <button class="w-full py-5 bg-black text-white rounded-2xl font-bold hover:bg-slate-800 transition-colors">Invia Messaggio</button>
                    </form>
                </div>
            </div>
        </div>
    </main>

    <!-- PRIVACY & GDPR -->
    <main id="privacy" class="page-content pt-32">
        <div class="max-w-4xl mx-auto px-8 py-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <h1 class="text-5xl font-extrabold mb-12 text-slate-900">Privacy & Cookie Policy</h1>
            <div class="prose prose-lg text-slate-600 max-w-none">
                <p class="font-bold text-sm uppercase tracking-widest text-blue-600 mb-8">Ultimo aggiornamento: ${new Date().toLocaleDateString('it-IT')}</p>
                
                <h3 class="text-2xl font-bold text-slate-900 mt-12 mb-4">1. Titolare del Trattamento</h3>
                <p>Il titolare del trattamento dei dati è <strong>${business.name}</strong>, con sede legale in <strong>${business.address}</strong>.<br>
                Per qualsiasi richiesta relativa alla privacy, puoi contattarci direttamente presso la nostra sede o telefonicamente.</p>

                <h3 class="text-2xl font-bold text-slate-900 mt-12 mb-4">2. Dati Raccolti e Finalità</h3>
                <p>Raccogliamo i dati personali forniti volontariamente tramite i moduli di contatto (nome, email, telefono, messaggio). Questi dati sono trattati esclusivamente per:</p>
                <ul class="list-disc pl-6 space-y-2 my-4">
                    <li>Rispondere alle tue richieste di informazioni o preventivi.</li>
                    <li>Fornire i servizi richiesti ed eseguire obblighi contrattuali.</li>
                    <li>Adempiere agli obblighi di legge e amministrativi.</li>
                </ul>
                <p>I dati non saranno ceduti a terzi per finalità di marketing senza il tuo esplicito consenso.</p>

                <h3 class="text-2xl font-bold text-slate-900 mt-12 mb-4">3. Base Giuridica</h3>
                <p>Il trattamento si basa sull'esecuzione di misure precontrattuali o contrattuali adottate su richiesta dell'interessato (art. 6.1.b GDPR) e sul legittimo interesse del titolare.</p>

                <h3 class="text-2xl font-bold text-slate-900 mt-12 mb-4">4. Cookie Policy</h3>
                <p>Questo sito utilizza esclusivamente cookie tecnici essenziali per il corretto funzionamento e la sicurezza del sito. Non vengono utilizzati cookie di profilazione o tracciamento di terze parti senza il preventivo consenso dell'utente (banner cookie).</p>

                <h3 class="text-2xl font-bold text-slate-900 mt-12 mb-4">5. Periodo di Conservazione</h3>
                <p>I dati saranno conservati per il tempo strettamente necessario a gestire la tua richiesta e, successivamente, per i termini previsti dalla legge per la conservazione amministrativa (solitamente 10 anni per dati amministrativi).</p>

                <h3 class="text-2xl font-bold text-slate-900 mt-12 mb-4">6. Diritti dell'Interessato</h3>
                <p>Ai sensi del Regolamento UE 2016/679 (GDPR), hai il diritto di:</p>
                <ul class="list-disc pl-6 space-y-2 my-4">
                    <li>Accedere ai tuoi dati personali.</li>
                    <li>Chiedere la rettifica o la cancellazione degli stessi.</li>
                    <li>Limitare il trattamento o opporti ad esso.</li>
                    <li>Richiedere la portabilità dei dati.</li>
                </ul>
                <p>Per esercitare questi diritti, rivolgiti al Titolare presso i contatti indicati.</p>
            </div>
            <div class="mt-16 pt-8 border-t border-slate-200">
                <button onclick="showPage('home')" class="text-blue-600 font-bold hover:underline">← Torna alla Home</button>
            </div>
        </div>
    </main>

    <footer class="py-20 bg-slate-900 text-slate-400 text-sm mt-20">
        <div class="max-w-7xl mx-auto px-8 grid md:grid-cols-4 gap-12 mb-12">
            <div class="col-span-2">
                <span class="text-2xl font-bold text-white block mb-4">${business.name}</span>
                <p class="max-w-xs">Soluzioni professionali per esigenze moderne. Contattaci per scoprire come possiamo aiutarti a crescere.</p>
            </div>
            <div>
                <p class="text-white font-bold mb-4">Link Rapidi</p>
                <ul class="space-y-2">
                    <li><a href="#" onclick="showPage('home')" class="hover:text-white">Home</a></li>
                    <li><a href="#" onclick="showPage('servizi')" class="hover:text-white">Servizi</a></li>
                    <li><a href="#" onclick="showPage('chi-siamo')" class="hover:text-white">Chi Siamo</a></li>
                </ul>
            </div>
            <div>
                <p class="text-white font-bold mb-4">Note Legali</p>
                <ul class="space-y-2">
                    <li><a href="#" onclick="showPage('privacy')" class="hover:text-white">Privacy Policy</a></li>
                    <li><a href="#" onclick="showPage('privacy')" class="hover:text-white">Cookie Policy</a></li>
                    <li><a href="#" onclick="showPage('privacy')" class="hover:text-white">Termini & Condizioni</a></li>
                </ul>
            </div>
        </div>
        <div class="text-center border-t border-slate-800 pt-8">
            &copy; 2026 ${business.name}. All rights reserved. Powered by WebRenovator Vision.
        </div>
    </footer>

    <!-- CHATBOT WIDGET -->
    <div id="ai-chat" class="fixed bottom-8 right-8 z-[100]">
        <button onclick="toggleChat()" class="w-16 h-16 bg-black text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform">
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg>
        </button>
        <div id="chat-win" class="hidden absolute bottom-20 right-0 w-80 glass rounded-[2rem] shadow-2xl flex flex-col overflow-hidden">
            <div class="bg-black p-4 text-white font-bold flex justify-between">Assistente AI <button onclick="toggleChat()">×</button></div>
            <div id="messages" class="h-64 p-4 overflow-y-auto space-y-3 text-xs">
                <div class="bg-slate-100 p-3 rounded-2xl self-start">Ciao! Posso aiutarti con i servizi di ${business.name}?</div>
            </div>
            <div class="p-4 bg-white flex gap-2">
                <input id="chat-in" type="text" placeholder="Scrivi..." class="flex-1 text-xs outline-none">
                <button onclick="send()" class="text-blue-600 font-bold">Invia</button>
            </div>
        </div>
    </div>

    <script>
        function showPage(id) {
            document.querySelectorAll('.page-content').forEach(p => p.classList.remove('page-active'));
            document.getElementById(id).classList.add('page-active');
            window.scrollTo(0,0);
        }
        function toggleChat() { document.getElementById('chat-win').classList.toggle('hidden'); }
        async function send() {
            const input = document.getElementById('chat-in');
            const msg = input.value;
            if(!msg) return;
            const box = document.getElementById('messages');
            box.innerHTML += '<div class="bg-blue-600 text-white p-3 rounded-2xl self-end text-right ml-auto max-w-[80%]">' + msg + '</div>';
            input.value = '';
            box.scrollTop = box.scrollHeight;
            
            window.parent.postMessage({ type: 'CHAT_REQUEST', message: msg }, '*');
        }
        window.addEventListener('message', (e) => {
            if(e.data.type === 'CHAT_RESPONSE') {
                const box = document.getElementById('messages');
                box.innerHTML += '<div class="bg-slate-100 p-3 rounded-2xl self-start max-w-[80%]">' + e.data.message + '</div>';
                box.scrollTop = box.scrollHeight;
            }
        });
        document.querySelectorAll('img[data-key]').forEach(img => {
            img.onclick = () => window.parent.postMessage({ type: 'ELEMENT_CLICKED', key: img.getAttribute('data-key'), category: 'image' }, '*');
        });
    </script>
</body>
</html>`;
};

export const generateSitePreview = async (business: Business, aiConfig: AIModelConfig, designPrefs: DesignPreferences, customImages?: Record<string, string>): Promise<GeneratedSite> => {
    // UPDATED PROMPT: Request testimonials and FAQs
    const textPrompt = `Genera un sito moderno 2026 per "${business.name}" (${business.type}). 
    Palette HEX: ${designPrefs.palette}.
    RESTITUISCI SOLO JSON: { 
        brand: { primaryColor, secondaryColor, fontHeading, fontBody }, 
        copy: { 
            heroHeadline, heroSubheadline, heroCta, 
            aboutTitle, aboutText, 
            features: [{title, desc}],
            testimonials: [{name, text}],
            faq: [{q, a}]
        }, 
        images: { heroKeyword, featureKeywords: [], aboutKeyword } 
    }`;

    const response = await ai.models.generateContent({
        model: aiConfig.textModel,
        contents: textPrompt,
        config: { responseMimeType: "application/json" }
    });
    
    const siteData = extractJSON(response.text || "");
    if (!siteData) throw new Error("AI data extraction failed");

    const images: Record<string, string> = { ...customImages };
    const realPhotos = business.photos || [];
    let photoIndex = 0;

    // LOGO: Generate new (usually businesses without site don't have digital logo assets)
    if (!images.logo) images.logo = await generateNanoImage(business.name, true, aiConfig.imageModel);

    // HERO: Prioritize real photo if available
    if (!images.hero) {
        if (realPhotos.length > photoIndex) {
            images.hero = realPhotos[photoIndex++];
        } else {
            images.hero = await generateNanoImage(siteData.images.heroKeyword, false, aiConfig.imageModel);
        }
    }

    // ABOUT: Prioritize real photo if available
    if (!images.about) {
        if (realPhotos.length > photoIndex) {
            images.about = realPhotos[photoIndex++];
        } else {
            images.about = await generateNanoImage(siteData.images.aboutKeyword || 'professional business environment', false, aiConfig.imageModel);
        }
    }
    
    // FEATURES: Use AI for consistency (icons/abstract), unless we have many real photos?
    // Let's stick to AI for features for design consistency as they usually require specific context
    if (siteData.images.featureKeywords) {
        for (let i = 0; i < siteData.images.featureKeywords.length; i++) {
            const key = `feature${i+1}`;
            if (!images[key]) images[key] = await generateNanoImage(siteData.images.featureKeywords[i], false, aiConfig.imageModel);
        }
    }

    const html = render2026HTML(siteData, business, images);
    return { html, copywriting: siteData.copy.heroHeadline, brandData: siteData.brand, contentData: siteData.copy, images };
};
