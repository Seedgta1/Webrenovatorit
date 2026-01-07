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

// 1. SCOUT AGENT (Ricerca) - DEVE USARE GEMINI 2.5 PER MAPS
export const searchLeads = async (niche: string, location: string): Promise<Business[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Usa Google Maps per trovare 5-8 attività commerciali reali nel settore "${niche}" a "${location}" (Italia).
  Restituisci JSON array: [{ "name": "...", "address": "...", "type": "...", "website": "URL/null", "phoneNumber": "...", "status": "NO_SITE"|"OLD_SITE"|"UNKNOWN", "reasoning": "..." }]
  JSON RAW ONLY.`;
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", // Maps Grounding è supportato solo su 2.5
      contents: prompt,
      config: { tools: [{ googleMaps: {} }], temperature: 0.2 },
    });
    const data = extractJSON(response.text || "[]");
    return Array.isArray(data) ? data.map((item: any, i: number) => ({
      ...item, id: `lead-${Date.now()}-${i}`, leadStatus: 'NEW', website: (!item.website || item.website === "http://") ? null : item.website
    })) : [];
  } catch (error) { throw new Error("Errore ricerca AI."); }
};

// 2. REPLY AGENT (Simulazione) - UPGRADE A GEMINI 3 FLASH
export const simulateBusinessReply = async (business: Business): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview', 
        contents: `Sei il proprietario di "${business.name}". Rispondi brevemente a una proposta di sito web. Chiedi info sul prezzo o un appuntamento. Max 15 parole.`,
    });
    return response.text || "Interessante, mi chiami domani?";
};

// 3. ORCHESTRATOR AGENT (Generazione Sito) - UPGRADE A GEMINI 3 PRO (MASSIMA POTENZA)
export const generateSitePreview = async (business: Business): Promise<GeneratedSite> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Definisci il contesto per gli agenti con istruzioni potenziate per Gemini 3 Pro
  const prompt = `
  Sei l'ORCHESTRATORE CREATIVO di una squadra di 6 Agenti AI di livello mondiale.
  Il cliente è: "${business.name}" (${business.type}) a "${business.address}".
  
  TASK: Coordina gli agenti per generare una SPA HTML5 mozzafiato (Standard 2026).

  --- SQUADRA AGENTI ---
  
  1. [AGENT DESIGN] @BrandIdentity
     - Palette: Colori sofisticati (es. Slate-900 + Electric Blue o Emerald + Gold).
     - Font: 'Outfit' (Headings), 'Plus Jakarta Sans' (Body).
     - UI: Glassmorphism estremo, ombre morbide, bordi arrotondati (rounded-2xl).
  
  2. [AGENT LOGO] @LogoGen
     - Genera URL: https://image.pollinations.ai/prompt/minimalist vector logo icon for ${business.type} ${business.name}, white background, flat design, high quality?width=150&height=150&nologo=true
  
  3. [AGENT COPY] @PersuasionMaster
     - Scrivi SOLO in Italiano perfetto.
     - Usa leve emotive (Scarcity, Authority, Trust).
     - Niente "Benvenuti nel nostro sito". Usa: "Trasformiamo il tuo sorriso" (Dentista) o "Il gusto della tradizione" (Ristorante).
  
  4. [AGENT MEDIA] @IconSelector
     - Usa icone SVG Lucide (inseriscile inline come <svg>).
     - Immagini: Usa https://image.pollinations.ai/prompt/{descrizione_inglese_dettagliata}?nologo=true.
     - Le immagini devono essere fotorealistiche e specifiche per ${business.type}.
  
  5. [AGENT DEV] @SeniorCoder
     - Scrivi codice HTML5 + TailwindCSS completo.
     - Navbar: Sticky, backdrop-blur-xl.
     - Hero: Full screen (min-h-screen), titolo H1 enorme (text-6xl+).
     - Grid: Usa CSS Grid per il layout "Bento" (celle irregolari).
     - Animazioni: Aggiungi attributi 'data-aos="fade-up"' a TUTTI gli elementi principali.
     - Includi script AOS alla fine: <script src="https://unpkg.com/aos@next/dist/aos.js"></script><script>AOS.init({duration:800,once:true});</script>
     - Footer: Completo con link finti e copyright.

  --- AGENT BOOKING (Modulo Intelligente) ---
  Crea un form di prenotazione specifico:
  - Se Ristorante: Data, Ora, N. Coperti.
  - Se Medico: Sintomi, Urgenza.
  - Se Servizi: Tipo Intervento, Foto.
  
  OUTPUT: Restituisci SOLO il codice HTML completo. Nessun markdown, nessuna premessa.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview", // Modello Pro per la massima qualità di coding e design
    contents: prompt,
    // Nessun thinkingConfig per bilanciare qualità e velocità
  });

  const cleanHtml = extractHTML(response.text || "");
  if (cleanHtml.length < 500) throw new Error("Generazione incompleta.");

  return {
    html: cleanHtml,
    copywriting: "Design Premium generato da Gemini 3 Pro Agents."
  };
};

// 4. SMART CHATBOT AGENT - UPGRADE A GEMINI 3 FLASH
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
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { responseMimeType: "application/json" }
    });

    return response.text || JSON.stringify({ text: "Mi dispiace, può ripetere?", visual_elements: [] });
};

// 5. AUDIT AGENT - UPGRADE A GEMINI 3 FLASH
export const generateSalesAudit = async (business: Business): Promise<MarketingAudit> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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

// 6. COLD EMAIL AGENT - UPGRADE A GEMINI 3 FLASH
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