import { useState, useEffect } from 'react';
import { 
  Upload, Database, Brain, Shield, AlertTriangle, 
  Mail, User, CheckCircle, FileText, Image, Video, 
  Mic, Lock, Activity, ChevronRight, ArrowRight, Sparkles
} from 'lucide-react';

const WorkflowAnimation = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  const steps = [
    {
      id: 1,
      title: "User Upload",
      description: "User uploads data in multiple formats",
      icon: Upload,
      color: "from-blue-500 to-cyan-500",
      subItems: [
        { icon: FileText, label: "Text", color: "text-blue-400" },
        { icon: Mic, label: "Audio", color: "text-purple-400" },
        { icon: Image, label: "Image", color: "text-green-400" },
        { icon: Video, label: "Video", color: "text-red-400" }
      ]
    },
    {
      id: 2,
      title: "IPFS Storage",
      description: "Data gets uploaded to decentralized IPFS network",
      icon: Database,
      color: "from-purple-500 to-pink-500",
      detail: "Distributed & Immutable"
    },
    {
      id: 3,
      title: "ML Analysis",
      description: "Machine Learning model analyzes for threats",
      icon: Brain,
      color: "from-orange-500 to-amber-500",
      detail: "Risk Score Generated"
    },
    {
      id: 4,
      title: "Blockchain Storage",
      description: "Results stored on blockchain for transparency",
      icon: Lock,
      color: "from-indigo-500 to-blue-500",
      detail: "Immutable Record"
    },
    {
      id: 5,
      title: "Risk Assessment",
      description: "Check if risk score exceeds threshold (>80)",
      icon: AlertTriangle,
      color: "from-red-500 to-orange-500",
      detail: "Critical Alert Triggered",
      conditional: true
    },
    {
      id: 6,
      title: "User Guidance",
      description: "AI guides user to prevent attack",
      icon: Shield,
      color: "from-green-500 to-emerald-500",
      detail: "Real-time Protection"
    },
    {
      id: 7,
      title: "Government Alert",
      description: "Mail sent to government authorities",
      icon: Mail,
      color: "from-yellow-500 to-orange-500",
      detail: "Automated Notification"
    },
    {
      id: 8,
      title: "Official Login",
      description: "Officials login with Gov credentials + OTP",
      icon: User,
      color: "from-teal-500 to-cyan-500",
      detail: "Secure Authentication"
    },
    {
      id: 9,
      title: "View Attacks",
      description: "Officials view attacks from blockchain & media from IPFS",
      icon: Activity,
      color: "from-violet-500 to-purple-500",
      detail: "Complete Visibility"
    },
    {
      id: 10,
      title: "Take Action",
      description: "Official takes appropriate action",
      icon: CheckCircle,
      color: "from-green-600 to-teal-600",
      detail: "Case Resolution"
    }
  ];

  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [isPlaying, steps.length]);

  const StepCard = ({ step, index, isActive }) => {
    const Icon = step.icon;
    return (
      <div className={`
        relative transition-all duration-500 ease-out
        ${isActive 
          ? 'scale-110 z-20' 
          : 'scale-95 opacity-60'
        }
      `}>
        {/* Connection Line */}
        {index < steps.length - 1 && (
          <div className={`
            absolute left-1/2 -ml-1 top-full h-16 w-0.5 
            transition-all duration-500
            ${index < activeStep 
              ? 'bg-gradient-to-b from-green-500 to-green-400' 
              : 'bg-gray-700'
            }
          `}>
            {index < activeStep && (
              <div className="absolute bottom-0 left-1/2 -ml-1 w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            )}
          </div>
        )}

        <div className={`
          bg-gradient-to-br from-slate-800/90 to-slate-900/90 
          backdrop-blur-sm rounded-2xl p-6 border-2
          transition-all duration-500
          ${isActive 
            ? 'border-green-400 shadow-2xl shadow-green-500/20' 
            : 'border-slate-700'
          }
        `}>
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className={`
              w-14 h-14 rounded-xl bg-gradient-to-br ${step.color}
              flex items-center justify-center
              transition-transform duration-500
              ${isActive ? 'rotate-0 scale-110' : 'rotate-12'}
            `}>
              <Icon className="w-7 h-7 text-white" />
            </div>
            <div className={`
              text-sm font-bold px-3 py-1 rounded-full
              ${isActive 
                ? 'bg-green-500 text-white' 
                : 'bg-slate-700 text-slate-400'
              }
            `}>
              Step {step.id}
            </div>
          </div>

          {/* Content */}
          <h3 className={`
            text-xl font-bold mb-2 transition-colors
            ${isActive ? 'text-white' : 'text-slate-300'}
          `}>
            {step.title}
          </h3>
          <p className="text-slate-400 text-sm mb-3 leading-relaxed">
            {step.description}
          </p>

          {/* Sub Items for Upload Step */}
          {step.subItems && isActive && (
            <div className="grid grid-cols-2 gap-2 mt-4">
              {step.subItems.map((item, idx) => {
                const SubIcon = item.icon;
                return (
                  <div 
                    key={idx}
                    className="bg-slate-900/50 rounded-lg p-2 flex items-center gap-2 border border-slate-700"
                    style={{ animationDelay: `${idx * 0.1}s` }}
                  >
                    <SubIcon className={`w-4 h-4 ${item.color}`} />
                    <span className="text-xs text-slate-300">{item.label}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Detail Badge */}
          {step.detail && (
            <div className={`
              mt-3 text-xs font-semibold px-3 py-1.5 rounded-lg inline-block
              ${isActive 
                ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-300 border border-green-500/30' 
                : 'bg-slate-800 text-slate-500 border border-slate-700'
              }
            `}>
              {step.detail}
            </div>
          )}

          {/* Conditional Badge */}
          {step.conditional && (
            <div className="mt-3 flex items-center gap-2 text-xs text-amber-400">
              <Sparkles className="w-4 h-4" />
              <span>Conditional Step</span>
            </div>
          )}

          {/* Active Indicator */}
          {isActive && (
            <div className="absolute -top-2 -right-2">
              <div className="relative">
                <div className="w-4 h-4 bg-green-400 rounded-full animate-ping absolute"></div>
                <div className="w-4 h-4 bg-green-400 rounded-full"></div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 py-12 px-4">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-12">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-4">
            System Workflow Animation
          </h1>
          <p className="text-slate-400 text-lg">
            Decentralized Cyber Defense Platform - End-to-End Process
          </p>
        </div>

        {/* Control Panel */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`
              px-6 py-3 rounded-lg font-semibold transition-all duration-300
              ${isPlaying 
                ? 'bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600' 
                : 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600'
              }
              text-white shadow-lg
            `}
          >
            {isPlaying ? 'Pause Animation' : 'Play Animation'}
          </button>
          <button
            onClick={() => setActiveStep((prev) => (prev + 1) % steps.length)}
            className="px-6 py-3 rounded-lg font-semibold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition-all"
          >
            Next Step
          </button>
          <button
            onClick={() => setActiveStep(0)}
            className="px-6 py-3 rounded-lg font-semibold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition-all"
          >
            Reset
          </button>
        </div>

        {/* Progress Bar */}
        <div className="mt-8 bg-slate-800 rounded-full h-3 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transition-all duration-500"
            style={{ width: `${((activeStep + 1) / steps.length) * 100}%` }}
          />
        </div>
        <div className="text-center mt-2 text-slate-400 text-sm font-mono">
          Progress: {activeStep + 1} / {steps.length} steps
        </div>
      </div>

      {/* Workflow Steps - Grid Layout */}
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <StepCard 
              key={step.id}
              step={step}
              index={index}
              isActive={index === activeStep}
            />
          ))}
        </div>
      </div>

      {/* Flow Diagram Legend */}
      <div className="max-w-7xl mx-auto mt-16">
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 border border-slate-700">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <ArrowRight className="w-6 h-6 text-blue-400" />
            Workflow Overview
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <h3 className="font-semibold text-green-400 text-sm uppercase tracking-wider">User Actions</h3>
              <p className="text-slate-300 text-sm">Upload → Analysis → AI Guidance</p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-purple-400 text-sm uppercase tracking-wider">Storage Layer</h3>
              <p className="text-slate-300 text-sm">IPFS (Media) + Blockchain (Records)</p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-orange-400 text-sm uppercase tracking-wider">Official Actions</h3>
              <p className="text-slate-300 text-sm">Login → View → Take Action</p>
            </div>
          </div>

          {/* Key Features */}
          <div className="mt-8 pt-6 border-t border-slate-700">
            <h3 className="font-semibold text-white mb-4">Key Features:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex items-center gap-3 text-sm">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-slate-300">Decentralized Storage</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <span className="text-slate-300">ML Threat Detection</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                <span className="text-slate-300">Blockchain Transparency</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                <span className="text-slate-300">Real-time Alerts</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Current Step Details */}
      <div className="max-w-4xl mx-auto mt-8">
        <div className="bg-gradient-to-r from-slate-800/80 to-slate-900/80 backdrop-blur-sm rounded-2xl p-8 border-2 border-green-400">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
            <h3 className="text-xl font-bold text-white">Currently Active</h3>
          </div>
          <div className="flex items-start gap-6">
            <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${steps[activeStep].color} flex items-center justify-center flex-shrink-0`}>
              {(() => {
                const Icon = steps[activeStep].icon;
                return <Icon className="w-8 h-8 text-white" />;
              })()}
            </div>
            <div className="flex-1">
              <h4 className="text-2xl font-bold text-white mb-2">{steps[activeStep].title}</h4>
              <p className="text-slate-300 mb-3">{steps[activeStep].description}</p>
              {steps[activeStep].detail && (
                <div className="inline-block px-4 py-2 bg-green-500/20 border border-green-500/30 rounded-lg text-green-300 text-sm font-semibold">
                  {steps[activeStep].detail}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkflowAnimation;
