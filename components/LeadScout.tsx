
import React, { useState } from 'react';
import { Search, MapPin, Loader2, AlertCircle, XCircle, ArrowRight, Mail, Globe, Sparkles, MessageCircle, Phone, Trash2, Info, Building2, Star, Layers, Check, Clock, Send } from 'lucide-react';
import { Business } from '../types';
import { searchLeads } from '../services/gemini';

interface LeadScoutProps {
  onSelectBusiness: (business: Business) => void;
  onOpenEmail: (business: Business) => void;
  leads: Business[];
  // Modificato per accettare una funzione generica o il setter
  setLeads: any;
}

export const LeadScout: React.FC<LeadScoutProps> = ({ onSelectBusiness, onOpenEmail, leads, setLeads }) => {
  const [niche, setNiche] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!niche || !location) return;
    setLoading(true);
    setError(null);
    setHasSearched(false);
    
    try {
      const results = await searchLeads(niche, location);
      
      if (results.length === 0) {
        setError("Nessuna attività trovata con i criteri specificati o i dati di Maps non erano completi. Riprova con una zona diversa.");
      } else {
          // Controlla duplicati rispetto allo stato corrente
          const existingIds = new Set(leads.map(l => l.id));
          const existingNames = new Set(leads.map(l => l.name.toLowerCase()));
          
          const newLeads = results.filter(l => 
              !existingIds.has(l.id) && !existingNames.has(l.name.toLowerCase())
          );

          if (newLeads.length > 0) {
              // Se setLeads è una funzione passata da App che gestisce il DB
              if (typeof setLeads === 'function') {
                  // Chiamiamo la funzione wrapper di App.tsx
                  setLeads(newLeads);
              }
          }
      }
      setHasSearched(true);
    } catch (err: any) {
      setError(err.message || "Errore durante la ricerca.");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
        case 'NEW': return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200"><Clock className="w-3 h-3"/> Nuovo</span>;
        case 'CONTACTED': return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-600 border border-amber-200"><Send className="w-3 h-3"/> Contattato</span>;
        case 'REPLIED': return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-green-50 text-green-600 border border-green-200"><MessageCircle className="w-3 h-3"/> Risposto</span>;
        case 'CLOSED': return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-600 border border-blue-200"><Check className="w-3 h-3"/> Chiuso</span>;
        default: return null;
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 pb-20">
      
      {/* SEARCH BAR */}
      <div className="bg-white p-6 rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100">
        <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg text-white"><Search className="w-5 h-5" /></div>
            Scansione Opportunità
        </h2>
        <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-12 gap-5">
            <div className="md:col-span-5 relative group">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                    <Building2 className="h-5 w-5 text-slate-400 group-focus-within:text-blue-600 transition-colors"/>
                </div>
                <input type="text" value={niche} onChange={(e) => setNiche(e.target.value)} placeholder="Settore (es. Ristorante, Dentista)" className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all font-medium text-slate-700 placeholder:text-slate-400" disabled={loading} />
            </div>
            <div className="md:col-span-5 relative group">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                    <MapPin className="h-5 w-5 text-slate-400 group-focus-within:text-blue-600 transition-colors"/>
                </div>
                <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Zona (es. Roma Centro)" className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all font-medium text-slate-700 placeholder:text-slate-400" disabled={loading} />
            </div>
            <div className="md:col-span-2">
                <button type="submit" disabled={loading} className="w-full h-full min-h-[56px] bg-slate-900 hover:bg-black text-white font-bold rounded-xl shadow-lg transition-all transform active:scale-95 flex items-center justify-center gap-2">
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Scansiona'}
                </button>
            </div>
        </form>
        {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm flex items-center gap-3 animate-in slide-in-from-top-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0" /> {error}
            </div>
        )}
      </div>

      {/* RESULTS GRID - PROFESSIONAL CRM STYLE */}
      {leads.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {leads.map((lead) => (
            <div key={lead.id} className="group bg-white rounded-2xl border border-slate-200 hover:border-blue-400 transition-all duration-200 shadow-sm hover:shadow-xl hover:shadow-blue-900/5 flex flex-col overflow-hidden">
              
              {/* Header */}
              <div className="p-5 border-b border-slate-100 bg-slate-50/30 flex justify-between items-start">
                  <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 font-bold text-lg shadow-sm">
                          {lead.name.charAt(0)}
                      </div>
                      <div>
                          <h3 className="font-bold text-slate-900 text-base leading-tight group-hover:text-blue-600 transition-colors">{lead.name}</h3>
                          <p className="text-xs text-slate-500 mt-1">{lead.type}</p>
                          {lead.rating && (
                              <div className="flex items-center gap-1 mt-1.5">
                                  <div className="flex text-amber-400">
                                      {[...Array(5)].map((_, i) => (
                                          <Star key={i} className={`w-3 h-3 ${i < Math.round(lead.rating!) ? 'fill-current' : 'text-slate-200'}`} />
                                      ))}
                                  </div>
                                  <span className="text-[10px] text-slate-400 font-medium">({lead.ratingCount || 0})</span>
                              </div>
                          )}
                      </div>
                  </div>
                  {getStatusBadge(lead.leadStatus)}
              </div>

              {/* Body Info */}
              <div className="p-5 space-y-4 flex-grow">
                  <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                            <span className="text-[10px] uppercase text-slate-400 font-bold tracking-wider block mb-1">Generazioni</span>
                            <div className="flex items-center gap-2">
                                <Layers className="w-4 h-4 text-purple-500" />
                                <span className={`text-sm font-bold ${lead.creations && lead.creations.length > 0 ? 'text-purple-700' : 'text-slate-400'}`}>
                                    {lead.creations?.length || 0} <span className="text-[10px] font-normal text-slate-400">bozze</span>
                                </span>
                            </div>
                        </div>
                        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                            <span className="text-[10px] uppercase text-slate-400 font-bold tracking-wider block mb-1">Stato Email</span>
                            <div className="flex items-center gap-2">
                                <Mail className={`w-4 h-4 ${lead.leadStatus === 'CONTACTED' || lead.leadStatus === 'REPLIED' ? 'text-blue-500' : 'text-slate-300'}`} />
                                <span className={`text-sm font-bold ${lead.leadStatus === 'CONTACTED' || lead.leadStatus === 'REPLIED' ? 'text-blue-700' : 'text-slate-400'}`}>
                                    {lead.leadStatus === 'CONTACTED' || lead.leadStatus === 'REPLIED' ? 'Inviata' : 'Non Inviata'}
                                </span>
                            </div>
                        </div>
                  </div>

                  <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span className="truncate">{lead.address}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                          <Info className="w-3.5 h-3.5 text-slate-400" />
                          <span className="italic text-slate-500 truncate max-w-full">"{lead.reasoning}"</span>
                      </div>
                  </div>
              </div>

              {/* Actions */}
              <div className="p-4 border-t border-slate-100 grid grid-cols-2 gap-3 bg-white">
                  <button 
                    onClick={() => onOpenEmail(lead)}
                    className="py-2.5 rounded-lg border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 hover:text-slate-900 transition-all flex items-center justify-center gap-2"
                  >
                      <Mail className="w-3.5 h-3.5" /> Invia Proposta
                  </button>
                  <button 
                    onClick={() => onSelectBusiness(lead)}
                    className="py-2.5 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2"
                  >
                      {lead.creations && lead.creations.length > 0 ? 'Vedi Progetti' : 'Genera Sito AI'} <ArrowRight className="w-3.5 h-3.5" />
                  </button>
              </div>

            </div>
          ))}
        </div>
      ) : hasSearched && !loading && !error && (
          <div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl border border-dashed border-slate-300">
              <div className="bg-slate-50 p-6 rounded-full mb-4">
                  <Search className="w-10 h-10 text-slate-300" />
              </div>
              <p className="text-slate-500 font-medium">Nessun lead trovato qui. Prova un'altra ricerca.</p>
          </div>
      )}
    </div>
  );
};
