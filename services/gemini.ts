
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
        Identifica quelle che NON hanno un sito web o hanno un sito obsoleto.
        Usa Google Search per verificare la presenza digitale.
        Cerca immagini REALI su web.
        Restituisci array JSON: [{id, name, address, type, website, phoneNumber, status, leadStatus, reasoning, photos}]`,
        config: { 
            tools: [{ googleMaps: {} }, { googleSearch: {} }],
            systemInstruction: "Agente lead generation senior. Solo JSON pulito."
        }
    });
    const results = extractJSON(response.text || "");
    return Array.isArray(results) ? results : [];
};

export const generateSalesAudit = async (business: Business): Promise<MarketingAudit> => {
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Audit marketing per "${business.name}" (${business.type}). Calcola perdita mensile e criticità digitali.`,
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
    return JSON.parse(response.text || "{}");
};

export const generateColdEmail = async (business: Business, audit: MarketingAudit, useIrresistibleOffer: boolean, baseUrl: string): Promise<{subject: string, body: string}> => {
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Scrivi email di vendita d'élite per ${business.name}. Usa i dati: ${audit.monthlyLostRevenue} persi. Link anteprima: ${baseUrl}?preview=${business.id}. Strategia: ${useIrresistibleOffer ? 'Psicologia della Reciprocità (Lavoro già svolto)' : 'Professionale standard'}.`,
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
    return JSON.parse(response.text || "{}");
};

export const simulateBusinessReply = async (business: Business): Promise<string> => {
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Risposta breve e interessata del titolare di ${business.name} alla proposta di un nuovo sito.`,
    });
    return response.text || "Sembra interessante, parliamone.";
};

export const generateNanoImage = async (keyword: string, isLogo: boolean = false, model: string = 'gemini-2.5-flash-image'): Promise<string> => {
    try {
        const prompt = `${keyword}. ${isLogo ? "ultra-minimal luxury vector logo, negative space, professional, white background" : "premium editorial photography, 8k, architectural lighting, soft shadows, masterpiece"}`;
        const response = await ai.models.generateContent({
            model: model,
            contents: { parts: [{ text: prompt }] },
            config: { imageConfig: { aspectRatio: isLogo ? "1:1" : "16:9" } }
        });
        const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        return part?.inlineData ? `data:image/png;base64,${part.inlineData.data}` : `https://image.pollinations.ai/prompt/${encodeURIComponent(keyword)}?width=1280&height=720&nologo=true`;
    } catch {
        return `https://image.pollinations.ai/prompt/${encodeURIComponent(keyword)}?seed=${Math.random()}&width=1280&height=720&nologo=true`;
    }
};

export const getChatbotResponse = async (message: string, context: any): Promise<string> => {
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Sei il concierge di "${context.businessName}". Rispondi a: ${message}`,
        config: { systemInstruction: "Sii estremamente colto, gentile ed elegante. Rispondi in 2 frasi." }
    });
    return response.text || "Siamo onorati del vostro interesse.";
};

export const render2026HTML = (data: any, business: Business, images: any) => {
    const { brand, copy } = data;
    return `<!DOCTYPE html>
<html lang="it" class="scroll-smooth">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,600;1,300&family=Inter:wght@300;400;600&display=swap" rel="stylesheet">
    <style>
        :root { --p: ${brand.primaryColor}; --s: ${brand.secondaryColor}; }
        body { font-family: 'Inter', sans-serif; color: #111; background: #fff; line-height: 1.6; }
        h1, h2, h3 { font-family: 'Cormorant Garamond', serif; font-weight: 300; font-style: italic; letter-spacing: -0.02em; }
        .text-brand { color: var(--p); }
        .bg-brand { background-color: var(--p); }
        .glass { background: rgba(255,255,255,0.8); backdrop-filter: blur(20px); border-bottom: 1px solid rgba(0,0,0,0.05); }
        .page-content { display: none; }
        .page-active { display: block; animation: reveal 1.2s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes reveal { from { opacity: 0; transform: translateY(40px); filter: blur(10px); } to { opacity: 1; transform: translateY(0); filter: blur(0); } }
        .hover-lift { transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1); }
        .hover-lift:hover { transform: translateY(-10px); }
        .bento-grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 24px; }
    </style>
</head>
<body class="antialiased selection:bg-black selection:text-white">
    <nav class="fixed top-0 left-0 w-full z-[100] glass px-12 py-6 flex justify-between items-center">
        <div class="flex items-center gap-4 cursor-pointer" onclick="showPage('home')">
            <img src="${images.logo}" class="w-12 h-12 rounded-full object-cover grayscale hover:grayscale-0 transition-all">
            <span class="font-bold text-xs uppercase tracking-[0.3em]">${business.name}</span>
        </div>
        <div class="hidden lg:flex gap-16">
            <a href="#" onclick="showPage('home')" class="text-[10px] font-bold uppercase tracking-widest hover:text-brand transition-colors">Intro</a>
            <a href="#" onclick="showPage('servizi')" class="text-[10px] font-bold uppercase tracking-widest hover:text-brand transition-colors">Expertise</a>
            <a href="#" onclick="showPage('chi-siamo')" class="text-[10px] font-bold uppercase tracking-widest hover:text-brand transition-colors">Vision</a>
            <a href="#" onclick="showPage('contatti')" class="text-[10px] font-bold uppercase tracking-widest hover:text-brand transition-colors">Contatti</a>
        </div>
        <button class="px-8 py-3 border border-black rounded-full text-[9px] font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-all" onclick="showPage('contatti')">Connettiamoci</button>
    </nav>

    <main id="home" class="page-content page-active pt-48 pb-32">
        <div class="max-w-7xl mx-auto px-12">
            <div class="max-w-4xl">
                <span class="text-brand font-bold uppercase tracking-[0.4em] text-[10px] mb-8 block">Eccellenza Italiana</span>
                <h1 class="text-7xl md:text-9xl font-light leading-[0.9] mb-12">${copy.heroHeadline}</h1>
                <p class="text-2xl text-slate-500 font-light max-w-2xl leading-relaxed mb-16">${copy.heroSubheadline}</p>
                <div class="flex items-center gap-12">
                    <button onclick="showPage('servizi')" class="text-xs font-bold uppercase tracking-widest border-b-2 border-brand pb-2">${copy.heroCta}</button>
                    <div class="hidden md:flex items-center gap-4">
                        <div class="w-12 h-[1px] bg-slate-200"></div>
                        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Est. 2026</span>
                    </div>
                </div>
            </div>
            <div class="mt-32 relative group overflow-hidden rounded-[4rem]">
                <img src="${images.hero}" data-key="hero" class="w-full h-[800px] object-cover transition-transform duration-[3s] group-hover:scale-110 cursor-pointer">
                <div class="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-all"></div>
            </div>
        </div>
    </main>

    <main id="servizi" class="page-content pt-48 pb-32">
        <div class="max-w-7xl mx-auto px-12">
            <h2 class="text-6xl md:text-8xl mb-24 italic">L'Arte del Fare.</h2>
            <div class="grid md:grid-cols-3 gap-20">
                ${copy.features.map((f:any, i:number) => `
                    <div class="group cursor-pointer" onclick="showPage('contatti')">
                        <div class="aspect-[4/5] overflow-hidden rounded-3xl mb-8">
                            <img src="${images[`feature${i+1}`] || ''}" data-key="feature${i+1}" class="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105">
                        </div>
                        <h3 class="text-4xl mb-4">${f.title}</h3>
                        <p class="text-sm text-slate-500 font-light leading-relaxed">${f.desc}</p>
                    </div>
                `).join('')}
            </div>
        </div>
    </main>

    <main id="chi-siamo" class="page-content pt-48 pb-32">
        <div class="max-w-7xl mx-auto px-12 grid lg:grid-cols-2 gap-32 items-center">
            <div class="space-y-12">
                <h2 class="text-7xl md:text-8xl">${copy.aboutTitle || 'DNA Innovativo.'}</h2>
                <p class="text-2xl text-slate-600 font-light leading-relaxed">${copy.aboutText || 'Crediamo che ogni dettaglio sia una firma. Il nostro impegno è rendere ogni interazione un momento memorabile.'}</p>
                <div class="pt-12 border-t border-slate-100 flex gap-20">
                    <div><p class="text-4xl font-light italic">99%</p><p class="text-[9px] font-bold uppercase tracking-widest text-slate-400">Quality Rate</p></div>
                    <div><p class="text-4xl font-light italic">24/7</p><p class="text-[9px] font-bold uppercase tracking-widest text-slate-400">Concierge</p></div>
                </div>
            </div>
            <img src="${images.about}" data-key="about" class="w-full h-[700px] object-cover rounded-[5rem] shadow-2xl">
        </div>
    </main>

    <main id="contatti" class="page-content pt-48 pb-32 min-h-screen">
        <div class="max-w-7xl mx-auto px-12">
            <h2 class="text-7xl md:text-9xl mb-32 italic">Scriviamo la storia.</h2>
            <div class="grid lg:grid-cols-2 gap-40">
                <div class="space-y-16">
                    <div><p class="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4">Location</p><p class="text-3xl font-light">${business.address}</p></div>
                    <div><p class="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4">Phone</p><p class="text-3xl font-light">${business.phoneNumber || '+39 02 1234567'}</p></div>
                    <div><p class="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4">Mail</p><p class="text-3xl font-light underline decoration-brand underline-offset-8">hello@${business.name.toLowerCase().replace(/\s/g, '')}.it</p></div>
                </div>
                <form class="space-y-12" onsubmit="event.preventDefault(); alert('Grazie. Sarete ricontattati a breve.')">
                    <input type="text" placeholder="Nome" class="w-full bg-transparent border-b border-slate-200 py-4 outline-none focus:border-brand transition-colors text-xl font-light">
                    <input type="email" placeholder="Email" class="w-full bg-transparent border-b border-slate-200 py-4 outline-none focus:border-brand transition-colors text-xl font-light">
                    <textarea placeholder="Il vostro progetto" rows="4" class="w-full bg-transparent border-b border-slate-200 py-4 outline-none focus:border-brand transition-colors text-xl font-light resize-none"></textarea>
                    <button class="px-16 py-5 bg-black text-white rounded-full text-[10px] font-bold uppercase tracking-widest hover:scale-105 transition-transform">Invia Richiesta</button>
                </form>
            </div>
        </div>
    </main>

    <footer class="py-20 border-t border-slate-100">
        <div class="max-w-7xl mx-auto px-12 flex justify-between items-center text-[9px] font-bold uppercase tracking-widest text-slate-400">
            <span>&copy; 2026 ${business.name}</span>
            <div class="flex gap-12">
                <a href="#" onclick="showPage('privacy')">Privacy</a>
                <a href="#" onclick="showPage('privacy')">Legal</a>
            </div>
        </div>
    </footer>

    <div id="ai-chat" class="fixed bottom-12 right-12 z-[200]">
        <button onclick="toggleChat()" class="w-20 h-20 bg-black text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all">
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg>
        </button>
        <div id="chat-win" class="hidden absolute bottom-28 right-0 w-[400px] h-[500px] bg-white border border-slate-100 rounded-[3rem] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-8">
            <div class="bg-black p-8 text-white flex justify-between items-center"><span class="text-[10px] font-bold uppercase tracking-widest">Concierge AI</span><button onclick="toggleChat()">×</button></div>
            <div id="messages" class="flex-1 p-8 overflow-y-auto space-y-6 text-xs font-light">
                <div class="bg-slate-50 p-5 rounded-3xl self-start">Benvenuto. Come posso assisterla oggi?</div>
            </div>
            <div class="p-8 bg-white border-t border-slate-50 flex gap-4">
                <input id="chat-in" type="text" placeholder="Scriva qui..." class="flex-1 text-xs outline-none font-light">
                <button onclick="send()" class="text-[10px] font-bold uppercase text-brand">Invia</button>
            </div>
        </div>
    </div>

    <script>
        function showPage(id) {
            document.querySelectorAll('.page-content').forEach(p => p.classList.remove('page-active'));
            document.getElementById(id).classList.add('page-active');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        function toggleChat() { document.getElementById('chat-win').classList.toggle('hidden'); }
        async function send() {
            const input = document.getElementById('chat-in');
            const msg = input.value.trim();
            if(!msg) return;
            const box = document.getElementById('messages');
            box.innerHTML += '<div class="bg-black text-white p-5 rounded-3xl self-end text-right ml-auto">' + msg + '</div>';
            input.value = '';
            box.scrollTop = box.scrollHeight;
            window.parent.postMessage({ type: 'CHAT_REQUEST', message: msg }, '*');
        }
        window.addEventListener('message', (e) => {
            if(e.data.type === 'CHAT_RESPONSE') {
                const box = document.getElementById('messages');
                box.innerHTML += '<div class="bg-slate-50 p-5 rounded-3xl self-start">' + e.data.message + '</div>';
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
    const textPrompt = `Genera contenuti d'élite per un sito web luxury-minimal per "${business.name}" (${business.type}).
    PALETTE: ${designPrefs.palette}.
    RESTITUISCI SOLO JSON: 
    { 
        "brand": { "primaryColor", "secondaryColor", "fontHeading", "fontBody" }, 
        "copy": { 
            "heroHeadline": "Slogan poetico corto", 
            "heroSubheadline": "Paragrafo persuasivo d'élite", 
            "heroCta": "CTA raffinata", 
            "aboutTitle": "Titolo Vision", 
            "aboutText": "Testo emozionale", 
            "features": [{"title": "Benefit", "desc": "Refined desc"} x 3],
            "testimonials": [{"name": "Autore", "text": "Recensione"} x 2],
            "faq": [{"q": "Q", "a": "A"} x 2]
        }, 
        "images": { "heroKeyword", "featureKeywords": ["img1", "img2", "img3"], "aboutKeyword" } 
    }`;

    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview', // USE PRO FOR BEST COPY
        contents: textPrompt,
        config: { 
            responseMimeType: "application/json",
            systemInstruction: "Sei un Creative Director di lusso. Ogni parola deve trasmettere valore assoluto."
        }
    });
    
    const siteData = extractJSON(response.text || "");
    if (!siteData) throw new Error("AI failed");

    const images: Record<string, string> = { ...customImages };
    const realPhotos = business.photos || [];
    let photoIndex = 0;

    if (!images.logo) images.logo = await generateNanoImage(business.name, true, aiConfig.imageModel);
    if (!images.hero) images.hero = realPhotos.length > photoIndex ? realPhotos[photoIndex++] : await generateNanoImage(siteData.images.heroKeyword, false, aiConfig.imageModel);
    if (!images.about) images.about = realPhotos.length > photoIndex ? realPhotos[photoIndex++] : await generateNanoImage(siteData.images.aboutKeyword, false, aiConfig.imageModel);
    
    if (siteData.images.featureKeywords) {
        for (let i = 0; i < siteData.images.featureKeywords.length; i++) {
            const key = `feature${i+1}`;
            if (!images[key]) images[key] = await generateNanoImage(siteData.images.featureKeywords[i], false, aiConfig.imageModel);
        }
    }

    const html = render2026HTML(siteData, business, images);
    return { html, copywriting: siteData.copy.heroHeadline, brandData: siteData.brand, contentData: siteData.copy, images };
};
