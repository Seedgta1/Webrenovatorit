
export interface Message {
  id: string;
  businessId: string;
  businessName: string;
  sender: 'BUSINESS' | 'YOU';
  content: string;
  timestamp: Date;
}

export interface AppConfig {
  resendApiKey: string;
  senderEmail: string;
  senderName: string;
  stripeSecretKey: string;
  stripePublishableKey: string;
  publicUrl?: string; // URL base per i link di anteprima
}

export interface SiteCreation {
  id: string;
  timestamp: number;
  html: string;
  copywriting: string;
  versionLabel: string;
  // Dati strutturati salvati per future modifiche
  brandData?: AgentBrandOutput;
  contentData?: AgentCopyOutput;
}

export interface Business {
  id: string;
  name: string;
  address: string;
  type: string;
  website: string | null;
  phoneNumber?: string;
  rating?: number;
  ratingCount?: number;
  status: 'NO_SITE' | 'OLD_SITE' | 'UNKNOWN';
  leadStatus: 'NEW' | 'CONTACTED' | 'REPLIED' | 'CLOSED';
  reasoning: string;
  creations?: SiteCreation[]; // Storico delle generazioni (Max 3)
}

export interface GeneratedSite {
  html: string;
  copywriting: string;
}

export interface MarketingAudit {
  seoScore: number;
  monthlyLostRevenue: string;
  criticalIssues: string[];
  competitorAdvantage: string;
}

// --- AGENT OUTPUT TYPES ---

// 1. ANALYST
export interface AgentAnalystOutput {
  industry: string; // Es. "Dentistry"
  niche: string; // Es. "Cosmetic Dentistry"
  targetAudience: string; // Es. "Upper class locals"
  coreValues: string[]; // Es. ["Professionalism", "Pain-free"]
}

export interface AgentBrandOutput {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontHeading: string;
  fontBody: string;
  vibe: string;
}

export interface AgentCopyOutput {
  heroHeadline: string;
  heroSubheadline: string;
  features: {title: string, desc: string}[];
  cta: string;
  aboutText: string;
  seoKeywords: string[];
}

export interface AgentUXOutput {
  layoutStructure: string[]; // Es. ['Navbar', 'Hero', 'Features', 'Testimonials', 'Footer']
  componentsStyle: string; // Es. "Bento Grid", "Glassmorphism", "Minimalist Cards"
  heroType: 'CENTERED' | 'SPLIT' | 'BACKGROUND_IMAGE';
}

// 2. CHATBOT
export interface AgentChatbotOutput {
  botName: string;
  welcomeMessage: string;
  tone: string;
  suggestedQuestions: string[];
}

export interface AgentVisualOutput {
  logoPrompt: string;
  heroImagePrompt: string;
  galleryPrompts: string[];
}

// 3. REPUTATION (Nuovo)
export interface AgentReviewsOutput {
  reviews: {
    author: string;
    text: string;
    rating: number; // 1-5
    source: 'Google' | 'Direct';
  }[];
  summary: string; // Es. "4.8 stelle su Google Maps"
}

export const PRICING = {
  setupFee: 299,
  currency: 'EUR'
};
