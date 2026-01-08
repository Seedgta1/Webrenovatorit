
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
    // Usiamo gemini-2.5-flash per il supporto Google Maps Grounding
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Trova 5 attività reali a ${location} nel settore "${niche}". 
        Identifica specificamente quelle che NON hanno un sito web o hanno un sito molto vecchio (non responsive).
        Usa Google Search per verificare se esiste un dominio.
        Restituisci ESCLUSIVAMENTE un array JSON con questa struttura: 
        [{id, name, address, type, website, phoneNumber, status, leadStatus, reasoning}]
        Status può essere: 'NO_SITE' o 'OLD_SITE'. LeadStatus deve essere 'NEW'.`,
        config: { 
            tools: [{ googleMaps: {} }, { googleSearch: {} }],
            systemInstruction: "Sei un agente esperto in lead generation. Restituisci solo codice JSON valido, senza testo introduttivo."
        }
    });
    
    const results = extractJSON(response.text || "");
    return Array.isArray(results) ? results : [];
};

// --- FIX: Added generateSalesAudit export ---
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

// --- FIX: Added generateColdEmail export ---
export const generateColdEmail = async (business: Business, audit: MarketingAudit, useIrresistibleOffer: boolean, baseUrl: string): Promise<{subject: string, body: string}> => {
    const strategy = useIrresistibleOffer 
        ? "Usa la strategia 'Offerta Irresistibile': Sconto 50% sul setup in cambio di feedback/caso studio." 
        : "Usa una strategia standard di proposta professionale mostrando l'anteprima del sito.";

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
        <button class="bg-black text-white px-6 py-2.5 rounded-full font-bold text-sm" onclick="showPage('contatti')">Inizia Ora</button>
    </nav>

    <!-- HOME -->
    <main id="home" class="page-content page-active pt-32">
        <div class="max-w-7xl mx-auto px-8 grid lg:grid-cols-2 gap-16 items-center py-20">
            <div class="space-y-8">
                <h1 class="text-7xl font-extrabold leading-[1.05] tracking-tight" style="color: var(--secondary)">${copy.heroHeadline}</h1>
                <p class="text-xl text-slate-500 leading-relaxed">${copy.heroSubheadline}</p>
                <div class="flex gap-4">
                    <button class="px-8 py-4 rounded-2xl font-bold text-white shadow-xl hover:scale-105 transition-transform" style="background: var(--primary)">${copy.heroCta}</button>
                </div>
            </div>
            <img src="${images.hero}" data-key="hero" class="rounded-[3rem] shadow-2xl w-full aspect-[4/3] object-cover cursor-pointer hover:ring-4 hover:ring-blue-500">
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
        </div>
    </main>

    <!-- CHI SIAMO -->
    <main id="chi-siamo" class="page-content pt-32">
        <div class="max-w-7xl mx-auto px-8 py-20 grid md:grid-cols-2 gap-20 items-center">
            <img src="${images.about}" data-key="about" class="rounded-[4rem] shadow-2xl cursor-pointer">
            <div class="space-y-6">
                <h2 class="text-5xl font-extrabold">${copy.aboutTitle || 'Chi Siamo'}</h2>
                <p class="text-xl text-slate-600 leading-relaxed">${copy.aboutText || 'Siamo leader nel settore da oltre 10 anni.'}</p>
            </div>
        </div>
    </main>

    <!-- CONTATTI -->
    <main id="contatti" class="page-content pt-32">
        <div class="max-w-4xl mx-auto px-8 py-20 text-center space-y-12">
            <h2 class="text-6xl font-extrabold">Entra in contatto</h2>
            <div class="glass p-12 rounded-[3.5rem] grid md:grid-cols-2 gap-12 text-left">
                <div class="space-y-6">
                    <p class="text-slate-400 font-bold uppercase text-xs tracking-widest">Contatti Diretti</p>
                    <p class="text-xl font-bold">${business.address}</p>
                    <p class="text-slate-500">${business.phoneNumber || 'Chiama per info'}</p>
                </div>
                <form onsubmit="event.preventDefault(); alert('Grazie!')" class="space-y-4">
                    <input type="text" placeholder="Nome" class="w-full p-4 bg-slate-100 rounded-2xl border-none outline-none">
                    <button class="w-full py-4 bg-black text-white rounded-2xl font-bold">Invia Richiesta</button>
                </form>
            </div>
        </div>
    </main>

    <footer class="py-20 text-center text-slate-400 text-sm border-t border-slate-50">
        &copy; 2026 ${business.name}. Built with WebRenovator Vision.
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
    const textPrompt = `Genera un sito moderno 2026 per "${business.name}" (${business.type}). 
    Palette HEX: ${designPrefs.palette}.
    RESTITUISCI SOLO JSON: { 
        brand: { primaryColor, secondaryColor, fontHeading, fontBody }, 
        copy: { heroHeadline, heroSubheadline, heroCta, aboutTitle, aboutText, features: [{title, desc}] }, 
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
    if (!images.logo) images.logo = await generateNanoImage(business.name, true, aiConfig.imageModel);
    if (!images.hero) images.hero = await generateNanoImage(siteData.images.heroKeyword, false, aiConfig.imageModel);
    if (!images.about) images.about = await generateNanoImage(siteData.images.aboutKeyword || 'professional business environment', false, aiConfig.imageModel);
    
    if (siteData.images.featureKeywords) {
        for (let i = 0; i < siteData.images.featureKeywords.length; i++) {
            const key = `feature${i+1}`;
            if (!images[key]) images[key] = await generateNanoImage(siteData.images.featureKeywords[i], false, aiConfig.imageModel);
        }
    }

    const html = render2026HTML(siteData, business, images);
    return { html, copywriting: siteData.copy.heroHeadline, brandData: siteData.brand, contentData: siteData.copy, images };
};
