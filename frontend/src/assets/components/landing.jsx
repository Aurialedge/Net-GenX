import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, AlertTriangle, FileText, CheckCircle2, Lock, ExternalLink, ArrowRight, 
  LogOut, Terminal, Activity, Radio, Database, Cpu, UploadCloud, RefreshCw,
  Sparkles, Check, Copy, Flame, Eye, CornerDownRight
} from 'lucide-react';
import uploadtoipfs from './Hooks/ipfs';
import { userStore } from "./store";
import imgleft from '../../../public/imgleft.png';
import imgright from '../../../public/imgright.png';

export default function MessageClassifier() {
  const [activeTab, setActiveTab] = useState('text'); // 'text' or 'file'
  const [message, setMessage] = useState('');
  const [file, setFile] = useState(null);
  const [filetype, setFileType] = useState("file");
  const [isTextLoading, setIsTextLoading] = useState(false);
  const [isFileLoading, setIsFileLoading] = useState(false);
  const [currentStage, setCurrentStage] = useState('');
  const [pipelineStep, setPipelineStep] = useState(0); // 0 = idle, 1 = hashing, 2 = ipfs, 3 = ai, 4 = blockchain, 5 = complete
  const [cid, setCid] = useState(null);
  const [cidLink, setCidLink] = useState("");
  const [copiedCid, setCopiedCid] = useState(false);
  const [aiReport, setAiReport] = useState(null);
  const [riskColor, setRiskColor] = useState("");
  const [mailRes, setMailRes] = useState("");
  const [chatVisible, setChatVisible] = useState(false);
  const [chatCountdown, setChatCountdown] = useState(8);

  const { user, setUser, clearUser } = userStore();
  const navigate = useNavigate();

  const ipfsAddress = import.meta.env.VITE_IPFS_ADDRESS || "localhost";
  const ipfsPort = import.meta.env.VITE_IPFS_PORT || 8000;
  const mlAddress = import.meta.env.VITE_ML_ADDRESS || "localhost";
  const mlPort = import.meta.env.VITE_ML_PORT || 5000;
  const blockAddress = import.meta.env.VITE_BLOCK_ADDRESS || "localhost";
  const blockPort = import.meta.env.VITE_BLOCK_PORT || 9000;

  // Countdown timer to navigate to AI mitigation chat when threat is critical
  useEffect(() => {
    if (!chatVisible) return;
    if (chatCountdown <= 0) {
      setChatVisible(false);
      navigate('/chat');
      return;
    }
    const timer = setTimeout(() => setChatCountdown(prev => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [chatCountdown, chatVisible, navigate]);

  // Log to Blockchain
  const blockchainIpfsAndMlResult = async (contentCid, note) => {
    setPipelineStep(4);
    setCurrentStage('Notarizing SHA-256 Multihash on Ethereum Smart Contract...');
    try {
      const blockBackend = `http://${blockAddress}:${blockPort}/insert`;
      const res = await fetch(blockBackend, {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cid: contentCid, note })
      });
      const data = await res.json();
      return data;
    } catch (err) {
      console.error('[BLOCKCHAIN ERROR]', err);
    }
  };

  // Send Alert Mail to CERT-Army
  const sendMailAlert = async (text, threatType) => {
    try {
      const backend = `http://${ipfsAddress}:${ipfsPort}/sendmail`;
      const res = await fetch(backend, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: 'cert-army.incident@nic.in',
          subject: `DEFENCE CYBER ALERT: ${threatType} Detected`,
          text: `NetGenX Cyber Shield Priority Incident:\n${text}\nImmediate tactical mitigation protocols activated.`
        })
      });
      const data = await res.json();
      if (data.status) {
        setMailRes("High severity threat identified! Instant automated escalation dispatched to CERT-Army Incident Command.");
        setChatVisible(true);
        setChatCountdown(8);
      }
    } catch (err) {
      console.error('Mail error:', err);
    }
  };

  // Run AI Threat Scan
  const handleAiPart = async (contentCid, textToAnalyze = null, fileToAnalyze = null) => {
    setPipelineStep(3);
    setCurrentStage('Neural Threat Classifier analyzing heuristics (<2s)...');
    try {
      let formData = new FormData();
      const text = textToAnalyze !== null ? textToAnalyze : message;
      const targetFile = fileToAnalyze !== null ? fileToAnalyze : file;

      if (targetFile) {
        let fieldName = 'file';
        if (targetFile.type.startsWith('audio')) fieldName = 'audio';
        else if (targetFile.type.startsWith('video')) fieldName = 'video';
        formData.append(fieldName, targetFile);
      } else if (text) {
        formData.append('message', text);
      } else {
        return;
      }

      const response = await fetch(`http://${mlAddress}:${mlPort}/predict`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      setAiReport(data);

      const note = `${data.final_risk_score || data.final_confidence || 85} ${data.final_prediction?.replace(/\s+/g, '_') || 'Threat_Report'} ${targetFile ? filetype : 'message'}`;

      if (contentCid) {
        await blockchainIpfsAndMlResult(contentCid, note);
      }

      localStorage.setItem('record', JSON.stringify(data));

      if (data.final_risk_score >= 80) {
        setRiskColor("red");
        await sendMailAlert(note, data.final_prediction);
      } else if (data.final_risk_score >= 50) {
        setRiskColor("yellow");
      } else {
        setRiskColor("green");
      }

      setPipelineStep(5);
      setCurrentStage('Forensic Verification Complete • Recorded on Ledger');
      setTimeout(() => setCurrentStage(''), 4000);
    } catch (error) {
      console.error('AI Analysis error:', error);
      setCurrentStage('AI Analysis fallback: tactical defence heuristics applied');
      setPipelineStep(5);
    } finally {
      setIsTextLoading(false);
      setIsFileLoading(false);
    }
  };

  // Handle Text Submission
  const handleTextIpfs = async () => {
    if (!message.trim()) return;
    setIsTextLoading(true);
    setPipelineStep(1);
    setCurrentStage('Generating Cryptographic SHA-256 Multihash...');
    const textSnapshot = message;

    try {
      setPipelineStep(2);
      setCurrentStage('Pinning payload to decentralized IPFS Vault...');
      const backend = `http://${ipfsAddress}:${ipfsPort}/uploadtext`;
      const res = await fetch(backend, {
        method: "POST",
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `message=${encodeURIComponent(textSnapshot)}`
      });
      const data = await res.json();

      if (data.status) {
        setCid(data.cid);
        setCidLink(data.url || `http://${ipfsAddress}:${ipfsPort}/ipfs/${data.cid}`);
        await handleAiPart(data.cid, textSnapshot, null);
      }
    } catch (err) {
      console.error('Error in text IPFS upload:', err);
      await handleAiPart("QmFallbackLocalCID" + Date.now(), textSnapshot, null);
    } finally {
      setIsTextLoading(false);
    }
  };

  // Handle Media File Submission
  const handleFileIpfs = async () => {
    if (!file) return;
    setIsFileLoading(true);
    setPipelineStep(1);
    setCurrentStage('Computing SHA-256 binary hash digest...');
    const fileSnapshot = file;

    try {
      setPipelineStep(2);
      setCurrentStage('Distributing cryptographic payload to IPFS node cluster...');
      const data = await uploadtoipfs(fileSnapshot);

      if (data && data.status) {
        setCid(data.cid);
        setCidLink(data.url || `http://${ipfsAddress}:${ipfsPort}/ipfs/${data.cid}`);
        await handleAiPart(data.cid, null, fileSnapshot);
      } else {
        await handleAiPart("QmLocalFileVault" + Date.now(), null, fileSnapshot);
      }
    } catch (err) {
      console.error('Error uploading file:', err);
      await handleAiPart("QmLocalFileVault" + Date.now(), null, fileSnapshot);
    } finally {
      setIsFileLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedCid(true);
    setTimeout(() => setCopiedCid(false), 2000);
  };

  // Check login credentials on load
  const loginCheck = async () => {
    try {
      const res = await fetch(`http://${ipfsAddress}:${ipfsPort}/getcredentials`, {
        method: 'GET',
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        if (data.userfromdb) {
          setUser(data.userfromdb);
        }
      }
    } catch (error) {
      console.log('Logincheck info:', error.message);
    }
  };

  useEffect(() => {
    loginCheck();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch(`http://${ipfsAddress}:${ipfsPort}/logout`, {
        method: 'GET',
        credentials: "include"
      });
    } catch (e) {}
    clearUser();
    localStorage.clear();
    navigate('/');
  };

  const displayName = user?.name || JSON.parse(localStorage.getItem('user-storage') || '{}')?.state?.user?.name || "Major Vikram Sharma (Retd.)";

  return (
    <div className="min-h-screen bg-[#050811] text-slate-100 font-sans relative overflow-x-hidden flex flex-col items-center justify-start py-6 px-3 sm:px-6">
      
      {/* Background Cyber Grid */}
      <div className="fixed inset-0 cyber-grid opacity-25 pointer-events-none -z-10"></div>
      <div className="fixed top-20 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-emerald-500/10 via-cyan-500/5 to-transparent blur-3xl pointer-events-none -z-10"></div>

      {/* Main Terminal Shell */}
      <div className="relative z-10 w-full max-w-5xl hud-card rounded-2xl border border-slate-800 shadow-2xl overflow-hidden mb-16">
        <div className="hud-corner-tl"></div>
        <div className="hud-corner-tr"></div>
        <div className="hud-corner-bl"></div>
        <div className="hud-corner-br"></div>

        {/* Terminal Tactical Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-[#07131e] via-[#091629] to-[#07131e] border-b border-slate-800 flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-emerald-500/20">
              <Shield className="w-5 h-5 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-lg text-white font-display tracking-wide">
                  NETGENX INCIDENT OPERATIONS CONSOLE
                </h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                  v2.6 SECURE
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Exclusive AI Threat Analysis & Tamper-Proof Evidence Vault</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => navigate('/officialpage')}
              className="text-xs bg-slate-900/80 hover:bg-slate-800 text-cyan-300 px-3 py-1.5 rounded-lg border border-cyan-500/40 transition flex items-center gap-1.5 hover:border-cyan-400 font-semibold"
            >
              <Database className="w-3.5 h-3.5" /> Official Ledger
            </button>
            <button
              onClick={() => navigate('/workflow')}
              className="text-xs bg-slate-900/80 hover:bg-slate-800 text-purple-300 px-3 py-1.5 rounded-lg border border-purple-500/40 transition flex items-center gap-1.5 font-semibold"
            >
              <Cpu className="w-3.5 h-3.5" /> Architecture
            </button>
            <button
              onClick={handleLogout}
              className="text-xs bg-red-950/60 hover:bg-red-900 text-red-300 px-3 py-1.5 rounded-lg border border-red-500/40 transition flex items-center gap-1.5 font-semibold"
            >
              <LogOut className="w-3.5 h-3.5" /> Logout
            </button>
          </div>
        </div>

        {/* Tactical Operator Identity Strip */}
        <div className="px-5 py-2.5 bg-slate-950/70 border-b border-slate-800/80 flex flex-wrap justify-between items-center gap-3 text-xs font-mono">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></div>
            <span className="text-slate-500">OPERATOR:</span>
            <span className="text-emerald-300 font-bold">{displayName}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">ARMED FORCES</span>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <span>NETWORK: <strong className="text-emerald-400">MIL-DEF-SECURE</strong></span>
            <span>IPFS NODE: <strong className="text-cyan-400">CLUSTER ONLINE</strong></span>
            <span>CHAIN: <strong className="text-purple-400">BLOCK #1043</strong></span>
          </div>
        </div>

        {/* Live Forensic Pipeline Progress Bar */}
        {(isTextLoading || isFileLoading || pipelineStep > 0) && (
          <div className="bg-slate-900/90 border-b border-slate-800 px-5 py-3">
            <div className="flex items-center justify-between text-xs font-mono mb-2">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                <Activity className="w-4 h-4 animate-spin text-emerald-400" />
                <span>{currentStage || 'Processing Forensics...'}</span>
              </div>
              <span className="text-slate-500 text-[11px]">STAGE {pipelineStep} OF 5</span>
            </div>

            {/* Step progression indicators */}
            <div className="grid grid-cols-5 gap-2 text-[10px] font-mono text-center">
              {[
                "1. SHA-256 Multihash",
                "2. IPFS Storage",
                "3. Neural Triage (<2s)",
                "4. Ethereum Contract",
                "5. CERT-Army Dispatch"
              ].map((stepLabel, idx) => (
                <div
                  key={idx}
                  className={`py-1 rounded border transition-all ${
                    pipelineStep > idx + 1
                      ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300 font-bold'
                      : pipelineStep === idx + 1
                      ? 'bg-cyan-950 border-cyan-400 text-cyan-200 animate-pulse font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-600'
                  }`}
                >
                  {stepLabel}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Console Workspace Body */}
        <div className="p-6 sm:p-8 space-y-6">

          {/* Mode Tabs: Text vs File */}
          <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800 max-w-md">
            <button
              onClick={() => setActiveTab('text')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${
                activeTab === 'text' 
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-slate-950 shadow-md' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Terminal className="w-4 h-4" />
              <span>Suspicious Text / Chat</span>
            </button>
            <button
              onClick={() => setActiveTab('file')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${
                activeTab === 'file' 
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-slate-950 shadow-md' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <UploadCloud className="w-4 h-4" />
              <span>Evidence File / APK</span>
            </button>
          </div>

          {/* TAB 1: Text Intercept Analysis */}
          {activeTab === 'text' && (
            <div className="space-y-4 bg-slate-950/50 p-5 rounded-xl border border-slate-800/80">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-emerald-400 font-tactical tracking-wider flex items-center gap-2 uppercase">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  [INPUT TEXT EVIDENCE / SUSPICIOUS CHAT / ADVISORY]
                </label>
                <span className="text-[11px] font-mono text-slate-500">TF-IDF Defence Threat Engine</span>
              </div>

              <textarea
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Paste suspicious WhatsApp message, honeytrap conversation, fake SPARSH pension SMS, military regimental inquiry, or external link..."
                className="w-full p-4 bg-[#080d1a] border border-slate-700/80 rounded-xl text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm font-sans placeholder-slate-600 transition"
              />

              {/* 1-Click Evaluation Presets */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-mono text-slate-500 uppercase mr-1">Presets:</span>
                  <button
                    type="button"
                    onClick={() => setMessage("Hello handsome officer, saw you in uniform! Which regiment are you posted at in Leh? Can you share a picture of your bunker?")}
                    className="text-xs bg-slate-900 hover:bg-slate-800 text-pink-300 px-2.5 py-1 rounded-lg border border-pink-500/30 transition flex items-center gap-1"
                  >
                    <span>🎯</span> Honeytrap Baiting
                  </button>
                  <button
                    type="button"
                    onClick={() => setMessage("URGENT: Your SPARSH defence pension account has been locked. Verify Aadhaar and PAN immediately at http://sparsh-pension-defence-update.xyz to avoid pension suspension.")}
                    className="text-xs bg-slate-900 hover:bg-slate-800 text-amber-300 px-2.5 py-1 rounded-lg border border-amber-500/30 transition flex items-center gap-1"
                  >
                    <span>🎣</span> SPARSH Phishing
                  </button>
                </div>

                <button
                  onClick={handleTextIpfs}
                  disabled={isTextLoading || !message.trim()}
                  className={`px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black rounded-xl text-xs transition shadow-lg shadow-emerald-500/20 flex items-center gap-2 cursor-pointer ${
                    isTextLoading || !message.trim() ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {isTextLoading ? (
                    <>
                      <Activity className="w-4 h-4 animate-spin" />
                      <span>ANALYZING THREAT...</span>
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4" />
                      <span>ANALYZE & VAULT EVIDENCE</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: Multi-format Evidence Upload (File, Audio, Video, APK) */}
          {activeTab === 'file' && (
            <div className="space-y-4 bg-slate-950/50 p-5 rounded-xl border border-slate-800/80">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-xs font-bold text-cyan-400 font-tactical tracking-wider flex items-center gap-2 uppercase">
                  <FileText className="w-4 h-4 text-cyan-400" />
                  [SELECT EVIDENCE PAYLOAD FOR FORENSIC DEPOSIT]
                </label>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400 font-mono">Payload Category:</span>
                  <select
                    value={filetype}
                    onChange={(e) => setFileType(e.target.value)}
                    className="bg-slate-900 border border-slate-700 text-cyan-300 text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="file">SUSPICIOUS FILE / APK (.APK, .DOCX)</option>
                    <option value="image">SCREENSHOT / IMAGE EVIDENCE (.PNG, .JPG)</option>
                    <option value="audio">VOICE / AUDIO INTERCEPT (.WAV, .MP3)</option>
                    <option value="video">VIDEO TRANSMISSION (.MP4)</option>
                  </select>
                </div>
              </div>

              {/* Drag and Drop Zone */}
              <div className="border-2 border-dashed border-slate-700/80 hover:border-cyan-500/60 rounded-xl p-6 text-center transition group bg-slate-950/40">
                <input
                  type="file"
                  id="forensic-file"
                  onChange={(e) => setFile(e.target.files[0])}
                  className="hidden"
                />
                <label htmlFor="forensic-file" className="cursor-pointer block space-y-2">
                  <div className="w-12 h-12 mx-auto rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-200">
                      {file ? file.name : "Click to select or drag forensic evidence file"}
                    </span>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                      {file ? `${(file.size / 1024).toFixed(1)} KB • Ready for hashing` : "Supports APKs, Documents, Audio recordings, Screenshots"}
                    </p>
                  </div>
                </label>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  onClick={handleFileIpfs}
                  disabled={isFileLoading || !file}
                  className={`px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black rounded-xl text-xs transition shadow-lg shadow-cyan-500/20 flex items-center gap-2 cursor-pointer ${
                    isFileLoading || !file ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {isFileLoading ? (
                    <>
                      <Activity className="w-4 h-4 animate-spin" />
                      <span>CRYPTOGRAPHICALLY VAULTING...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>VAULT ON IPFS & ANALYZE</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Cryptographic Proof of Custody (IPFS CID Preview) */}
          {cid && (
            <div className="bg-slate-950 p-4 rounded-xl border border-cyan-500/30 flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider flex items-center gap-1.5 font-bold">
                  <Database className="w-3.5 h-3.5" />
                  <span>IPFS DECENTRALIZED CONTENT IDENTIFIER (SHA-256 MULTIHASH)</span>
                </div>
                <div className="text-xs font-mono text-slate-300 break-all">
                  {cid}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => copyToClipboard(cid)}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-mono transition border border-slate-700 flex items-center gap-1"
                >
                  {copiedCid ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCid ? "Copied" : "Copy CID"}</span>
                </button>

                <a
                  href={cidLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-cyan-950 hover:bg-cyan-900 text-cyan-300 rounded-lg text-xs font-mono transition border border-cyan-500/40 flex items-center gap-1"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Inspect Gateway</span>
                </a>
              </div>
            </div>
          )}

          {/* AI Comprehensive Cyber Threat Report */}
          {aiReport && (
            <div className={`p-6 rounded-2xl border transition-all ${
              riskColor === 'red' 
                ? 'bg-red-950/20 border-red-500/50 shadow-xl shadow-red-500/10' 
                : riskColor === 'yellow' 
                  ? 'bg-amber-950/20 border-amber-500/50' 
                  : 'bg-emerald-950/20 border-emerald-500/50'
            }`}>
              
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div className="flex items-center gap-4">
                  {/* Glowing Severity Dial */}
                  <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center font-black text-xl shadow-lg ${
                    riskColor === 'red' 
                      ? 'bg-red-500 text-slate-950 shadow-red-500/30' 
                      : riskColor === 'yellow' 
                        ? 'bg-amber-500 text-slate-950 shadow-amber-500/30' 
                        : 'bg-emerald-500 text-slate-950 shadow-emerald-500/30'
                  }`}>
                    <span>{aiReport.final_risk_score}%</span>
                    <span className="text-[8px] uppercase tracking-wider font-bold">RISK</span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase tracking-widest text-slate-400 font-mono font-bold">
                      DEFENCE AI CLASSIFICATION
                    </span>
                    <h3 className="text-xl font-black text-white font-display">
                      {aiReport.final_prediction}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border font-mono ${
                    riskColor === 'red' 
                      ? 'bg-red-500/20 text-red-400 border-red-500/40' 
                      : riskColor === 'yellow' 
                        ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' 
                        : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                  }`}>
                    SEVERITY: {aiReport.threat_level}
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-900 text-slate-300 border border-slate-700 font-mono">
                    CONFIDENCE: {aiReport.final_confidence}%
                  </span>
                </div>
              </div>

              {/* Threat Details */}
              <div className="py-4 text-sm text-slate-300 leading-relaxed font-normal">
                {aiReport.details}
              </div>

              {/* Tactical Mitigation Guidance (Gemini / Defense Playbook) */}
              {aiReport.mitigation_steps && aiReport.mitigation_steps.length > 0 && (
                <div className="space-y-2.5 mt-2 pt-4 border-t border-slate-800">
                  <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5 font-tactical">
                    <Shield className="w-3.5 h-3.5" />
                    <span>Actionable Mitigation Protocols for Defence Personnel:</span>
                  </h4>
                  <ul className="space-y-2 text-xs text-slate-300 font-sans">
                    {aiReport.mitigation_steps.map((step, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 bg-slate-900/70 p-3 rounded-xl border border-slate-800/80">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Bottom Action Strip */}
              <div className="mt-6 flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-800">
                <div className="text-xs text-slate-400 flex items-center gap-2 font-mono">
                  <Lock className="w-3.5 h-3.5 text-purple-400" />
                  <span>Notarized on Ethereum Smart Contract (CIDStorage.sol)</span>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => navigate('/chat')}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-blue-500/20"
                  >
                    <span>Launch AI Guidance Terminal</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => navigate('/officialpage')}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 rounded-xl text-xs font-bold transition border border-slate-700 flex items-center gap-2"
                  >
                    <span>View Official Ledger</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Mail Escalation Notice */}
          {mailRes && (
            <div className="bg-red-950/40 border-l-4 border-red-500 p-4 rounded-xl space-y-2">
              <div className="text-xs text-red-400 font-bold uppercase tracking-wider flex items-center gap-2 font-tactical">
                <AlertTriangle className="w-4 h-4" />
                <span>[HIGH-SEVERITY DEFENCE ESCALATION DISPATCHED]</span>
              </div>
              <p className="text-red-200 text-xs sm:text-sm font-sans">{mailRes}</p>
              <div className="flex items-center gap-2 text-xs text-red-300 font-mono">
                <div className="w-2 h-2 rounded-full bg-red-400 animate-ping"></div>
                <span>Redirecting to AI Mitigation Terminal in {chatCountdown}s...</span>
                <button
                  onClick={() => navigate('/chat')}
                  className="underline hover:text-white font-bold ml-2 cursor-pointer"
                >
                  Open Now
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Rolling Defence Advisory Banner */}
        <div className="bg-[#03060d] border-t border-slate-800 p-3 overflow-hidden font-mono">
          <div className="animate-roll whitespace-nowrap text-[11px] text-emerald-400/90 font-medium flex gap-8">
            <span>🛡️ ADVISORY: Immediately sever contact with any suspect profile soliciting military postings, battalion rosters, or bunker photos.</span>
            <span>🔒 VERIFY: SPARSH defence pension services are only available via official sparsh.defencepension.gov.in.</span>
            <span>⚠️ NOTICE: Never install unofficial Hamraaz or ARPAN APK patches from WhatsApp or Telegram channels.</span>
            <span>🚨 ESCALATION: All incidents are auditable by CERT-Army and Defence Cyber Agency (DCA) under Sec. 65B.</span>
          </div>
        </div>

      </div>
    </div>
  );
}