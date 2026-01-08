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

const extractHTML = (text: string) => {
    const markdownMatch = text.match(/```html([\s\S]*?)```/);
    if (markdownMatch && markdownMatch[1]) return markdownMatch[1].trim();
    const match = text.match(/<!DOCTYPE html>[\s\S]*<\/html>/i) || text.match(/<html[\s\S]*<\/html>/i);
    if (match) return match[0];
    if (text.trim().startsWith('<')) return text.trim();
    return "";
};

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- AGENTI SEQUENZIALI (INTELLIGENZA AUMENTATA) ---

// 0. ANALYST AGENT (Il cervello iniziale)
export const agentAnalyst = async (business: Business): Promise<AgentAnalystOutput> => {
    const prompt = `Sei un Business Analyst esperto. Analizza il lead: "${business.name}" (${business.type}).
    Deduci il settore specifico, la nicchia e il target di riferimento per guidare la creazione del sito.
    
    Output JSON Schema:
    {
      "industry": "Settore macro in INGLESE (es. Healthcare)",
      "niche": "Nicchia specifica in INGLESE (es. Pediatric Dentistry)",
      "targetAudience": "Descrizione target (es. Famiglie locali)",
      "coreValues": ["Valore 1", "Valore 2", "Valore 3"]
    }`;

    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: { responseMimeType: "application/json" }
    });

    return extractJSON(response.text || "") || {
        industry: "General Business", niche: "Local Service", targetAudience: "Locals", coreValues: ["Quality"]
    };
};

// 1. BRAND AGENT
export const agentBrandIdentity = async (business: Business, analysis: AgentAnalystOutput): Promise<AgentBrandOutput> => {
    const prompt = `Sei un Creative Director. Usa l'analisi: Settore ${analysis.industry}, Nicchia ${analysis.niche}.
    Definisci una brand identity per "${business.name}".
    
    Se è medicale -> Colori puliti (Blu, Verde acqua, Bianco).
    Se è cibo -> Colori caldi.
    Se è lusso -> Nero, Oro, Serif fonts.
    
    Output JSON Schema:
    {
      "primaryColor": "hex code",
      "secondaryColor": "hex code",
      "accentColor": "hex code",
      "fontHeading": "Google Font Name (es. Playfair Display, Outfit)",
      "fontBody": "Google Font Name (es. Inter, Lato)",
      "vibe": "Descrizione stile (es. Professional and sterile)"
    }`;

    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: { responseMimeType: "application/json" }
    });
    
    return extractJSON(response.text || "") || {
        primaryColor: "#000000", secondaryColor: "#ffffff", accentColor: "#3b82f6", fontHeading: "Inter", fontBody: "Inter", vibe: "Standard"
    };
};

// 2. COPYWRITING AGENT
export const agentCopywriting = async (business: Business, brand: AgentBrandOutput, analysis: AgentAnalystOutput): Promise<AgentCopyOutput> => {
    const prompt = `Sei un Senior Copywriter. Scrivi per "${business.name}".
    Target: ${analysis.targetAudience}. Valori: ${analysis.coreValues.join(", ")}.
    Stile: ${brand.vibe}. Lingua: ITALIANO.
    
    Usa la formula A.I.D.A.
    
    Output JSON Schema:
    {
      "heroHeadline": "Titolo H1 (max 7 parole)",
      "heroSubheadline": "H2 persuasivo (max 15 parole)",
      "features": [{"title": "...", "desc": "..."}, {"title": "...", "desc": "..."}], 
      "cta": "Call to Action",
      "aboutText": "Chi Siamo (max 40 parole)",
      "seoKeywords": ["keyword1", "keyword2"]
    }`;

    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: { responseMimeType: "application/json" }
    });

    return extractJSON(response.text || "") || {
        heroHeadline: "Benvenuti", heroSubheadline: "Il miglior servizio", features: [], cta: "Contattaci", aboutText: "", seoKeywords: []
    };
};

// 3. UX STRATEGIST
export const agentUX = async (business: Business, copy: AgentCopyOutput, analysis: AgentAnalystOutput): Promise<AgentUXOutput> => {
    const prompt = `Sei un UX Strategist. Definisci il layout per un business di tipo: ${analysis.niche}.
    
    Output JSON Schema:
    {
      "layoutStructure": ["Navbar", "Hero", "Features", "About", "Testimonials", "Booking", "Footer"],
      "componentsStyle": "Descrizione stile (es. 'Clean medical cards', 'Dark mode luxury')",
      "heroType": "CENTERED" | "SPLIT" | "BACKGROUND_IMAGE"
    }`;

    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: { responseMimeType: "application/json" }
    });

    return extractJSON(response.text || "") || {
        layoutStructure: ["Navbar", "Hero", "Footer"], componentsStyle: "Standard", heroType: "CENTERED"
    };
};

// 4. CHATBOT AGENT
export const agentChatbot = async (business: Business, brand: AgentBrandOutput): Promise<AgentChatbotOutput> => {
    const prompt = `Sei un Conversational Designer. Crea la configurazione per il chatbot di "${business.name}".
    Stile: ${brand.vibe}.
    
    Output JSON Schema:
    {
      "botName": "Nome del bot (es. DentistaBot)",
      "welcomeMessage": "Messaggio di benvenuto accogliente",
      "tone": "Formal | Friendly | Professional",
      "suggestedQuestions": ["Domanda 1", "Domanda 2", "Domanda 3"]
    }`;

    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: { responseMimeType: "application/json" }
    });

    return extractJSON(response.text || "") || {
        botName: "Assistant", welcomeMessage: "Ciao, come posso aiutarti?", tone: "Professional", suggestedQuestions: ["Orari", "Prezzi"]
    };
};

// 5. REPUTATION AGENT (Nuovo)
export const agentReviews = async (business: Business, niche: string): Promise<AgentReviewsOutput> => {
    const prompt = `Usa Google Maps per cercare le recensioni di "${business.name}" a "${business.address}".
    
    TASK: Estrai 3 recensioni positive (4-5 stelle) reali. 
    Se NON trovi recensioni reali o l'attività non esiste su Maps, genera 3 testimonianze realistiche ideali per la nicchia "${niche}".
    
    Output JSON Schema:
    {
      "reviews": [
        { "author": "Nome Cognome", "text": "Testo breve della recensione (max 20 parole)", "rating": 5, "source": "Google" }
      ],
      "summary": "Stringa riassuntiva (es. 4.8/5 su Google)"
    }`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { 
            // responseMimeType: "application/json" rimosso perché incompatibile con googleMaps tool
            tools: [{ googleMaps: {} }]
        }
    });

    return extractJSON(response.text || "") || {
        reviews: [{ author: "Cliente Soddisfatto", text: "Servizio eccellente!", rating: 5, source: "Google" }],
        summary: "5.0 su Google"
    };
};

// 6. VISUAL AGENT
export const agentVisuals = async (business: Business, brand: AgentBrandOutput, analysis: AgentAnalystOutput): Promise<AgentVisualOutput> => {
    const prompt = `Sei un Art Director. Crea prompt per immagini AI per "${business.name}".
    
    CRUCIALE: Usa i dati di analisi per essere specifico.
    Settore: ${analysis.industry}. Nicchia: ${analysis.niche}.
    
    Esempi:
    - Se "Dentist": "Modern dental clinic reception, bright lighting, clean white minimalist design".
    - Se "Pizza": "Wood fired pizza close up, melting cheese, rustic wooden table".
    
    NON usare testo nelle immagini.
    
    Output JSON Schema:
    {
       "logoPrompt": "vector minimalist icon logo for ${analysis.niche}, simple shapes, flat design, ${brand.primaryColor} color...",
       "heroImagePrompt": "photorealistic shot of ${analysis.niche} environment, cinematic lighting, 8k resolution...",
       "galleryPrompts": ["detail of...", "interior of..."]
    }`;

    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: { responseMimeType: "application/json" }
    });

    return extractJSON(response.text || "") || {
        logoPrompt: "logo", heroImagePrompt: "building", galleryPrompts: []
    };
};

// 7. IMAGE GENERATOR (Nano Banana / Gemini 2.5 Flash Image)
export const generateNanoImage = async (prompt: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [{ text: prompt }]
            }
        });

        // Safe extraction with optional chaining
        const candidate = response.candidates?.[0];
        const part = candidate?.content?.parts?.[0];
        
        if (part?.inlineData?.data) {
             return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
        
        return "https://placehold.co/600x400?text=Generation+Failed";
    } catch (e) {
        console.error("Image Gen Error:", e);
        return "https://placehold.co/600x400?text=Error";
    }
};

// 8. ARCHITECT AGENT
export const agentArchitect = async (
    business: Business, 
    brand: AgentBrandOutput, 
    copy: AgentCopyOutput, 
    ux: AgentUXOutput,
    visuals: AgentVisualOutput,
    chatbot: AgentChatbotOutput,
    reviews: AgentReviewsOutput,
    images: { logo: string, hero: string, gallery: string[] }
): Promise<GeneratedSite> => {
    
    const prompt = `Sei un Senior Frontend Engineer (TailwindCSS).
    
    TASK: Crea il codice HTML5 finale per "${business.name}".
    
    --- DATI ---
    Colori: ${brand.primaryColor}, ${brand.secondaryColor}. Font: ${brand.fontHeading}.
    Hero: "${copy.heroHeadline}"
    UX: ${ux.heroType}, ${ux.componentsStyle}.
    Chatbot: Nome "${chatbot.botName}", Msg "${chatbot.welcomeMessage}".
    
    --- RECENSIONI (OBBLIGATORIO INSERIRE LA SEZIONE TESTIMONIALS) ---
    Usa ESATTAMENTE questi dati: ${JSON.stringify(reviews.reviews)}
    
    --- ASSETS (Usa ESATTAMENTE le stringhe placeholder fornite) ---
    Logo URL: ${images.logo}
    Hero URL: ${images.hero}
    Gallery: ${images.gallery.join(", ")}
    
    --- REQUISITI ---
    1. HTML5 file singolo.
    2. Tailwind CSS CDN.
    3. Google Fonts.
    4. Implementa un FAB (Floating Action Button) per il Chatbot in basso a destra.
    5. Form prenotazione finto ma bello.
    6. Footer professionale.
    7. SEZIONE TESTIMONIALS ben visibile usando i dati forniti.
    
    OUTPUT: SOLO CODICE HTML.`;

    const response = await ai.models.generateContent({
        model: "gemini-3-pro-preview",
        contents: prompt
    });

    const cleanHtml = extractHTML(response.text || "");
    if (cleanHtml.length < 200) throw new Error("Generazione codice fallita.");

    return {
        html: cleanHtml,
        copywriting: `Stile: ${brand.vibe}. Copy: ${copy.heroHeadline}`
    };
};

// --- EXPORT PRINCIPALE ---
export const generateSitePreview = async (business: Business): Promise<GeneratedSite> => {
    const analysis = await agentAnalyst(business);
    const brand = await agentBrandIdentity(business, analysis);
    const copy = await agentCopywriting(business, brand, analysis);
    const ux = await agentUX(business, copy, analysis);
    const chatbot = await agentChatbot(business, brand);
    const reviews = await agentReviews(business, analysis.niche); // Nuovo Agent Reputation
    const visuals = await agentVisuals(business, brand, analysis);
    
    // Generazione Immagini Parallela (Nano Banana)
    const logoPromise = generateNanoImage(visuals.logoPrompt);
    const heroPromise = generateNanoImage(visuals.heroImagePrompt);
    // Generiamo max 3 immagini galleria per velocità
    const galleryPromises = visuals.galleryPrompts.slice(0, 3).map(p => generateNanoImage(p));
    
    const [logoBase64, heroBase64, ...galleryBase64] = await Promise.all([logoPromise, heroPromise, ...galleryPromises]);
    
    // Placeholder Strategy
    const placeholders = {
        logo: "[[LOGO_IMG]]",
        hero: "[[HERO_IMG]]",
        gallery: galleryBase64.map((_, i) => `[[GALLERY_${i}]]`)
    };

    const result = await agentArchitect(business, brand, copy, ux, visuals, chatbot, reviews, placeholders);
    
    // Replace placeholders
    let finalHtml = result.html;
    finalHtml = finalHtml.replace("[[LOGO_IMG]]", logoBase64);
    finalHtml = finalHtml.replace("[[HERO_IMG]]", heroBase64);
    galleryBase64.forEach((b64, i) => {
        finalHtml = finalHtml.replace(`[[GALLERY_${i}]]`, b64);
    });

    return { ...result, html: finalHtml };
};

// --- ALTRI SERVIZI ---
export const searchLeads = async (niche: string, location: string): Promise<Business[]> => {
  const prompt = `Usa Google Maps per trovare 5-8 attività commerciali reali nel settore "${niche}" a "${location}" (Italia).
  Restituisci JSON array: [{ "name": "...", "address": "...", "type": "...", "website": "URL/null", "phoneNumber": "...", "rating": 4.5, "ratingCount": 120, "status": "NO_SITE"|"OLD_SITE"|"UNKNOWN", "reasoning": "..." }]
  JSON RAW ONLY.`;
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", 
      contents: prompt,
      config: { tools: [{ googleMaps: {} }], temperature: 0.2 },
    });
    const data = extractJSON(response.text || "[]");
    return Array.isArray(data) ? data.map((item: any, i: number) => ({
      ...item, id: `lead-${Date.now()}-${i}`, leadStatus: 'NEW', website: (!item.website || item.website === "http://") ? null : item.website
    })) : [];
  } catch (error) { throw new Error("Errore ricerca AI."); }
};

export const simulateBusinessReply = async (business: Business): Promise<string> => {
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview', 
        contents: `Sei il proprietario di "${business.name}". Rispondi brevemente a una proposta di sito web. Chiedi info sul prezzo o un appuntamento. Max 15 parole.`,
    });
    return response.text || "Interessante, mi chiami domani?";
};

export const getChatbotResponse = async (business: Business, userMessage: string): Promise<string> => {
    const prompt = `Sei l'assistente IA avanzato del sito di "${business.name}" (${business.type}).
    MESSAGGIO UTENTE: "${userMessage}"
    Rispondi in modo empatico e professionale.
    OUTPUT JSON: { "text": "Risposta HTML", "visual_elements": [] }`;

    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { responseMimeType: "application/json" }
    });

    return response.text || JSON.stringify({ text: "Mi dispiace, può ripetere?", visual_elements: [] });
};

export const generateSalesAudit = async (business: Business): Promise<MarketingAudit> => {
    const prompt = `Analizza "${business.name}" (${business.type}). Crea un audit marketing spietato in JSON.
    Campi: seoScore (30-60), monthlyLostRevenue (es. "€2.400"), criticalIssues (array stringhe), competitorAdvantage.`;

    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
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
};

export const generateColdEmail = async (business: Business, audit?: MarketingAudit, isDiscounted: boolean = true, baseUrl: string = ""): Promise<{subject: string, body: string}> => {
    const prompt = `Scrivi una cold email per "${business.name}".
    Output JSON: { "subject": "...", "body": "..." }`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    
    let data = extractJSON(response.text || "");
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const previewUrl = `${cleanBaseUrl}?preview=${business.id}`;
    if (data?.body) data.body = data.body.replace("[LINK_ANTEPRIMA]", previewUrl);
    
    return data || { subject: "Sito pronto", body: `Ecco il link: ${previewUrl}` };
};