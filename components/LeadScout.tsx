
import React, { useState, useEffect } from 'react';
import { Search, MapPin, Loader2, AlertCircle, ArrowRight, Mail, Building2, Globe, Sparkles, Navigation } from 'lucide-react';
import { Business } from '../types';
import { searchLeads } from '../services/gemini';

interface LeadScoutProps {
  onSelectBusiness: (business: Business) => void;
  onOpenEmail: (business: Business) => void;
  leads: Business[];
  setLeads: any;
}

export const LeadScout: React.FC<LeadScoutProps> = ({ onSelectBusiness, onOpenEmail, leads, setLeads }) => {
  const [niche, setNiche] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);

  const getUserLocation = () => {
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setLocation(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        setGeoLoading(false);
      },
      () => {
        setGeoLoading(false);
        setError("Impossibile ottenere la posizione. Inseriscila manualmente.");
      }
    );
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!niche || !location || loading) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const results = await searchLeads(niche, location);
      
      if (!results || results.length === 0) {
        setError("Nessuna attività trovata con criteri di obsolescenza digitale. Prova un altro settore.");
      } else {
          setLeads(results);
      }
    } catch (err: any) {
      setError("Errore AI Grounding. Assicurati che l'API KEY sia configurata correttamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 pb-20 animate-in fade-in duration-700">
      <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-2xl border border-white/20">
        <h2 className="text-2xl font-black text-slate-800 mb-8 flex items-center gap-3">
            <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-lg shadow-blue-500/20"><Search className="w-6 h-6" /></div>
            Digital Opportunity Scout
        </h2>
        <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-5 relative group">
                <Building2 className="absolute left-5 top-5 h-6 w-6 text-slate-400 group-focus-within:text-blue-600 transition-colors"/>
                <input type="text" value={niche} onChange={(e) => setNiche(e.target.value)} placeholder="Settore (es. Architetti, B&B)" className="w-full pl-14 pr-5 py-5 bg-slate-50 border border-slate-200 rounded-[1.5rem] outline-none transition-all font-bold text-slate-700 focus:bg-white focus:ring-4 focus:ring-blue-500/10" />
            </div>
            <div className="md:col-span-5 relative group">
                <MapPin className="absolute left-5 top-5 h-6 w-6 text-slate-400 group-focus-within:text-blue-600 transition-colors"/>
                <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Località (es. Milano Navigli)" className="w-full pl-14 pr-16 py-5 bg-slate-50 border border-slate-200 rounded-[1.5rem] outline-none transition-all font-bold text-slate-700 focus:bg-white focus:ring-4 focus:ring-blue-500/10" />
                <button type="button" onClick={getUserLocation} className="absolute right-4 top-4 p-2 hover:bg-white rounded-xl text-blue-600 transition-all">
                    {geoLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Navigation className="w-5 h-5" />}
                </button>
            </div>
            <div className="md:col-span-2">
                <button type="submit" disabled={loading} className="w-full h-full min-h-[64px] bg-slate-900 hover:bg-blue-600 text-white font-black rounded-[1.5rem] shadow-xl hover:shadow-blue-500/20 transition-all flex items-center justify-center gap-3">
                    {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Sparkles className="w-6 h-6" />} Scansiona
                </button>
            </div>
        </form>
        {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-sm font-bold flex items-center gap-3 animate-in slide-in-from-top-2">
                <AlertCircle className="w-5 h-5" /> {error}
            </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {leads.map((lead, i) => (
            <div key={lead.id} className="group bg-white rounded-[2.5rem] border border-slate-100 hover:border-blue-400 transition-all duration-500 shadow-xl hover:shadow-2xl overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${i * 100}ms` }}>
              <div className="p-8 space-y-6">
                <div className="flex justify-between items-start">
                    <div className="w-16 h-16 rounded-[1.2rem] bg-slate-50 flex items-center justify-center text-slate-900 font-black text-2xl group-hover:bg-blue-600 group-hover:text-white transition-all">
                        {lead.name.charAt(0)}
                    </div>
                    <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tighter ${lead.status === 'NO_SITE' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                        {lead.status === 'NO_SITE' ? 'Senza Sito' : 'Sito Obsoleto'}
                    </div>
                </div>
                <div>
                    <h3 className="text-xl font-black text-slate-900 leading-tight">{lead.name}</h3>
                    <p className="text-sm font-bold text-slate-400 mt-1 uppercase tracking-widest">{lead.type}</p>
                </div>
                <p className="text-sm text-slate-500 leading-relaxed line-clamp-2">"{lead.reasoning}"</p>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                    <MapPin className="w-4 h-4 text-blue-500" /> {lead.address}
                </div>
              </div>
              <div className="mt-auto p-6 bg-slate-50/50 grid grid-cols-2 gap-4">
                  <button onClick={() => onOpenEmail(lead)} className="py-4 rounded-2xl border border-slate-200 text-slate-600 text-xs font-black hover:bg-white transition-all flex items-center justify-center gap-2">
                      <Mail className="w-4 h-4" /> Proposta
                  </button>
                  <button onClick={() => onSelectBusiness(lead)} className="py-4 rounded-2xl bg-slate-900 text-white text-xs font-black hover:bg-blue-600 transition-all flex items-center justify-center gap-2">
                      Vision Studio <ArrowRight className="w-4 h-4" />
                  </button>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};
