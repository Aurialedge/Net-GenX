import { useState, useEffect } from 'react';
import { 
  Upload, Database, Brain, Shield, AlertTriangle, Mail, User, 
  CheckCircle, FileText, Image, Video, Mic, Lock, Activity, 
  ArrowRight, Zap, Eye, Server, Key, Smartphone, FileCheck, Bell, UserCheck
} from 'lucide-react';

const SecuritySystemExplainer = () => {
  const [activePhase, setActivePhase] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [riskLevel, setRiskLevel] = useState('low');

  const phases = [
    { id: 0, title: "User Upload", description: "Users upload text, audio, image, or video", primaryColor: "blue", icon: Upload },
    { id: 1, title: "IPFS Storage", description: "Files stored on IPFS for decentralized access", primaryColor: "purple", icon: Database },
    { id: 2, title: "AI Analysis", description: "AI analyzes content and generates risk scores", primaryColor: "orange", icon: Brain },
    { id: 3, title: "Risk Assessment", description: "System evaluates threat levels", primaryColor: "red", icon: AlertTriangle },
    { id: 4, title: "User Guidance", description: "High-risk users receive step-by-step guidance", primaryColor: "green", icon: Shield },
    { id: 5, title: "Blockchain Recording", description: "Results recorded on blockchain", primaryColor: "indigo", icon: Lock },
    { id: 6, title: "Government Alert", description: "Authorities notified of high-risk incidents", primaryColor: "yellow", icon: Mail },
    { id: 7, title: "Official Authentication", description: "Officials login with credentials + OTP", primaryColor: "teal", icon: Key },
    { id: 8, title: "Incident Review", description: "Officials view blockchain records and IPFS media", primaryColor: "violet", icon: Eye },
    { id: 9, title: "Action & Resolution", description: "Actions executed and recorded on blockchain", primaryColor: "emerald", icon: CheckCircle }
  ];

  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setActivePhase((prev) => {
        const next = (prev + 1) % phases.length;
        if (next === 3) setRiskLevel(['low', 'medium', 'high'][Math.floor(Math.random() * 3)]);
        return next;
      });
    }, 4000);
    return () => clearInterval(timer);
  }, [isPlaying]);

  const getRiskColor = (risk) => ({
    high: { bg: 'bg-red-500', text: 'text-red-400', glow: 'shadow-red-500/50' },
    medium: { bg: 'bg-amber-500', text: 'text-amber-400', glow: 'shadow-amber-500/50' },
    low: { bg: 'bg-green-500', text: 'text-green-400', glow: 'shadow-green-500/50' }
  })[risk];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Animated Background */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      </div>

      {/* Header */}
      <div className="relative z-10 pt-16 pb-12 text-center px-4">
        <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
          Futuristic Cyber Defense System
        </h1>
        <p className="text-slate-400 text-xl">AI-Powered • Blockchain-Secured • Government-Integrated</p>
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-8 py-8">
        <div className="grid lg:grid-cols-2 gap-12">
          
          {/* Visual Stage */}
          <div className="relative h-[600px] bg-slate-900/50 backdrop-blur-xl rounded-3xl border-2 border-slate-700 p-8 overflow-hidden">
            
            {activePhase === 0 && (
              <div className="h-full flex flex-col items-center justify-center space-y-6 animate-fade-in">
                <Upload className="w-32 h-32 text-blue-400 animate-bounce" />
                <div className="grid grid-cols-4 gap-4">
                  {[{ icon: FileText, label: 'Text' }, { icon: Mic, label: 'Audio' }, { icon: Image, label: 'Image' }, { icon: Video, label: 'Video' }].map((item, i) => {
                    const Icon = item.icon;
                    return <div key={i} className="flex flex-col items-center gap-2 p-4 bg-slate-800 rounded-xl"><Icon className="w-8 h-8 text-blue-400" /><span className="text-xs text-slate-400">{item.label}</span></div>;
                  })}
                </div>
              </div>
            )}

            {activePhase === 1 && (
              <div className="h-full flex flex-col items-center justify-center space-y-8">
                <Database className="w-32 h-32 text-purple-400 animate-pulse" />
                <div className="grid grid-cols-3 gap-3">
                  {[...Array(9)].map((_, i) => (
                    <div key={i} className="h-16 bg-purple-500/20 rounded-lg border border-purple-500/30 flex items-center justify-center">
                      <Server className="w-6 h-6 text-purple-400" />
                    </div>
                  ))}
                </div>
                <div className="text-purple-400 font-mono text-sm">CID: Qm...</div>
              </div>
            )}

            {activePhase === 2 && (
              <div className="h-full flex flex-col items-center justify-center space-y-6">
                <div className="w-32 h-32 bg-gradient-to-br from-orange-500 to-amber-500 rounded-full flex items-center justify-center">
                  <Brain className="w-16 h-16 text-white animate-pulse" />
                </div>
                <div className="w-full max-w-md space-y-3">
                  {['Content Analysis', 'Pattern Recognition', 'Threat Detection', 'Risk Calculation'].map((label, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Zap className="w-5 h-5 text-orange-400" />
                      <div className="flex-1">
                        <div className="text-slate-300 text-sm">{label}</div>
                        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-orange-500 to-amber-500" style={{ width: `${(i + 1) * 25}%` }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activePhase === 3 && (
              <div className="h-full flex flex-col items-center justify-center space-y-8">
                <div className={`w-48 h-48 ${getRiskColor(riskLevel).bg} rounded-full flex items-center justify-center animate-pulse`}>
                  <AlertTriangle className="w-24 h-24 text-white" />
                </div>
                <div className="flex gap-4">
                  {['low', 'medium', 'high'].map((level) => (
                    <div key={level} className={`px-6 py-3 rounded-xl border-2 ${riskLevel === level ? `${getRiskColor(level).bg} text-white` : 'border-slate-700 bg-slate-800 text-slate-500'}`}>
                      <div className="text-xs uppercase font-bold">{level}</div>
                      <div className="text-2xl font-bold">{level === 'high' ? '85%' : level === 'medium' ? '55%' : '20%'}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activePhase === 4 && (
              <div className="h-full flex flex-col items-center justify-center space-y-6">
                <Shield className="w-32 h-32 text-green-400 animate-bounce" />
                <div className="w-full max-w-md space-y-3">
                  {[{ text: 'Change passwords', icon: Key }, { text: 'Enable 2FA', icon: Smartphone }, { text: 'Review activity', icon: Activity }, { text: 'Update security', icon: Lock }].map((item, i) => {
                    const Icon = item.icon;
                    return (
                      <div key={i} className="flex items-center gap-4 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-bold">{i + 1}</div>
                        <Icon className="w-5 h-5 text-green-400" />
                        <span className="text-slate-300 text-sm">{item.text}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activePhase === 5 && (
              <div className="h-full flex flex-col items-center justify-center space-y-6">
                <Lock className="w-32 h-32 text-indigo-400 animate-pulse" />
                <div className="w-full max-w-md space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-lg">
                      <div className="w-2 h-2 bg-indigo-400 rounded-full" />
                      <div className="flex-1 font-mono text-xs text-indigo-300">Block #{i + 1}: 0x{Math.random().toString(16).substr(2, 8)}...</div>
                      <CheckCircle className="w-4 h-4 text-indigo-400" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activePhase === 6 && (
              <div className="h-full flex flex-col items-center justify-center space-y-8">
                <div className="relative">
                  <Mail className="w-32 h-32 text-yellow-400 animate-bounce" />
                  <Bell className="absolute -top-2 -right-2 w-8 h-8 text-red-500 animate-ping" />
                </div>
                <div className="w-full max-w-md p-6 bg-yellow-500/10 border-2 border-yellow-500/30 rounded-xl">
                  <div className="flex items-center gap-3 mb-4">
                    <AlertTriangle className="w-6 h-6 text-yellow-400" />
                    <span className="text-yellow-400 font-bold">HIGH PRIORITY ALERT</span>
                  </div>
                  <div className="text-slate-300 text-sm space-y-2">
                    <div className="flex justify-between"><span>Risk Level:</span><span className="text-red-400 font-bold">HIGH (85%)</span></div>
                    <div className="flex justify-between"><span>Status:</span><span className="text-green-400">✓ Authorities Notified</span></div>
                  </div>
                </div>
              </div>
            )}

            {activePhase === 7 && (
              <div className="h-full flex flex-col items-center justify-center space-y-8">
                <Key className="w-32 h-32 text-teal-400 animate-pulse" />
                <div className="w-full max-w-md space-y-4">
                  <div className="p-4 bg-teal-500/10 border border-teal-500/30 rounded-xl">
                    <div className="flex items-center gap-3 mb-3">
                      <User className="w-5 h-5 text-teal-400" />
                      <span className="text-slate-300 text-sm">Gov Credentials</span>
                    </div>
                    <div className="h-10 bg-slate-800 rounded-lg flex items-center px-3">
                      <span className="text-slate-500 text-sm">gov.official@mha.gov.in</span>
                    </div>
                  </div>
                  <div className="p-4 bg-teal-500/10 border border-teal-500/30 rounded-xl">
                    <div className="flex items-center gap-3 mb-3">
                      <Smartphone className="w-5 h-5 text-teal-400" />
                      <span className="text-slate-300 text-sm">OTP Verification</span>
                    </div>
                    <div className="flex gap-2">
                      {[...Array(6)].map((_, i) => (
                        <div key={i} className="flex-1 h-12 bg-slate-800 rounded-lg flex items-center justify-center border-2 border-teal-500">
                          <span className="text-teal-400 text-xl font-bold">{Math.floor(Math.random() * 10)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-green-400">
                    <CheckCircle className="w-5 h-5" />
                    <span className="text-sm font-semibold">Authentication Successful</span>
                  </div>
                </div>
              </div>
            )}

            {activePhase === 8 && (
              <div className="h-full flex flex-col items-center justify-center space-y-6">
                <Eye className="w-32 h-32 text-violet-400 animate-pulse" />
                <div className="w-full max-w-md space-y-3">
                  <div className="p-4 bg-violet-500/10 border border-violet-500/30 rounded-xl">
                    <div className="flex items-center gap-3 mb-3">
                      <Lock className="w-5 h-5 text-violet-400" />
                      <span className="text-slate-300 text-sm">Blockchain Records</span>
                    </div>
                    <div className="space-y-2 text-xs text-slate-400">
                      <div className="flex justify-between"><span>Total Incidents:</span><span className="text-violet-400 font-bold">127</span></div>
                      <div className="flex justify-between"><span>High Risk:</span><span className="text-red-400 font-bold">23</span></div>
                    </div>
                  </div>
                  <div className="p-4 bg-violet-500/10 border border-violet-500/30 rounded-xl">
                    <div className="flex items-center gap-3 mb-3">
                      <Database className="w-5 h-5 text-violet-400" />
                      <span className="text-slate-300 text-sm">IPFS Media</span>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {[FileText, Image, Video, Mic].map((Icon, i) => (
                        <div key={i} className="aspect-square bg-slate-800 rounded-lg flex items-center justify-center">
                          <Icon className="w-6 h-6 text-violet-400" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activePhase === 9 && (
              <div className="h-full flex flex-col items-center justify-center space-y-8">
                <CheckCircle className="w-32 h-32 text-emerald-400 animate-bounce" />
                <div className="w-full max-w-md space-y-3">
                  {['Case Reviewed', 'Evidence Collected', 'Action Taken', 'Blockchain Updated'].map((text, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                      <UserCheck className="w-6 h-6 text-emerald-400" />
                      <span className="flex-1 text-slate-300">{text}</span>
                      <CheckCircle className="w-5 h-5 text-emerald-400" />
                    </div>
                  ))}
                </div>
                <div className="text-emerald-400 text-lg font-bold">Case Resolved ✓</div>
              </div>
            )}
          </div>

          {/* Info Panel */}
          <div className="space-y-6">
            <div className="p-8 bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm rounded-3xl border-2 border-slate-700">
              <div className="flex items-center gap-4 mb-6">
                {(() => {
                  const Icon = phases[activePhase].icon;
                  return <Icon className="w-12 h-12 text-blue-400" />;
                })()}
                <div>
                  <div className="text-sm text-slate-500 font-semibold">Phase {activePhase + 1} of {phases.length}</div>
                  <h2 className="text-3xl font-bold text-white">{phases[activePhase].title}</h2>
                </div>
              </div>
              <p className="text-slate-300 text-lg leading-relaxed">{phases[activePhase].description}</p>
            </div>

            {/* Controls */}
            <div className="flex gap-4">
              <button onClick={() => setIsPlaying(!isPlaying)} className={`flex-1 px-6 py-4 rounded-xl font-bold transition-all ${isPlaying ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'} text-white`}>
                {isPlaying ? 'Pause' : 'Play'}
              </button>
              <button onClick={() => setActivePhase((p) => (p + 1) % phases.length)} className="px-6 py-4 rounded-xl font-bold bg-slate-700 hover:bg-slate-600 text-white">
                Next <ArrowRight className="inline w-5 h-5" />
              </button>
            </div>

            {/* Progress */}
            <div className="p-6 bg-slate-800/50 rounded-2xl border border-slate-700">
              <div className="text-slate-400 text-sm mb-3">System Flow Progress</div>
              <div className="h-3 bg-slate-900 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transition-all" style={{ width: `${((activePhase + 1) / phases.length) * 100}%` }} />
              </div>
              <div className="text-slate-500 text-xs mt-2 font-mono">{activePhase + 1} / {phases.length} completed</div>
            </div>

            {/* Key Features */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'AI-Powered', color: 'orange' },
                { label: 'IPFS Storage', color: 'purple' },
                { label: 'Blockchain', color: 'indigo' },
                { label: 'Gov Integration', color: 'teal' }
              ].map((item, i) => (
                <div key={i} className={`p-4 bg-${item.color}-500/10 border border-${item.color}-500/30 rounded-xl text-center`}>
                  <div className={`text-${item.color}-400 font-semibold text-sm`}>{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }
        .animate-bounce-slow {
          animation: bounce 2s infinite;
        }
      `}</style>
    </div>
  );
};

export default SecuritySystemExplainer;
