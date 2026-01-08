
import { GoogleGenAI, Type } from "@google/genai";
import { Business, GeneratedSite, MarketingAudit, AgentBrandOutput, AgentCopyOutput, AgentReviewsOutput, AIModelConfig, DesignPreferences } from "../types";

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
        if (isArray && lastArrClose !== -1) cleanText = cleanText.substring(firstArrOpen, lastArrClose + 1);
        else if (isObject && lastClose !== -1) cleanText = cleanText.substring(firstOpen, lastClose + 1);
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
        if (retries > 0) {
            console.warn(`[${context}] Retrying... (${retries} left)`);
            await sleep(delay);
            return callGeminiWithRetry(operation, retries - 1, delay * 2, context);
        }
        throw error;
    }
};

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
// FIX: Define MODEL_MAPS for Google Maps grounding (requires Gemini 2.5 series)
const MODEL_MAPS = 'gemini-2.5-flash';

// --- AGENT REVIEWS ---
export const agentReviews = async (business: Business, model: string = 'gemini-3-flash-preview'): Promise<AgentReviewsOutput> => {
    const prompt = `Trova o genera 3 recensioni realistiche per "${business.name}" (${business.type}, ${business.address}). JSON: { "reviews": [{ "author": "Nome", "text": "...", "rating": 5 }], "summary": "4.9/5" }`;
    return callGeminiWithRetry(async () => {
        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        return extractJSON(response.text || "") || { reviews: [], summary: "Ottimo" };
    }, 2, 1000, "Reviews");
};

// --- CORE GENERATOR ---
export const agentUnifiedGenerator = async (
    business: Business, 
    reviews: AgentReviewsOutput, 
    aiConfig: AIModelConfig,
    designPrefs: DesignPreferences
): Promise<any> => {
    const searchPart = aiConfig.useGoogleSearch ? `Usa Google Search per trovare info reali su questo settore a ${business.address}.` : "";
    const prompt = `Sei un Creative Director di lusso. Crea un sito per: "${business.name}" (${business.type}). 
    Design richiesto: Palette ${designPrefs.palette}, Font ${designPrefs.fontPairing}, Layout ${designPrefs.layoutType}.
    ${searchPart}
    JSON: {
        "brand": { "primaryColor": "#...", "secondaryColor": "#...", "accentColor": "#...", "fontHeading": "...", "fontBody": "..." },
        "copy": { "heroHeadline": "...", "heroSubheadline": "...", "heroCta": "...", "aboutTitle": "...", "aboutText": "...", "features": [{"title": "...", "desc": "...", "icon": "star"}] },
        "images": { "heroKeyword": "...", "aboutKeyword": "...", "featureKeywords": ["...", "...", "..."] }
    }`;

    return callGeminiWithRetry(async () => {
        const response = await ai.models.generateContent({
            model: aiConfig.textModel,
            contents: prompt,
            config: { 
                responseMimeType: "application/json",
                tools: aiConfig.useGoogleSearch ? [{ googleSearch: {} }] : undefined
            }
        });
        return extractJSON(response.text || "");
    }, 2, 3000, "UnifiedAgent");
};

// --- SECTION CONTENT REGENERATOR ---
export const regenerateSectionContent = async (businessName: string, sectionName: string, currentText: string, aiConfig: AIModelConfig): Promise<string> => {
    const prompt = `Riscrivi il testo per la sezione "${sectionName}" del sito di "${businessName}". 
    Testo attuale: "${currentText}". 
    Rendilo più accattivante e professionale. Restituisci SOLO il nuovo testo, max 25 parole.`;
    
    const response = await ai.models.generateContent({
        model: aiConfig.textModel,
        contents: prompt
    });
    return response.text?.trim() || currentText;
};

// --- IMAGE GENERATOR ---
export const generateNanoImage = async (keyword: string, isLogo: boolean = false, model: string = 'gemini-2.5-flash-image'): Promise<string> => {
    const prompt = `${keyword}. ${isLogo ? "minimal vector logo, white background" : "high quality commercial photography, 4k, photorealistic"}`;
    try {
        return await callGeminiWithRetry(async () => {
            const response = await ai.models.generateContent({
                model: model,
                contents: { parts: [{ text: prompt }] },
                config: { imageConfig: { aspectRatio: isLogo ? "1:1" : "16:9" } }
            });
            for (const part of response.candidates?.[0]?.content?.parts || []) {
                if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
            throw new Error();
        }, 1, 1000, "ImgGen");
    } catch {
        const encoded = encodeURIComponent(prompt);
        return `https://image.pollinations.ai/prompt/${encoded}?width=${isLogo?512:1280}&height=${isLogo?512:720}&nologo=true&seed=${Math.random()}`;
    }
};

// --- PREVIEW GENERATOR ---
// FIX: Added default parameters to aiConfig and designPrefs to resolve the argument count error in PaymentModal.tsx
export const generateSitePreview = async (
    business: Business, 
    aiConfig: AIModelConfig = {
        textModel: 'gemini-3-flash-preview',
        imageModel: 'gemini-2.5-flash-image',
        useGoogleSearch: true
    }, 
    designPrefs: DesignPreferences = {
        palette: 'modern',
        fontPairing: 'inter-playfair',
        layoutType: 'liquid',
        gridDensity: 'relaxed'
    }
): Promise<GeneratedSite> => {
    const reviews = await agentReviews(business, aiConfig.textModel);
    const siteData = await agentUnifiedGenerator(business, reviews, aiConfig, designPrefs);
    
    const images: Record<string, string> = { logo: await generateNanoImage(business.name, true, aiConfig.imageModel) };
    images.hero = await generateNanoImage(siteData.images.heroKeyword, false, aiConfig.imageModel);
    images.about = await generateNanoImage(siteData.images.aboutKeyword, false, aiConfig.imageModel);
    
    // FIX: Await all image generations correctly
    await Promise.all(siteData.images.featureKeywords.map(async (k: string, i: number) => {
        images[`feature${i+1}`] = await generateNanoImage(k, false, aiConfig.imageModel);
    }));

    const html = renderProfessionalTemplate(siteData, business, reviews, images, designPrefs);
    return { html, copywriting: siteData.copy.heroHeadline, brandData: siteData.brand, contentData: siteData.copy };
};

const renderProfessionalTemplate = (data: any, business: Business, reviews: any, images: any, prefs: DesignPreferences) => {
    const { brand, copy } = data;
    const containerClass = prefs.layoutType === 'liquid' ? 'max-w-full px-10' : prefs.layoutType === 'boxed' ? 'max-w-6xl mx-auto' : 'max-w-7xl mx-auto';
    
    return `<!DOCTYPE html>
<html lang="it" class="scroll-smooth">
<head>
    <meta charset="UTF-8"><title>${business.name}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=${brand.fontHeading.replace(' ', '+')}&family=${brand.fontBody.replace(' ', '+')}&display=swap" rel="stylesheet">
    <style>
        :root { --p: ${brand.primaryColor}; --s: ${brand.secondaryColor}; --a: ${brand.accentColor}; }
        body { font-family: '${brand.fontBody}', sans-serif; }
        h1, h2, h3 { font-family: '${brand.fontHeading}', serif; }
        .bg-primary { background-color: var(--p); }
        .text-primary { color: var(--p); }
        .border-primary { border-color: var(--p); }
        .bento-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; }
    </style>
</head>
<body class="bg-slate-50 text-slate-900">
    <nav class="fixed w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div class="${containerClass} h-16 flex justify-between items-center">
            <div class="flex items-center gap-2">
                <img src="${images.logo}" class="w-8 h-8 rounded-full" alt="L">
                <span class="font-bold tracking-tight">${business.name}</span>
            </div>
            <div class="hidden md:flex gap-6 text-sm font-medium">
                <a href="#about">Chi Siamo</a><a href="#features">Servizi</a><a href="#reviews">Dicono di noi</a>
            </div>
            <button class="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold">Contattaci</button>
        </div>
    </nav>
    <header class="pt-32 pb-20 overflow-hidden">
        <div class="${containerClass} grid md:grid-cols-2 gap-12 items-center">
            <div class="fade-up">
                <h1 class="text-5xl md:text-7xl font-bold mb-6 leading-tight">${copy.heroHeadline}</h1>
                <p class="text-xl text-slate-600 mb-8 font-light">${copy.heroSubheadline}</p>
                <button class="bg-primary text-white px-8 py-4 rounded-xl font-bold shadow-lg">${copy.heroCta}</button>
            </div>
            <div class="relative">
                <img src="${images.hero}" class="rounded-3xl shadow-2xl aspect-video object-cover" alt="H">
            </div>
        </div>
    </header>
    <section id="features" class="py-24 bg-white">
        <div class="${containerClass}">
            <h2 class="text-3xl font-bold mb-12 text-center">Eccellenza Garantita</h2>
            <div class="${prefs.layoutType === 'bento' ? 'bento-grid' : 'grid md:grid-cols-3 gap-8'}">
                ${copy.features.map((f: any, i: number) => `
                    <div class="p-8 rounded-3xl bg-slate-50 border border-slate-100 hover:shadow-xl transition-all">
                        <div class="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-6">★</div>
                        <h3 class="text-xl font-bold mb-3">${f.title}</h3>
                        <p class="text-slate-500 text-sm leading-relaxed">${f.desc}</p>
                    </div>
                `).join('')}
            </div>
        </div>
    </section>
    <footer class="py-20 bg-slate-900 text-white">
        <div class="${containerClass} text-center">
            <h2 class="text-4xl font-bold mb-6">${business.name}</h2>
            <p class="text-slate-400 mb-8">${business.address}</p>
            <div class="flex justify-center gap-4 text-sm font-bold">
                <a href="#">Privacy</a><a href="#">Terms</a>
            </div>
        </div>
    </footer>
</body></html>`;
};

export const searchLeads = async (niche: string, location: string): Promise<Business[]> => {
    const prompt = `Trova 5 attività tipo "${niche}" a "${location}". Restituisci SOLO un array JSON: [{ "name": "...", "address": "...", "type": "...", "website": null, "rating": 4.5 }]`;
    return callGeminiWithRetry(async () => {
        const response = await ai.models.generateContent({
            model: MODEL_MAPS,
            contents: prompt,
            config: { tools: [{ googleMaps: {} }] }
        });
        const data = extractJSON(response.text || "[]");
        return Array.isArray(data) ? data.map((item: any, i: number) => ({
            ...item, id: `lead-${Date.now()}-${i}`, leadStatus: 'NEW', status: item.website ? 'OLD_SITE' : 'NO_SITE', reasoning: "Identificato tramite AI."
        })) : [];
    }, 2, 2000, "SearchLeads");
};

export const simulateBusinessReply = async (business: Business): Promise<string> => "Ciao! Grazie, fammi vedere la bozza.";
export const getChatbotResponse = async (business: Business, userMessage: string): Promise<string> => `Sono l'AI di ${business.name}, come posso aiutarti?`;
export const generateSalesAudit = async (business: Business): Promise<MarketingAudit> => ({ seoScore: 40, monthlyLostRevenue: "€1.500", criticalIssues: ["No Mobile"], competitorAdvantage: "SEO Migliore" });
export const generateColdEmail = async (business: Business, audit?: MarketingAudit, isDiscounted: boolean = true, baseUrl: string = ""): Promise<{subject: string, body: string}> => ({ subject: "Anteprima sito", body: "Ecco il tuo sito." });
