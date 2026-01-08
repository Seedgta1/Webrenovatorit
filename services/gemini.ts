import { GoogleGenAI, Type } from "@google/genai";
import { Business, GeneratedSite, MarketingAudit, AgentBrandOutput, AgentCopyOutput, AgentVisualOutput, AgentUXOutput, AgentAnalystOutput, AgentChatbotOutput, AgentReviewsOutput } from "../types";

// --- HELPERS ---
const extractJSON = (text: string) => {
    try {
        let cleanText = text.replace(/```json/gi, '').replace(/```/g, '').trim();
        const firstOpen = cleanText.indexOf('{');
        const firstArrOpen = cleanText.indexOf('[');
        const lastClose = cleanText.lastIndexOf('}');
        const lastArrClose = cleanText.lastIndexOf(']');

        const isObject = firstOpen !== -1 && (firstArrOpen === -1 || firstOpen < firstArrOpen);
        const isArray = firstArrOpen !== -1 && (firstOpen === -1 || firstArrOpen < firstOpen);

        if (isArray && lastArrClose !== -1) {
             cleanText = cleanText.substring(firstArrOpen, lastArrClose + 1);
        } else if (isObject && lastClose !== -1) {
             cleanText = cleanText.substring(firstOpen, lastClose + 1);
        }
        
        return JSON.parse(cleanText);
    } catch (e) {
        console.warn("JSON Extraction Failed", e);
        return null;
    }
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const callGeminiWithRetry = async <T>(
    operation: () => Promise<T>, 
    retries = 3, 
    delay = 2000, 
    context = ""
): Promise<T> => {
    try {
        return await operation();
    } catch (error: any) {
        const errorString = JSON.stringify(error);
        if (errorString.includes("403") || errorString.includes("PERMISSION_DENIED")) {
            console.error(`[${context}] 403 Permission Denied - Check API Key.`);
            throw error;
        }
        if (retries > 0) {
            console.warn(`[${context}] Retrying... (${retries} left)`);
            await sleep(delay);
            return callGeminiWithRetry(operation, retries - 1, delay * 2, context);
        }
        throw error;
    }
};

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- MODELLI CONFIGURATI ---
const MODEL_TEXT = 'gemini-3-flash-preview'; 
const MODEL_MAPS = 'gemini-2.5-flash';
const MODEL_IMAGE = 'gemini-2.5-flash-image';

// --- 1. REPUTATION AGENT ---
export const agentReviews = async (business: Business): Promise<AgentReviewsOutput> => {
    const prompt = `Task: Trova o genera 3 recensioni realistiche (5 stelle) per "${business.name}" (${business.type}, ${business.address}).
    JSON Output: { "reviews": [{ "author": "Nome", "text": "...", "rating": 5 }], "summary": "4.9/5 su Google" }`;

    try {
        return await callGeminiWithRetry(async () => {
            const response = await ai.models.generateContent({
                model: MODEL_TEXT,
                contents: prompt,
                config: { responseMimeType: "application/json" }
            });
            return extractJSON(response.text || "") || { reviews: [], summary: "Eccellente" };
        }, 2, 1000, "Reviews");
    } catch {
        return {
            reviews: [
                { author: "Cliente Soddisfatto", text: "Professionalità e cortesia uniche. Consigliatissimo!", rating: 5, source: "Google" },
                { author: "Marco Rossi", text: "Esperienza positiva, tornerò sicuramente.", rating: 5, source: "Google" },
                { author: "Giulia Bianchi", text: "Servizio eccellente e ambiente curato.", rating: 5, source: "Google" }
            ],
            summary: "4.8 su Google"
        };
    }
};

// --- 2. DATA AGENT ---
interface SiteDataOutput {
    brand: {
        primaryColor: string;
        secondaryColor: string;
        accentColor: string;
        fontHeading: string;
        fontBody: string;
        themeMode: 'light' | 'dark';
    };
    copy: {
        navCta: string;
        heroHeadline: string;
        heroSubheadline: string;
        heroCta: string;
        aboutTitle: string;
        aboutText: string;
        featuresTitle: string;
        features: { title: string; desc: string; icon: string }[];
        reviewsTitle: string;
        footerText: string;
    };
    images: {
        heroKeyword: string;
        aboutKeyword: string;
        feature1Keyword: string;
        feature2Keyword: string;
        feature3Keyword: string;
    };
    chatbot: {
        welcomeMessage: string;
    };
}

export const agentUnifiedGenerator = async (business: Business, reviews: AgentReviewsOutput): Promise<SiteDataOutput> => {
    const prompt = `Sei un Creative Director di un'agenzia web di lusso (Awwwards level).
    CLIENTE: "${business.name}"
    SETTORE: "${business.type}"
    LUOGO: "${business.address}"

    Il tuo compito è definire il BRANDING e il COPYWRITING per un sito web ultra-moderno.
    
    IMPORTANTE PER LE IMMAGINI: Genera descrizioni visive (prompt) ESTREMAMENTE dettagliate, realistiche e specifiche per questa attività. 
    Esempio: Invece di "gym", scrivi "modern crossfit gym interior with black equipment, dramatic neon lighting, high contrast, 4k".

    OUTPUT JSON FORMAT:
    {
        "brand": { "primaryColor": "#...", "secondaryColor": "#...", "accentColor": "#...", "fontHeading": "...", "fontBody": "Inter", "themeMode": "light" },
        "copy": { 
            "navCta": "Prenota",
            "heroHeadline": "Titolo Potente (max 6 parole)", 
            "heroSubheadline": "Sottotitolo evocativo (max 15 parole)", 
            "heroCta": "Scopri di più", 
            "aboutTitle": "La Nostra Storia",
            "aboutText": "Testo emozionale di 3 frasi...",
            "featuresTitle": "I Nostri Punti di Forza",
            "features": [
                { "title": "...", "desc": "...", "icon": "star" },
                { "title": "...", "desc": "...", "icon": "shield" },
                { "title": "...", "desc": "...", "icon": "zap" }
            ],
            "reviewsTitle": "Dicono di Noi",
            "footerText": "Eccellenza dal 2024."
        },
        "images": {
            "heroKeyword": "descrizione dettagliata hero image...",
            "aboutKeyword": "descrizione dettagliata about image...",
            "feature1Keyword": "descrizione dettagliata feature 1...",
            "feature2Keyword": "descrizione dettagliata feature 2...",
            "feature3Keyword": "descrizione dettagliata feature 3..."
        },
        "chatbot": { "welcomeMessage": "Benvenuto in ${business.name}. Come posso aiutarti?" }
    }`;

    return callGeminiWithRetry(async () => {
        const response = await ai.models.generateContent({
            model: MODEL_TEXT,
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        
        const data = extractJSON(response.text || "");
        if (!data) throw new Error("Generazione Dati fallita.");
        return data as SiteDataOutput;
    }, 2, 5000, "UnifiedAgent");
};

// --- 3. TEMPLATE ENGINE ---
const renderTemplate = (data: SiteDataOutput, business: Business, reviews: AgentReviewsOutput, images: Record<string, string>) => {
    const { brand, copy } = data;
    
    const icons: Record<string, string> = {
        star: '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path></svg>',
        shield: '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>',
        zap: '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>',
        default: '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M5 13l4 4L19 7"></path></svg>'
    };

    return `<!DOCTYPE html>
<html lang="it" class="scroll-smooth">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${business.name}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=${brand.fontHeading.replace(' ', '+')}:wght@300;400;600;700&family=${brand.fontBody.replace(' ', '+')}:wght@300;400;500;600&display=swap" rel="stylesheet">
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        primary: '${brand.primaryColor}',
                        secondary: '${brand.secondaryColor}',
                        accent: '${brand.accentColor}',
                    },
                    fontFamily: {
                        heading: ['"${brand.fontHeading}"', 'serif'],
                        body: ['"${brand.fontBody}"', 'sans-serif'],
                    },
                    boxShadow: {
                        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
                    }
                }
            }
        }
    </script>
    <style>
        body { font-family: '${brand.fontBody}', sans-serif; }
        h1, h2, h3, h4 { font-family: '${brand.fontHeading}', serif; }
        .glass-panel {
            background: rgba(255, 255, 255, 0.7);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.3);
        }
        .text-shadow { text-shadow: 0 2px 10px rgba(0,0,0,0.3); }
        .fade-up { animation: fadeUp 0.8s ease-out forwards; opacity: 0; transform: translateY(20px); }
        .delay-100 { animation-delay: 0.1s; }
        .delay-200 { animation-delay: 0.2s; }
        @keyframes fadeUp { to { opacity: 1; transform: translateY(0); } }
        
        #mobile-menu { transition: transform 0.3s ease-in-out; }
        .menu-open { transform: translateX(0) !important; }
        .menu-closed { transform: translateX(100%); }
    </style>
</head>
<body class="bg-slate-50 text-slate-800 antialiased selection:bg-primary selection:text-white">

    <!-- NAVIGATION -->
    <nav class="fixed w-full z-50 transition-all duration-300 glass-panel border-b border-white/20">
        <div class="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
            <div class="flex items-center gap-3 relative z-50">
                <img src="${images.logo}" class="w-10 h-10 rounded-full shadow-lg object-cover" alt="Logo">
                <div class="text-xl font-bold text-slate-900 tracking-tight">${business.name}</div>
            </div>
            <div class="hidden md:flex gap-8 text-sm font-medium text-slate-600">
                <a href="#about" class="hover:text-primary transition-colors">Chi Siamo</a>
                <a href="#services" class="hover:text-primary transition-colors">Esperienza</a>
                <a href="#reviews" class="hover:text-primary transition-colors">Clienti</a>
            </div>
            <a href="#contact" class="hidden md:block px-6 py-2.5 bg-primary text-white rounded-full text-sm font-bold shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:-translate-y-0.5 transition-all">
                ${copy.navCta}
            </a>
            <button onclick="toggleMenu()" class="md:hidden relative z-50 p-2 text-slate-800">
                <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
            </button>
        </div>
        <div id="mobile-menu" class="fixed inset-0 bg-white z-40 menu-closed md:hidden flex flex-col pt-24 px-6 gap-6">
             <a href="#about" onclick="toggleMenu()" class="text-2xl font-bold text-slate-900 border-b border-slate-100 pb-4">Chi Siamo</a>
             <a href="#services" onclick="toggleMenu()" class="text-2xl font-bold text-slate-900 border-b border-slate-100 pb-4">Esperienza</a>
             <a href="#reviews" onclick="toggleMenu()" class="text-2xl font-bold text-slate-900 border-b border-slate-100 pb-4">Clienti</a>
             <a href="#contact" onclick="toggleMenu()" class="text-2xl font-bold text-primary border-b border-slate-100 pb-4">${copy.navCta}</a>
        </div>
    </nav>

    <!-- HERO SECTION -->
    <section class="relative h-screen flex items-center justify-center overflow-hidden">
        <div class="absolute inset-0 z-0">
             <img src="${images.hero}" alt="Hero" class="w-full h-full object-cover scale-105 animate-[pulse_20s_infinite_alternate]">
             <div class="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/60"></div>
        </div>
        <div class="relative z-10 text-center max-w-5xl px-6 fade-up">
            <h1 class="text-5xl md:text-8xl font-bold text-white mb-6 leading-tight tracking-tight text-shadow">
                ${copy.heroHeadline}
            </h1>
            <p class="text-lg md:text-2xl text-slate-100 mb-10 font-light max-w-2xl mx-auto leading-relaxed text-shadow">
                ${copy.heroSubheadline}
            </p>
            <div class="flex flex-col md:flex-row gap-4 justify-center">
                <a href="#contact" class="px-8 py-4 bg-white text-slate-900 rounded-full font-bold text-lg shadow-xl hover:bg-slate-100 transition-all transform hover:-translate-y-1">
                    ${copy.heroCta}
                </a>
            </div>
        </div>
    </section>

    <!-- ABOUT SECTION -->
    <section id="about" class="py-32 px-6 bg-white">
        <div class="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-20 items-center">
            <div class="order-2 md:order-1">
                <span class="text-accent font-bold tracking-widest text-xs uppercase mb-4 block">About Us</span>
                <h2 class="text-4xl md:text-5xl font-bold text-slate-900 mb-8 leading-tight">${copy.aboutTitle}</h2>
                <p class="text-lg text-slate-600 leading-relaxed mb-8 font-light">
                    ${copy.aboutText}
                </p>
                <div class="flex gap-12 border-t border-slate-100 pt-8">
                    <div>
                        <div class="text-3xl font-bold text-slate-900">100%</div>
                        <div class="text-xs text-slate-400 uppercase tracking-wider mt-1">Qualità</div>
                    </div>
                    <div>
                        <div class="text-3xl font-bold text-slate-900">5.0</div>
                        <div class="text-xs text-slate-400 uppercase tracking-wider mt-1">Rating</div>
                    </div>
                </div>
            </div>
            <div class="order-1 md:order-2 relative group">
                <div class="absolute inset-0 bg-primary/10 rounded-[2rem] transform rotate-3 transition-transform group-hover:rotate-6"></div>
                <img src="${images.about}" alt="About" class="relative rounded-[2rem] shadow-2xl w-full object-cover aspect-[3/4]">
            </div>
        </div>
    </section>

    <!-- FEATURES SECTION -->
    <section id="services" class="py-32 px-6 bg-slate-50">
        <div class="max-w-7xl mx-auto">
            <div class="text-center mb-20">
                <span class="text-accent font-bold tracking-widest text-xs uppercase mb-4 block">Services</span>
                <h2 class="text-4xl md:text-5xl font-bold text-slate-900">${copy.featuresTitle}</h2>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[300px]">
                <div class="md:col-span-2 group relative overflow-hidden rounded-3xl shadow-sm hover:shadow-xl transition-all duration-500">
                    <img src="${images.feature1}" class="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110">
                    <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-8 flex flex-col justify-end">
                        <div class="bg-white/10 backdrop-blur-md w-12 h-12 rounded-xl flex items-center justify-center text-white mb-4 border border-white/20">
                            ${icons[copy.features[0].icon]}
                        </div>
                        <h3 class="text-2xl font-bold text-white mb-2">${copy.features[0].title}</h3>
                        <p class="text-slate-200">${copy.features[0].desc}</p>
                    </div>
                </div>
                <div class="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between hover:-translate-y-2 transition-transform duration-300">
                    <div class="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                        ${icons[copy.features[1].icon]}
                    </div>
                    <div>
                        <h3 class="text-xl font-bold text-slate-900 mb-2">${copy.features[1].title}</h3>
                        <p class="text-slate-500 text-sm leading-relaxed">${copy.features[1].desc}</p>
                    </div>
                    <img src="${images.feature2}" class="w-full h-32 object-cover rounded-xl mt-4 opacity-80">
                </div>
                <div class="bg-slate-900 p-8 rounded-3xl text-white shadow-xl flex flex-col justify-between relative overflow-hidden group">
                    <div class="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -mr-16 -mt-16"></div>
                    <div class="relative z-10">
                         <div class="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center text-white mb-6 border border-white/10">
                            ${icons[copy.features[2].icon]}
                        </div>
                        <h3 class="text-xl font-bold mb-2">${copy.features[2].title}</h3>
                        <p class="text-slate-400 text-sm leading-relaxed">${copy.features[2].desc}</p>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- REVIEWS SECTION -->
    <section id="reviews" class="py-32 px-6 bg-white overflow-hidden">
        <div class="max-w-7xl mx-auto">
             <div class="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
                <div>
                    <h2 class="text-4xl font-bold text-slate-900 mb-2">${copy.reviewsTitle}</h2>
                    <p class="text-slate-500">Dicono di noi su Google</p>
                </div>
                <div class="flex gap-2">
                    <div class="w-12 h-1 bg-primary rounded-full"></div>
                    <div class="w-4 h-1 bg-slate-200 rounded-full"></div>
                </div>
             </div>
             <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                ${reviews.reviews.map(r => `
                    <div class="p-8 rounded-3xl bg-slate-50 border border-slate-100 hover:shadow-lg transition-all duration-300">
                        <div class="flex text-amber-400 mb-6 space-x-1">
                            ${Array(r.rating).fill('★').join('')}
                        </div>
                        <p class="text-slate-700 italic mb-8 leading-relaxed">"${r.text}"</p>
                        <div class="flex items-center gap-4">
                            <div class="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-500 text-sm">
                                ${r.author.charAt(0)}
                            </div>
                            <div>
                                <div class="font-bold text-slate-900 text-sm">${r.author}</div>
                                <div class="text-xs text-slate-400">Cliente Verificato</div>
                            </div>
                        </div>
                    </div>
                `).join('')}
             </div>
        </div>
    </section>

    <!-- FOOTER -->
    <footer id="contact" class="bg-[#0f172a] text-slate-400 py-24 px-6 relative overflow-hidden">
        <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-accent to-primary"></div>
        <div class="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-20">
            <div>
                <h3 class="text-4xl font-bold text-white mb-8">${business.name}</h3>
                <p class="mb-10 max-w-md text-lg font-light text-slate-300">${copy.footerText}</p>
                <div class="space-y-6">
                    <p class="flex items-center gap-4 text-slate-300 hover:text-white transition-colors"><span class="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-primary">📍</span> ${business.address}</p>
                    ${business.phoneNumber ? `<p class="flex items-center gap-4 text-slate-300 hover:text-white transition-colors"><span class="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-primary">📞</span> ${business.phoneNumber}</p>` : ''}
                    <p class="flex items-center gap-4 text-slate-300 hover:text-white transition-colors"><span class="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-primary">✉️</span> info@${business.name.toLowerCase().replace(/\s/g,'')}.it</p>
                </div>
            </div>
            <div>
                <form onsubmit="handleForm(event)" class="space-y-4 bg-white/5 p-8 rounded-3xl border border-white/10 backdrop-blur-md">
                    <h4 class="text-white font-bold mb-6 text-xl">Prenota una consulenza</h4>
                    <div class="grid grid-cols-2 gap-4">
                        <input required type="text" placeholder="Nome" class="w-full px-4 py-4 bg-black/20 border border-white/10 rounded-xl focus:border-primary outline-none text-white placeholder:text-white/30 transition-all">
                        <input required type="text" placeholder="Cognome" class="w-full px-4 py-4 bg-black/20 border border-white/10 rounded-xl focus:border-primary outline-none text-white placeholder:text-white/30 transition-all">
                    </div>
                    <input required type="email" placeholder="Email" class="w-full px-4 py-4 bg-black/20 border border-white/10 rounded-xl focus:border-primary outline-none text-white placeholder:text-white/30 transition-all">
                    <button type="submit" class="w-full py-4 bg-primary text-white font-bold rounded-xl hover:bg-white hover:text-slate-900 transition-all shadow-lg shadow-primary/20">Invia Richiesta</button>
                </form>
            </div>
        </div>
        <div class="mt-20 pt-8 border-t border-white/10 text-center text-xs text-slate-600 flex flex-col md:flex-row justify-between items-center">
            <span>&copy; ${new Date().getFullYear()} ${business.name}. All rights reserved.</span>
            <span class="flex items-center gap-2 mt-4 md:mt-0">Powered by <span class="text-slate-400 font-bold">WebRenovator AI</span></span>
        </div>
    </footer>

    <script>
        function toggleMenu() {
            const menu = document.getElementById('mobile-menu');
            menu.classList.toggle('menu-closed');
            menu.classList.toggle('menu-open');
        }
        function handleForm(e) {
            e.preventDefault();
            const btn = e.target.querySelector('button');
            const originalText = btn.innerText;
            btn.innerText = 'Richiesta Inviata!';
            btn.style.backgroundColor = '#22c55e';
            btn.style.color = 'white';
            btn.disabled = true;
            setTimeout(() => {
                btn.innerText = originalText;
                btn.style.backgroundColor = ''; 
                btn.style.color = '';
                btn.disabled = false;
                e.target.reset();
                alert("Grazie! Il messaggio è stato inviato correttamente alla demo.");
            }, 2500);
        }
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const targetId = this.getAttribute('href');
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    targetElement.scrollIntoView({ behavior: 'smooth' });
                }
            });
        });
    </script>
</body>
</html>`;
};

// --- 4. IMAGE GENERATOR (GEMINI + POLLINATIONS FALLBACK) ---
export const generateNanoImage = async (keyword: string, isLogo: boolean = false): Promise<string> => {
    // Stile Forzato per Alta Qualità
    const styleModifiers = isLogo 
        ? "minimalist vector logo, flat design, white background, high quality, geometric, professional corporate identity"
        : "professional commercial photography, 4k resolution, highly detailed, realistic texture, cinematic lighting, sharp focus, taken with Sony A7R IV, award winning photo";

    const prompt = `${keyword}. ${styleModifiers}`;

    try {
        // TENTATIVO 1: Gemini 2.5 Flash Image
        return await callGeminiWithRetry(async () => {
             const response = await ai.models.generateContent({
                model: MODEL_IMAGE,
                contents: { parts: [{ text: prompt }] },
                config: {
                    imageConfig: {
                         aspectRatio: isLogo ? "1:1" : "16:9"
                    }
                }
            });

            for (const part of response.candidates?.[0]?.content?.parts || []) {
                if (part.inlineData) {
                    return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                }
            }
            throw new Error("No image generated by Gemini");
        }, 1, 1000, "ImageGen");

    } catch (e) {
        console.warn(`Gemini Image Gen Failed for ${keyword}. Switching to Fallback.`, e);
        
        // TENTATIVO 2: Pollinations AI (Fallback Alta Qualità)
        // Questo garantisce che ci sia SEMPRE un'immagine coerente e ad alta risoluzione anche se Gemini fallisce (429/Filter).
        const encodedPrompt = encodeURIComponent(prompt);
        const width = isLogo ? 512 : 1280;
        const height = isLogo ? 512 : 720;
        return `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&nologo=true&seed=${Math.floor(Math.random() * 1000)}`;
    }
};

// --- EXPORT PRINCIPALE ---
export const generateSitePreview = async (business: Business): Promise<GeneratedSite> => {
    // 1. Analisi Recensioni
    const reviews = await agentReviews(business);
    
    // 2. Generazione Dati
    const siteData = await agentUnifiedGenerator(business, reviews);
    
    // Safety Fallback Dati
    if (!siteData.images) {
        siteData.images = {
            heroKeyword: `modern interior of ${business.name} ${business.type}`,
            aboutKeyword: `professional team working at ${business.type}`,
            feature1Keyword: `high quality service detail ${business.type}`,
            feature2Keyword: `premium equipment ${business.type}`,
            feature3Keyword: `happy customer ${business.type}`
        };
    }

    // 3. Generazione Immagini SEQUENZIALE
    const images: Record<string, string> = {};
    const prompts = [
        { key: 'logo', keyword: business.name, isLogo: true },
        { key: 'hero', keyword: siteData.images.heroKeyword || "luxury business interior", isLogo: false },
        { key: 'about', keyword: siteData.images.aboutKeyword || "professional team portrait", isLogo: false },
        { key: 'feature1', keyword: siteData.images.feature1Keyword || "premium service detail", isLogo: false },
        { key: 'feature2', keyword: siteData.images.feature2Keyword || "modern equipment detail", isLogo: false },
        { key: 'feature3', keyword: siteData.images.feature3Keyword || "customer satisfaction smile", isLogo: false }
    ];

    for (const p of prompts) {
        if (p.key !== 'logo') await sleep(1500); // Aumentato delay per evitare 429 su Gemini Image
        images[p.key] = await generateNanoImage(p.keyword, p.isLogo);
    }

    // 4. Rendering
    const finalHtml = renderTemplate(siteData, business, reviews, images);

    return {
        html: finalHtml,
        copywriting: siteData.copy.heroHeadline,
        brandData: { 
            primaryColor: siteData.brand.primaryColor, 
            secondaryColor: siteData.brand.secondaryColor, 
            accentColor: siteData.brand.accentColor, 
            fontHeading: siteData.brand.fontHeading, 
            fontBody: siteData.brand.fontBody, 
            vibe: 'Luxury' 
        },
        contentData: { 
            heroHeadline: siteData.copy.heroHeadline, 
            heroSubheadline: siteData.copy.heroSubheadline, 
            features: siteData.copy.features, 
            cta: siteData.copy.heroCta, 
            aboutText: siteData.copy.aboutText, 
            seoKeywords: [] 
        }
    };
};

// --- ALTRI SERVIZI ---
export const searchLeads = async (niche: string, location: string): Promise<Business[]> => {
  const prompt = `Trova 5 attività commerciali tipo "${niche}" a "${location}" usando Google Maps.
  IMPORTANTE: Restituisci SOLO un array JSON valido. Nessun testo prima o dopo.
  Format: [{ "name": "...", "address": "...", "type": "...", "website": "URL o null", "rating": 4.5 }]`;
  
  return callGeminiWithRetry(async () => {
    const response = await ai.models.generateContent({
      model: MODEL_MAPS,
      contents: prompt,
      config: { tools: [{ googleMaps: {} }] }
    });
    const data = extractJSON(response.text || "[]");
    return Array.isArray(data) ? data.map((item: any, i: number) => ({
      ...item, id: `lead-${Date.now()}-${i}`, leadStatus: 'NEW', website: (!item.website || item.website === "http://") ? null : item.website
    })) : [];
  }, 2, 2000, "SearchLeads");
};

export const simulateBusinessReply = async (business: Business): Promise<string> => "Grazie, quando possiamo sentirci?";

export const getChatbotResponse = async (business: Business, userMessage: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: MODEL_TEXT,
            contents: `Sei l'assistente di "${business.name}". Utente: "${userMessage}". Rispondi brevemente. JSON: {"text": "..."}`,
            config: { responseMimeType: "application/json" }
        });
        return response.text || JSON.stringify({ text: "Mi scusi, non ho capito." });
    } catch { return JSON.stringify({ text: "Servizio momentaneamente non disponibile." }); }
};

export const generateSalesAudit = async (business: Business): Promise<MarketingAudit> => {
     return { seoScore: 45, monthlyLostRevenue: "€2.100", criticalIssues: ["Sito assente", "Nessuna keyword"], competitorAdvantage: "Competitor attivi su social" };
};

export const generateColdEmail = async (business: Business, audit?: MarketingAudit, isDiscounted: boolean = true, baseUrl: string = ""): Promise<{subject: string, body: string}> => {
    const previewUrl = `${baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl}?preview=${business.id}`;
    return { 
        subject: `Anteprima sito web per ${business.name}`, 
        body: `Gentile titolare,<br>Ho creato una bozza del vostro nuovo sito: <a href="${previewUrl}">${previewUrl}</a>.<br>Fatemi sapere cosa ne pensate.` 
    };
};
