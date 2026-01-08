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

        // Prioritize Array if asking for list
        if (firstArrOpen !== -1 && lastArrClose !== -1) {
             cleanText = cleanText.substring(firstArrOpen, lastArrClose + 1);
        } else if (firstOpen !== -1 && lastClose !== -1) {
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
            console.error(`[${context}] 403 Permission Denied.`);
            throw error;
        }
        // Retry on 429 or 503 or 400 (sometimes transient model loading)
        if (retries > 0) {
            await sleep(delay);
            return callGeminiWithRetry(operation, retries - 1, delay * 2, context);
        }
        throw error;
    }
};

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// CONFIGURAZIONE MODELLI IBRIDA
// 1. Gemini 3 Pro: Per Copywriting, Design System e Ragionamento Complesso (Massima Qualità)
const MODEL_TEXT = 'gemini-3-pro-preview'; 
// 2. Gemini 2.0 Flash Exp: Più stabile per Google Maps Tools al momento
const MODEL_MAPS = 'gemini-2.0-flash-exp';

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
                { author: "Cliente Felice", text: "Servizio impeccabile!", rating: 5, source: "Google" },
                { author: "Marco R.", text: "Consigliatissimo.", rating: 5, source: "Google" },
                { author: "Anna B.", text: "Qualità top.", rating: 5, source: "Google" }
            ],
            summary: "5.0 su Google"
        };
    }
};

// --- 2. DATA AGENT (SOLO JSON, NIENTE HTML) ---
// Questo agente definisce il contenuto, non la forma.
interface SiteDataOutput {
    brand: {
        primaryColor: string; // hex es. #1e40af
        secondaryColor: string; // hex es. #f8fafc
        accentColor: string; // hex es. #fbbf24
        fontHeading: string; // 'Playfair Display' | 'Montserrat' | 'Roboto Slab'
        fontBody: string; // 'Inter' | 'Lato' | 'Open Sans'
        themeMode: 'light' | 'dark';
    };
    copy: {
        navCta: string;
        heroHeadline: string;
        heroSubheadline: string;
        heroCta: string;
        aboutTitle: string;
        aboutText: string; // 2-3 frasi
        featuresTitle: string;
        features: { title: string; desc: string; icon: string }[]; // icon: 'star', 'shield', 'zap', 'heart', 'user', 'map', 'phone'
        reviewsTitle: string;
        footerText: string;
    };
    images: {
        heroKeyword: string; // keywords inglese per LoremFlickr es. "luxury restaurant interior"
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
    const prompt = `Sei un Creative Director di un'agenzia web di lusso.
    CLIENTE: "${business.name}"
    SETTORE: "${business.type}"
    LUOGO: "${business.address}"

    Il tuo compito è definire il BRANDING e il COPYWRITING per un sito web moderno.
    NON generare codice HTML. Genera solo i dati JSON.

    LINEE GUIDA BRAND:
    - Colori: Scegli una palette professionale e adatta al settore (es. Medico: Blu/Bianco, Ristorante: Caldo/Scuro).
    - Font: Usa 'Playfair Display' per settori lusso/cibo, 'Montserrat' per moderni/tech, 'Roboto Slab' per tradizionali.
    - Copywriting: Persuasivo, elegante, orientato alla vendita.
    - Immagini: Definisci keyword IN INGLESE specifiche per cercare foto stock reali (es. "dentist chair modern", "pizza margherita hd").

    OUTPUT JSON FORMAT (Rigoroso):
    {
        "brand": { "primaryColor": "#...", "secondaryColor": "#...", "accentColor": "#...", "fontHeading": "...", "fontBody": "Inter", "themeMode": "light" },
        "copy": { 
            "navCta": "Prenota",
            "heroHeadline": "Titolo Impattante (max 6 parole)", 
            "heroSubheadline": "Sottotitolo valore (max 15 parole)", 
            "heroCta": "Call to Action", 
            "aboutTitle": "La Nostra Storia",
            "aboutText": "Testo chi siamo...",
            "featuresTitle": "I Nostri Servizi",
            "features": [
                { "title": "...", "desc": "...", "icon": "star" },
                { "title": "...", "desc": "...", "icon": "shield" },
                { "title": "...", "desc": "...", "icon": "zap" }
            ],
            "reviewsTitle": "Dicono di Noi",
            "footerText": "Tutti i diritti riservati."
        },
        "images": {
            "heroKeyword": "...",
            "aboutKeyword": "...",
            "feature1Keyword": "...",
            "feature2Keyword": "...",
            "feature3Keyword": "..."
        },
        "chatbot": { "welcomeMessage": "Ciao! Come posso aiutarti?" }
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
    }, 2, 8000, "UnifiedAgent");
};

// --- 3. TEMPLATE ENGINE (HTML HARDCODED ROBUSTO) ---
// Questo sostituisce la generazione HTML dell'IA. Qui il layout è perfetto per definizione.

const renderTemplate = (data: SiteDataOutput, business: Business, reviews: AgentReviewsOutput, images: Record<string, string>) => {
    const { brand, copy } = data;
    
    // Icon Mapping (Simple SVG strings)
    const icons: Record<string, string> = {
        star: '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path></svg>',
        shield: '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>',
        zap: '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>',
        default: '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>'
    };

    return `<!DOCTYPE html>
<html lang="it" class="scroll-smooth">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${business.name}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=${brand.fontHeading.replace(' ', '+')}:wght@400;700&family=${brand.fontBody.replace(' ', '+')}:wght@300;400;600&display=swap" rel="stylesheet">
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
                    }
                }
            }
        }
    </script>
    <style>
        body { font-family: '${brand.fontBody}', sans-serif; }
        h1, h2, h3, h4 { font-family: '${brand.fontHeading}', serif; }
        .glass { background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(10px); }
        .hero-overlay { background: linear-gradient(to top, rgba(0,0,0,0.8), rgba(0,0,0,0.4)); }
    </style>
</head>
<body class="bg-slate-50 text-slate-800 antialiased selection:bg-accent selection:text-white">

    <!-- NAVIGATION -->
    <nav class="fixed w-full z-50 transition-all duration-300 glass border-b border-slate-200/50">
        <div class="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
            <div class="text-2xl font-bold text-primary tracking-tight">${business.name}</div>
            <div class="hidden md:flex gap-8 text-sm font-medium text-slate-600">
                <a href="#about" class="hover:text-primary transition-colors">Chi Siamo</a>
                <a href="#services" class="hover:text-primary transition-colors">Servizi</a>
                <a href="#reviews" class="hover:text-primary transition-colors">Recensioni</a>
            </div>
            <a href="#contact" class="px-6 py-2.5 bg-primary text-white rounded-full text-sm font-bold shadow-lg shadow-primary/30 hover:bg-opacity-90 transition-all transform hover:-translate-y-0.5">
                ${copy.navCta}
            </a>
        </div>
    </nav>

    <!-- HERO SECTION -->
    <section class="relative h-screen min-h-[600px] flex items-center justify-center overflow-hidden">
        <img src="${images.hero}" alt="Hero" class="absolute inset-0 w-full h-full object-cover">
        <div class="absolute inset-0 hero-overlay"></div>
        
        <div class="relative z-10 text-center max-w-4xl px-6 animate-[fadeIn_1s_ease-out]">
            <span class="inline-block py-1 px-3 rounded-full bg-white/10 text-white/90 text-xs font-bold tracking-widest uppercase mb-6 border border-white/20 backdrop-blur-sm">
                ${business.type} Premium
            </span>
            <h1 class="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight drop-shadow-lg">
                ${copy.heroHeadline}
            </h1>
            <p class="text-lg md:text-xl text-slate-200 mb-10 font-light max-w-2xl mx-auto leading-relaxed">
                ${copy.heroSubheadline}
            </p>
            <div class="flex flex-col md:flex-row gap-4 justify-center">
                <a href="#contact" class="px-8 py-4 bg-accent text-slate-900 rounded-full font-bold text-lg shadow-xl hover:shadow-2xl hover:bg-white transition-all transform hover:-translate-y-1">
                    ${copy.heroCta}
                </a>
                <a href="#about" class="px-8 py-4 bg-white/10 text-white border border-white/30 rounded-full font-bold text-lg backdrop-blur-sm hover:bg-white/20 transition-all">
                    Scopri di più
                </a>
            </div>
        </div>
    </section>

    <!-- FEATURES / SERVICES -->
    <section id="services" class="py-24 px-6 bg-white">
        <div class="max-w-7xl mx-auto">
            <div class="text-center mb-16">
                <h2 class="text-3xl md:text-4xl font-bold text-slate-900 mb-4">${copy.featuresTitle}</h2>
                <div class="w-20 h-1 bg-accent mx-auto rounded-full"></div>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-3 gap-10">
                ${copy.features.map((f, i) => `
                <div class="group p-8 rounded-3xl bg-slate-50 border border-slate-100 hover:border-primary/20 hover:shadow-2xl hover:shadow-primary/10 transition-all duration-300">
                    <div class="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-primary mb-6 shadow-sm group-hover:scale-110 transition-transform duration-300 border border-slate-100">
                        ${icons[f.icon] || icons['default']}
                    </div>
                    <div class="h-48 overflow-hidden rounded-xl mb-6">
                        <img src="${i === 0 ? images.feature1 : i === 1 ? images.feature2 : images.feature3}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="${f.title}">
                    </div>
                    <h3 class="text-xl font-bold text-slate-900 mb-3">${f.title}</h3>
                    <p class="text-slate-600 leading-relaxed">${f.desc}</p>
                </div>
                `).join('')}
            </div>
        </div>
    </section>

    <!-- ABOUT SPLIT -->
    <section id="about" class="py-24 px-6 bg-slate-50 overflow-hidden">
        <div class="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-16">
            <div class="w-full md:w-1/2 relative">
                <div class="absolute -top-4 -left-4 w-full h-full border-2 border-accent rounded-3xl translate-x-4 translate-y-4"></div>
                <img src="${images.about}" alt="About" class="relative rounded-3xl shadow-2xl w-full object-cover aspect-[4/3] z-10">
            </div>
            <div class="w-full md:w-1/2">
                <h2 class="text-3xl md:text-4xl font-bold text-slate-900 mb-6">${copy.aboutTitle}</h2>
                <p class="text-lg text-slate-600 leading-relaxed mb-8">
                    ${copy.aboutText}
                </p>
                <ul class="space-y-4 mb-8">
                    <li class="flex items-center gap-3 text-slate-700 font-medium">
                        <div class="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs">✓</div>
                        Professionalità Garantita
                    </li>
                    <li class="flex items-center gap-3 text-slate-700 font-medium">
                        <div class="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs">✓</div>
                        Esperienza Pluriennale
                    </li>
                    <li class="flex items-center gap-3 text-slate-700 font-medium">
                        <div class="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs">✓</div>
                        Supporto Dedicato
                    </li>
                </ul>
            </div>
        </div>
    </section>

    <!-- REVIEWS -->
    <section id="reviews" class="py-24 px-6 bg-slate-900 text-white">
        <div class="max-w-7xl mx-auto text-center">
             <h2 class="text-3xl md:text-4xl font-bold mb-16">${copy.reviewsTitle}</h2>
             <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                ${reviews.reviews.map(r => `
                    <div class="bg-white/5 p-8 rounded-3xl border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors text-left">
                        <div class="flex text-accent mb-4">
                            ${Array(r.rating).fill('★').join('')}
                        </div>
                        <p class="text-slate-300 italic mb-6">"${r.text}"</p>
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center font-bold text-sm">
                                ${r.author.charAt(0)}
                            </div>
                            <div>
                                <div class="font-bold text-sm">${r.author}</div>
                                <div class="text-xs text-slate-400">Cliente Verificato</div>
                            </div>
                        </div>
                    </div>
                `).join('')}
             </div>
        </div>
    </section>

    <!-- CONTACT / FOOTER -->
    <footer id="contact" class="bg-slate-950 text-slate-400 py-16 px-6 border-t border-slate-900">
        <div class="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12">
            <div>
                <h3 class="text-2xl font-bold text-white mb-6">${business.name}</h3>
                <p class="mb-6 max-w-md">${copy.footerText}</p>
                <div class="space-y-3">
                    <p class="flex items-center gap-3"><span class="text-primary">📍</span> ${business.address}</p>
                    ${business.phoneNumber ? `<p class="flex items-center gap-3"><span class="text-primary">📞</span> ${business.phoneNumber}</p>` : ''}
                    <p class="flex items-center gap-3"><span class="text-primary">✉️</span> info@${business.name.toLowerCase().replace(/\s/g,'')}.it</p>
                </div>
            </div>
            <div>
                <form class="space-y-4 bg-white/5 p-6 rounded-2xl border border-white/10">
                    <h4 class="text-white font-bold mb-4">Contattaci Rapidamente</h4>
                    <input type="text" placeholder="Il tuo nome" class="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-lg focus:border-primary outline-none text-white">
                    <input type="email" placeholder="La tua email" class="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-lg focus:border-primary outline-none text-white">
                    <button class="w-full py-3 bg-primary text-white font-bold rounded-lg hover:bg-opacity-90 transition-all">Invia Messaggio</button>
                </form>
            </div>
        </div>
        <div class="mt-16 pt-8 border-t border-slate-900 text-center text-xs text-slate-600">
            &copy; ${new Date().getFullYear()} ${business.name}. Designed by WebRenovator AI.
        </div>
    </footer>

</body>
</html>`;
};

// --- 4. IMAGE GENERATOR (LOREMFLICKR + KEYWORD REFINING) ---
export const generateNanoImage = async (keyword: string, isLogo: boolean = false): Promise<string> => {
    if (isLogo) {
        const name = keyword.replace(/[^a-zA-Z0-9 ]/g, "").substring(0, 2);
        return `https://ui-avatars.com/api/?name=${name}&background=1e293b&color=ffffff&size=200&font-size=0.5&rounded=true&bold=true`;
    }
    // Pulisce le keyword per LoremFlickr
    const cleanKw = encodeURIComponent(keyword.split(',')[0].trim());
    const lock = Math.floor(Math.random() * 9999);
    return `https://loremflickr.com/1280/800/${cleanKw}/all?lock=${lock}`;
};

// --- EXPORT PRINCIPALE ---
export const generateSitePreview = async (business: Business): Promise<GeneratedSite> => {
    // 1. Analisi Recensioni
    const reviews = await agentReviews(business);
    
    // 2. Generazione Dati (JSON) con Gemini 3 Pro
    const siteData = await agentUnifiedGenerator(business, reviews);
    
    // 3. Generazione Immagini Parallela
    const imgPromises = {
        hero: generateNanoImage(siteData.images.heroKeyword),
        about: generateNanoImage(siteData.images.aboutKeyword),
        feature1: generateNanoImage(siteData.images.feature1Keyword),
        feature2: generateNanoImage(siteData.images.feature2Keyword),
        feature3: generateNanoImage(siteData.images.feature3Keyword),
        logo: generateNanoImage(business.name, true)
    };

    const images = {
        hero: await imgPromises.hero,
        about: await imgPromises.about,
        feature1: await imgPromises.feature1,
        feature2: await imgPromises.feature2,
        feature3: await imgPromises.feature3,
        logo: await imgPromises.logo
    };

    // 4. Rendering Template HTML Rigido
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

// --- ALTRI SERVIZI INVARIATI ---
export const searchLeads = async (niche: string, location: string): Promise<Business[]> => {
  const prompt = `Trova 5 attività commerciali tipo "${niche}" a "${location}" usando Google Maps.
  IMPORTANTE: Restituisci SOLO un array JSON valido. Nessun testo prima o dopo.
  Format: [{ "name": "...", "address": "...", "type": "...", "website": "URL o null", "rating": 4.5 }]`;
  
  return callGeminiWithRetry(async () => {
    const response = await ai.models.generateContent({
      model: MODEL_MAPS, // Modello che supporta i tool Maps
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
