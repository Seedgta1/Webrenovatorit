
import React, { useState } from 'react';
import { Message, Business } from '../types';
import { MessageSquare, Clock, Mail, MessageCircle, AlertCircle, Inbox as InboxIcon } from 'lucide-react';

interface InboxProps {
  messages: Message[];
  leads: Business[];
  onContactWhatsApp: (businessId: string) => void;
}

export const Inbox: React.FC<InboxProps> = ({ messages, leads, onContactWhatsApp }) => {
  const [filter, setFilter] = useState<'all' | 'contacted'>('all');
  
  const activeLeads = leads.filter(l => l.leadStatus !== 'NEW');

  if (activeLeads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 bg-white rounded-3xl border-2 border-dashed border-slate-200">
        <div className="p-4 bg-slate-100 rounded-full mb-4">
            <InboxIcon className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-xl font-bold text-slate-800">Nessun invio effettuato</h3>
        <p className="text-slate-500 mt-2">Invia le tue prime proposte reali dalla sezione Scout per tracciarle qui.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="bg-blue-600 p-6 rounded-3xl text-white shadow-lg flex items-start gap-4 mb-10">
          <div className="bg-white/20 p-2 rounded-xl"><AlertCircle className="w-6 h-6" /></div>
          <div>
              <h3 className="font-bold text-lg">Nota sulle Risposte Reali</h3>
              <p className="text-blue-100 text-sm opacity-90 leading-relaxed">
                  Dato che l'invio è reale, le risposte dei clienti arriveranno direttamente nella tua casella email (Gmail/Outlook). 
                  Usa questa dashboard per monitorare lo stato di avanzamento di ogni lead contattato.
              </p>
          </div>
      </div>

      <div className="flex items-center justify-between mb-8">
        <div>
            <h2 className="text-3xl font-bold text-slate-900">Gestione Lead Contattati</h2>
            <p className="text-slate-500">Traccia le trattative nate dagli invii automatici.</p>
        </div>
      </div>

      <div className="space-y-4">
          {activeLeads.map((lead) => (
              <div key={lead.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-wrap items-center justify-between gap-6 group">
                  <div className="flex items-center gap-5">
                      <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 font-bold text-xl">
                          {lead.name.charAt(0)}
                      </div>
                      <div>
                          <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-bold text-slate-900 text-lg">{lead.name}</h3>
                              <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md uppercase tracking-wider ${lead.leadStatus === 'CONTACTED' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                                  {lead.leadStatus === 'CONTACTED' ? 'Email Inviata' : 'Interesse Ricevuto'}
                              </span>
                          </div>
                          <p className="text-sm text-slate-500 flex items-center gap-2">
                              <Mail className="w-3.5 h-3.5" /> Proposta inviata tramite Resend
                          </p>
                      </div>
                  </div>

                  <div className="flex items-center gap-3">
                      <button 
                          onClick={() => onContactWhatsApp(lead.id)}
                          className="px-6 py-3 bg-[#25D366] text-white font-bold rounded-2xl shadow-lg shadow-green-100 flex items-center gap-2 hover:bg-[#128C7E] transition-all"
                      >
                          <MessageCircle className="w-5 h-5" /> Follow-up WhatsApp
                      </button>
                  </div>
              </div>
          ))}
      </div>
    </div>
  );
};
