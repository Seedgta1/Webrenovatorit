
import React, { useState } from 'react';
import { Search, MapPin, Loader2, AlertCircle, XCircle, ArrowRight, Mail, Globe, Sparkles, MessageCircle, Phone, Trash2, Info } from 'lucide-react';
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
          // Unisci i nuovi lead evitando duplicati per nome
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
    <div className="w-full max-w-6xl mx-auto space-y-10 pb-20">
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-3">
            <Search className="w-5 h-5 text-blue-600" /> Nuova Scansione Opportunità
        </h2>
        <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-12 gap-5">
            <div className="md:col-span-5">
                <input type="text" value={niche} onChange={(e) => setNiche(e.target.value)} placeholder="Settore (es. Ristorante, Idraulico)" className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none" disabled={loading} />
            </div>
            <div className="md:col-span-5">
                <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Zona (es. Milano Centro)" className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none" disabled={loading} />
            </div>
            <div className="md:col-span-2">
                <button type="submit" disabled={loading} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-lg shadow-blue-100 flex items-center justify-center gap-2 disabled:opacity-70">
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Scansiona'}
                </button>
            </div>
        </form>

        {error && (
            <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-2xl text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> {error}
            </div>
        )}
      </div>

      {leads.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {leads.map((lead) => (
            <div key={lead.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col group overflow-hidden animate-in fade-in zoom-in duration-300">
              <div className="p-6 flex-grow">
                <div className="flex justify-between items-start mb-4">
                  <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${lead.leadStatus === 'NEW' ? 'bg-blue-50 text-blue-600' : lead.leadStatus === 'CONTACTED' ? 'bg-amber-50 text-amber-600' : 'bg-green-50 text-green-600'}`}>
                    {lead.leadStatus}
                  </span>
                  <button onClick={() => deleteLead(lead.id)} className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">{lead.name}</h3>
                <p className="text-xs text-slate-500 flex items-center gap-2 mb-3"><MapPin className="w-3.5 h-3.5" />{lead.address}</p>
                <div className="bg-slate-50 p-3 rounded-xl mb-4 border border-slate-100">
                    <p className="text-xs text-slate-600 italic leading-relaxed">"{lead.reasoning}"</p>
                </div>
                {lead.phoneNumber && (
                  <p className="text-xs font-semibold text-green-600 flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5" /> {lead.phoneNumber}
                  </p>
                )}
              </div>
              <div className="p-4 bg-slate-50/50 border-t border-slate-100 grid grid-cols-2 gap-2">
                <button onClick={() => onOpenEmail(lead)} className="py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-slate-50"><Mail className="w-3.5 h-3.5" /> Email</button>
                <button onClick={() => onSelectBusiness(lead)} className="py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-blue-600">Sito AI <ArrowRight className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      ) : hasSearched && !loading && !error && (
          <div className="text-center py-20 opacity-50">
              <Info className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="text-slate-500">I risultati della scansione appariranno qui.</p>
          </div>
      )}
    </div>
  );
};
