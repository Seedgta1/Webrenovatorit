import { GoogleGenAI, Type } from "@google/genai";
import { Business, GeneratedSite, MarketingAudit, AgentBrandOutput, AgentCopyOutput, AgentVisualOutput, AgentUXOutput, AgentAnalystOutput, AgentChatbotOutput, AgentReviewsOutput } from "../types";

// --- HELPERS ---
const extractJSON = (text: string) => {
    try {
        let cleanText = text.replace(/```json/gi, '').replace(/```/g, '').trim();
        const firstOpen = cleanText.indexOf('{');
        const lastClose = cleanText.lastIndexOf('}');
        const firstArrOpen = cleanText.indexOf('[');
        const lastArrClose = cleanText.lastIndexOf(']');
        if (firstOpen !== -1 && lastClose !== -1 && (firstArrOpen === -1 || firstOpen < firstArrOpen)) {
             cleanText = cleanText.substring(firstOpen, lastClose + 1);
        } else if (firstArrOpen !== -1 && lastArrClose !== -1) {
             cleanText = cleanText.substring(firstArrOpen, lastArrClose + 1);
        }
        return JSON.parse(cleanText);
    } catch (e) {
        console.warn("JSON Extraction Failed", e);
        return null;
    }
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Funzione wrapper per gestire automaticamente i retry
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
        
        // Se è un errore 403 (Permission Denied), inutile riprovare con lo stesso modello/chiave
        if (errorString.includes("403") || errorString.includes("PERMISSION_DENIED")) {
            console.error(`[${context}] 403 Permission Denied.`);
            throw error;
        }

        const isRateLimit = errorString.includes("429") || errorString.includes("Resource has been exhausted");
        const isOverloaded = errorString.includes("503") || errorString.includes("Overloaded");

        if (retries > 0 && (isRateLimit || isOverloaded)) {
            console.warn(`[${context}] Rate limit hit. Retrying in ${delay}ms...`);
            await sleep(delay);
            return callGeminiWithRetry(operation, retries - 1, delay * 2, context);
        }
        throw error;
    }
};

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Configurazione Modelli Sicuri
const MODEL_TEXT = 'gemini-2.5-flash'; 
const MODEL_IMAGE = 'gemini-2.5-flash-image';

// --- 1. REPUTATION AGENT ---
export const agentReviews = async (business: Business): Promise<AgentReviewsOutput> => {
    const prompt = `Usa Google Maps per cercare le recensioni di "${business.name}" a "${business.address}".
    
    TASK: Estrai 3 recensioni positive (4-5 stelle) reali. 
    Se NON trovi recensioni reali o l'attività non esiste su Maps, genera 3 testimonianze realistiche ideali per questa tipologia di attività.
    
    Output JSON Schema:
    {
      "reviews": [
        { "author": "Nome Cognome", "text": "Testo breve della recensione (max 20 parole)", "rating": 5, "source": "Google" }
      ],
      "summary": "Stringa riassuntiva (es. 4.8/5 su Google)"
    }`;

    try {
        return await callGeminiWithRetry(async () => {
            const response = await ai.models.generateContent({
                model: MODEL_TEXT,
                contents: prompt,
                config: { 
                    tools: [{ googleMaps: {} }]
                }
            });
            return extractJSON(response.text || "") || {
                reviews: [{ author: "Cliente Soddisfatto", text: "Servizio eccellente!", rating: 5, source: "Google" }],
                summary: "5.0 su Google"
            };
        }, 3, 2000, "Reviews");
    } catch (e) {
        // Fallback locale immediato
        return {
            reviews: [
                { author: "Maria Rossi", text: "Esperienza fantastica, personale gentilissimo.", rating: 5, source: "Google" },
                { author: "Luca Bianchi", text: "Qualità prezzo imbattibile.", rating: 5, source: "Google" },
                { author: "Giulia Verdi", text: "Consigliatissimo!", rating: 4, source: "Google" }
            ],
            summary: "4.7 su Google"
        };
    }
};

// --- 2. UNIFIED WEB AGENCY AGENT (DESIGN POTENZIATO) ---
interface UnifiedOutput {
    brand: AgentBrandOutput;
    copy: AgentCopyOutput;
    chatbot: AgentChatbotOutput;
    visuals: AgentVisualOutput;
    html: string;
}

export const agentUnifiedGenerator = async (business: Business, reviews: AgentReviewsOutput): Promise<UnifiedOutput> => {
    // Prompt potenziato per forzare design di alta qualità anche con modello flash
    const prompt = `Sei una Web Agency Pluripremiata (Awwwards level).
    
    CLIENTE: "${business.name}" (${business.type})
    LOCALITÀ: "${business.address}"
    RECENSIONI: ${JSON.stringify(reviews.reviews)}

    TASK: Crea un sito web One-Page moderno, elegante e persuasivo.

    LINEE GUIDA VISUAL & DESIGN (STRICT):
    - Usa **Tailwind CSS** via CDN.
    - **Palette**: Colori sofisticati (es. Slate-900 + Emerald-500 per medici, Amber-500 + Stone-900 per ristoranti). Evita colori primari "default".
    - **Layout**: 
      1. **Hero Section Immersiva**: Altezza minima 80vh, immagine di sfondo scura con overlay gradient o split-screen asimmetrico.
      2. **Tipografia**: Titoli grandi (text-5xl o 6xl), font 'Playfair Display' o 'Inter' o 'Outfit'.
      3. **Bento Grid**: Per la sezione servizi/features, usa grid layout con card arrotondate (rounded-3xl).
      4. **Glassmorphism**: Usa sfondi semi-trasparenti (bg-white/10 backdrop-blur-md) per elementi sopra le immagini.
      5. **Spaziatura**: Usa ampi margini (py-20 o py-24) tra le sezioni. Il sito deve respirare.
      6. **Call To Action**: Bottoni grandi, con ombre colorate (shadow-lg shadow-blue-500/30).

    STRUTTURA HTML RICHIESTA:
    1. Header Sticky (Logo + Nav + CTA "Prenota").
    2. Hero Section (H1 Persuasivo + Subheadline + CTA Primaria).
    3. Features/Servizi (Griglia 3 colonne o Bento Grid).
    4. Social Proof (Carosello o griglia con le recensioni fornite).
    5. About/Chi Siamo (Testo emozionale + Immagine).
    6. Footer Moderno (Link, Copyright, Social Icons).
    7. Floating Action Button (FAB) in basso a destra per Chatbot.

    PLACEHOLDER IMMAGINI (Devi usarli esattamente così):
    - "[[LOGO_IMG]]" (Nel nav e footer)
    - "[[HERO_IMG]]" (Sfondo hero o immagine principale)
    - "[[GALLERY_0]]" (Per sezione about o servizio principale)
    - "[[GALLERY_1]]" (Per servizio secondario)
    - "[[GALLERY_2]]" (Per sfondo recensioni o altro)

    OUTPUT JSON UNICO:
    {
        "brand": { "primaryColor": "hex", "secondaryColor": "hex", "accentColor": "hex", "fontHeading": "font-family", "fontBody": "font-family", "vibe": "description" },
        "copy": { "heroHeadline": "...", "heroSubheadline": "...", "features": [{"title": "...", "desc": "..."}], "cta": "...", "aboutText": "...", "seoKeywords": ["..."] },
        "chatbot": { "botName": "...", "welcomeMessage": "...", "tone": "...", "suggestedQuestions": ["..."] },
        "visuals": { 
             "logoPrompt": "Minimalist vector logo for ${business.type}, icon only, flat design, white background", 
             "heroImagePrompt": "Cinematic shot of ${business.type} interior, warm lighting, professional photography, 4k", 
             "galleryPrompts": ["Detail shot 1", "Detail shot 2", "Detail shot 3"] 
        },
        "html": "<!DOCTYPE html><html>...</html>"
    }`;

    return callGeminiWithRetry(async () => {
        const response = await ai.models.generateContent({
            model: MODEL_TEXT,
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        
        const data = extractJSON(response.text || "");
        if (!data || !data.html) throw new Error("Generazione HTML fallita.");
        return data as UnifiedOutput;
    }, 2, 6000, "UnifiedAgent");
};

// --- 3. IMAGE GENERATOR (ROBUSTISSIMO) ---
export const generateNanoImage = async (prompt: string): Promise<string> => {
    // Strategia:
    // 1. Prova Gemini 2.5 Flash Image.
    // 2. Se fallisce, usa Pollinations.ai (garanzia 100% di avere un'immagine).
    
    try {
        const response = await ai.models.generateContent({
            model: MODEL_IMAGE,
            contents: { parts: [{ text: prompt }] }
        });

        const candidate = response.candidates?.[0];
        const part = candidate?.content?.parts?.[0];
        
        if (part?.inlineData?.data) {
                return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
        throw new Error("No inline data");
    } catch (e) {
        // FALLBACK SICURO: Pollinations AI
        // Genera immagini on-the-fly via URL. Non fallisce mai.
        const safePrompt = encodeURIComponent(prompt.substring(0, 150) + ", high quality, photorealistic, 4k");
        // Random seed per variare le immagini se il prompt è uguale
        const seed = Math.floor(Math.random() * 1000);
        return `https://image.pollinations.ai/prompt/${safePrompt}?seed=${seed}&nologo=true&width=800&height=600`;
    }
};

// --- EXPORT PRINCIPALE ---
export const generateSitePreview = async (business: Business): Promise<GeneratedSite> => {
    // 1. Recensioni
    const reviews = await agentReviews(business);
    
    // 2. Generazione Sito
    const unifiedData = await agentUnifiedGenerator(business, reviews);
    
    // 3. Immagini (in parallelo)
    // Non serve più il try/catch wrapper qui perché generateNanoImage gestisce già il fallback
    const imgPromises = [
        generateNanoImage(unifiedData.visuals.logoPrompt),
        generateNanoImage(unifiedData.visuals.heroImagePrompt),
        generateNanoImage(unifiedData.visuals.galleryPrompts[0] || `modern ${business.type} interior`)
    ];

    const [logoBase64, heroBase64, gallery0] = await Promise.all(imgPromises);
    
    // Le altre immagini caricale se servono, usando gallery0 come base se non ci sono prompt
    const gallery1 = unifiedData.visuals.galleryPrompts[1] ? await generateNanoImage(unifiedData.visuals.galleryPrompts[1]) : gallery0;
    const gallery2 = unifiedData.visuals.galleryPrompts[2] ? await generateNanoImage(unifiedData.visuals.galleryPrompts[2]) : gallery0;

    // 4. Montaggio
    let finalHtml = unifiedData.html;
    finalHtml = finalHtml.replace(/\[\[LOGO_IMG\]\]/g, logoBase64);
    finalHtml = finalHtml.replace(/\[\[HERO_IMG\]\]/g, heroBase64);
    finalHtml = finalHtml.replace(/\[\[GALLERY_0\]\]/g, gallery0);
    finalHtml = finalHtml.replace(/\[\[GALLERY_1\]\]/g, gallery1);
    finalHtml = finalHtml.replace(/\[\[GALLERY_2\]\]/g, gallery2);

    return {
        html: finalHtml,
        copywriting: unifiedData.copy.heroHeadline,
        brandData: unifiedData.brand,
        contentData: unifiedData.copy
    } as any;
};

// --- ALTRI SERVIZI ---
export const searchLeads = async (niche: string, location: string): Promise<Business[]> => {
  const prompt = `Usa Google Maps per trovare 5-8 attività commerciali reali nel settore "${niche}" a "${location}" (Italia).
  Restituisci JSON array: [{ "name": "...", "address": "...", "type": "...", "website": "URL/null", "phoneNumber": "...", "rating": 4.5, "ratingCount": 120, "status": "NO_SITE"|"OLD_SITE"|"UNKNOWN", "reasoning": "..." }]
  JSON RAW ONLY.`;
  
  return callGeminiWithRetry(async () => {
    const response = await ai.models.generateContent({
      model: MODEL_TEXT, 
      contents: prompt,
      config: { tools: [{ googleMaps: {} }], temperature: 0.2 },
    });
    const data = extractJSON(response.text || "[]");
    return Array.isArray(data) ? data.map((item: any, i: number) => ({
      ...item, id: `lead-${Date.now()}-${i}`, leadStatus: 'NEW', website: (!item.website || item.website === "http://") ? null : item.website
    })) : [];
  }, 2, 2000, "SearchLeads");
};

export const simulateBusinessReply = async (business: Business): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: MODEL_TEXT,
            contents: `Sei il proprietario di "${business.name}". Rispondi brevemente a una proposta di sito web. Chiedi info sul prezzo o un appuntamento. Max 15 parole.`,
        });
        return response.text || "Interessante, mi chiami domani?";
    } catch(e) {
        return "Grazie, mi mandi maggiori info?";
    }
};

export const getChatbotResponse = async (business: Business, userMessage: string): Promise<string> => {
    const prompt = `Sei l'assistente IA avanzato del sito di "${business.name}" (${business.type}).
    MESSAGGIO UTENTE: "${userMessage}"
    Rispondi in modo empatico e professionale.
    OUTPUT JSON: { "text": "Risposta HTML", "visual_elements": [] }`;

    try {
        const response = await ai.models.generateContent({
            model: MODEL_TEXT,
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        return response.text || JSON.stringify({ text: "Mi dispiace, può ripetere?", visual_elements: [] });
    } catch (e) {
        return JSON.stringify({ text: "Attualmente sono offline per manutenzione.", visual_elements: [] });
    }
};

export const generateSalesAudit = async (business: Business): Promise<MarketingAudit> => {
    const prompt = `Analizza "${business.name}" (${business.type}). Crea un audit marketing spietato in JSON.
    Campi: seoScore (30-60), monthlyLostRevenue (es. "€2.400"), criticalIssues (array stringhe), competitorAdvantage.`;

    try {
        return await callGeminiWithRetry(async () => {
            const response = await ai.models.generateContent({
                model: MODEL_TEXT,
                contents: prompt,
                config: { responseMimeType: "application/json" }
            });
            
            const data = extractJSON(response.text || "");
            return {
                seoScore: 42,
                monthlyLostRevenue: "€1.800",
                criticalIssues: ["Assenza modulo prenotazioni", "Invisibile su Google Mobile", "Design obsoleto"],
                competitorAdvantage: "I competitor usano funnel di vendita automatici.",
                ...data
            };
        }, 2, 1000, "Audit");
    } catch (e) {
        return {
            seoScore: 35,
            monthlyLostRevenue: "€1.500",
            criticalIssues: ["Sito web non trovato", "Nessuna strategia di lead generation"],
            competitorAdvantage: "Presenza online consolidata"
        };
    }
};

export const generateColdEmail = async (business: Business, audit?: MarketingAudit, isDiscounted: boolean = true, baseUrl: string = ""): Promise<{subject: string, body: string}> => {
    const prompt = `Scrivi una cold email per "${business.name}".
    Output JSON: { "subject": "...", "body": "..." }`;

    try {
        return await callGeminiWithRetry(async () => {
            const response = await ai.models.generateContent({
            model: MODEL_TEXT,
            contents: prompt,
            config: { responseMimeType: "application/json" }
            });
            
            let data = extractJSON(response.text || "");
            const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
            const previewUrl = `${cleanBaseUrl}?preview=${business.id}`;
            if (data?.body) data.body = data.body.replace("[LINK_ANTEPRIMA]", previewUrl);
            
            return data || { subject: "Sito pronto", body: `Ecco il link: ${previewUrl}` };
        }, 2, 1000, "Email");
    } catch (e) {
        const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
        const previewUrl = `${cleanBaseUrl}?preview=${business.id}`;
        return { subject: `Anteprima sito per ${business.name}`, body: `Gentile titolare, ho preparato una bozza per il vostro nuovo sito: ${previewUrl}` };
    }
};
