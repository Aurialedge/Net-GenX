import { useEffect, useState } from "react";
import { LogOut, Clock, FileText, ArrowLeft, ShieldAlert, CheckCircle, ExternalLink, RefreshCw, Database } from "lucide-react";
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
      // First attempt local IPFS storage gateway
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

  const getRiskColor = (note) => {
    const risk = parseFloat(note?.split(" ")[0]) || 0;
    if (risk >= 75) return "from-red-500 to-red-700";
    if (risk >= 50) return "from-orange-400 to-orange-600";
    if (risk >= 25) return "from-yellow-300 to-yellow-500";
    return "from-green-400 to-green-600";
  };

  const getRiskScore = (note) => {
    return parseFloat(note?.split(" ")[0]) || 0;
  };

  const filteredCids = cids.filter(item => {
    const score = getRiskScore(item.note);
    if (filter === "critical") return score >= 75;
    if (filter === "medium") return score >= 40 && score < 75;
    if (filter === "low") return score < 40;
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-16">
      {/* Top Header */}
      <div className="bg-slate-900/80 backdrop-blur-xl border-b border-slate-800 sticky top-0 z-50 shadow-2xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/upload')}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition border border-slate-700"
              title="Return to Shield Portal"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20">
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 via-purple-300 to-pink-400 bg-clip-text text-transparent tracking-tight">
                CERT-Army & DCA Official Command Dashboard
              </h1>
              <p className="text-xs text-slate-400">Decentralized IPFS & Blockchain Tamper-Proof Incident Ledger</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={getcidsfromblock}
              disabled={loading}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition border border-slate-700 text-xs font-semibold"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Sync Ledger
            </button>

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-950/60 hover:bg-red-900 text-red-300 rounded-xl transition border border-red-500/40 text-xs font-semibold"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Stats Bar */}
      <div className="max-w-7xl mx-auto px-6 pt-8 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider mr-2">Severity Filter:</span>
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
            >
              All Records ({cids.length})
            </button>
            <button
              onClick={() => setFilter("critical")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${filter === 'critical' ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
            >
              Critical Risk (&gt;75%)
            </button>
            <button
              onClick={() => setFilter("medium")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${filter === 'medium' ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
            >
              Medium Risk
            </button>
            <button
              onClick={() => setFilter("low")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${filter === 'low' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
            >
              Benign / Low
            </button>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
            <span>SMART CONTRACT: <strong className="text-purple-400">CIDStorage.sol</strong></span>
            <span>STATUS: <strong className="text-emerald-400">AUDITED & IMMUTABLE</strong></span>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="max-w-7xl mx-auto px-6 py-4">
        {loading ? (
          <div className="flex justify-center items-center py-32">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-slate-700 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-slate-300 text-sm font-semibold">Synchronizing Blockchain Ledger & IPFS Vault...</p>
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
                  className="bg-slate-900/80 backdrop-blur-xl rounded-2xl shadow-xl hover:shadow-purple-500/10 transition-all duration-300 border border-slate-800 hover:border-slate-700 overflow-hidden flex flex-col justify-between"
                >
                  <div>
                    {/* Risk Indicator Ribbon */}
                    <div className={`h-2 w-full bg-gradient-to-r ${getRiskColor(item.note)}`} />

                    {/* Threat Category & Header */}
                    <div className="p-6 border-b border-slate-800/80 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${score >= 75 ? 'bg-red-500/20 text-red-400 border border-red-500/30' : score >= 40 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>
                          {score}%
                        </div>
                        <div>
                          <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">THREAT CATEGORY</span>
                          <h3 className="font-bold text-slate-100 text-sm">{threatLabel.replace(/_/g, ' ')}</h3>
                        </div>
                      </div>

                      <span className="text-xs px-2.5 py-1 rounded bg-slate-800 text-slate-300 font-mono border border-slate-700">
                        FORMAT: {type.toUpperCase()}
                      </span>
                    </div>

                    {/* Evidence Content Preview */}
                    <div className="p-6 bg-slate-950/60">
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
                        <div className="bg-slate-950 text-green-400 p-4 rounded-xl font-mono text-xs max-h-48 overflow-y-auto border border-slate-800/80 whitespace-pre-wrap break-words">
                          {textContents[item.cid] || "[Reading text payload from decentralized IPFS vault...]"}
                        </div>
                      )}

                      {type === "audio" && (
                        <div className="p-4 bg-slate-900 rounded-xl border border-slate-800">
                          <audio controls className="w-full">
                            <source src={localGatewayUrl} />
                            <source src={publicGatewayUrl} />
                            Your browser does not support audio playback.
                          </audio>
                        </div>
                      )}

                      {type === "video" && (
                        <div className="relative w-full aspect-video bg-slate-900 rounded-xl overflow-hidden border border-slate-800">
                          <video controls className="w-full h-full object-contain">
                            <source src={localGatewayUrl} />
                            <source src={publicGatewayUrl} />
                            Your browser does not support video playback.
                          </video>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Metadata & Audit Trail */}
                  <div className="p-6 space-y-3 bg-slate-900/90 border-t border-slate-800/80">
                    <div className="flex items-start justify-between gap-3 text-xs">
                      <div>
                        <span className="text-slate-400 font-bold uppercase tracking-wider block mb-1 flex items-center gap-1.5">
                          <Database className="w-3.5 h-3.5 text-cyan-400" /> IPFS Content Identifier (CID):
                        </span>
                        <a
                          href={localGatewayUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-cyan-400 hover:text-cyan-300 font-mono break-all underline"
                        >
                          {item.cid}
                        </a>
                      </div>
                      <a
                        href={publicGatewayUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-slate-400 hover:text-white p-1 rounded bg-slate-800"
                        title="View on Public IPFS Gateway"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800 font-mono">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-purple-400" />
                        <span>{new Date(Number(item.timestamp) * 1000).toLocaleString()}</span>
                      </div>
                      {item.blockNumber && (
                        <span className="text-purple-300 font-bold">
                          BLOCK #{item.blockNumber}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-28 bg-slate-900/40 rounded-3xl border border-slate-800">
            <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-300 mb-1">No Incidents Found</h3>
            <p className="text-slate-500 text-sm">No complaints matching current filter recorded on the blockchain ledger.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default OfficialPage;