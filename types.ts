
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
export interface AgentBrandOutput {
  primaryColor: string;
  secondaryColor: string;
  fontHeading: string;
  fontBody: string;
  vibe: string;
}

export interface AgentCopyOutput {
  heroHeadline: string;
  heroSubheadline: string;
  features: string[];
  cta: string;
}

export interface AgentVisualOutput {
  logoPrompt: string;
  heroImagePrompt: string;
  galleryPrompts: string[];
}

export const PRICING = {
  setupFee: 299,
  currency: 'EUR'
};
