
import { GoogleGenAI, Type } from "@google/genai";
import { Business, GeneratedSite, MarketingAudit } from "../types";

const apiKey = process.env.API_KEY || '';

// Funzione helper robusta per estrarre JSON (Array o Oggetto) dalla risposta AI
const extractJSON = (text: string) => {
    try {
        // Tentativo 1: Cerca un array JSON [ ... ]
        const arrayMatch = text.match(/\[([\s\S]*?)\]/);
        if (arrayMatch) {
            return JSON.parse(arrayMatch[0]);
        }
        
        // Tentativo 2: Cerca un oggetto JSON { ... }
        const objectMatch = text.match(/\{([\s\S]*?)\}/);
        if (objectMatch) {
            return JSON.parse(objectMatch[0]);
        }

        // Tentativo 3: Prova a parsare tutto il testo
        return JSON.parse(text);
    } catch (e) {
        console.warn("JSON Extraction Failed for text:", text.substring(0, 100) + "...");
        return null;
    }
};

// Funzione helper per estrarre SOLO l'HTML valido ignorando markdown o chat
const extractHTML = (text: string) => {
    // Cerca pattern standard di inizio e fine documento HTML
    const match = text.match(/<!DOCTYPE html>[\s\S]*<\/html>/i) || text.match(/<html[\s\S]*<\/html>/i);
    if (match) {
        return match[0];
    }
    // Fallback: pulizia markdown
    return text.replace(/```html/g, '').replace(/```/g, '').trim();
};

export const searchLeads = async (niche: string, location: string): Promise<Business[]> => {
  if (!apiKey) throw new Error("API Key mancante");
  const ai = new GoogleGenAI({ apiKey });
  // Usiamo gemini-2.5-flash per velocità e capacità di tool use
  const modelId = "gemini-2.5-flash"; 
  
  const prompt = `Usa Google Maps per trovare 5-8 attività commerciali reali nel settore "${niche}" a "${location}" (Italia).

  OBIETTIVO: Identificare potenziali clienti per una web agency.
  
  ISTRUZIONI:
  1. Trova le attività su Maps.
  2. Verifica se hanno un sito web.
  3. Restituisci un array JSON valido con i dettagli.
  
  FORMATO JSON RICHIESTO:
  [
    {
      "name": "Nome Attività",
      "address": "Indirizzo",
      "type": "Categoria",
      "website": "URL (o null se assente)",
      "phoneNumber": "Telefono",
      "rating": 4.5,
      "status": "NO_SITE" (se manca il sito) o "OLD_SITE" (se c'è ma sembra datato/non sicuro) o "UNKNOWN",
      "reasoning": "Breve motivo per cui contattarli (es. 'Non hanno un sito web')"
    }
  ]
  
  IMPORTANTE: Restituisci SOLO il JSON raw. Nessun blocco markdown, nessun testo introduttivo.`;
  
  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: { 
          tools: [{ googleMaps: {} }], 
          temperature: 0.2,
      },
    });

    const text = response.text || "[]";
    const data = extractJSON(text);

    if (!data || !Array.isArray(data)) {
        console.warn("Dati non validi ricevuti:", text);
        return [];
    }

    return data.map((item: any, index: number) => ({
      ...item,
      id: `lead-${Date.now()}-${index}`,
      leadStatus: 'NEW',
      website: (item.website === "" || item.website === "http://" || !item.website) ? null : item.website,
      phoneNumber: item.phoneNumber || undefined
    }));
  } catch (error) {
    console.error("Errore Search:", error);
    throw new Error("Errore durante la ricerca lead. Assicurati che l'API Key sia valida.");
  }
};

export const simulateBusinessReply = async (business: Business): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Sei il proprietario dell'attività "${business.name}". Hai ricevuto un'email con un sito web già fatto per te con un'offerta scontata.
        Rispondi in modo breve (max 15 parole) chiedendo se lo sconto è ancora valido o come procedere.`,
    });
    return response.text || "L'offerta del 50% è interessante, possiamo sentirci per i dettagli?";
};

export const generateSitePreview = async (business: Business): Promise<GeneratedSite> => {
  if (!apiKey) throw new Error("API Key mancante");
  const ai = new GoogleGenAI({ apiKey });
  
  // USIAMO GEMINI 3 PRO PREVIEW PER QUALITÀ CODICE SUPERIORE
  const modelId = "gemini-3-pro-preview"; 

  const prompt = `Sei un Creative Director e Lead Frontend Developer premiato su Awwwards.
  Il tuo compito è creare un sito web SPA (Single Page Application) MOZZAFIATO in un unico file HTML per "${business.name}" (${business.type}).
  
  --- DESIGN SYSTEM DINAMICO (CRITICO PER EDITING) ---
  Devi usare le CSS VARIABLES nella root per permettere la modifica dei colori e dei font successivamente tramite JS.
  Definisci nel <style>:
  :root {
      --primary: #2563eb; /* Colore principale (cambialo in base al settore) */
      --secondary: #1e293b; /* Colore secondario */
      --font-heading: 'Playfair Display', serif; 
      --font-body: 'Lato', sans-serif;
      --radius: 1rem;
  }
  Usa queste variabili nel CSS (es. background-color: var(--primary); font-family: var(--font-heading);).

  --- ISTRUZIONI VISIVE & ANIMAZIONI ---
  1.  **Tipografia**: Importa Google Fonts (Playfair Display, Lato, Outfit, ecc.).
  2.  **Layout**: Bento Grid per servizi, Glassmorphism per navbar/card.
  3.  **Animazioni CSS**: Keyframes per 'fade-in-up', 'float'.

  --- STRUTTURA & COPYWRITING (A.I.D.A.) ---
  1.  **HERO**: Background full-screen. H1 editabile. CTA.
  2.  **NAVBAR**: Logo testuale o SVG.
  3.  **CONTENUTO**: Servizi, Menu (se ristorante), Recensioni.
  4.  **CHATBOT WIDGET**:
      - Inserisci un div flottante in basso a destra.
      - DEVE includere lo script JS per ascoltare 'AI_REPLY'.
      - Logica 'ui_action' per: show_hours, show_booking, show_quote.

  --- EDITOR COMPATIBILITY ---
  Ogni testo importante (H1, H2, P, Button) deve essere racchiuso in tag puliti. 
  Non aggiungere attributi 'contenteditable' ora, verranno aggiunti dal software genitore.
  
  Output: SOLO CODICE HTML (da <!DOCTYPE html> a </html>).`;

  const response = await ai.models.generateContent({
    model: modelId,
    contents: prompt,
    // Thinking Budget alto per pianificare l'architettura CSS e le animazioni
    config: { thinkingConfig: { thinkingBudget: 16384 } } 
  });

  const rawText = response.text || "";
  const cleanHtml = extractHTML(rawText);

  if (!cleanHtml || cleanHtml.length < 500) {
      throw new Error("Generazione sito fallita o incompleta.");
  }

  return {
    html: cleanHtml,
    copywriting: "Design Next-Gen generato con Gemini 3 Pro."
  };
};

export const getChatbotResponse = async (business: Business, userMessage: string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    
    const prompt = `Sei l'assistente virtuale avanzato sul sito di "${business.name}" (${business.type}).
    Il cliente scrive: "${userMessage}".

    OBIETTIVI:
    1. Rispondi in modo professionale e cordiale (max 30 parole).
    2. Riconosci l'INTENTO dell'utente per attivare widget interattivi.

    OUTPUT JSON OBBLIGATORIO:
    {
       "text": "La risposta testuale...",
       "image_keywords": [],
       "ui_action": "ACTION_CODE"
    }

    CODICI "ui_action" DISPONIBILI:
    - "show_hours": Se l'utente chiede gli orari di apertura.
    - "show_booking": Se l'utente vuole prenotare un tavolo, una visita o un appuntamento.
    - "show_quote": Se l'utente chiede prezzi, preventivi o quanto costa.
    - "none": Per conversazione generica.
    
    Rispondi SOLO con il JSON.`;

    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { responseMimeType: "application/json" }
    });

    return response.text || JSON.stringify({ text: "Mi scusi, può ripetere?", image_keywords: [], ui_action: "none" });
};

// NUOVA FUNZIONE: Genera un audit che giustifica l'urgenza
export const generateSalesAudit = async (business: Business): Promise<MarketingAudit> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    const prompt = `Analizza l'attività "${business.name}" (${business.type}) a "${business.address}".
    Agisci come un consulente di marketing esperto. Genera un mini-audit realistico ma preoccupante per il proprietario.

    Output JSON richiesto:
    {
        "seoScore": (numero tra 35 e 55),
        "monthlyLostRevenue": "€X.XXX" (stima realistica di quanto perdono senza sito/prenotazioni online),
        "criticalIssues": [
            "Problema 1 (es. Assenza posizionamento locale)",
            "Problema 2 (es. Impossibile prenotare fuori orario)",
            "Problema 3 (es. Concorrenti visibili su Maps)"
        ],
        "competitorAdvantage": "Frase breve su come i competitor stanno rubando clienti"
    }
    
    Usa SOLO JSON.`;

    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { responseMimeType: "application/json" }
    });
    
    const rawData = extractJSON(response.text || "");
    const defaults = {
        seoScore: 45,
        monthlyLostRevenue: "€1.500",
        criticalIssues: ["Mancanza di visibilità", "Sito non ottimizzato per conversioni", "Assenza prenotazioni online"],
        competitorAdvantage: "I competitor sono molto più attivi online."
    };

    return { ...defaults, ...rawData };
};

export const generateColdEmail = async (business: Business, audit?: MarketingAudit, isDiscounted: boolean = false): Promise<{subject: string, body: string}> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    
    let prompt = "";
    
    if (isDiscounted && audit) {
        prompt = `Scrivi una 'Cold Email Irresistibile' per "${business.name}".
        
        DATI AUDIT DA USARE NEL TESTO:
        - Perdita stimata: ${audit.monthlyLostRevenue}/mese.
        - Problema critico: ${audit.criticalIssues[0]}.
        
        STRATEGIA (Irresistible Offer):
        1. Oggetto: Urgente/Personale (es. "Ho analizzato la sua presenza online...")
        2. Hook: "Ho fatto un'analisi rapida e ho visto che state lasciando sul tavolo circa ${audit.monthlyLostRevenue} al mese perché ${audit.criticalIssues[0]}."
        3. Value: "Ho già creato il sito per risolvere questo problema. È pronto."
        4. The DEAL: "Normalmente chiedo 300€, ma sto cercando un Case Study nel settore ${business.type}. Se vi piace e mi lasciate una recensione, ve lo lascio a 149€ (Sconto 50%)."
        5. Scarcity: "L'offerta vale per 48h perché devo chiudere il portfolio settimanale."
        6. Link: [LINK_ANTEPRIMA]
        
        Tono: Diretto, Autorevole ma che offre un favore.`;
    } else {
        prompt = `Scrivi una email commerciale standard B2B per "${business.name}".
        Subject: Anteprima nuovo sito web.
        Body: Ho creato un sito per voi, guardatelo qui [LINK_ANTEPRIMA]. Fatemi sapere.`;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt + " Restituisci JSON {subject, body}.",
      config: { 
          responseMimeType: "application/json",
          temperature: 0.7 
      }
    });
    
    const data = extractJSON(response.text || "");
    
    if (!data) return { subject: "Proposta Web", body: "Salve, ho un sito per voi." };

    if (data.body) {
        data.body = data.body.replace("[LINK_ANTEPRIMA]", `https://preview.webrenovator.it/v/${business.id}`);
    }
    return data;
};
