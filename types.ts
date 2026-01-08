
export interface Message {
  id: string;
  businessId: string;
  businessName: string;
  sender: 'BUSINESS' | 'YOU' | 'AI_ASSISTANT';
  content: string;
  timestamp: Date;
}

export interface AppConfig {
  resendApiKey: string;
  senderEmail: string;
  senderName: string;
  stripeSecretKey: string;
  stripePublishableKey: string;
  publicUrl?: string;
}

export interface SiteCreation {
  id: string;
  timestamp: number;
  html: string;
  copywriting: string;
  versionLabel: string;
  brandData: AgentBrandOutput;
  contentData: AgentCopyOutput;
  designPreferences: DesignPreferences;
  sectionsOrder: string[];
}

export interface DesignPreferences {
  palette: 'modern' | 'luxury' | 'bold' | 'minimal' | 'nature' | 'custom';
  fontPairing: 'inter-playfair' | 'montserrat-lato' | 'poppins-roboto' | 'fraunces-outfit';
  layoutType: 'liquid' | 'boxed' | 'bento';
  gridDensity: 'relaxed' | 'compact';
}

export interface AIModelConfig {
  textModel: 'gemini-3-flash-preview' | 'gemini-3-pro-preview';
  imageModel: 'gemini-2.5-flash-image' | 'gemini-3-pro-image-preview';
  useGoogleSearch: boolean;
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
  creations?: SiteCreation[];
}

export interface GeneratedSite {
  html: string;
  copywriting: string;
  brandData: AgentBrandOutput;
  contentData: AgentCopyOutput;
  images?: Record<string, string>;
}

export interface MarketingAudit {
  seoScore: number;
  monthlyLostRevenue: string;
  criticalIssues: string[];
  competitorAdvantage: string;
}

export interface AgentBrandOutput {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontHeading: string;
  fontBody: string;
}

export interface AgentCopyOutput {
  heroHeadline: string;
  heroSubheadline: string;
  features: {title: string, desc: string, icon: string}[];
  heroCta: string;
  aboutTitle: string;
  aboutText: string;
}

export interface AgentReviewsOutput {
  reviews: {
    author: string;
    text: string;
    rating: number;
    source: 'Google' | 'Direct';
  }[];
  summary: string;
}

export const PRICING = {
  setupFee: 299,
  currency: 'EUR'
};
