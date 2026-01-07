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
    // 1. Prova a trovare il blocco markdown HTML
    const markdownMatch = text.match(/```html([\s\S]*?)```/);
    if (markdownMatch && markdownMatch[1]) {
        return markdownMatch[1].trim();
    }

    // 2. Cerca pattern standard di inizio e fine documento HTML
    const match = text.match(/<!DOCTYPE html>[\s\S]*<\/html>/i) || text.match(/<html[\s\S]*<\/html>/i);
    if (match) {
        return match[0];
    }
    
    // 3. Fallback: restituisci tutto se sembra HTML (inizia con <)
    if (text.trim().startsWith('<')) {
        return text.trim();
    }
    
    return "";
};

export const searchLeads = async (niche: string, location: string): Promise<Business[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  // Usiamo gemini-2.5-flash per la ricerca (Maps tool è ottimizzato qui)
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
        model: 'gemini-2.5-flash', // DOWNGRADE A FLASH PER SICUREZZA QUOTA
        contents: `Sei il proprietario dell'attività "${business.name}". Hai ricevuto un'email con un sito web già fatto per te con un'offerta scontata.
        Rispondi in modo breve (max 15 parole) chiedendo se lo sconto è ancora valido o come procedere.`,
    });
    return response.text || "L'offerta del 50% è interessante, possiamo sentirci per i dettagli?";
};

export const generateSitePreview = async (business: Business): Promise<GeneratedSite> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // FIX CRITICO: Forziamo gemini-2.5-flash ovunque per evitare errori 429
  const modelId = "gemini-2.5-flash"; 

  const prompt = `Sei un Creative Director e Senior Frontend Developer premiato.
  
  TASK: Crea un sito web SPA (Single Page Application) di LIVELLO SUPERIORE per "${business.name}" (${business.type}).
  Il design deve essere mozzafiato, moderno, con animazioni fluide e una UX impeccabile.
  
  --- SPECIFICHE TECNICHE ---
  1. Usa HTML5 semantico e TailwindCSS via CDN.
  2. Implementa un design system flessibile usando CSS Variables (:root) per colori e font, in modo che sia editabile.
     - --primary: Colore principale adatto al settore
     - --secondary: Colore secondario elegante
     - --font-heading: Font per titoli (es. Playfair Display, Inter)
     - --font-body: Font per testo (es. Lato, Roboto)
  3. Il sito deve essere RESPONSIVE e mobile-first.
  
  --- CONTENUTO & STRUTTURA ---
  1. Hero Section: Immagine di sfondo impattante (usa placeholder di alta qualità o gradienti mesh), H1 potente, CTA chiara.
  2. Features/Servizi: Grid layout (Bento box style) moderno.
  3. Social Proof: Sezione recensioni con design a card.
  4. Footer completo.
  5. CHATBOT: Inserisci un div fisso in basso a destra per la chat AI.
     - ID Container: 'chatbot-container'
     - ID Area Messaggi: 'chat-messages'
     - Deve integrarsi perfettamente col design.

  --- IMPORTANTE ---
  Fornisci SOLO il codice HTML completo (da <!DOCTYPE html> a </html>). Non aggiungere spiegazioni o markdown.
  Il codice deve essere pronto per la produzione.`;

  const response = await ai.models.generateContent({
    model: modelId,
    contents: prompt,
    // Nessun thinkingConfig per evitare timeout e costi token
  });

  const rawText = response.text || "";
  const cleanHtml = extractHTML(rawText);

  if (!cleanHtml || cleanHtml.length < 500) {
      console.error("Output generato troppo breve:", rawText);
      throw new Error("Generazione sito fallita: output incompleto.");
  }

  return {
    html: cleanHtml,
    copywriting: "Design Premium generato con Gemini 2.5 Flash."
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
        model: 'gemini-2.5-flash', // DOWNGRADE A FLASH
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
        model: 'gemini-2.5-flash', // DOWNGRADE A FLASH
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

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { 
          responseMimeType: "application/json",
          temperature: 0.7 
      }
    });
    
    let data = extractJSON(response.text || "");
    
    if (!data || !data.subject) {
        data = {
            subject: `Ho creato il nuovo sito per ${business.name} (Caso Studio)`,
            body: `Ciao,\n\nSono Riccardo C.\n\nSarò diretto: ho lavorato per tutta la settimana scorsa per creare un nuovo sito web moderno per ${business.name}, senza chiedervi nulla in anticipo.\n\nPerché?\nSto costruendo il mio portfolio e mi serve un Caso Studio d'eccellenza nel vostro settore.\n\nHo già realizzato tutto, potete vederlo qui:\n[LINK_ANTEPRIMA]\n\nSe vi piace, possiamo parlarne. Il lavoro è già fatto.\n\nA presto,\nRiccardo C.`
        };
    }

    if (data.body && !data.body.includes('[LINK_ANTEPRIMA]')) {
        data.body += "\n\nPotete vedere l'anteprima qui: [LINK_ANTEPRIMA]";
    }

    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const previewUrl = `${cleanBaseUrl}?preview=${business.id}`;

    if (data.body) {
        data.body = data.body.replace("[LINK_ANTEPRIMA]", previewUrl);
    }
    
    return data;
};