import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, Lock, Cpu, Database, AlertTriangle, CheckCircle, ArrowRight, Zap, 
  Radio, Users, PhoneCall, ExternalLink, ChevronLeft, ChevronRight, Activity,
  Terminal, FileCode, CheckCircle2, Flame, ShieldAlert, Key, Globe, Eye
} from 'lucide-react';
import leftimg from '../../../public/imgleft.png';
import rightimg from '../../../public/imgright.png';

export default function CyberCrimePortal() {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);

  // Interactive Live Threat Simulator State
  const [simulatedScenario, setSimulatedScenario] = useState('honeytrap');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simResult, setSimResult] = useState({
    threat: "Honeytrap & Operational Espionage",
    score: 96,
    level: "CRITICAL",
    color: "crimson",
    cid: "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco",
    latency: "142ms",
    mitigation: "Immediate communication cutoff, isolate military devices from cantonment Wi-Fi, preserve chat hashes for Station Security Officer (SSO)."
  });

  const scenarios = {
    honeytrap: {
      name: "Honeytrap Espionage",
      icon: "🎯",
      text: "Hello handsome officer, saw you in uniform! Which regiment are you posted at in Leh? Can you share a picture of your bunker?",
      threat: "Honeytrap & Operational Espionage",
      score: 96,
      level: "CRITICAL",
      color: "crimson",
      cid: "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco",
      latency: "142ms",
      mitigation: "Immediate communication cutoff, isolate military devices from cantonment Wi-Fi, preserve chat hashes for Station Security Officer (SSO)."
    },
    sparsh: {
      name: "SPARSH Pension Scam",
      icon: "🎣",
      text: "URGENT: Your SPARSH defence pension account has been locked. Verify Aadhaar and PAN immediately at http://sparsh-pension-update.xyz to avoid suspension.",
      threat: "Defence Portal Phishing (SPARSH)",
      score: 92,
      level: "CRITICAL",
      color: "crimson",
      cid: "QmZtmD2qt8fJpq32DhZPEks5fEx2g2Yp26sWkvn45vybmn",
      latency: "118ms",
      mitigation: "Never click external URLs. Access SPARSH exclusively via https://sparsh.defencepension.gov.in. Change military banking credentials immediately."
    },
    trojan: {
      name: "Weaponized Hamraaz APK",
      icon: "☣️",
      text: "Download new Hamraaz_Army_v7.3.apk for viewing revised 8th Pay Commission allowances. Install and grant all background permissions.",
      threat: "Malicious Trojanized Military Spyware",
      score: 98,
      level: "CRITICAL",
      color: "crimson",
      cid: "QmPZ9gcCEpqKTo6aq61g2nXGUhM49wbdukBogGhGmb3Kwp",
      latency: "165ms",
      mitigation: "Do not execute payload. Turn off mobile telemetry and radio beacons. File hash automatically recorded on NetGenX Blockchain."
    },
    benign: {
      name: "Official Circular",
      icon: "🛡️",
      text: "HQ Eastern Command Advisory: Annual sports tournament registration opens on Monday. Contact Sports NCO for details.",
      threat: "Authorized Internal Defence Advisory",
      score: 8,
      level: "BENIGN / VERIFIED",
      color: "emerald",
      cid: "QmQ6M4zW8yV9nL2pK1eA5bC7dE3fG4hI6jK8mN0pQ2rS4t",
      latency: "94ms",
      mitigation: "Communication conforms to standard military communication templates. No hostile markers or telemetry extraction detected."
    }
  };

  const handleSelectScenario = (key) => {
    setIsSimulating(true);
    setSimulatedScenario(key);
    setTimeout(() => {
      setSimResult(scenarios[key]);
      setIsSimulating(false);
    }, 400);
  };

  const slides = [
    {
      id: 0,
      badge: "SOVEREIGN DEFENCE INFRASTRUCTURE",
      title: "NetGenX Defence Cyber Shield",
      highlight: "Dedicated Tactical Protection",
      subtitle: "Purpose-built cyber defense portal for Indian Armed Forces personnel, military families, and veterans. Eliminates delays by bypassing civilian complaint backlogs.",
      path: "/auth",
      cta: "File Priority Incident"
    },
    {
      id: 1,
      badge: "SUB-2-SECOND THREAT INFERENCE",
      title: "Instant AI Threat Triage",
      highlight: "& CERT-Army Escalation",
      subtitle: "Neural NLP engine trained on military-specific threat corpus detects honeytraps, SPARSH pension phishing, and Trojan APKs in under 2 seconds.",
      path: "/upload",
      cta: "Launch Incident Console"
    },
    {
      id: 2,
      badge: "CRYPTOGRAPHIC PROOF OF CUSTODY",
      title: "Tamper-Proof Evidence Vault",
      highlight: "IPFS + Ethereum Blockchain",
      subtitle: "Off-chain SHA-256 cryptographic multihash storage paired with Solidity smart contracts guarantees immutable chain-of-custody for military courts of inquiry.",
      path: "/workflow",
      cta: "Explore Architecture"
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [slides.length]);

  return (
    <div className="min-h-screen bg-[#050811] text-slate-100 font-sans selection:bg-emerald-500/30 selection:text-emerald-300 relative overflow-x-hidden">
      
      {/* Ambient Radial Lights */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-emerald-500/10 via-cyan-500/5 to-transparent blur-3xl pointer-events-none -z-10"></div>
      <div className="fixed bottom-0 right-0 w-[600px] h-[400px] bg-indigo-500/5 blur-3xl pointer-events-none -z-10"></div>

      {/* Top Defence Telemetry & Government Masthead */}
      <div className="bg-[#090d1a] border-b border-slate-800/80 py-2 px-4 sm:px-8 text-xs backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-3">
          <div className="flex items-center gap-4 text-[11px] font-tactical tracking-wider">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-orange-400">भारत सरकार</span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-300 font-medium">GOVT OF INDIA</span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5">
              <span className="text-slate-600">|</span>
              <span className="font-bold text-emerald-400">रक्षा मंत्रालय</span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-300 font-medium">MINISTRY OF DEFENCE</span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-[11px] font-mono">
            <div className="flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              <span className="font-semibold">DEFCON 2 // ACTIVE SHIELD</span>
            </div>
            <span className="hidden md:inline text-slate-500">LATENCY: <strong className="text-emerald-400 font-semibold">&lt;150ms</strong></span>
            <span className="hidden lg:inline text-slate-500">BLOCK HEIGHT: <strong className="text-cyan-400 font-semibold">#1043</strong></span>
          </div>
        </div>
      </div>

      {/* Main Tactical Navigation Bar */}
      <header className="bg-[#070b16]/90 border-b border-slate-800/80 sticky top-0 z-50 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4">
          
          {/* Brand Logo */}
          <div className="flex items-center gap-3.5 cursor-pointer group" onClick={() => navigate('/')}>
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-700 flex items-center justify-center shadow-lg shadow-emerald-500/20 ring-1 ring-emerald-400/40 group-hover:scale-105 transition duration-300">
              <Shield className="w-6 h-6 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black tracking-tight text-white font-display">
                  NetGen<span className="text-emerald-400 glow-text-emerald">X</span>
                </span>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-500/30 font-tactical tracking-wider">
                  DEFENCE CYBER SHIELD
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">AI-Enabled Cyber Incident Triage & Cryptographic Vault</p>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <button 
              onClick={() => navigate('/upload')}
              className="px-3.5 py-2 bg-slate-900/80 hover:bg-slate-800 text-slate-200 rounded-xl text-xs font-semibold transition border border-slate-700/80 flex items-center gap-1.5 hover:border-emerald-500/40"
            >
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Incident</span> Console
            </button>

            <button 
              onClick={() => navigate('/officialpage')}
              className="px-3.5 py-2 bg-slate-900/80 hover:bg-slate-800 text-cyan-300 rounded-xl text-xs font-semibold transition border border-cyan-500/30 flex items-center gap-1.5 hover:border-cyan-400/60"
            >
              <Database className="w-3.5 h-3.5 text-cyan-400" />
              <span>CERT-Army Vault</span>
            </button>

            <button 
              onClick={() => navigate('/auth')}
              className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold rounded-xl text-xs transition shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Login / Clearance</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Showcase Section */}
      <section className="relative pt-12 pb-20 px-4 sm:px-8 border-b border-slate-800/80 cyber-grid">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Hero Slider */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 text-xs font-tactical font-bold tracking-wider">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              {slides[currentSlide].badge}
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.1] font-display">
              {slides[currentSlide].title} <br />
              <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
                {slides[currentSlide].highlight}
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl font-normal">
              {slides[currentSlide].subtitle}
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                onClick={() => navigate(slides[currentSlide].path)}
                className="px-7 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black rounded-xl text-sm transition-all shadow-xl shadow-emerald-500/25 flex items-center gap-2 cursor-pointer hover:gap-3 group"
              >
                <span>{slides[currentSlide].cta}</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>

              <button
                onClick={() => navigate('/workflow')}
                className="px-6 py-3.5 bg-slate-900/80 hover:bg-slate-800 text-slate-200 font-bold rounded-xl text-sm transition border border-slate-700/80 flex items-center gap-2 hover:border-slate-500"
              >
                <Cpu className="w-4 h-4 text-purple-400" />
                <span>Architecture Explainer</span>
              </button>
            </div>

            {/* Slide Navigation Dots */}
            <div className="flex items-center gap-2.5 pt-4">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentSlide(i)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${i === currentSlide ? 'w-10 bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.7)]' : 'w-2.5 bg-slate-700 hover:bg-slate-500'}`}
                />
              ))}
            </div>
          </div>

          {/* Right Column: Interactive Live Threat Simulator HUD */}
          <div className="lg:col-span-5">
            <div className="hud-card rounded-2xl p-6 relative overflow-hidden border border-cyan-500/30">
              <div className="hud-corner-tl"></div>
              <div className="hud-corner-tr"></div>
              <div className="hud-corner-bl"></div>
              <div className="hud-corner-br"></div>

              {/* HUD Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-5">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
                  <span className="text-xs font-bold text-white font-tactical tracking-wider uppercase">
                    INTERACTIVE AI THREAT SIMULATOR
                  </span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-500/30">
                  REAL-TIME PREVIEW
                </span>
              </div>

              {/* Scenario Selector Chips */}
              <div className="space-y-2 mb-5">
                <span className="text-[11px] font-mono text-slate-400 block">Select Threat Vector to Triage:</span>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(scenarios).map(([key, sc]) => (
                    <button
                      key={key}
                      onClick={() => handleSelectScenario(key)}
                      className={`p-2.5 rounded-xl text-left text-xs font-medium transition flex items-center gap-2 border ${
                        simulatedScenario === key 
                          ? 'bg-slate-800 border-emerald-400/60 text-emerald-300 shadow-md shadow-emerald-500/10' 
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      <span>{sc.icon}</span>
                      <span className="truncate">{sc.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Simulated Payload Inspector */}
              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 mb-5 font-mono text-xs">
                <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>Intercepted Payload / Transmission</span>
                  <span className="text-emerald-400">{scenarios[simulatedScenario].latency}</span>
                </div>
                <p className="text-slate-300 text-xs line-clamp-2 leading-relaxed">
                  "{scenarios[simulatedScenario].text}"
                </p>
              </div>

              {/* Triage Output Card */}
              <div className={`p-4 rounded-xl border transition-all ${
                isSimulating 
                  ? 'opacity-40 animate-pulse' 
                  : simResult.color === 'crimson' 
                    ? 'bg-red-950/30 border-red-500/40' 
                    : 'bg-emerald-950/30 border-emerald-500/40'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{simResult.color === 'crimson' ? '🚨' : '✅'}</span>
                    <span className={`text-xs font-black tracking-wide font-display ${simResult.color === 'crimson' ? 'text-red-400' : 'text-emerald-400'}`}>
                      {simResult.level} ({simResult.score}%)
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">
                    CERT-Army Auto-Alert: <strong>{simResult.score > 80 ? 'TRIGGERED' : 'STANDBY'}</strong>
                  </span>
                </div>

                <div className="text-xs font-semibold text-white mb-2">
                  Classification: {simResult.threat}
                </div>

                <div className="text-[11px] text-slate-300 leading-relaxed mb-3">
                  {simResult.mitigation}
                </div>

                {/* CID Stamp */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span className="flex items-center gap-1 text-cyan-400">
                    <Database className="w-3 h-3" /> IPFS CID:
                  </span>
                  <span className="truncate max-w-[200px] text-slate-400">{simResult.cid}</span>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-4">
                <button
                  onClick={() => navigate('/upload')}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 rounded-xl text-xs font-bold transition border border-emerald-500/30 flex items-center justify-center gap-1.5"
                >
                  <span>Test with Your Own File or Text Evidence</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* NetGenX vs NCRP: Tactical Advantage Matrix */}
      <section className="py-20 px-4 sm:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-xs font-tactical font-bold tracking-wider">
            <span>DEFENCE SOVEREIGNTY VS CIVILIAN QUEUES</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white font-display">
            Why NetGenX Outperforms NCRP
          </h2>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            Civilian portals leave sensitive defence complaints buried under civilian financial frauds. NetGenX delivers dedicated military-grade triage with sub-2-second response latency.
          </p>
        </div>

        {/* Matrix Comparison Table */}
        <div className="hud-card rounded-2xl overflow-hidden border border-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-900/90 border-b border-slate-800 text-slate-400 font-tactical uppercase tracking-wider text-xs">
                  <th className="py-4 px-6">Operational Metric</th>
                  <th className="py-4 px-6 bg-red-950/20 text-red-300 border-l border-r border-slate-800">
                    Civilian NCRP Portal (Civilian Load)
                  </th>
                  <th className="py-4 px-6 bg-emerald-950/30 text-emerald-300">
                    NetGenX Defence Cyber Shield 🛡️
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 font-normal">
                <tr className="hover:bg-slate-900/40 transition">
                  <td className="py-4 px-6 font-bold text-slate-200">Incident Triage Latency</td>
                  <td className="py-4 px-6 text-red-400 bg-red-950/10 border-l border-r border-slate-800">
                    3 to 14 days (Buried in civil fraud complaints)
                  </td>
                  <td className="py-4 px-6 text-emerald-400 font-bold bg-emerald-950/20">
                    &lt; 2 Seconds (Instant Neural Inference)
                  </td>
                </tr>
                <tr className="hover:bg-slate-900/40 transition">
                  <td className="py-4 px-6 font-bold text-slate-200">Evidence Integrity Standard</td>
                  <td className="py-4 px-6 text-slate-400 bg-red-950/10 border-l border-r border-slate-800">
                    Unsigned Web Uploads (Vulnerable to tampering)
                  </td>
                  <td className="py-4 px-6 text-cyan-300 font-semibold bg-emerald-950/20">
                    SHA-256 IPFS Multihash + Ethereum Smart Contract
                  </td>
                </tr>
                <tr className="hover:bg-slate-900/40 transition">
                  <td className="py-4 px-6 font-bold text-slate-200">Threat Detection Corpus</td>
                  <td className="py-4 px-6 text-slate-400 bg-red-950/10 border-l border-r border-slate-800">
                    Generic Consumer Cybercrime (e.g. Credit Card fraud)
                  </td>
                  <td className="py-4 px-6 text-emerald-300 font-semibold bg-emerald-950/20">
                    Specialized Military Corpus (Honeytraps, SPARSH, APKs)
                  </td>
                </tr>
                <tr className="hover:bg-slate-900/40 transition">
                  <td className="py-4 px-6 font-bold text-slate-200">Escalation Authority</td>
                  <td className="py-4 px-6 text-slate-400 bg-red-950/10 border-l border-r border-slate-800">
                    Local civilian municipal police stations
                  </td>
                  <td className="py-4 px-6 text-purple-300 font-semibold bg-emerald-950/20">
                    Direct automated dispatch to CERT-Army Command
                  </td>
                </tr>
                <tr className="hover:bg-slate-900/40 transition">
                  <td className="py-4 px-6 font-bold text-slate-200">Court of Inquiry Admissibility</td>
                  <td className="py-4 px-6 text-slate-400 bg-red-950/10 border-l border-r border-slate-800">
                    Requires manual forensic certification
                  </td>
                  <td className="py-4 px-6 text-emerald-400 font-bold bg-emerald-950/20">
                    Cryptographic Proof of Custody (Sec. 65B compliant)
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Target Ecosystem Pillars */}
      <section className="py-16 px-4 sm:px-8 max-w-7xl mx-auto border-t border-slate-800/80">
        <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-400 font-tactical">
            DEFENCE ECOSYSTEM COVERAGE
          </span>
          <h2 className="text-3xl font-black text-white font-display">Who We Protect</h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          
          <div className="hud-card rounded-2xl p-6 group hover:-translate-y-1 transition duration-300 border-slate-800">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center mb-4 text-blue-400 group-hover:scale-110 transition">
              <Shield className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-white text-base mb-2 font-display">Serving Personnel</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Shielding officers and jawans from honeytrap solicitations, hostile geolocation tracking, and operational leakage bait.
            </p>
          </div>

          <div className="hud-card rounded-2xl p-6 group hover:-translate-y-1 transition duration-300 border-slate-800">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-4 text-emerald-400 group-hover:scale-110 transition">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-white text-base mb-2 font-display">Military Families</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Protecting cantonment families against officer impersonation scams, extortion calls, and fraudulent regimental funds.
            </p>
          </div>

          <div className="hud-card rounded-2xl p-6 group hover:-translate-y-1 transition duration-300 border-slate-800">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-4 text-amber-400 group-hover:scale-110 transition">
              <Key className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-white text-base mb-2 font-display">Veterans & Pensioners</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Immediate detection of SPARSH pension phishing URLs, fraudulent life certificate requests, and fake ECHS medical alerts.
            </p>
          </div>

          <div className="hud-card rounded-2xl p-6 group hover:-translate-y-1 transition duration-300 border-slate-800">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center mb-4 text-purple-400 group-hover:scale-110 transition">
              <Database className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-white text-base mb-2 font-display">CERT-Army Command</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Real-time incident dispatch, immutable blockchain ledger auditing, and live mitigation step synthesis via Google Gemini.
            </p>
          </div>

        </div>
      </section>

      {/* Call to Action Banner */}
      <section className="bg-gradient-to-r from-slate-900 via-[#0a1226] to-slate-900 border-t border-b border-slate-800 py-14 px-4 sm:px-8 relative overflow-hidden">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
          <div className="space-y-2 text-center md:text-left">
            <h3 className="text-2xl sm:text-3xl font-black text-white font-display">
              Suspect Hostile Cyber Espionage or Phishing?
            </h3>
            <p className="text-sm text-slate-300 max-w-xl">
              Don't let your complaint get delayed in civilian queues. Submit text, screenshot, or audio for instant cryptographic triage.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={() => navigate('/upload')}
              className="px-7 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black rounded-xl text-sm transition shadow-xl shadow-emerald-500/25 flex items-center gap-2 cursor-pointer hover:scale-105"
            >
              <span>Launch Incident Scanner</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate('/auth')}
              className="px-6 py-3.5 bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold rounded-xl text-sm transition border border-slate-700/80"
            >
              Clearance Login
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#03060d] border-t border-slate-900 py-10 px-4 sm:px-8 text-center text-xs text-slate-500 font-mono space-y-2">
        <p className="text-slate-400">NetGenX Defence Cyber Shield • Built for the Indian Armed Forces Ecosystem</p>
        <p>Decoupled Microservices • SHA-256 IPFS Vault • Ethereum Smart Contracts • Scikit-Learn Inference Engine</p>
      </footer>

    </div>
  );
}