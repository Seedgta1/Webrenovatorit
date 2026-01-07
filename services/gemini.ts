import { GoogleGenAI, Type } from "@google/genai";
import { Business, GeneratedSite, MarketingAudit } from "../types";

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

// --- AGENTI AI ---

// 1. SCOUT AGENT (Ricerca)
export const searchLeads = async (niche: string, location: string): Promise<Business[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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

// 2. REPLY AGENT (Simulazione)
export const simulateBusinessReply = async (business: Business): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash', 
        contents: `Sei il proprietario di "${business.name}". Rispondi brevemente a una proposta di sito web. Chiedi info sul prezzo o un appuntamento. Max 15 parole.`,
    });
    return response.text || "Interessante, mi chiami domani?";
};

// 3. ORCHESTRATOR AGENT (Generazione Sito Multi-Agente)
export const generateSitePreview = async (business: Business): Promise<GeneratedSite> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Definisci il contesto per gli agenti
  const prompt = `
  Sei l'ORCHESTRATORE di una squadra di 6 Agenti AI esperti.
  Il cliente è: "${business.name}" (${business.type}) a "${business.address}".
  
  ESEGUI I SEGUENTI COMPITI SEQUENZIALI e produci un UNICO OUTPUT HTML finale:

  --- AGENTE 1: BRAND IDENTITY & DESIGN ---
  - Definisci una palette colori professionale basata sulla psicologia del colore per il settore ${business.type}.
  - Seleziona font moderni da Google Fonts (es. Outfit, Plus Jakarta, Space Grotesk).
  - Stile: Glassmorphism 2.0 (sfondi sfocati, bordi sottili bianchi), Bento Grid Layout.

  --- AGENTE 2: LOGO CREATOR ---
  - Crea un URL per il logo usando ESATTAMENTE questo formato: 
    https://image.pollinations.ai/prompt/minimalist vector logo for ${business.type} named ${business.name}, flat design, vector art, white background?width=200&height=200&nologo=true
  - Inseriscilo nella navbar.

  --- AGENTE 3: PERSUASIVE COPYWRITER ---
  - Scrivi titoli potenti (H1) che colpiscono il "pain point" del cliente.
  - Usa il framework A.I.D.A.
  - NON usare "Lorem Ipsum". Scrivi testo italiano reale e convincente.

  --- AGENTE 4: ICON SELECTOR ---
  - Scegli icone <svg> Lucide specifiche per i servizi (es. 'Utensils' per ristoranti, 'Stethoscope' per medici).
  - NON usare icone generiche se possibile.

  --- AGENTE 5: SMART BOOKING ---
  - Crea una sezione "Prenotazione Intelligente" specifica per il settore.
  - Se Ristorante -> Input: Data, Ora, N. Persone, Allergie.
  - Se Medico/Dentista -> Input: Tipo Dolore (Select), Urgenza.
  - Se Artigiano -> Input: Tipo Guasto, Foto (file input finto).
  - Se Avvocato -> Input: Area Legale, Breve Descrizione.

  --- AGENTE 6: SENIOR CODER ---
  - Assembla tutto in una Single Page Application HTML5 + TailwindCSS.
  - Includi libreria AOS (Animate On Scroll) per animazioni fade-up su TUTTO.
  - Navbar Sticky Glassmorphism.
  - Hero Section con immagine di sfondo di alta qualità (usa https://image.pollinations.ai/prompt/...).
  - Footer completo.
  - CODICE HTML RAW PRONTO ALL'USO.
  
  OUTPUT: Restituisci SOLO il codice HTML completo da <!DOCTYPE html> in poi.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });

  const cleanHtml = extractHTML(response.text || "");
  if (cleanHtml.length < 500) throw new Error("Generazione incompleta.");

  return {
    html: cleanHtml,
    copywriting: "Design System 2026 generato da 6 Agenti AI."
  };
};

// 4. SMART CHATBOT AGENT (Dati Reali + NLP)
export const getChatbotResponse = async (business: Business, userMessage: string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const prompt = `Sei l'assistente IA avanzato del sito di "${business.name}" (${business.type}).
    
    CONTESTO DATI REALI (Inferiti):
    - Indirizzo: ${business.address}
    - Orari tipici: Lun-Sab 9:00-19:00 (Adatta se Ristorante: 12-15 / 19-23).
    - Obiettivo: Prenotazione appuntamento/tavolo.

    MESSAGGIO UTENTE: "${userMessage}"

    LOGICA AGENTE:
    1. Analizza l'intento (Info, Prenotazione, Prezzi, Menu/Servizi).
    2. Rispondi in modo empatico e professionale.
    3. Se chiede prezzi/menu, mostra IMMAGINI visive (visual_elements).

    OUTPUT JSON:
    {
       "text": "Risposta HTML (usa <b>, <br>)",
       "ui_action": "show_booking_modal" | "none",
       "visual_elements": [
          { "type": "image", "keyword": "english description for pollination", "caption": "Titolo" }
       ]
    }
    
    JSON ONLY.`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: "application/json" }
    });

    return response.text || JSON.stringify({ text: "Mi dispiace, può ripetere?", visual_elements: [] });
};

// 5. AUDIT AGENT
export const generateSalesAudit = async (business: Business): Promise<MarketingAudit> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `Analizza "${business.name}" (${business.type}). Crea un audit marketing spietato in JSON.
    Campi: seoScore (30-60), monthlyLostRevenue (es. "€2.400"), criticalIssues (array stringhe), competitorAdvantage.`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
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

// 6. COLD EMAIL AGENT
export const generateColdEmail = async (business: Business, audit?: MarketingAudit, isDiscounted: boolean = true, baseUrl: string = ""): Promise<{subject: string, body: string}> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const prompt = `Scrivi una cold email per "${business.name}".
    Mittente: Riccardo C. (Web Designer).
    Strategia: ${isDiscounted ? "Caso Studio (Sconto 50% in cambio di feedback)" : "Rifacimento Diretto (Valore puro)"}.
    
    Regole Copywriting:
    - Subject: Corto, curioso, non spam.
    - Body: Empatico. Menziona che il sito è GIÀ PRONTO.
    - Placeholder link: [LINK_ANTEPRIMA]
    
    Output JSON: { "subject": "...", "body": "..." }`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    
    let data = extractJSON(response.text || "");
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const previewUrl = `${cleanBaseUrl}?preview=${business.id}`;
    
    if (data?.body) data.body = data.body.replace("[LINK_ANTEPRIMA]", previewUrl);
    
    return data || { subject: "Sito pronto", body: `Ecco il link: ${previewUrl}` };
};