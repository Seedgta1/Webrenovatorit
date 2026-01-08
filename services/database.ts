import { Business, Message, SiteCreation } from "../types";

export const dbService = {
  // Leads
  async getLeads(): Promise<Business[]> {
    try {
      const res = await fetch('/api/leads');
      if (!res.ok) throw new Error('Failed to fetch leads');
      return await res.json();
    } catch (e) {
      console.warn("API non disponibile, uso fallback locale o vuoto");
      return [];
    }
  },

  async getLeadById(id: string): Promise<Business | null> {
    try {
      const res = await fetch(`/api/leads?id=${id}`);
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      return null;
    }
  },

  async addLeads(leads: Business[]) {
    await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(leads)
    });
  },

  async updateLeadStatus(id: string, status: string) {
    await fetch('/api/leads', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, leadStatus: status })
    });
  },

  async saveCreations(id: string, creations: SiteCreation[]) {
    await fetch('/api/leads', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, creations })
    });
  },

  // Messages
  async getMessages(): Promise<Message[]> {
    try {
      const res = await fetch('/api/messages');
      if (!res.ok) throw new Error('Failed to fetch messages');
      return await res.json();
    } catch (e) {
      return [];
    }
  },

  async addMessage(msg: Message) {
    await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(msg)
    });
  }
};