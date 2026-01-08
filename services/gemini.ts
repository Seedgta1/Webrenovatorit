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

// --- 1. REPUTATION AGENT (Deve rimanere su Gemini 2.5 Flash per supporto Google Maps Grounding) ---
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

    return callGeminiWithRetry(async () => {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
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
};

// --- 2. UNIFIED WEB AGENCY AGENT (Upgrade a Gemini 3 Pro) ---
interface UnifiedOutput {
    brand: AgentBrandOutput;
    copy: AgentCopyOutput;
    chatbot: AgentChatbotOutput;
    visuals: AgentVisualOutput;
    html: string;
}

export const agentUnifiedGenerator = async (business: Business, reviews: AgentReviewsOutput): Promise<UnifiedOutput> => {
    const prompt = `Sei una Web Agency AI completa (Analista, Designer, Copywriter, Sviluppatore).
    
    CLIENTE: "${business.name}"
    TIPO: "${business.type}"
    INDIRIZZO: "${business.address}"
    RECENSIONI REALI DA INCLUDERE: ${JSON.stringify(reviews.reviews)}

    OBIETTIVO: Creare un sito web moderno, professionale e ad alta conversione in un unico passaggio.

    REQUISITI STRUTTURALI:
    1.  **Analisi & Brand**: Deduci il settore e crea una palette colori moderna (Tailwind).
    2.  **Copywriting**: Usa la formula AIDA. Scrivi testi persuasivi in ITALIANO.
    3.  **Chatbot**: Configura un assistente virtuale amichevole.
    4.  **Visual**: Crea 3 prompt per immagini fotorealistiche (Logo, Hero, Gallery).
    5.  **CODICE HTML**: Scrivi l'intero codice HTML5 in un unico file.
        - Usa **Tailwind CSS** (via CDN).
        - Usa **Google Fonts** (Inter, Playfair Display, etc.).
        - Includi una sezione **Testimonials** usando ESATTAMENTE le recensioni fornite.
        - Includi un **Floating Action Button (FAB)** per il chatbot.
        - Usa i seguenti placeholder per le immagini: "[[LOGO_IMG]]", "[[HERO_IMG]]", "[[GALLERY_0]]", "[[GALLERY_1]]", "[[GALLERY_2]]".

    OUTPUT JSON FORMAT (Unico oggetto JSON contenente tutto):
    {
        "brand": { "primaryColor": "...", "secondaryColor": "...", "accentColor": "...", "fontHeading": "...", "fontBody": "...", "vibe": "..." },
        "copy": { "heroHeadline": "...", "heroSubheadline": "...", "features": [{"title": "...", "desc": "..."}], "cta": "...", "aboutText": "...", "seoKeywords": ["..."] },
        "chatbot": { "botName": "...", "welcomeMessage": "...", "tone": "...", "suggestedQuestions": ["..."] },
        "visuals": { "logoPrompt": "...", "heroImagePrompt": "...", "galleryPrompts": ["...", "...", "..."] },
        "html": "<!DOCTYPE html><html>...</html>"
    }`;

    return callGeminiWithRetry(async () => {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview', // UPGRADE: Modello Pro per qualità superiore
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        
        const data = extractJSON(response.text || "");
        if (!data || !data.html) throw new Error("Generazione unificata fallita.");
        return data as UnifiedOutput;
    }, 2, 5000, "UnifiedAgent");
};

// --- 3. IMAGE GENERATOR (Upgrade a Gemini 3 Pro Image) ---
export const generateNanoImage = async (prompt: string): Promise<string> => {
    return callGeminiWithRetry(async () => {
        try {
            // Upgrade to Pro Image model for reliability and quality
            const response = await ai.models.generateContent({
                model: 'gemini-3-pro-image-preview',
                contents: { parts: [{ text: prompt }] },
                config: {
                    imageConfig: {
                        aspectRatio: "4:3",
                        imageSize: "1K"
                    }
                }
            });

            if (response.candidates?.[0]?.content?.parts) {
                for (const part of response.candidates[0].content.parts) {
                    if (part.inlineData && part.inlineData.data) {
                        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                    }
                }
            }
            return "https://placehold.co/600x400?text=Generation+Failed";
        } catch (e) {
            console.error("Image Gen Error:", e);
            throw e; // Rilancia per il retry
        }
    }, 2, 4000, "ImageGen");
};

// --- EXPORT PRINCIPALE OTTIMIZZATO ---
export const generateSitePreview = async (business: Business): Promise<GeneratedSite> => {
    // 1. Cerca Recensioni
    const reviews = await agentReviews(business);
    
    // 2. Generazione Unificata (Analisi + Copy + Codice)
    const unifiedData = await agentUnifiedGenerator(business, reviews);
    
    // 3. Generazione Immagini (Safe Mode: se fallisce mette placeholder senza crashare)
    const safeGenImage = async (prompt: string, fallbackText: string) => {
        try {
            return await generateNanoImage(prompt);
        } catch (e) {
            console.warn(`Failed to gen image for ${fallbackText}`, e);
            return `https://placehold.co/1024x768?text=${fallbackText}`;
        }
    };

    const imgPromises = [
        safeGenImage(unifiedData.visuals.logoPrompt, "Logo"),
        safeGenImage(unifiedData.visuals.heroImagePrompt, "Hero+Image"),
        safeGenImage(unifiedData.visuals.galleryPrompts[0] || "modern interior", "Gallery+1")
    ];

    const [logoBase64, heroBase64, gallery0] = await Promise.all(imgPromises);
    
    // Altre immagini sequenziali (Safe)
    let gallery1 = gallery0;
    if (unifiedData.visuals.galleryPrompts[1]) {
         gallery1 = await safeGenImage(unifiedData.visuals.galleryPrompts[1], "Gallery+2");
    }
    let gallery2 = gallery0;
    if (unifiedData.visuals.galleryPrompts[2]) {
         gallery2 = await safeGenImage(unifiedData.visuals.galleryPrompts[2], "Gallery+3");
    }

    // 4. Assembly
    let finalHtml = unifiedData.html;
    finalHtml = finalHtml.replace("[[LOGO_IMG]]", logoBase64);
    finalHtml = finalHtml.replace("[[HERO_IMG]]", heroBase64);
    finalHtml = finalHtml.replace("[[GALLERY_0]]", gallery0);
    finalHtml = finalHtml.replace("[[GALLERY_1]]", gallery1);
    finalHtml = finalHtml.replace("[[GALLERY_2]]", gallery2);

    return {
        html: finalHtml,
        copywriting: `Stile: ${unifiedData.brand.vibe}. Copy: ${unifiedData.copy.heroHeadline}`,
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
    // Deve rimanere su 2.5 Flash per il tool googleMaps
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", 
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
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview', // UPGRADE
        contents: `Sei il proprietario di "${business.name}". Rispondi brevemente a una proposta di sito web. Chiedi info sul prezzo o un appuntamento. Max 15 parole.`,
    });
    return response.text || "Interessante, mi chiami domani?";
};

export const getChatbotResponse = async (business: Business, userMessage: string): Promise<string> => {
    const prompt = `Sei l'assistente IA avanzato del sito di "${business.name}" (${business.type}).
    MESSAGGIO UTENTE: "${userMessage}"
    Rispondi in modo empatico e professionale.
    OUTPUT JSON: { "text": "Risposta HTML", "visual_elements": [] }`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview', // UPGRADE
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

    return callGeminiWithRetry(async () => {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview', // UPGRADE
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
};

export const generateColdEmail = async (business: Business, audit?: MarketingAudit, isDiscounted: boolean = true, baseUrl: string = ""): Promise<{subject: string, body: string}> => {
    const prompt = `Scrivi una cold email per "${business.name}".
    Output JSON: { "subject": "...", "body": "..." }`;

    return callGeminiWithRetry(async () => {
        const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview', // UPGRADE
        contents: prompt,
        config: { responseMimeType: "application/json" }
        });
        
        let data = extractJSON(response.text || "");
        const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
        const previewUrl = `${cleanBaseUrl}?preview=${business.id}`;
        if (data?.body) data.body = data.body.replace("[LINK_ANTEPRIMA]", previewUrl);
        
        return data || { subject: "Sito pronto", body: `Ecco il link: ${previewUrl}` };
    }, 2, 1000, "Email");
};