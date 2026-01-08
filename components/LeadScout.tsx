
import React, { useState } from 'react';
import { Search, MapPin, Loader2, AlertCircle, ArrowRight, Mail, Building2, Sparkles, Navigation, Globe } from 'lucide-react';
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

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!niche || !location || loading) return;
    setLoading(true);
    setError(null);
    try {
      const results = await searchLeads(niche, location);
      if (!results || results.length === 0) setError("Nessuna opportunità rilevata. Prova un altro settore.");
      else setLeads(results);
    } catch (err: any) {
      setError("Errore durante la scansione. Riprova tra poco.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-12 pb-32">
      <div className="bg-[#141417] p-10 rounded-[3rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.5)] border border-white/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2"></div>
        <div className="relative z-10">
            <h2 className="text-3xl font-black text-white mb-10 flex items-center gap-4">
                <div className="p-3 bg-indigo-600 rounded-2xl shadow-2xl shadow-indigo-500/20"><Search className="w-6 h-6" /></div>
                Discovery Engine
            </h2>
            <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="md:col-span-5 relative group">
                    <Building2 className="absolute left-6 top-6 h-6 w-6 text-slate-500 group-focus-within:text-indigo-500 transition-colors"/>
                    <input type="text" value={niche} onChange={(e) => setNiche(e.target.value)} placeholder="Settore (es. Luxury Hotel, Studio Legale)" className="w-full pl-16 pr-6 py-6 bg-white/5 border border-white/10 rounded-2xl outline-none transition-all font-bold text-white focus:bg-white/10 focus:ring-4 focus:ring-indigo-500/20 placeholder:text-slate-600" />
                </div>
                <div className="md:col-span-5 relative group">
                    <MapPin className="absolute left-6 top-6 h-6 w-6 text-slate-500 group-focus-within:text-indigo-500 transition-colors"/>
                    <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Città" className="w-full pl-16 pr-6 py-6 bg-white/5 border border-white/10 rounded-2xl outline-none transition-all font-bold text-white focus:bg-white/10 focus:ring-4 focus:ring-indigo-500/20 placeholder:text-slate-600" />
                </div>
                <div className="md:col-span-2">
                    <button type="submit" disabled={loading} className="w-full h-full min-h-[72px] bg-white text-black font-black rounded-2xl shadow-2xl hover:scale-105 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50">
                        {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Sparkles className="w-6 h-6" />} Scout
                    </button>
                </div>
            </form>
            {error && <div className="mt-8 text-red-400 text-sm font-bold flex items-center gap-2"><AlertCircle className="w-5 h-5" /> {error}</div>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {leads.map((lead, i) => (
            <div key={lead.id} className="group bg-white rounded-[2.5rem] border border-slate-100 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.05)] hover:shadow-[0_50px_100px_-20px_rgba(0,0,0,0.1)] transition-all duration-700 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-6" style={{ animationDelay: `${i * 100}ms` }}>
              <div className="p-10 space-y-8 flex-1">
                <div className="flex justify-between items-start">
                    <div className="w-16 h-16 rounded-3xl bg-slate-50 flex items-center justify-center text-slate-900 font-black text-2xl group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                        {lead.name.charAt(0)}
                    </div>
                    <div className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest ${lead.status === 'NO_SITE' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                        {lead.status === 'NO_SITE' ? 'NO WEB' : 'OLD WEB'}
                    </div>
                </div>
                <div>
                    <h3 className="text-2xl font-black text-slate-900 leading-tight group-hover:text-indigo-600 transition-colors">{lead.name}</h3>
                    <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-[0.2em]">{lead.type}</p>
                </div>
                <p className="text-sm text-slate-500 leading-relaxed font-light italic">"{lead.reasoning}"</p>
                <div className="flex items-center gap-3 text-xs font-bold text-slate-400 bg-slate-50 p-4 rounded-2xl">
                    <MapPin className="w-4 h-4 text-indigo-600" /> <span className="truncate">{lead.address}</span>
                </div>
              </div>
              <div className="p-8 bg-slate-50/50 grid grid-cols-2 gap-4 border-t border-slate-100">
                  <button onClick={() => onOpenEmail(lead)} className="py-5 rounded-2xl border border-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-widest hover:bg-white transition-all flex items-center justify-center gap-2">
                      <Mail className="w-4 h-4" /> Proposta
                  </button>
                  <button onClick={() => onSelectBusiness(lead)} className="py-5 rounded-2xl bg-black text-white text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95">
                      Visualizza <ArrowRight className="w-4 h-4" />
                  </button>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};
