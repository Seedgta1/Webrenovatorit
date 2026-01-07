
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

export const PRICING = {
  setupFee: 299,
  currency: 'EUR'
};
