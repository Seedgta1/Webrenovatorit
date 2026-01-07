import { GoogleGenAI, Type } from "@google/genai";
import { Business, GeneratedSite, MarketingAudit } from "../types";

// Funzione helper robusta per estrarre JSON (Array o Oggetto) dalla risposta AI
const extractJSON = (text: string) => {
    try {
        // 1. Rimuovi blocchi markdown comuni
        let cleanText = text.replace(/```json/gi, '').replace(/```/g, '').trim();

        // 2. Trova la prima parentesi graffa aperta e l'ultima chiusa
        const firstOpen = cleanText.indexOf('{');
        const lastClose = cleanText.lastIndexOf('}');
        const firstArrOpen = cleanText.indexOf('[');
        const lastArrClose = cleanText.lastIndexOf(']');

        // Determina se è probabile che sia un oggetto o un array
        if (firstOpen !== -1 && lastClose !== -1 && (firstArrOpen === -1 || firstOpen < firstArrOpen)) {
             cleanText = cleanText.substring(firstOpen, lastClose + 1);
        } else if (firstArrOpen !== -1 && lastArrClose !== -1) {
             cleanText = cleanText.substring(firstArrOpen, lastArrClose + 1);
        }

        return JSON.parse(cleanText);
    } catch (e) {
        console.warn("JSON Extraction Failed for text:", text.substring(0, 50) + "...", e);
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
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Sei il proprietario dell'attività "${business.name}". Hai ricevuto un'email con un sito web già fatto per te con un'offerta scontata.
        Rispondi in modo breve (max 15 parole) chiedendo se lo sconto è ancora valido o come procedere.`,
    });
    return response.text || "L'offerta del 50% è interessante, possiamo sentirci per i dettagli?";
};

export const generateSitePreview = async (business: Business): Promise<GeneratedSite> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
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
      - Il div della chat deve avere ID 'chatbot-container'.
      - I messaggi devono essere appesi a un div con ID 'chat-messages'.

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
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const prompt = `Sei l'assistente virtuale avanzato sul sito di "${business.name}" (${business.type}).
    Il cliente scrive: "${userMessage}".

    OBIETTIVI:
    1. Rispondi in modo professionale, persuasivo e specifico per il settore.
    2. Se l'utente chiede del cibo, servizi o prodotti, DEVI mostrare immagini pertinenti.
    3. Guida l'utente alla conversione (prenotazione, chiamata).

    OUTPUT JSON OBBLIGATORIO:
    {
       "text": "Risposta testuale (usa HTML base come <b> o <br> se serve, max 40 parole).",
       "ui_action": "show_hours" | "show_booking" | "show_quote" | "none",
       "visual_elements": [
          {
             "type": "image",
             "keyword": "descrizione visiva in inglese per generare l'immagine (es. 'delicious italian pizza margherita high quality')",
             "caption": "Nome del piatto o servizio (es. 'Pizza Margherita DOP')"
          }
       ]
    }
    
    Regole Visual Elements:
    - Se l'utente chiede il menu, restituisci 2-3 piatti tipici del settore come immagini.
    - Se l'utente chiede 'come lavorate' (es. dentista), mostra 'modern dentist chair' o 'smiling patient'.
    - Se la conversazione è generica, lascia l'array vuoto.

    Rispondi SOLO con il JSON.`;

    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { responseMimeType: "application/json" }
    });

    return response.text || JSON.stringify({ 
        text: "Certamente, come posso aiutarla oggi?", 
        ui_action: "none", 
        visual_elements: [] 
    });
};

// NUOVA FUNZIONE: Genera un audit che giustifica l'urgenza
export const generateSalesAudit = async (business: Business): Promise<MarketingAudit> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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

export const generateColdEmail = async (business: Business, audit?: MarketingAudit, isDiscounted: boolean = true, baseUrl: string = "https://webrenovator.it"): Promise<{subject: string, body: string}> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    let prompt = "";
    
    if (isDiscounted) {
        prompt = `Scrivi una 'Cold Email' iper-persuasiva per "${business.name}" da parte di Riccardo C. (Web Designer).
        
        ELEMENTI PSICOLOGICI OBBLIGATORI:
        1. SFORZO (Reciprocità): Inizia DICENDO ESPLICITAMENTE "Ho passato l'ultima settimana a studiare il vostro brand e ho creato un sito completo per voi, senza che me lo chiedeste."
        2. MOTIVO (Trust): "Mi serve un Caso Studio di eccellenza nel settore ${business.type} per il mio portfolio, per questo ho fatto il lavoro in anticipo."
        3. CALL TO ACTION: "Clicca per vedere l'anteprima che ho creato."
        
        OBBLIGATORIO: Devi includere il placeholder [LINK_ANTEPRIMA] nel testo.
        
        Output JSON {subject, body}.`;
    } else {
        prompt = `Scrivi una email breve e diretta per "${business.name}" da parte di Riccardo C.
        Subject: Ho rifatto il sito di ${business.name} (Anteprima)
        Body: Ciao, sono Riccardo C. Ho notato che il vostro sito attuale potrebbe performare meglio. Ho creato una versione moderna e ottimizzata, ci ho lavorato personalmente questa settimana.
        
        Potete vederla qui: [LINK_ANTEPRIMA]
        
        Fatemi sapere se vi piace.
        
        Output JSON {subject, body}.`;
    }

    // Usiamo gemini-2.5-flash per maggiore velocità e affidabilità JSON
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { 
          responseMimeType: "application/json",
          temperature: 0.7 
      }
    });
    
    let data = extractJSON(response.text || "");
    
    // Fallback manuale se il JSON fallisce o è vuoto
    if (!data || !data.subject) {
        data = {
            subject: `Ho creato il nuovo sito per ${business.name} (Caso Studio)`,
            body: `Ciao,\n\nSono Riccardo C.\n\nSarò diretto: ho lavorato per tutta la settimana scorsa per creare un nuovo sito web moderno per ${business.name}, senza chiedervi nulla in anticipo.\n\nPerché?\nSto costruendo il mio portfolio e mi serve un Caso Studio d'eccellenza nel vostro settore.\n\nHo già realizzato tutto, potete vederlo qui:\n[LINK_ANTEPRIMA]\n\nSe vi piace, possiamo parlarne. Il lavoro è già fatto.\n\nA presto,\nRiccardo C.`
        };
    }

    // SICUREZZA LINK: Se l'AI ha dimenticato il placeholder, lo aggiungiamo noi.
    if (data.body && !data.body.includes('[LINK_ANTEPRIMA]')) {
        data.body += "\n\nPotete vedere l'anteprima qui: [LINK_ANTEPRIMA]";
    }

    // Sostituzione finale link con l'URL base passato (che sarà quello reale dell'app)
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const previewUrl = `${cleanBaseUrl}?preview=${business.id}`;

    if (data.body) {
        data.body = data.body.replace("[LINK_ANTEPRIMA]", previewUrl);
    }
    
    return data;
};