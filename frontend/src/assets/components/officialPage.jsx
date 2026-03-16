import { useEffect, useState } from "react";
import { LogOut, Clock, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";

const OfficialPage = () => {
  const blockaddress = "localhost";
  const blockport = "9000";

  const [cids, setCids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [textContents, setTextContents] = useState({});

  const navigate = useNavigate();

  const getcidsfromblock = async () => {
    try {
      setLoading(true);
      const res = await fetch(`http://${blockaddress}:${blockport}/getcids`);
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
      const res = await fetch(`https://ipfs.io/ipfs/${cid}`);
      const text = await res.text();
      setTextContents((prev) => ({ ...prev, [cid]: text }));
    } catch (err) {
      console.error("Error fetching text:", err);
    }
  };

  const handleLogout = async () => {
    try {
      const res = await fetch(`http://${blockaddress}:${blockport}/logout`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
      const data = await res.json();
      if (data.msg === "Logged out successfully") navigate("/auth");
      else alert("Something went wrong");
    } catch (err) {
      console.error("Logout error:", err);
      alert("Logout failed");
    }
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

  const LinkIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <div className="bg-slate-900/70 backdrop-blur-xl border-b border-slate-700/50 sticky top-0 z-50 shadow-2xl">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 via-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent tracking-tight">
              Official Dashboard
            </h1>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-slate-800 to-slate-700 hover:from-slate-700 hover:to-slate-600 text-slate-100 rounded-xl transition-all duration-300 border border-slate-600/50 hover:border-slate-500 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
          >
            <LogOut className="w-4 h-4" />
            <span className="font-semibold">Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-10">
        {loading ? (
          <div className="flex justify-center items-center py-40">
            <div className="text-center">
              <div className="relative inline-block">
                <div className="w-20 h-20 border-4 border-slate-700/30 border-t-blue-500 rounded-full animate-spin"></div>
                <div
                  className="absolute inset-0 w-20 h-20 border-4 border-transparent border-t-purple-500 rounded-full animate-spin"
                  style={{ animationDirection: "reverse", animationDuration: "1s" }}
                ></div>
              </div>
              <p className="text-slate-300 text-lg mt-8 font-semibold animate-pulse">Loading content...</p>
            </div>
          </div>
        ) : cids.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {cids.map((item, index) => {
              const gatewayUrl = `https://ipfs.io/ipfs/${item.cid}`;
              const allowedTypes = ["file", "message", "audio", "video"];
              const lastWord = item.note?.split(" ").pop()?.toLowerCase();
              const type = allowedTypes.includes(lastWord) ? lastWord : "unknown";

              if (type === "message" && !textContents[item.cid]) fetchText(item.cid);

              return (
                <div
                  key={index}
                  className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-xl rounded-3xl shadow-2xl hover:shadow-purple-500/10 transition-all duration-500 border border-slate-700/60 hover:border-slate-600/80 group overflow-hidden hover:-translate-y-1"
                >
                  {/* Risk Indicator */}
                  <div
                    className={`h-2 w-full bg-gradient-to-r ${getRiskColor(
                      item.note
                    )} shadow-lg`}
                  />

                  {/* Content Container */}
                  <div className="p-6">
                    <div className="mb-6 rounded-2xl overflow-hidden bg-slate-950/80 border border-slate-800/50 shadow-inner">
                      {type === "file" && (
                        <div className="relative w-full aspect-video bg-slate-900/50">
                          <img
                            src={gatewayUrl}
                            alt={item.note || "IPFS content"}
                            className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"
                          />
                        </div>
                      )}
                      {type === "message" && (
                        <div className="p-6">
                          <pre className="bg-black/80 text-green-400 p-6 overflow-x-auto text-sm font-mono whitespace-pre-wrap break-words max-h-96 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-900 rounded-xl shadow-inner border border-slate-800/50">
                            {textContents[item.cid] || "Loading..."}
                          </pre>
                        </div>
                      )}
                      {type === "audio" && (
                        <div className="p-6">
                          <audio 
                            controls 
                            className="w-full rounded-xl shadow-lg"
                            style={{
                              height: '54px',
                              filter: 'brightness(0.9) contrast(1.1)'
                            }}
                          >
                            <source src={gatewayUrl} />
                            Your browser does not support the audio element.
                          </audio>
                        </div>
                      )}
                      {type === "video" && (
                        <div className="relative w-full aspect-video bg-slate-900/50">
                          <video
                            controls
                            className="w-full h-full object-contain rounded-xl"
                          >
                            <source src={gatewayUrl} />
                            Your browser does not support the video element.
                          </video>
                        </div>
                      )}
                      {type === "unknown" && (
                        <div className="w-full aspect-video flex items-center justify-center bg-gradient-to-br from-slate-800/50 to-slate-900/50 text-slate-400 rounded-xl shadow-inner border border-slate-700/30">
                          <div className="text-center">
                            <FileText className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                            <p className="font-medium">Unsupported content type</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Metadata */}
                    <div className="space-y-4">
                      <div className="flex items-start gap-3 p-4 bg-slate-900/60 backdrop-blur-sm rounded-xl border border-slate-800/50 hover:bg-slate-900/80 hover:border-slate-700/60 transition-all duration-300 shadow-lg">
                        <div className="text-blue-400 mt-0.5 flex-shrink-0">
                          <LinkIcon />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-400 uppercase tracking-widest font-bold mb-2 flex items-center gap-2">
                            Content ID
                          </p>
                          <a
                            href={gatewayUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-400 hover:text-blue-300 font-mono text-xs break-all transition-colors underline decoration-blue-400/40 hover:decoration-blue-300/80 decoration-2 underline-offset-2"
                          >
                            {item.cid}
                          </a>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 p-4 bg-slate-900/60 backdrop-blur-sm rounded-xl border border-slate-800/50 hover:bg-slate-900/80 hover:border-slate-700/60 transition-all duration-300 shadow-lg">
                        <Clock className="w-5 h-5 text-purple-400 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-slate-400 uppercase tracking-widest font-bold mb-1.5">
                            Timestamp
                          </p>
                          <span className="text-slate-200 text-sm font-medium">
                            {new Date(Number(item.timestamp) * 1000).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 p-4 bg-slate-900/60 backdrop-blur-sm rounded-xl border border-slate-800/50 hover:bg-slate-900/80 hover:border-slate-700/60 transition-all duration-300 shadow-lg">
                        <Clock className="w-5 h-5 text-purple-400 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-slate-400 uppercase tracking-widest font-bold mb-1.5">
                          Risk score and type
                          </p>
                          <span className="text-slate-200 text-sm font-medium">
                            {item.note.split(" ")[0]  + " " + item.note.split(" ")[1]}
                          </span>
                        </div>
                      </div>

                      
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-40">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl mb-8 border border-slate-700/50 shadow-xl">
              <FileText className="w-12 h-12 text-slate-500" />
            </div>
            <h3 className="text-2xl font-bold text-slate-300 mb-3">No Content Found</h3>
            <p className="text-slate-400 text-lg">There are no CIDs available to display</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default OfficialPage;