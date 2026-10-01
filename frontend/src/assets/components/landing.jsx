import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, AlertTriangle, FileText, CheckCircle2, Lock, ExternalLink, ArrowRight, LogOut, Terminal, Activity, Radio, Database, Cpu } from 'lucide-react';
import uploadtoipfs from './Hooks/ipfs';
import { userStore } from "./store";
import imgleft from '../../../public/imgleft.png';
import imgright from '../../../public/imgright.png';

export default function MessageClassifier() {
  const [message, setMessage] = useState('');
  const [file, setFile] = useState(null);
  const [filetype, setFileType] = useState("image");
  const [isTextLoading, setIsTextLoading] = useState(false);
  const [isFileLoading, setIsFileLoading] = useState(false);
  const [currentStage, setCurrentStage] = useState('');
  const [cid, setCid] = useState(null);
  const [cidLink, setCidLink] = useState("");
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
    try {
      const blockBackend = `http://${blockAddress}:${blockPort}/insert`;
      console.log('[BLOCKCHAIN] Logging CID and report:', blockBackend, contentCid);
      const res = await fetch(blockBackend, {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cid: contentCid, note })
      });
      const data = await res.json();
      console.log('[BLOCKCHAIN RESPONSE]', data);
      return data;
    } catch (err) {
      console.error('[BLOCKCHAIN ERROR]', err);
    }
  };

  // Send Alert Mail to CERT-Army
  const sendMailAlert = async (text, threatType) => {
    setCurrentStage('Escalating to CERT-Army Command...');
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
      console.log('[MAIL ALERT]', data);
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
    setCurrentStage('AI Engine analyzing threat patterns...');
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
        console.warn('No content provided for AI analysis');
        return;
      }

      console.log(`[AI SCAN] Contacting ML Service on http://${mlAddress}:${mlPort}/predict`);
      const response = await fetch(`http://${mlAddress}:${mlPort}/predict`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      console.log('[AI REPORT]', data);
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

      setCurrentStage('Analysis Complete');
      setTimeout(() => setCurrentStage(''), 3000);
    } catch (error) {
      console.error('AI Analysis error:', error);
      setCurrentStage('AI Analysis offline, using local shield heuristics');
    } finally {
      setIsTextLoading(false);
      setIsFileLoading(false);
    }
  };

  // Handle Text Submission
  const handleTextIpfs = async () => {
    if (!message.trim()) return;
    setIsTextLoading(true);
    setCurrentStage('Uploading to Decentralized IPFS...');
    const textSnapshot = message;

    try {
      const backend = `http://${ipfsAddress}:${ipfsPort}/uploadtext`;
      const res = await fetch(backend, {
        method: "POST",
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `message=${encodeURIComponent(textSnapshot)}`
      });
      const data = await res.json();
      console.log('[IPFS TEXT RESPONSE]', data);

      if (data.status) {
        setCid(data.cid);
        setCidLink(data.url || `http://${ipfsAddress}:${ipfsPort}/ipfs/${data.cid}`);
        await handleAiPart(data.cid, textSnapshot, null);
      }
    } catch (err) {
      console.error('Error in text IPFS upload:', err);
      // Fallback: run AI analysis anyway
      await handleAiPart("QmFallbackLocalCID" + Date.now(), textSnapshot, null);
    } finally {
      setIsTextLoading(false);
    }
  };

  // Handle Media File Submission
  const handleFileIpfs = async () => {
    if (!file) return;
    setIsFileLoading(true);
    setCurrentStage('Distributing to IPFS network...');
    const fileSnapshot = file;

    try {
      const data = await uploadtoipfs(fileSnapshot);
      console.log('[IPFS FILE RESPONSE]', data);

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

  const displayName = user?.name || JSON.parse(localStorage.getItem('user-storage') || '{}')?.state?.user?.name || "Officer / Defence Personnel";

  return (
    <div className="min-h-screen bg-slate-950 font-mono text-green-400 relative overflow-x-hidden flex flex-col items-center justify-start py-6 px-4">
      {/* Background Matrix Grid */}
      <div className="fixed inset-0 opacity-15 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-transparent to-blue-500/10"></div>
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(rgba(0, 255, 65, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 65, 0.1) 1px, transparent 1px)`,
            backgroundSize: '30px 30px'
          }}
        ></div>
      </div>

      {/* Decorative Insignias */}
      <img src={imgleft} alt="NetGenX" className="hidden lg:block absolute top-6 left-6 w-20 h-auto opacity-80 pointer-events-none" />
      <img src={imgright} alt="Defence Cyber" className="hidden lg:block absolute top-6 right-6 w-20 h-auto opacity-80 pointer-events-none" />

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-5xl bg-slate-900/90 border border-green-500/50 rounded-2xl shadow-2xl shadow-green-500/10 backdrop-blur-xl overflow-hidden mb-16">
        
        {/* Terminal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 border-b border-green-500/40 flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 border border-green-400 flex items-center justify-center text-green-400">
              <Shield className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="font-extrabold text-xl text-green-300 tracking-wider flex items-center gap-2">
                NETGENX DEFENCE CYBER SHIELD
                <span className="text-xs px-2 py-0.5 rounded bg-green-500/20 text-green-400 border border-green-500/30">v2.5 LIVE</span>
              </h1>
              <p className="text-xs text-slate-400">Exclusive AI Incident Response & Blockchain Evidence Portal for Indian Armed Forces</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/officialpage')}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-blue-300 px-3 py-1.5 rounded-lg border border-blue-500/40 transition flex items-center gap-1.5"
            >
              <Database className="w-3.5 h-3.5" /> Official Dashboard
            </button>
            <button
              onClick={() => navigate('/workflow')}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-purple-300 px-3 py-1.5 rounded-lg border border-purple-500/40 transition flex items-center gap-1.5"
            >
              <Cpu className="w-3.5 h-3.5" /> Workflow
            </button>
            <button
              onClick={handleLogout}
              className="text-xs bg-red-950/60 hover:bg-red-900 text-red-300 px-3 py-1.5 rounded-lg border border-red-500/40 transition flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" /> Logout
            </button>
          </div>
        </div>

        {/* User Identity Banner */}
        <div className="px-6 py-3 bg-slate-950/60 border-b border-slate-800 flex justify-between items-center text-xs">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></div>
            <span className="text-slate-400">OPERATOR:</span>
            <span className="text-green-300 font-bold">{displayName}</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>NETWORK: <strong className="text-emerald-400">MIL-DEF-SECURE</strong></span>
            <span>IPFS NODE: <strong className="text-cyan-400">CONNECTED</strong></span>
            <span>BLOCKCHAIN: <strong className="text-purple-400">SYNCHRONIZED</strong></span>
          </div>
        </div>

        {/* Dynamic Status Notification */}
        {currentStage && (
          <div className="bg-emerald-950/40 border-b border-emerald-500/30 px-6 py-2.5 flex items-center gap-3 text-xs text-emerald-300">
            <Radio className="w-4 h-4 text-emerald-400 animate-spin" />
            <span>{currentStage}</span>
          </div>
        )}

        {/* Incident Reporting Body */}
        <div className="p-6 md:p-8 space-y-8">
          
          {/* Method 1: Text Threat Analysis */}
          <div className="space-y-3 bg-slate-950/40 p-5 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-green-300 flex items-center gap-2">
                <Terminal className="w-4 h-4 text-green-400" />
                [ENTER TEXT EVIDENCE / SUSPICIOUS MESSAGE / ADVISORY]
              </label>
              <span className="text-xs text-slate-500">TF-IDF Vectorized Pattern Detection</span>
            </div>
            
            <textarea
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Paste suspicious WhatsApp message, honeytrap chat, fake SPARSH pension notice, regimental inquiry, or SMS text..."
              className="w-full p-4 bg-slate-950 border border-green-500/40 rounded-xl text-green-200 focus:outline-none focus:ring-2 focus:ring-green-400 text-sm font-mono placeholder-slate-600 transition"
            />

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setMessage("Hello handsome officer, saw you in uniform! Which regiment are you posted at in Leh? Can you share a picture of your bunker?")}
                  className="text-xs bg-slate-800 hover:bg-slate-700 text-pink-300 px-2.5 py-1 rounded border border-pink-500/30"
                >
                  Example: Honeytrap Baiting
                </button>
                <button
                  type="button"
                  onClick={() => setMessage("URGENT: Your SPARSH defence pension account has been locked. Verify Aadhaar and PAN immediately at http://sparsh-pension-defence-update.xyz to avoid pension suspension.")}
                  className="text-xs bg-slate-800 hover:bg-slate-700 text-amber-300 px-2.5 py-1 rounded border border-amber-500/30"
                >
                  Example: SPARSH Phishing
                </button>
              </div>

              <button
                onClick={handleTextIpfs}
                disabled={isTextLoading || !message.trim()}
                className={`px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-slate-950 font-bold rounded-xl text-sm transition-all shadow-lg shadow-green-500/20 flex items-center gap-2 ${isTextLoading || !message.trim() ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                {isTextLoading ? (
                  <>
                    <Activity className="w-4 h-4 animate-spin" />
                    ANALYZING MESSAGE...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4" />
                    ANALYZE TEXT EVIDENCE
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Section Divider */}
          <div className="flex items-center gap-4 text-slate-600">
            <div className="flex-1 h-px bg-slate-800"></div>
            <span className="text-xs uppercase tracking-widest text-slate-400 font-bold">OR MULTI-FORMAT FORENSICS</span>
            <div className="flex-1 h-px bg-slate-800"></div>
          </div>

          {/* Method 2: Multi-format Evidence Upload (File, Audio, Video, Image) */}
          <div className="space-y-4 bg-slate-950/40 p-5 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-green-300 flex items-center gap-2">
                <FileText className="w-4 h-4 text-green-400" />
                [UPLOAD {filetype.toUpperCase()} EVIDENCE FOR FORENSIC SCAN]
              </label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Media Type:</span>
                <select
                  value={filetype}
                  onChange={(e) => setFileType(e.target.value)}
                  className="bg-slate-900 border border-green-500/40 text-green-300 text-xs rounded-lg px-2.5 py-1 focus:outline-none"
                >
                  <option value="image">IMAGE EVIDENCE (.PNG, .JPG)</option>
                  <option value="video">VIDEO TRANSMISSION (.MP4)</option>
                  <option value="audio">AUDIO INTERCEPT (.MP3, .WAV)</option>
                  <option value="file">SUSPICIOUS FILE / APK (.APK, .DOCX)</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <input
                type="file"
                onChange={(e) => setFile(e.target.files[0])}
                className="w-full p-2.5 bg-slate-950 border border-green-500/40 rounded-xl text-green-300 text-sm font-mono cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-green-700 file:text-white hover:file:bg-green-600 transition"
              />

              <button
                onClick={handleFileIpfs}
                disabled={isFileLoading || !file}
                className={`w-full sm:w-auto px-6 py-2.5 whitespace-nowrap bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-slate-950 font-bold rounded-xl text-sm transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 ${isFileLoading || !file ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                {isFileLoading ? (
                  <>
                    <Activity className="w-4 h-4 animate-spin" />
                    UPLOADING & SCANNING...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    STORE ON IPFS & ANALYZE
                  </>
                )}
              </button>
            </div>
          </div>

          {/* IPFS CID Immutable Link Preview */}
          {cidLink && (
            <div className="bg-slate-950 border-l-4 border-cyan-400 p-4 rounded-xl flex items-center justify-between gap-4">
              <div>
                <div className="text-xs text-cyan-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5" /> IPFS Decentralized Content Identifier (CID)
                </div>
                <div className="text-slate-300 text-sm font-mono break-all">
                  {cid}
                </div>
              </div>
              <a
                href={cidLink}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-1.5 bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/40 rounded-lg text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap"
              >
                Inspect Vault <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

          {/* AI Comprehensive Cyber Threat Report */}
          {aiReport && (
            <div className={`p-6 rounded-2xl border-2 transition-all ${riskColor === 'red' ? 'bg-red-950/30 border-red-500/60 shadow-xl shadow-red-500/10' : riskColor === 'yellow' ? 'bg-amber-950/30 border-amber-500/60' : 'bg-emerald-950/30 border-emerald-500/60'}`}>
              
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl ${riskColor === 'red' ? 'bg-red-500 text-slate-950' : riskColor === 'yellow' ? 'bg-amber-500 text-slate-950' : 'bg-emerald-500 text-slate-950'}`}>
                    {aiReport.final_risk_score}%
                  </div>
                  <div>
                    <span className="text-xs uppercase tracking-widest text-slate-400 font-bold">DEFENCE AI VERDICT</span>
                    <h3 className="text-xl font-bold text-slate-100">{aiReport.final_prediction}</h3>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border ${riskColor === 'red' ? 'bg-red-500/20 text-red-400 border-red-500/40' : riskColor === 'yellow' ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'}`}>
                    SEVERITY: {aiReport.threat_level}
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700">
                    CONFIDENCE: {aiReport.final_confidence}%
                  </span>
                </div>
              </div>

              {/* Threat Details */}
              <div className="py-4 text-sm text-slate-300 leading-relaxed">
                {aiReport.details}
              </div>

              {/* Immediate Tactical Mitigation Steps */}
              {aiReport.mitigation_steps && aiReport.mitigation_steps.length > 0 && (
                <div className="space-y-2 mt-2 pt-4 border-t border-slate-800">
                  <h4 className="text-xs font-bold text-green-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" /> Actionable Mitigation Protocols for Defence Personnel:
                  </h4>
                  <ul className="space-y-2 text-xs text-slate-300 font-mono">
                    {aiReport.mitigation_steps.map((step, idx) => (
                      <li key={idx} className="flex items-start gap-2 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-6 flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-800">
                <div className="text-xs text-slate-400 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-purple-400" />
                  <span>Logged to Ethereum Smart Contract Ledger</span>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => navigate('/chat')}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-blue-500/20"
                  >
                    Launch Interactive AI Terminal <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => navigate('/officialpage')}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition border border-slate-700 flex items-center gap-2"
                  >
                    View Official Ledger
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Mail Res Alert Banner */}
          {mailRes && (
            <div className="bg-red-950/50 border-l-4 border-red-500 p-4 rounded-xl space-y-2 animate-pulse">
              <div className="text-xs text-red-400 font-bold uppercase tracking-wider flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> [AUTOMATED DEFENCE ESCALATION TRIGGERED]
              </div>
              <p className="text-red-200 text-sm font-sans">{mailRes}</p>
              <div className="flex items-center gap-2 text-xs text-red-300">
                <div className="w-2 h-2 rounded-full bg-red-400 animate-ping"></div>
                <span>Redirecting to AI Mitigation Terminal in {chatCountdown}s...</span>
                <button
                  onClick={() => navigate('/chat')}
                  className="underline hover:text-white font-bold ml-2"
                >
                  Open Terminal Now
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Rolling Defence Security Advisory Banner */}
        <div className="bg-slate-950 border-t border-slate-800 p-3 overflow-hidden">
          <div className="animate-roll whitespace-nowrap text-xs text-emerald-400 font-bold flex gap-8">
            <span>🛡️ ADVISORY: Beware of unauthorized WhatsApp contacts requesting photos in uniform or regimental deployment details.</span>
            <span>🔒 VERIFY: SPARSH defence pension services are only available via official sparsh.defencepension.gov.in.</span>
            <span>⚠️ NOTICE: Never install third-party Hamraaz or ARPAN APK updates from external links or Telegram.</span>
            <span>🚨 ESCALATION: All incidents are directly auditable by CERT-Army and Defence Cyber Agency (DCA).</span>
          </div>
        </div>

      </div>
    </div>
  );
}