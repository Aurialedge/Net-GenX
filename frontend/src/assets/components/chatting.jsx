import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
export default function ChatInterface() {
  const navigate=useNavigate()
  const [chatVisible, setChatVisible] = useState(true);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  
  // Scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Fetch response from Gemini
  const getResponse = async (promptText = input) => {
    if (!promptText.trim()) return;
  
    const address = import.meta.env.VITE_IPFS_AI_URL || "localhost";
    const port = import.meta.env.VITE_IPFS_AI_PORT || "8000";
  
    setIsLoading(true);
  
    try {
      const res = await fetch(`http://${address}:${port}/gemini`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: promptText }),
      });
  
      const data = await res.json(); // data.data is already an object
      const steps = data.data || {};
      
      // Append each step as a separate Gemini message
      const stepMessages = Object.entries(steps).map(([key, value]) => ({
        text: `${key}. ${value}`,
        sender: "Model",
        riskScore: data.riskScore || null,
      }));
  
      setMessages((prev) => [...prev, ...stepMessages]);
    } catch (err) {
      console.error("Error fetching response:", err);
      setMessages((prev) => [
        ...prev,
        { text: "Error getting response", sender: "gemini" },
      ]);
    } finally {
      setIsLoading(false);
    }
  };
  


  const hasFetchedOnMount = useRef(false);

  useEffect(() => {
    if (hasFetchedOnMount.current) return;
  
    const recordStr = localStorage.getItem("record");
    if (!recordStr) return;
  
    const record = JSON.parse(recordStr);
    const preinput = record.final_prediction;
  
    if (preinput) {
      getResponse(preinput);
      // setInput(preinput);
    }
  
    hasFetchedOnMount.current = true;
  }, []);
  

  const sendMessage = () => {
    if (!input.trim()) return;

    setMessages((prev) => [...prev, { text: input, sender: "user" }]);
    getResponse(input);
    setInput(""); // clear input after sending
  };

  return (
    <div className="min-h-screen bg-gray-900 font-mono text-green-400 relative overflow-hidden">
      {/* Animated background grid */}
      <div className="fixed inset-0 opacity-20 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-transparent to-blue-500/10"></div>
        <div 
          className="absolute inset-0" 
          style={{
            backgroundImage: `
              linear-gradient(rgba(0, 255, 65, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0, 255, 65, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '30px 30px'
          }}
        ></div>
      </div>

      {/* Main container */}
      <div className="relative z-10 flex flex-col items-end p-4 space-y-4 h-screen">
        {/* <button
          className="group relative bg-gray-900/50 hover:bg-gray-800/60 text-green-400 px-6 py-2 rounded border-2 border-green-500 font-bold transition-all duration-300 hover:shadow-lg hover:shadow-green-500/20 overflow-hidden absolute top-4 right-4 z-30"
          onClick={() => setChatVisible(!chatVisible)}
        >
          <span className="absolute inset-0 bg-gradient-to-r from-transparent via-green-400/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></span>
          <span className="relative">
            {chatVisible ? "HIDE TERMINAL" : "SHOW TERMINAL"}
          </span>
        </button> */}

        {chatVisible && (
          <div className="w-full h-full fixed inset-0 border-2 border-green-400 flex flex-col justify-between bg-gray-800 shadow-2xl shadow-green-500/20 z-20">
            {/* Terminal Header */}
            <div className="px-4 py-2 bg-green-800 border-b-2 border-green-400">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-sm text-green-100 tracking-wider">DEFENSE AI TERMINAL</h3>
                <div className="flex items-center text-xs">
                  {/* <div className="w-2 h-2 bg-green-400 rounded-full mr-1 animate-pulse shadow-lg shadow-green-400/50"></div> */}
                  {/* <span className="text-green-400">SECURE</span>   */}
                </div>
                <button
                onClick={()=>{
                    navigate('/upload')
                }}
                >Home</button>
              </div>
            </div>

            {/* Messages */}
            <div className="p-4 overflow-y-auto flex-1 space-y-2 text-green-200 h-full">
              {messages.length === 0 && (
                <div className="text-center text-green-600 py-8 space-y-2">
                  <div className="text-lg">⚡</div>
                  <p className="text-green-400 text-sm font-bold">AWAITING TRANSMISSION</p>
                </div>
              )}
              {messages.map((msg, idx) => {
                // Optional: color coding based on AI risk - DEFENSE STYLING
                let styleClass = msg.sender === "user"
                  ? "bg-blue-900/30 border-l-4 border-blue-400 text-blue-200 ml-auto"
                  : msg.sender === "system" 
                  ? "bg-amber-900/30 border-l-4 border-amber-400 text-amber-200"
                  : "bg-gray-900/50 border-l-4 border-gray-500 text-gray-300";

                if (msg.sender === "gemini" && msg.riskScore !== null) {
                  if (msg.riskScore >= 75) styleClass = "bg-red-900/30 border-l-4 border-red-400 text-red-200";
                  else if (msg.riskScore >= 40) styleClass = "bg-yellow-900/30 border-l-4 border-yellow-400 text-yellow-200";
                  else styleClass = "bg-green-900/30 border-l-4 border-green-400 text-green-200";
                }

                return (
                  <div key={idx} className={`p-3 rounded max-w-[85%] ${styleClass} backdrop-blur-sm font-mono text-sm`}>
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-xs opacity-70 font-bold">
                        [{msg.sender === "user" ? "OPERATOR" : msg.sender.toUpperCase()}]
                      </span>
                      {msg.riskScore && (
                        <span className="text-xs bg-yellow-900/50 text-yellow-300 px-2 py-1 rounded ml-2">
                          RISK: {msg.riskScore}%
                        </span>
                      )}
                    </div>
                    <div className="leading-relaxed">{msg.text}</div>
                  </div>
                );
              })}
              
              {/* Loading indicator when AI is processing */}
              {isLoading && (
                <div className="bg-green-900/30 border-l-4 border-green-400 text-green-200 p-3 rounded max-w-[85%] backdrop-blur-sm font-mono text-sm">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-xs opacity-70 font-bold">[AI-SYSTEM]</span>
                    <span className="text-xs bg-green-900/50 text-green-300 px-2 py-1 rounded ml-2">
                      PROCESSING
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      <div className="w-1 h-1 bg-green-400 rounded-full animate-bounce"></div>
                      <div className="w-1 h-1 bg-green-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                      <div className="w-1 h-1 bg-green-400 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
                    </div>
                    <span className="text-sm opacity-75">ANALYZING TRANSMISSION...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
                          <div className="p-3 border-t-2 border-green-400 bg-gray-700">
              <div className="flex items-center space-x-2">
                <span className="text-green-400 text-sm font-bold">$&gt;</span>
                <input
                  type="text"
                  className="flex-1 p-2 bg-gray-800 border border-green-400 rounded text-green-300 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent text-sm font-mono placeholder-green-500"
                  placeholder="ENTER COMMAND..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                />
                <button
                  className="group relative bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded disabled:opacity-50 transition-all duration-300 border border-green-400 font-bold text-sm overflow-hidden"
                  onClick={sendMessage}
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500"></span>
                  <span className="relative">SEND</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}