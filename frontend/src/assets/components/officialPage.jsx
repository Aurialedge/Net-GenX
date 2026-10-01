import { useEffect, useState } from "react";
import { 
  LogOut, Clock, FileText, ArrowLeft, ShieldAlert, CheckCircle, ExternalLink, 
  RefreshCw, Database, Copy, Check, Search, ShieldCheck, Hash, Terminal, Cpu, Lock
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const OfficialPage = () => {
  const blockAddress = import.meta.env.VITE_BLOCK_ADDRESS || "localhost";
  const blockPort = import.meta.env.VITE_BLOCK_PORT || "9000";
  const ipfsAddress = import.meta.env.VITE_IPFS_ADDRESS || "localhost";
  const ipfsPort = import.meta.env.VITE_IPFS_PORT || "8000";

  const [cids, setCids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [textContents, setTextContents] = useState({});
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedMap, setCopiedMap] = useState({});

  const navigate = useNavigate();

  const getcidsfromblock = async () => {
    try {
      setLoading(true);
      const res = await fetch(`http://${blockAddress}:${blockPort}/getcids`);
      if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
      const data = await res.json();

      const sortedCids = (data?.cids || []).sort((a, b) => {
        const riskA = parseFloat(a.note?.split(" ")[0]) || 0;
        const riskB = parseFloat(b.note?.split(" ")[0]) || 0;
        return riskB - riskA;
      });

      setCids(sortedCids);
    } catch (err) {
      console.error("Error fetching CIDs:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchText = async (cid) => {
    try {
      let res = await fetch(`http://${ipfsAddress}:${ipfsPort}/ipfs/${cid}`);
      if (!res.ok) {
        res = await fetch(`https://ipfs.io/ipfs/${cid}`);
      }
      const text = await res.text();
      setTextContents((prev) => ({ ...prev, [cid]: text }));
    } catch (err) {
      console.error("Error fetching text:", err);
    }
  };

  const handleCopy = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedMap((prev) => ({ ...prev, [id]: true }));
    setTimeout(() => {
      setCopiedMap((prev) => ({ ...prev, [id]: false }));
    }, 2000);
  };

  const handleLogout = async () => {
    try {
      await fetch(`http://${blockAddress}:${blockPort}/logout`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      await fetch(`http://${ipfsAddress}:${ipfsPort}/logout`, {
        method: "GET",
        credentials: "include"
      });
    } catch (err) {
      console.error("Logout notice:", err);
    }
    localStorage.clear();
    navigate("/auth");
  };

  useEffect(() => {
    getcidsfromblock();
  }, []);

  const getRiskScore = (note) => {
    return parseFloat(note?.split(" ")[0]) || 0;
  };

  const filteredCids = cids.filter(item => {
    const score = getRiskScore(item.note);
    let matchesFilter = true;
    if (filter === "critical") matchesFilter = score >= 75;
    else if (filter === "medium") matchesFilter = score >= 40 && score < 75;
    else if (filter === "low") matchesFilter = score < 40;

    const matchesSearch = !searchQuery.trim() || 
      item.cid.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (item.note && item.note.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (textContents[item.cid] && textContents[item.cid].toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesFilter && matchesSearch;
  });

  const criticalCount = cids.filter(c => getRiskScore(c.note) >= 75).length;
  const mediumCount = cids.filter(c => getRiskScore(c.note) >= 40 && getRiskScore(c.note) < 75).length;

  return (
    <div className="min-h-screen bg-[#050811] text-slate-100 font-sans pb-20 relative overflow-x-hidden">
      
      {/* Background Cyber Grid */}
      <div className="fixed inset-0 cyber-grid opacity-20 pointer-events-none -z-10"></div>
      <div className="fixed top-0 right-1/4 w-[700px] h-[350px] bg-gradient-to-b from-purple-500/10 via-cyan-500/5 to-transparent blur-3xl pointer-events-none -z-10"></div>

      {/* Top Header */}
      <div className="bg-[#070b16]/90 backdrop-blur-2xl border-b border-slate-800 sticky top-0 z-50 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
          
          <div className="flex items-center gap-3.5">
            <button
              onClick={() => navigate('/upload')}
              className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl transition border border-slate-700/80 hover:border-emerald-500/40"
              title="Return to Shield Portal"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20">
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black text-white font-display tracking-wide">
                  CERT-ARMY & DCA INCIDENT AUDIT VAULT
                </h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-500/40">
                  TOP SECRET // CLASSIFIED
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Decentralized IPFS Multihash Vault & Ethereum Smart Contract Ledger</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={getcidsfromblock}
              disabled={loading}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-cyan-300 rounded-xl transition border border-cyan-500/30 text-xs font-semibold hover:border-cyan-400"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Sync Ledger</span>
            </button>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-4 py-2 bg-red-950/60 hover:bg-red-900 text-red-300 rounded-xl transition border border-red-500/40 text-xs font-semibold"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Command Stats Strip */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="hud-card rounded-xl p-4 border border-slate-800">
            <div className="text-[10px] text-slate-400 font-mono uppercase tracking-wider mb-1">TOTAL AUDITED INCIDENTS</div>
            <div className="text-2xl font-black text-white font-display">{cids.length}</div>
            <div className="text-[10px] text-emerald-400 font-mono mt-1">100% Tamper-Evident Proof</div>
          </div>

          <div className="hud-card rounded-xl p-4 border border-slate-800">
            <div className="text-[10px] text-slate-400 font-mono uppercase tracking-wider mb-1">CRITICAL THREATS (ESCALATED)</div>
            <div className="text-2xl font-black text-red-400 font-display">{criticalCount}</div>
            <div className="text-[10px] text-red-300 font-mono mt-1">CERT-Army Dispatched</div>
          </div>

          <div className="hud-card rounded-xl p-4 border border-slate-800">
            <div className="text-[10px] text-slate-400 font-mono uppercase tracking-wider mb-1">DECENTRALIZED IPFS STORAGE</div>
            <div className="text-2xl font-black text-cyan-400 font-display">SHA-256</div>
            <div className="text-[10px] text-cyan-300 font-mono mt-1">Cryptographic Multihash CIDv0</div>
          </div>

          <div className="hud-card rounded-xl p-4 border border-slate-800">
            <div className="text-[10px] text-slate-400 font-mono uppercase tracking-wider mb-1">SMART CONTRACT STATUS</div>
            <div className="text-2xl font-black text-purple-400 font-display">ACTIVE</div>
            <div className="text-[10px] text-purple-300 font-mono mt-1">CIDStorage.sol (Block Height #1043)</div>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-6 pb-4">
        <div className="hud-card p-4 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
          
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider font-tactical mr-1">Severity Filter:</span>
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition font-mono ${filter === 'all' ? 'bg-cyan-600 text-white shadow-md' : 'bg-slate-900 text-slate-400 hover:text-white'}`}
            >
              All Incidents ({cids.length})
            </button>
            <button
              onClick={() => setFilter("critical")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition font-mono ${filter === 'critical' ? 'bg-red-600 text-white shadow-md' : 'bg-slate-900 text-slate-400 hover:text-white'}`}
            >
              Critical ({criticalCount})
            </button>
            <button
              onClick={() => setFilter("medium")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition font-mono ${filter === 'medium' ? 'bg-amber-600 text-white shadow-md' : 'bg-slate-900 text-slate-400 hover:text-white'}`}
            >
              Medium ({mediumCount})
            </button>
            <button
              onClick={() => setFilter("low")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition font-mono ${filter === 'low' ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-900 text-slate-400 hover:text-white'}`}
            >
              Low / Benign
            </button>
          </div>

          <div className="relative min-w-[240px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search CID, threat, payload..."
              className="w-full bg-[#080d1a] border border-slate-700/80 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
            />
          </div>

        </div>
      </div>

      {/* Main Incident Ledger Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-2">
        {loading ? (
          <div className="flex justify-center items-center py-32">
            <div className="text-center space-y-3">
              <div className="w-14 h-14 border-4 border-slate-800 border-t-cyan-500 rounded-full animate-spin mx-auto"></div>
              <p className="text-slate-300 text-xs font-mono">Synchronizing Blockchain Ledger & IPFS Vault Nodes...</p>
            </div>
          </div>
        ) : filteredCids.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredCids.map((item, index) => {
              const localGatewayUrl = `http://${ipfsAddress}:${ipfsPort}/ipfs/${item.cid}`;
              const publicGatewayUrl = `https://ipfs.io/ipfs/${item.cid}`;
              const allowedTypes = ["file", "message", "audio", "video"];
              const noteWords = (item.note || "").split(" ");
              const score = parseFloat(noteWords[0]) || 0;
              const threatLabel = noteWords.slice(1, -1).join(" ") || noteWords[1] || "Incident Report";
              const lastWord = noteWords[noteWords.length - 1]?.toLowerCase();
              const type = allowedTypes.includes(lastWord) ? lastWord : "message";

              if (type === "message" && !textContents[item.cid]) fetchText(item.cid);

              return (
                <div
                  key={index}
                  className="hud-card rounded-2xl overflow-hidden border border-slate-800/80 hover:border-cyan-500/40 transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Header Strip */}
                    <div className="p-5 border-b border-slate-800 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs font-mono ${
                          score >= 75 
                            ? 'bg-red-500/20 text-red-400 border border-red-500/40' 
                            : score >= 40 
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' 
                              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        }`}>
                          {score}%
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 font-mono font-bold uppercase tracking-wider block">
                            INCIDENT #{index + 1} • {type.toUpperCase()}
                          </span>
                          <h3 className="font-bold text-white text-sm font-display">
                            {threatLabel.replace(/_/g, ' ')}
                          </h3>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${
                          score >= 75 
                            ? 'bg-red-950/80 text-red-400 border-red-500/40' 
                            : 'bg-emerald-950/80 text-emerald-400 border-emerald-500/40'
                        }`}>
                          {score >= 75 ? 'PRIORITY ESCALATED' : 'STANDBY'}
                        </span>
                      </div>
                    </div>

                    {/* Evidence Content Preview */}
                    <div className="p-5 bg-slate-950/70 border-b border-slate-800/80">
                      {type === "file" && (
                        <div className="relative w-full aspect-video bg-slate-900 rounded-xl overflow-hidden flex items-center justify-center border border-slate-800">
                          <img
                            src={localGatewayUrl}
                            alt="IPFS content"
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = publicGatewayUrl;
                            }}
                          />
                        </div>
                      )}

                      {type === "message" && (
                        <div className="bg-[#080d1a] text-slate-200 p-3.5 rounded-xl font-mono text-xs max-h-36 overflow-y-auto border border-slate-800/80 whitespace-pre-wrap break-words leading-relaxed">
                          {textContents[item.cid] || "[Fetching decrypted payload from IPFS node...]"}
                        </div>
                      )}

                      {type === "audio" && (
                        <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                          <audio controls className="w-full">
                            <source src={localGatewayUrl} />
                            <source src={publicGatewayUrl} />
                          </audio>
                        </div>
                      )}

                      {type === "video" && (
                        <div className="relative w-full aspect-video bg-slate-900 rounded-xl overflow-hidden border border-slate-800">
                          <video controls className="w-full h-full object-contain">
                            <source src={localGatewayUrl} />
                            <source src={publicGatewayUrl} />
                          </video>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Cryptographic Proof & Metadata Footer */}
                  <div className="p-5 space-y-3 bg-[#070b16]">
                    
                    {/* CID Link */}
                    <div className="flex items-center justify-between gap-2 text-xs font-mono">
                      <div className="truncate mr-2">
                        <span className="text-[10px] text-slate-500 uppercase block">IPFS Cryptographic CID:</span>
                        <span className="text-cyan-400 break-all text-[11px] font-semibold">{item.cid}</span>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => handleCopy(item.cid, item.cid)}
                          className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded border border-slate-700"
                          title="Copy CID"
                        >
                          {copiedMap[item.cid] ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                        <a
                          href={localGatewayUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 bg-slate-900 hover:bg-slate-800 text-cyan-400 rounded border border-slate-700"
                          title="Open Gateway"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>

                    {/* Transaction Hash & Block Height */}
                    <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-[11px] text-slate-400 font-mono gap-2">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-purple-400" />
                        <span>{new Date(Number(item.timestamp) * 1000).toLocaleString()}</span>
                      </div>

                      {item.blockNumber && (
                        <div className="flex items-center gap-1 text-purple-300 font-bold">
                          <Hash className="w-3 h-3 text-purple-400" />
                          <span>BLOCK #{item.blockNumber}</span>
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-28 hud-card rounded-2xl border border-slate-800">
            <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white font-display mb-1">No Matching Incident Records</h3>
            <p className="text-slate-500 text-xs">No entries match your current search query or severity filter.</p>
          </div>
        )}
      </div>

    </div>
  );
};

export default OfficialPage;