import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, Cpu, Database, AlertTriangle, CheckCircle, ArrowRight, Zap, Radio, Users, PhoneCall, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import leftimg from '../../../public/imgleft.png';

export default function CyberCrimePortal() {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      id: 0,
      title: "NetGenX Defence Cyber Shield",
      subtitle: "Dedicated, AI-driven cyber incident handling for Indian Armed Forces personnel, veterans, and military families.",
      badge: "EXCLUSIVE DEFENCE CHANNEL",
      buttonText: "File Defence Incident",
      path: "/auth",
      color: "from-blue-600 to-indigo-800"
    },
    {
      id: 1,
      title: "Instant Threat Analysis & CERT-Army Escalation",
      subtitle: "AI Engine scans text, audio, images, and APKs in <2 seconds. Automatic escalation triggered for risk scores >80%.",
      badge: "REAL-TIME MITIGATION",
      buttonText: "Launch Threat Scanner",
      path: "/upload",
      color: "from-emerald-700 to-teal-900"
    },
    {
      id: 2,
      title: "Immutable Evidence on Blockchain + IPFS",
      subtitle: "Tamper-proof decentralized vault preserves cryptographic Content IDs (CIDs) and audit trails for court of inquiry.",
      badge: "TAMPER-PROOF AUDIT",
      buttonText: "Inspect Architecture",
      path: "/workflow",
      color: "from-purple-800 to-slate-900"
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Top Government Masthead */}
      <div className="bg-slate-900 border-b border-slate-800 py-2 px-6 flex justify-between items-center text-xs">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="font-bold text-orange-400">भारत सरकार</span>
            <span className="text-slate-400">|</span>
            <span className="text-slate-300">GOVERNMENT OF INDIA</span>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <span className="font-bold text-emerald-400">रक्षा मंत्रालय</span>
            <span className="text-slate-400">|</span>
            <span className="text-slate-300">MINISTRY OF DEFENCE</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
            CERT-ARMY INTEGRATED
          </span>
          <span className="text-slate-400 text-xs">Priority Clearance: <strong>DEFENCE ECOSYSTEM</strong></span>
        </div>
      </div>

      {/* Main Identity Navigation */}
      <header className="bg-slate-900/90 border-b border-slate-800 sticky top-0 z-50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 via-green-600 to-teal-700 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Shield className="w-7 h-7 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black tracking-tight text-white">NetGen<span className="text-emerald-400">X</span></span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">CYBER SHIELD</span>
              </div>
              <p className="text-xs text-slate-400">Defence Ecosystem Cyber Safety & Tamper-Proof Evidence Vault</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/workflow')}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition border border-slate-700 flex items-center gap-1.5"
            >
              <Cpu className="w-3.5 h-3.5 text-purple-400" /> System Workflow
            </button>
            <button 
              onClick={() => navigate('/explainer')}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition border border-slate-700 flex items-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" /> Interactive Explainer
            </button>
            <button 
              onClick={() => navigate('/auth')}
              className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-slate-950 font-bold rounded-xl text-xs transition shadow-lg shadow-emerald-500/20 flex items-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5" /> Portal Login / Register
            </button>
          </div>
        </div>
      </header>

      {/* Hero Showcase Slider */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-900 to-slate-950 border-b border-slate-800 py-16 px-6">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-12 gap-12 items-center">
          
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              {slides[currentSlide].badge}
            </div>

            <h1 className="text-4xl sm:text-5xl font-black text-slate-100 tracking-tight leading-tight">
              {slides[currentSlide].title}
            </h1>

            <p className="text-lg text-slate-300 leading-relaxed max-w-2xl font-normal">
              {slides[currentSlide].subtitle}
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-4">
              <button
                onClick={() => navigate(slides[currentSlide].path)}
                className="px-8 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold rounded-xl text-sm transition-all shadow-xl shadow-emerald-500/20 flex items-center gap-2 cursor-pointer"
              >
                <span>{slides[currentSlide].buttonText}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => navigate('/officialpage')}
                className="px-6 py-3.5 bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold rounded-xl text-sm transition border border-slate-700 flex items-center gap-2"
              >
                <Database className="w-4 h-4 text-cyan-400" />
                <span>CERT-Army Command</span>
              </button>
            </div>

            {/* Slider Dots */}
            <div className="flex items-center gap-2 pt-6">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentSlide(i)}
                  className={`h-1.5 rounded-full transition-all ${i === currentSlide ? 'w-8 bg-emerald-400' : 'w-2 bg-slate-700'}`}
                />
              ))}
            </div>
          </div>

          {/* Problem Statement vs Solution Feature Card */}
          <div className="lg:col-span-5 bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-2xl relative">
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-red-950/40 border border-red-500/30">
                <span className="text-[10px] font-bold uppercase tracking-wider text-red-400 block mb-1">
                  🚨 THE CRITICAL CHALLENGE (CIVILIAN NCRP DELAY)
                </span>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Defence personnel cyber complaints frequently get buried in civilian NCRP workloads, resulting in critical delayed response times, operational risk, and vulnerability for soldiers and veterans.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block mb-1">
                  ✨ THE NETGENX SOLUTION
                </span>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Dedicated sovereign portal delivering sub-2-second AI threat categorization, immutable IPFS + Ethereum blockchain evidence preservation, and real-time automated escalation to CERT-Army.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-center">
                  <div className="text-2xl font-black text-emerald-400">&lt;2s</div>
                  <div className="text-[10px] text-slate-400">AI Threat Classification</div>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-center">
                  <div className="text-2xl font-black text-cyan-400">100%</div>
                  <div className="text-[10px] text-slate-400">Tamper-Proof Audit</div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Target Audience & Capabilities */}
      <section className="py-16 px-6 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">PURPOSE-BUILT ARCHITECTURE</span>
          <h2 className="text-3xl font-bold text-slate-100">Protecting the Entire Indian Defence Ecosystem</h2>
          <p className="text-slate-400 text-sm">
            Tailored specifically for Armed Forces branches, veterans receiving pensions, defence families, and military incident responders.
          </p>
        </div>

        <div className="grid md:grid-cols-4 gap-6">
          <div className="p-6 bg-slate-900/60 rounded-2xl border border-slate-800 hover:border-emerald-500/40 transition group">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center mb-4 text-blue-400 group-hover:scale-110 transition">
              <Shield className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-100 text-base mb-2">Serving Personnel</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Protection against honeytrap baiting, location solicitation, troop movement inquiries, and hostile military espionage.
            </p>
          </div>

          <div className="p-6 bg-slate-900/60 rounded-2xl border border-slate-800 hover:border-emerald-500/40 transition group">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-4 text-emerald-400 group-hover:scale-110 transition">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-100 text-base mb-2">Defence Families</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Shielding cantonment families from social engineering, impersonation of senior officers, and fraudulent emergency demands.
            </p>
          </div>

          <div className="p-6 bg-slate-900/60 rounded-2xl border border-slate-800 hover:border-emerald-500/40 transition group">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-4 text-amber-400 group-hover:scale-110 transition">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-100 text-base mb-2">Veterans & Pensioners</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Detection of fake SPARSH pension portal updates, ECHS medical scams, and fraudulent PCDA life certificate links.
            </p>
          </div>

          <div className="p-6 bg-slate-900/60 rounded-2xl border border-slate-800 hover:border-emerald-500/40 transition group">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center mb-4 text-purple-400 group-hover:scale-110 transition">
              <Database className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-100 text-base mb-2">CERT-Army Command</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Direct incident feed, immutable blockchain hash audit, multi-format forensic preview, and tactical escalation dashboard.
            </p>
          </div>
        </div>
      </section>

      {/* Quick Action Banner */}
      <section className="bg-slate-900 border-t border-slate-800 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-2xl font-bold text-slate-100 mb-2">Encountered Suspicious Defence Communication?</h3>
            <p className="text-sm text-slate-400">Analyze honeytrap chats, weaponized files, or fake pension SMS in under 2 seconds.</p>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => navigate('/auth')}
              className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-sm transition shadow-lg shadow-emerald-500/20"
            >
              Report Incident Now →
            </button>
            <button
              onClick={() => navigate('/officialpage')}
              className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-sm transition border border-slate-700"
            >
              Official Command Login
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-slate-900 py-8 px-6 text-center text-xs text-slate-500 font-mono">
        <p>NetGenX Defence Cyber Shield • Built for the Indian Armed Forces • Immutable Blockchain + IPFS Protocol</p>
      </footer>
    </div>
  );
}