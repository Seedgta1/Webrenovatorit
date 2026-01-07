
import React, { useState } from 'react';
import { Search, MapPin, Loader2, AlertCircle, XCircle, ArrowRight, Mail, Globe, Sparkles, MessageCircle, Phone, Trash2, Info, Building2, Star } from 'lucide-react';
import { Business } from '../types';
import { searchLeads } from '../services/gemini';

interface LeadScoutProps {
  onSelectBusiness: (business: Business) => void;
  onOpenEmail: (business: Business) => void;
  leads: Business[];
  setLeads: React.Dispatch<React.SetStateAction<Business[]>>;
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
          setLeads(prev => {
              const existingNames = new Set(prev.map(l => l.name.toLowerCase()));
              const newLeads = results.filter(l => !existingNames.has(l.name.toLowerCase()));
              return [...newLeads, ...prev];
          });
      }
      setHasSearched(true);
    } catch (err: any) {
      setError(err.message || "Errore durante la ricerca.");
    } finally {
      setLoading(false);
    }
  };

  const deleteLead = (id: string) => {
    setLeads(prev => prev.filter(l => l.id !== id));
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 pb-20">
      <div className="bg-white p-6 md:p-8 rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100">
        <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg text-blue-600"><Search className="w-5 h-5" /></div>
            Nuova Scansione Opportunità
        </h2>
        <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-12 gap-5">
            <div className="md:col-span-5 relative group">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                    <Building2 className="h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors"/>
                </div>
                <input type="text" value={niche} onChange={(e) => setNiche(e.target.value)} placeholder="Settore (es. Ristorante, Dentista)" className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all font-medium text-slate-700 placeholder:text-slate-400" disabled={loading} />
            </div>
            <div className="md:col-span-5 relative group">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                    <MapPin className="h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors"/>
                </div>
                <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Zona (es. Roma Centro)" className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all font-medium text-slate-700 placeholder:text-slate-400" disabled={loading} />
            </div>
            <div className="md:col-span-2">
                <button type="submit" disabled={loading} className="w-full h-full min-h-[56px] bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed transition-all transform active:scale-95">
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

      {leads.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {leads.map((lead) => (
            <div key={lead.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 flex flex-col group relative overflow-hidden animate-in fade-in zoom-in-95">
              
              {/* Status Bar */}
              <div className="h-1.5 w-full bg-gradient-to-r from-slate-200 to-slate-100 group-hover:from-blue-500 group-hover:to-indigo-500 transition-all"></div>

              <div className="p-6 flex-grow flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${
                        lead.leadStatus === 'NEW' ? 'bg-blue-50 text-blue-600 border-blue-100' : 
                        lead.leadStatus === 'CONTACTED' ? 'bg-amber-50 text-amber-600 border-amber-100' : 
                        'bg-green-50 text-green-600 border-green-100'
                  }`}>
                    {lead.leadStatus === 'NEW' ? 'Nuovo Lead' : lead.leadStatus}
                  </div>
                  <button onClick={() => deleteLead(lead.id)} className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-start gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-sm border border-slate-200">
                        {lead.name.charAt(0)}
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-slate-900 leading-tight line-clamp-2 group-hover:text-blue-600 transition-colors">{lead.name}</h3>
                        <p className="text-xs text-slate-400 mt-0.5">{lead.type}</p>
                    </div>
                </div>

                <div className="space-y-2 mb-4 mt-2">
                    <p className="text-xs text-slate-500 flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" /> <span className="truncate">{lead.address}</span>
                    </p>
                    {lead.phoneNumber && (
                        <p className="text-xs font-medium text-slate-600 flex items-center gap-2">
                            <Phone className="w-3.5 h-3.5 text-slate-400" /> {lead.phoneNumber}
                        </p>
                    )}
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 mt-auto">
                    <div className="flex items-start gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-500 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-slate-600 italic leading-relaxed">"{lead.reasoning}"</p>
                    </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50/50 border-t border-slate-100 grid grid-cols-2 gap-3">
                <button onClick={() => onOpenEmail(lead)} className="py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-100 transition-all shadow-sm">
                    <Mail className="w-3.5 h-3.5" /> Email
                </button>
                <button onClick={() => onSelectBusiness(lead)} className="py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-slate-800 shadow-md shadow-slate-900/10 transition-all">
                    Genera Sito <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : hasSearched && !loading && !error && (
          <div className="flex flex-col items-center justify-center py-20 opacity-40">
              <div className="bg-slate-100 p-4 rounded-full mb-4">
                  <Search className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-500 font-medium">I risultati della scansione appariranno qui.</p>
          </div>
      )}
    </div>
  );
};
