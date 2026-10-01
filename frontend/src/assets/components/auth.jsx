import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, Lock, ArrowLeft, Key, Smartphone, CheckCircle2, AlertTriangle, 
  Terminal, User, Building, Zap, ArrowRight, Activity, ShieldAlert
} from 'lucide-react';
import { OtpStore } from './otp.store.js';
import { userStore } from './store.js';

export default function AuthPages() {
  const [authType, setAuthType] = useState('select'); // 'select', 'user', 'official', 'user-register', 'official-register'
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    officialId: '',
    department: '',
    securityCode: '',
    fullName: '',
    phone: ''
  });

  const [emailError, setEmailError] = useState('');
  const [nameError, setNameError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [loginsuccess, setloginsuccess] = useState(false);
  const [sending, setSending] = useState("Send Code to Mobile Number");
  const [otpsent, setOtpsent] = useState(false);

  const { number, setnumber } = OtpStore();
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (name === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (value && !emailRegex.test(value)) {
        setEmailError('Invalid email format (e.g., officer@army.mil)');
      } else {
        setEmailError('');
      }
    }
  };

  const handleUserRegister = async () => {
    setIsLoading(true);
    setMessage('');

    if (!formData.fullName.trim() || !formData.email.trim() || !formData.password.trim()) {
      setMessage('All fields are required');
      setIsLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setMessage('Passwords do not match');
      setIsLoading(false);
      return;
    }

    try {
      const payload = {
        name: formData.fullName.trim(),
        email: formData.email.trim(),
        password: formData.password
      };

      const res = await fetch("http://localhost:8000/register", {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.status === 200) {
        setMessage(`REGISTRATION SUCCESSFUL: ${data.message}`);
        setTimeout(() => {
          setAuthType('user');
          setIsLoading(false);
        }, 1500);
      } else {
        setMessage(data.message || data.msg || "Registration failed");
        setIsLoading(false);
      }
    } catch (err) {
      console.error(err);
      setMessage("Registration failed - Server error");
      setIsLoading(false);
    }
  };

  const handleUserLogin = async () => {
    setIsLoading(true);
    setMessage('');
    try {
      const res = await fetch("http://localhost:8000/loginuser", {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData)
      });
      const data = await res.json();

      if (res.status === 200) {
        localStorage.setItem("logintoken", data.token);
        if (data.name) {
          userStore.getState().setUser({
            _id: data.id || "usr_session",
            name: data.name,
            email: data.email || formData.email
          });
        }
        setMessage(`ACCESS GRANTED: ${data.msg}`);
        setTimeout(() => {
          setIsLoading(false);
          navigate('/upload');
        }, 1200);
      } else {
        setMessage(data.msg || "Access Denied: Incorrect credentials");
        setIsLoading(false);
      }
    } catch (err) {
      console.error(err);
      setMessage("Login failed - Gateway offline");
      setIsLoading(false);
    }
  };

  const handleOfficialLogin = async () => {
    setIsLoading(true);
    setMessage('');
    try {
      const res = await fetch("http://localhost:8000/loginofficial", {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData)
      });
      const data = await res.json();

      if (res.status === 200) {
        localStorage.setItem("logintoken", data.token);
        const officialPhone = data.official?.phone || data.official?.phoneNumber || "+91-9876543210";
        setnumber(officialPhone);
        setMessage("Official Identity Verified. Proceed to Two-Factor Clearance.");
        setIsLoading(false);
        setloginsuccess(true);
      } else {
        setMessage(data.msg || "Incorrect Official Credentials");
        setIsLoading(false);
      }
    } catch (err) {
      console.error(err);
      setMessage("Official login failed - Server connection error");
      setIsLoading(false);
    }
  };

  const handleofficialsendotp = async () => {
    setMessage("Dispatching verification OTP...");
    const num = number;
    if (!num) {
      setMessage("Number not set, please re-authenticate");
      return;
    }
    setSending("Dispatching...");
    try {
      const res = await fetch("http://localhost:8000/sendotp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number: num })
      });
      const data = await res.json();

      if (data && data.status) {
        setMessage(data.testOtp ? `OTP DISPATCHED [Code: ${data.testOtp}]` : "Verification code sent to registered defence number");
        if (data.testOtp) {
          setFormData(prev => ({ ...prev, securityCode: data.testOtp }));
        }
        setOtpsent(true);
        setSending("Verify Code");
      } else {
        setMessage("Failed to send OTP code");
        setSending("Send Code to Mobile Number");
      }
    } catch (e) {
      setMessage("Error sending OTP code");
      setSending("Retry Send Code");
    }
  };

  const handleverifyotp = async () => {
    const num = number;
    if (!num) {
      setMessage("Number not set, please login again");
      return;
    }
    setSending('Verifying Security Code...');
    try {
      const res = await fetch("http://localhost:8000/verifyotp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number: num, code: formData.securityCode })
      });
      const data = await res.json();

      if (data && data.status) {
        navigate('/officialpage');
      } else {
        setMessage(data.msg || "Invalid or expired verification code");
        setSending("Verify Code");
      }
    } catch (e) {
      setMessage("Verification request failed");
      setSending("Verify Code");
    }
  };

  return (
    <div className="min-h-screen bg-[#050811] text-slate-100 font-sans relative overflow-x-hidden flex items-center justify-center p-4">
      
      {/* Background Cyber Grid */}
      <div className="fixed inset-0 cyber-grid opacity-20 pointer-events-none -z-10"></div>
      <div className="fixed top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-b from-emerald-500/10 via-cyan-500/5 to-transparent blur-3xl pointer-events-none -z-10"></div>

      {/* Main Terminal Box */}
      <div className="relative z-10 w-full max-w-xl hud-card rounded-2xl border border-slate-800 shadow-2xl overflow-hidden my-8">
        <div className="hud-corner-tl"></div>
        <div className="hud-corner-tr"></div>
        <div className="hud-corner-bl"></div>
        <div className="hud-corner-br"></div>

        {/* Tactical Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-[#07131e] via-[#091629] to-[#07131e] border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-slate-950 font-black shadow-md shadow-emerald-500/20">
              <Shield className="w-5 h-5 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white font-display tracking-wider uppercase">
                DEFENCE SECURITY CLEARANCE TERMINAL
              </h2>
              <p className="text-[10px] text-slate-400 font-mono">SOVEREIGN MILITARY ACCESS CONTROL</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 font-mono text-[10px] text-emerald-400">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></div>
            <span>SECURE 256-BIT</span>
          </div>
        </div>

        {/* SCREEN 1: PORTAL SELECTION */}
        {authType === 'select' && (
          <div className="p-6 sm:p-8 space-y-6">
            <div className="text-center space-y-2">
              <div className="inline-flex p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-1">
                <Lock className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-black text-white font-display">Select Operational Access Level</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Authenticate as serving personnel/veteran or access CERT-Army incident command.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 pt-2">
              
              {/* Personnel Login Button */}
              <button
                onClick={() => setAuthType('user')}
                className="hud-card p-5 rounded-xl border border-emerald-500/30 hover:border-emerald-400 text-left transition group space-y-3 cursor-pointer"
              >
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm font-display">Personnel & Veterans</h4>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    Report suspicious messages, file forensic evidence, or review threat triage.
                  </p>
                </div>
                <div className="text-[10px] font-mono text-emerald-400 font-bold flex items-center gap-1">
                  <span>ENTER PORTAL</span>
                  <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-1" />
                </div>
              </button>

              {/* Official Command Login Button */}
              <button
                onClick={() => setAuthType('official')}
                className="hud-card p-5 rounded-xl border border-cyan-500/30 hover:border-cyan-400 text-left transition group space-y-3 cursor-pointer"
              >
                <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition">
                  <Building className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm font-display">CERT-Army / DCA</h4>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    Incident command, decentralized blockchain ledger & evidence custody.
                  </p>
                </div>
                <div className="text-[10px] font-mono text-cyan-400 font-bold flex items-center gap-1">
                  <span>OFFICIAL CLEARANCE</span>
                  <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-1" />
                </div>
              </button>

            </div>

            <div className="pt-2 text-center">
              <button
                onClick={() => navigate('/')}
                className="text-xs text-slate-400 hover:text-slate-200 transition font-mono flex items-center gap-1 mx-auto"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to Public Defence Shield</span>
              </button>
            </div>
          </div>
        )}

        {/* SCREEN 2: PERSONNEL LOGIN */}
        {authType === 'user' && (
          <div className="p-6 sm:p-8 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <button
                onClick={() => setAuthType('select')}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-mono transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
              <span className="text-[10px] font-mono text-emerald-400 font-bold">ARMED FORCES CREDENTIALS</span>
            </div>

            {/* Quick-Fill Fast Evaluation Preset */}
            <div className="p-3 bg-emerald-950/40 rounded-xl border border-emerald-500/30 space-y-1.5">
              <div className="text-[10px] font-mono text-emerald-400 font-bold flex items-center gap-1">
                <Zap className="w-3 h-3" /> 1-CLICK TEST CREDENTIALS:
              </div>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, email: "officer@army.mil", password: "Password123" }))}
                className="w-full text-left p-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 text-xs font-mono text-slate-200 flex items-center justify-between transition"
              >
                <span>Major Vikram Sharma (Retd.)</span>
                <span className="text-emerald-400 font-bold">[Auto-Fill]</span>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 font-mono mb-1.5">
                  MILITARY EMAIL ADDRESS:
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="officer@army.mil"
                  className="w-full p-3 bg-[#080d1a] border border-slate-700/80 rounded-xl text-slate-100 focus:outline-none focus:border-emerald-500 font-mono text-xs placeholder-slate-600 transition"
                />
                {emailError && <div className="text-[11px] text-red-400 mt-1 font-mono">{emailError}</div>}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 font-mono mb-1.5">
                  ACCESS PASSWORD:
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="••••••••••••"
                  className="w-full p-3 bg-[#080d1a] border border-slate-700/80 rounded-xl text-slate-100 focus:outline-none focus:border-emerald-500 font-mono text-xs placeholder-slate-600 transition"
                />
              </div>

              <button
                onClick={handleUserLogin}
                disabled={isLoading || !formData.email || !formData.password}
                className={`w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black rounded-xl text-xs font-mono transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer ${
                  isLoading || !formData.email || !formData.password ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isLoading ? (
                  <>
                    <Activity className="w-4 h-4 animate-spin" />
                    <span>AUTHENTICATING IDENTITY...</span>
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4" />
                    <span>LOGIN TO INCIDENT CONSOLE</span>
                  </>
                )}
              </button>

              {message && (
                <div className="p-3 bg-slate-900 border-l-4 border-emerald-400 rounded text-xs font-mono text-emerald-300">
                  {message}
                </div>
              )}

              <div className="text-center pt-2 text-xs text-slate-400">
                <span>Need a personal incident reporting account? </span>
                <button
                  onClick={() => setAuthType('user-register')}
                  className="text-emerald-400 hover:underline font-bold"
                >
                  Register Here
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SCREEN 3: PERSONNEL REGISTRATION */}
        {authType === 'user-register' && (
          <div className="p-6 sm:p-8 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <button
                onClick={() => setAuthType('user')}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-mono transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Login
              </button>
              <span className="text-[10px] font-mono text-emerald-400 font-bold">NEW OPERATOR ENROLLMENT</span>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 font-mono mb-1">
                  FULL NAME / RANK:
                </label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  placeholder="Capt. Ramesh Kumar / Veteran"
                  className="w-full p-2.5 bg-[#080d1a] border border-slate-700/80 rounded-xl text-slate-100 focus:outline-none focus:border-emerald-500 font-mono text-xs transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 font-mono mb-1">
                  DEFENCE EMAIL ADDRESS:
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="officer@army.mil"
                  className="w-full p-2.5 bg-[#080d1a] border border-slate-700/80 rounded-xl text-slate-100 focus:outline-none focus:border-emerald-500 font-mono text-xs transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 font-mono mb-1">
                    PASSWORD:
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="••••••••"
                    className="w-full p-2.5 bg-[#080d1a] border border-slate-700/80 rounded-xl text-slate-100 focus:outline-none focus:border-emerald-500 font-mono text-xs transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 font-mono mb-1">
                    CONFIRM PASSWORD:
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    placeholder="••••••••"
                    className="w-full p-2.5 bg-[#080d1a] border border-slate-700/80 rounded-xl text-slate-100 focus:outline-none focus:border-emerald-500 font-mono text-xs transition"
                  />
                </div>
              </div>

              <button
                onClick={handleUserRegister}
                disabled={isLoading || !formData.fullName || !formData.email || !formData.password}
                className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black rounded-xl text-xs font-mono transition shadow-lg shadow-emerald-500/20 cursor-pointer"
              >
                {isLoading ? "ENROLLING OPERATOR..." : "ENROLL IN DEFENCE SHIELD REGISTRY"}
              </button>

              {message && (
                <div className="p-3 bg-slate-900 border-l-4 border-emerald-400 rounded text-xs font-mono text-emerald-300">
                  {message}
                </div>
              )}
            </div>
          </div>
        )}

        {/* SCREEN 4: OFFICIAL CERT-ARMY LOGIN & 2FA */}
        {authType === 'official' && (
          <div className="p-6 sm:p-8 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <button
                onClick={() => { setAuthType('select'); setloginsuccess(false); }}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-mono transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
              <span className="text-[10px] font-mono text-cyan-400 font-bold">CERT-ARMY INCIDENT COMMAND</span>
            </div>

            {!loginsuccess ? (
              <>
                {/* 1-Click Fast Official Credential Preset */}
                <div className="p-3 bg-cyan-950/40 rounded-xl border border-cyan-500/30 space-y-1.5">
                  <div className="text-[10px] font-mono text-cyan-400 font-bold flex items-center gap-1">
                    <Zap className="w-3 h-3" /> OFFICIAL DEFENCE CREDENTIAL PRESET:
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, officialId: "ARMY-CERT-01", password: "DefShield@2025" }))}
                    className="w-full text-left p-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 text-xs font-mono text-slate-200 flex items-center justify-between transition"
                  >
                    <span>ID: ARMY-CERT-01 (Indian Army Cyber Group)</span>
                    <span className="text-cyan-400 font-bold">[Auto-Fill]</span>
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 font-mono mb-1.5">
                      OFFICIAL SERVICE IDENTIFIER (CERT-ARMY):
                    </label>
                    <input
                      type="text"
                      name="officialId"
                      value={formData.officialId}
                      onChange={handleInputChange}
                      placeholder="ARMY-CERT-01"
                      className="w-full p-3 bg-[#080d1a] border border-slate-700/80 rounded-xl text-slate-100 focus:outline-none focus:border-cyan-500 font-mono text-xs placeholder-slate-600 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 font-mono mb-1.5">
                      COMMAND AUTHORIZATION SECRET:
                    </label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="••••••••••••"
                      className="w-full p-3 bg-[#080d1a] border border-slate-700/80 rounded-xl text-slate-100 focus:outline-none focus:border-cyan-500 font-mono text-xs placeholder-slate-600 transition"
                    />
                  </div>

                  <button
                    onClick={handleOfficialLogin}
                    disabled={isLoading || !formData.officialId || !formData.password}
                    className={`w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black rounded-xl text-xs font-mono transition shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 cursor-pointer ${
                      isLoading || !formData.officialId || !formData.password ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {isLoading ? "VERIFYING OFFICIAL REGISTRY..." : "PROCEED TO 2FA CLEARANCE"}
                  </button>

                  {message && (
                    <div className="p-3 bg-slate-900 border-l-4 border-cyan-400 rounded text-xs font-mono text-cyan-300">
                      {message}
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* TWO-FACTOR AUTHENTICATION STEP */
              <div className="space-y-4">
                <div className="text-center p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                  <div className="w-10 h-10 mx-auto rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-2">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-bold text-white font-display">TWO-FACTOR MOBILE AUTHENTICATION</h4>
                  <p className="text-[11px] text-slate-400 font-mono">
                    Registered Defence Phone: <strong className="text-cyan-300">{number}</strong>
                  </p>
                </div>

                {!otpsent ? (
                  <button
                    onClick={handleofficialsendotp}
                    className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-black rounded-xl text-xs font-mono transition shadow-lg shadow-cyan-500/20 cursor-pointer"
                  >
                    {sending}
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 font-mono mb-1.5">
                        ENTER 6-DIGIT VERIFICATION CODE:
                      </label>
                      <input
                        type="text"
                        name="securityCode"
                        value={formData.securityCode}
                        onChange={handleInputChange}
                        placeholder="123456"
                        className="w-full p-3 bg-[#080d1a] border border-cyan-500/60 rounded-xl text-cyan-300 focus:outline-none focus:ring-1 focus:ring-cyan-400 font-mono text-center tracking-widest text-lg font-bold"
                      />
                    </div>

                    <button
                      onClick={handleverifyotp}
                      className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black rounded-xl text-xs font-mono transition shadow-lg shadow-emerald-500/20 cursor-pointer"
                    >
                      VERIFY CODE & ACCESS COMMAND LEDGER
                    </button>
                  </div>
                )}

                {message && (
                  <div className="p-3 bg-slate-900 border-l-4 border-cyan-400 rounded text-xs font-mono text-cyan-300">
                    {message}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}