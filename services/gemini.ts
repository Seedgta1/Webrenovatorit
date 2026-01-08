
import { GoogleGenAI, Type } from "@google/genai";
import { Business, GeneratedSite, MarketingAudit, AgentBrandOutput, AgentCopyOutput, AgentVisualOutput } from "../types";

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

// --- AGENTI SEQUENZIALI ---

// 1. BRAND AGENT (Definisce lo stile)
export const agentBrandIdentity = async (business: Business): Promise<AgentBrandOutput> => {
    const prompt = `Sei il Brand Director. Analizza "${business.name}" (${business.type}).
    Definisci una palette colori professionale e fonts moderni.
    
    Output JSON Schema:
    {
      "primaryColor": "hex code (es. #0f172a)",
      "secondaryColor": "hex code (es. #3b82f6)",
      "fontHeading": "Google Font Name (es. Outfit, Playfair Display)",
      "fontBody": "Google Font Name (es. Plus Jakarta Sans)",
      "vibe": "Descrizione breve dello stile (es. Minimalista, Lussuoso)"
    }`;

    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { responseMimeType: "application/json" }
    });
    
    return extractJSON(response.text || "") || {
        primaryColor: "#000000", secondaryColor: "#ffffff", fontHeading: "Inter", fontBody: "Inter", vibe: "Standard"
    };
};

// 2. COPYWRITING AGENT (Scrive i testi)
export const agentCopywriting = async (business: Business, brand: AgentBrandOutput): Promise<AgentCopyOutput> => {
    const prompt = `Sei il Senior Copywriter. Scrivi i testi per il sito di "${business.name}" (${business.type}).
    Stile richiesto: ${brand.vibe}. Lingua: ITALIANO.
    Usa tecniche di persuasione (A.I.D.A.).

    Output JSON Schema:
    {
      "heroHeadline": "Titolo principale d'impatto (max 8 parole)",
      "heroSubheadline": "Sottotitolo persuasivo (max 15 parole)",
      "features": ["Vantaggio 1", "Vantaggio 2", "Vantaggio 3"],
      "cta": "Call to Action (es. Prenota Ora)"
    }`;

    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { responseMimeType: "application/json" }
    });

    return extractJSON(response.text || "") || {
        heroHeadline: "Benvenuti", heroSubheadline: "Il miglior servizio", features: [], cta: "Contattaci"
    };
};

// 3. VISUAL AGENT (Genera i prompt per le immagini)
export const agentVisuals = async (business: Business, brand: AgentBrandOutput): Promise<AgentVisualOutput> => {
    const prompt = `Sei l'Art Director. Crea prompt in INGLESE per generare immagini fotorealistiche con AI.
    Business: ${business.type}. Stile: ${brand.vibe}.
    
    Output JSON Schema:
    {
       "logoPrompt": "minimalist vector logo description...",
       "heroImagePrompt": "cinematic shot description...",
       "galleryPrompts": ["image 1 description", "image 2 description"]
    }`;

    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { responseMimeType: "application/json" }
    });

    return extractJSON(response.text || "") || {
        logoPrompt: "logo", heroImagePrompt: "building", galleryPrompts: []
    };
};

// 4. ARCHITECT AGENT (Assembla il codice finale)
export const agentArchitect = async (
    business: Business, 
    brand: AgentBrandOutput, 
    copy: AgentCopyOutput, 
    visuals: AgentVisualOutput
): Promise<GeneratedSite> => {
    
    const prompt = `Sei il Senior Frontend Developer (TailwindCSS expert).
    
    TASK: Genera una Landing Page HTML5 completa per "${business.name}".
    
    --- INPUT DAGLI ALTRI AGENTI ---
    1. BRAND: Colori ${brand.primaryColor} (Primary), ${brand.secondaryColor} (Secondary). Fonts: ${brand.fontHeading}, ${brand.fontBody}.
    2. COPY:
       H1: "${copy.heroHeadline}"
       Sub: "${copy.heroSubheadline}"
       Features: ${JSON.stringify(copy.features)}
       CTA: "${copy.cta}"
    3. ASSETS:
       Logo URL: https://image.pollinations.ai/prompt/${encodeURIComponent(visuals.logoPrompt)}?width=150&height=150&nologo=true
       Hero Image URL: https://image.pollinations.ai/prompt/${encodeURIComponent(visuals.heroImagePrompt)}?nologo=true
    
    --- REQUISITI TECNICI ---
    - HTML5 singolo file (nessun CSS esterno a parte Tailwind CDN).
    - <script src="https://cdn.tailwindcss.com"></script>
    - Configura Tailwind nel <script> per usare i colori brand: colors: { primary: '${brand.primaryColor}', secondary: '${brand.secondaryColor}' }.
    - Font Google: Importa ${brand.fontHeading} e ${brand.fontBody}.
    - Layout: Navbar Sticky, Hero Fullscreen, Grid Features, Booking Form (finto), Footer.
    - Stile: ${brand.vibe}. Usa ombre, bordi arrotondati, glassmorphism se adatto.
    - Immagini Galleria: Usa https://image.pollinations.ai/prompt/{prompt}?nologo=true per i prompt in ${JSON.stringify(visuals.galleryPrompts)}.
    
    OUTPUT: SOLO CODICE HTML VALIDO.`;

    const response = await ai.models.generateContent({
        model: "gemini-3-pro-preview", // Modello più potente per il codice
        contents: prompt
    });

    const cleanHtml = extractHTML(response.text || "");
    if (cleanHtml.length < 200) throw new Error("Generazione codice fallita.");

    return {
        html: cleanHtml,
        copywriting: `Stile: ${brand.vibe}. Copy: ${copy.heroHeadline}`
    };
};

// --- ALTRI AGENTI (Scout, Chatbot, ecc...) Rimangono invariati ---

export const searchLeads = async (niche: string, location: string): Promise<Business[]> => {
  const prompt = `Usa Google Maps per trovare 5-8 attività commerciali reali nel settore "${niche}" a "${location}" (Italia).
  Restituisci JSON array: [{ "name": "...", "address": "...", "type": "...", "website": "URL/null", "phoneNumber": "...", "status": "NO_SITE"|"OLD_SITE"|"UNKNOWN", "reasoning": "..." }]
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

export const generateSitePreview = async (business: Business): Promise<GeneratedSite> => {
    const brand = await agentBrandIdentity(business);
    const copy = await agentCopywriting(business, brand);
    const visuals = await agentVisuals(business, brand);
    return await agentArchitect(business, brand, copy, visuals);
};
