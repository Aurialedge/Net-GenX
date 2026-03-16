import { useState } from 'react';
import axios from 'axios'
import { useNavigate } from 'react-router-dom'


import { OtpStore } from './otp.store.js'

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
    
    // Reset form data when switching auth types
    const resetForm = () => {
        setFormData({
            email: '',
            password: '',
            confirmPassword: '',
            officialId: '',
            department: '',
            securityCode: '',
            fullName: '',
            phone: ''
        });
        setMessage('');
        setEmailError('');
        setNameError('');
    };
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [isUserRegistered, setIsUserRegistered] = useState(false);
    const [isOfficialRegistered, setIsOfficialRegistered] = useState(false);
    const navigate = useNavigate();
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
        
        // Real-time validation
        if (name === 'email') {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (value && !emailRegex.test(value)) {
                setEmailError('Please enter a valid email (e.g., user@domain.com)');
            } else {
                setEmailError('');
            }
        }
        
        if (name === 'fullName') {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (value && emailRegex.test(value)) {
                setNameError('This looks like an email! Please enter your name here.');
            } else {
                setNameError('');
            }
        }
    };

    const handleUserRegister = async () => {
        setIsLoading(true);
        setMessage('');
        
        // Clear previous form data
        console.log('Form data before validation:', formData);
        
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
        
        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            setMessage('Please enter a valid email address');
            setIsLoading(false);
            return;
        }
        
        const address = "http://localhost";
        const port = "8000";
        
        try {
            const payload = {
                name: formData.fullName.trim(),
                email: formData.email.trim(),
                password: formData.password
            };
            
            console.log('Sending payload:', payload);
            
            const res = await fetch(`${address}:${port}/register`, {
                method: 'POST',
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            
            if (res.status === 200) {
                setMessage(`REGISTRATION SUCCESSFUL - ${data.message}`);
                setTimeout(() => {
                    setAuthType('user');
                    setIsLoading(false);
                }, 2000);
            } else {
                setMessage(data.message || "Registration failed");
                setIsLoading(false);
            }
        } catch (err) {
            console.error(err);
            setMessage("Registration failed - Server error");
            setIsLoading(false);
        }
    };

    const handleOfficialRegister = async () => {
        setIsLoading(true);
        setMessage('');
        
        if (formData.password !== formData.confirmPassword) {
            setMessage('Passwords do not match');
            setIsLoading(false);
            return;
        }
        
        // Since there's no official registration endpoint in the backend,
        // we'll show a message that official registration requires manual approval
        setMessage('OFFICIAL REGISTRATION REQUIRES MANUAL APPROVAL - Please contact your department administrator');
        setIsLoading(false);
        
        setTimeout(() => {
            setAuthType('official');
        }, 3000);
    };
    const handleUserLogin = async () => {
        setIsLoading(true);
        setMessage('');
        const address = "http://localhost"
        const port = "8000"
        try {
            // console.log(formData, 
            //     `${address}:${port}/loginuser`
            // )
            const res = await fetch(`${address}:${port}/loginuser`, {
                method: 'POST',
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(formData)
            });
            const data = await res.json()
            console.log(data, res.status)
            if (res.status === 200) {
                localStorage.setItem("logintoken", data.token);
                // console.log(res);

                setTimeout(() => {
                    setIsLoading(false);
                    setMessage(`ACCESS GRANTED - ${data.msg}`);
                }, 2000);

                setTimeout(() => {
                    navigate('/upload');
                }, 3000);
            } else {
                // This else may not run often, since axios usually throws on non-200s
                setTimeout(() => {
                    setIsLoading(false);
                    console.log(data.msg)
                    setMessage(data.msg || "ACCESS DENIED - Something went wrong");
                }, 2000);
            }
        } catch (err) {
            console.error(err);

            setTimeout(() => {
                setMessage(
                    err.response?.msg || "ACCESS DENIED - Something went wrong"
                );
                setIsLoading(false);
            }, 2000);
        }


    }; { }
    const [loginsuccess, setloginsuccess] = useState(false)
    const { number, setnumber } = OtpStore()

    const handleOfficialLogin = async () => {
        setIsLoading(true);
        setMessage('');
        const address = "http://localhost"
        const port = "8000"
        try {
            console.log(formData)
            const res = await fetch(`${address}:${port}/loginofficial`, {
                method: 'POST',
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(formData)
            });
            const data = await res.json()
            console.log(data, res.status)
            if (res.status === 200) {
                localStorage.setItem("logintoken", data.token);
                console.log(data);
                console.log(data.official.phone, data.official.phone.split('-')[1])
                setnumber(data.official.phone)

                setTimeout(() => {
                    setIsLoading(false);
                    setMessage(`ACCESS GRANTED - CLICK HERE SEND THE SECURITY CODE ON YOUR MOBILE NUMBER`);
                }, 2000);
                setloginsuccess(true)

            } else {
                // This else may not run often, since axios usually throws on non-200s
                setTimeout(() => {
                    setIsLoading(false);
                    setMessage(data.msg);
                }, 2000);
            }
        } catch (err) {
            console.error(err);

            setTimeout(() => {
                setMessage(
                    err.response?.msg || "ACCESS DENIED - Something went wrong"
                );
                setIsLoading(false);
            }, 2000);
        }
    };

    const [sending, setSending] = useState("Send Code to Mobile Number")
    const [otpsent, setOtpsent] = useState(false)
    const handleofficialsendotp = async () => {

        setMessage("Sending OTP...")
        const address = "localhost"
        const port = 8000
        const num = number
        if (!num) {
            setMessage("Number not set please login again");
            return;
        }
        setSending("Sending OTP...")
        const res = await fetch(`http://${address}:${port}/sendotp`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ number: num })
        })
        const data = await res.json()
        console.log(data)
        if (!data) {
            setMessage("Failed to send OTP");
            setSending("Send Code to Mobile Number")
            return;
        }
        setMessage("Verify the code");
        setSending("Verify the OTP on your GOV NO.")
        setOtpsent(true)
    }
    const handleverifyotp = async () => {
        const address = "localhost"
        const port = 8000
        const num = number
        console.log('in the verifying one')
        if (!num) {
            setMessage("Number not set please login again");
            return;
        }
        setSending('Verifying OTP...')
        const res = await fetch(`http://${address}:${port}/verifyotp`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ number: num, code: formData.securityCode })
        })
        const data = await res.json()
        if (!data) {
            setMessage("Failed to send OTP");
            setSending("Verify the OTP on your GOV NO.")
            return;
        }
        console.log(data)
        setSending("Verify the OTP on your GOV NO.")
        navigate('/officialpage')
    }
    // Selection Screen
    if (authType === 'select') {
        return (
            <div className="min-h-screen bg-gray-900 font-mono text-green-400 relative overflow-hidden flex items-center justify-center min-w-screen">
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

                {/* Selection Container */}
                <div className="relative z-10 bg-gray-800 border-2 border-green-400 rounded w-11/12 max-w-2xl shadow-2xl shadow-green-500/20">
                    {/* Header */}
                    <div className="px-6 py-4 bg-green-800 border-b-2 border-green-400">
                        <div className="flex justify-between items-center">
                            <h2 className="font-bold text-lg text-green-100 tracking-wider">DEFENSE CYBER PORTAL - ACCESS SELECTION</h2>
                            <div className="flex items-center text-xs">
                                <div className="w-2 h-2 bg-green-400 rounded-full mr-1 animate-pulse shadow-lg shadow-green-400/50"></div>
                                <span className="text-green-400">SECURE</span>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-8 space-y-6">
                        <div className="text-center mb-8">
                            <div className="text-6xl mb-4">🔐</div>
                            <p className="text-green-300 text-sm">SELECT YOUR ACCESS LEVEL</p>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            {/* User Access */}
                            <div className="space-y-4">
                                <button
                                    onClick={() => setAuthType('user')}
                                    className="group relative w-full bg-gray-900 border-2 border-green-400 rounded p-6 hover:bg-gray-800 transition-all duration-300 overflow-hidden"
                                >
                                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-green-400/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></span>
                                    <div className="relative space-y-3">
                                        <div className="text-3xl">👤</div>
                                        <h3 className="text-lg font-bold text-green-300">CIVILIAN LOGIN</h3>
                                        <p className="text-xs text-green-500">Existing user authentication</p>
                                        <div className="text-xs text-green-400 font-bold">[ENTER] →</div>
                                    </div>
                                </button>
                                <button
                                    onClick={() => setAuthType('user-register')}
                                    className="group relative w-full bg-gray-900 border-2 border-green-400 rounded p-6 hover:bg-gray-800 transition-all duration-300 overflow-hidden"
                                >
                                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-green-400/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></span>
                                    <div className="relative space-y-3">
                                        <div className="text-3xl">📝</div>
                                        <h3 className="text-lg font-bold text-green-300">CIVILIAN REGISTER</h3>
                                        <p className="text-xs text-green-500">Create new account</p>
                                        <div className="text-xs text-green-400 font-bold">[ENTER] →</div>
                                    </div>
                                </button>
                            </div>

                            {/* Official Access */}
                            <div className="space-y-4">
                                <button
                                    onClick={() => setAuthType('official')}
                                    className="group relative w-full bg-gray-900 border-2 border-amber-400 rounded p-6 hover:bg-gray-800 transition-all duration-300 overflow-hidden"
                                >
                                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-400/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></span>
                                    <div className="relative space-y-3">
                                        <div className="text-3xl">⭐</div>
                                        <h3 className="text-lg font-bold text-amber-300">OFFICIAL LOGIN</h3>
                                        <p className="text-xs text-amber-500">Government personnel login</p>
                                        <div className="text-xs text-amber-400 font-bold">[ENTER] →</div>
                                    </div>
                                </button>
                                <button
                                    onClick={() => setAuthType('official-register')}
                                    className="group relative w-full bg-gray-900 border-2 border-amber-400 rounded p-6 hover:bg-gray-800 transition-all duration-300 overflow-hidden"
                                >
                                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-400/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></span>
                                    <div className="relative space-y-3">
                                        <div className="text-3xl">🏛️</div>
                                        <h3 className="text-lg font-bold text-amber-300">OFFICIAL REGISTER</h3>
                                        <p className="text-xs text-amber-500">Request official access</p>
                                        <div className="text-xs text-amber-400 font-bold">[ENTER] →</div>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // User Registration Screen
    if (authType === 'user-register') {
        return (
            <div className="min-h-screen bg-gray-900 font-mono text-green-400 relative overflow-hidden flex items-center justify-center min-w-screen">
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

                {/* User Registration Container */}
                <div className="relative z-10 bg-gray-800 border-2 border-green-400 rounded w-11/12 max-w-md shadow-2xl shadow-green-500/20">
                    {/* Header */}
                    <div className="px-4 py-3 bg-green-800 border-b-2 border-green-400">
                        <div className="flex justify-between items-center">
                            <h2 className="font-bold text-sm text-green-100 tracking-wider">CIVILIAN USER REGISTRATION</h2>
                            <div className="flex items-center text-xs">
                                <div className="w-2 h-2 bg-green-400 rounded-full mr-1 animate-pulse shadow-lg shadow-green-400/50"></div>
                                <span className="text-green-400">SECURE</span>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-4">
                        <button
                            onClick={() => setAuthType('select')}
                            className="text-xs text-green-500 hover:text-green-300 flex items-center space-x-1"
                        >
                            <span>←</span>
                            <span>BACK TO SELECTION</span>
                        </button>

                        <div className="text-center py-4">
                            <div className="text-5xl mb-3">📝</div>
                            <p className="text-green-300 text-xs">CREATE YOUR ACCOUNT</p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs text-green-400 font-bold tracking-wider mb-2">
                                    [YOUR NAME] ⚠️ NOT YOUR EMAIL
                                </label>
                                <input
                                    type="text"
                                    name="fullName"
                                    value={formData.fullName}
                                    onChange={handleInputChange}
                                    placeholder="Enter your REAL name (e.g., John Smith)"
                                    className={`w-full p-3 bg-gray-900 border rounded text-green-300 focus:outline-none focus:ring-2 text-sm font-mono placeholder-green-600 ${
                                        nameError ? 'border-red-400 focus:ring-red-400' : 'border-green-400 focus:ring-green-400'
                                    }`}
                                />
                                {nameError && (
                                    <div className="text-xs text-red-400 mt-1">{nameError}</div>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs text-green-400 font-bold tracking-wider mb-2">
                                    [EMAIL ADDRESS] ✉️ MUST CONTAIN @
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    placeholder="Enter your EMAIL (e.g., user@domain.com)"
                                    className={`w-full p-3 bg-gray-900 border rounded text-green-300 focus:outline-none focus:ring-2 text-sm font-mono placeholder-green-600 ${
                                        emailError ? 'border-red-400 focus:ring-red-400' : 'border-green-400 focus:ring-green-400'
                                    }`}
                                />
                                {emailError && (
                                    <div className="text-xs text-red-400 mt-1">{emailError}</div>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs text-green-400 font-bold tracking-wider mb-2">
                                    [PHONE NUMBER]
                                </label>
                                <input
                                    type="tel"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleInputChange}
                                    placeholder="+1234567890"
                                    className="w-full p-3 bg-gray-900 border border-green-400 rounded text-green-300 focus:outline-none focus:ring-2 focus:ring-green-400 text-sm font-mono placeholder-green-600"
                                />
                            </div>

                            <div>
                                <label className="block text-xs text-green-400 font-bold tracking-wider mb-2">
                                    [PASSWORD]
                                </label>
                                <input
                                    type="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleInputChange}
                                    placeholder="••••••••"
                                    className="w-full p-3 bg-gray-900 border border-green-400 rounded text-green-300 focus:outline-none focus:ring-2 focus:ring-green-400 text-sm font-mono placeholder-green-600"
                                />
                            </div>

                            <div>
                                <label className="block text-xs text-green-400 font-bold tracking-wider mb-2">
                                    [CONFIRM PASSWORD]
                                </label>
                                <input
                                    type="password"
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleInputChange}
                                    placeholder="••••••••"
                                    className="w-full p-3 bg-gray-900 border border-green-400 rounded text-green-300 focus:outline-none focus:ring-2 focus:ring-green-400 text-sm font-mono placeholder-green-600"
                                />
                            </div>

                            <button
                                onClick={handleUserRegister}
                                disabled={isLoading || !formData.fullName || !formData.email || !formData.phone || !formData.password || !formData.confirmPassword}
                                className={`
                  group relative w-full p-3 bg-green-700 hover:bg-green-600 text-white rounded font-bold text-sm transition-all duration-300 border border-green-400 overflow-hidden
                  ${isLoading || !formData.fullName || !formData.email || !formData.phone || !formData.password || !formData.confirmPassword ? 'opacity-50 cursor-not-allowed' : ''}
                `}
                            >
                                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500"></span>
                                <span className="relative flex items-center justify-center">
                                    {isLoading ? (
                                        <>
                                            <div className="flex space-x-1 mr-2">
                                                <div className="w-1 h-1 bg-white rounded-full animate-bounce"></div>
                                                <div className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                                <div className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                                            </div>
                                            REGISTERING...
                                        </>
                                    ) : (
                                        'REGISTER'
                                    )}
                                </span>
                            </button>

                            {message && (
                                <div className="bg-green-900/30 border-l-4 border-green-400 p-3 rounded backdrop-blur-sm">
                                    <div className="text-xs text-green-400 font-bold mb-1">[SYSTEM MESSAGE]</div>
                                    <p className="text-green-200 text-sm">{message}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // User Login Screen
    if (authType === 'user') {
        return (
            <div className="min-h-screen bg-gray-900 font-mono text-green-400 relative overflow-hidden flex items-center justify-center min-w-screen" >
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

                {/* User Login Container */}
                <div className="relative z-10 bg-gray-800 border-2 border-green-400 rounded w-11/12 max-w-md shadow-2xl shadow-green-500/20">
                    {/* Header */}
                    <div className="px-4 py-3 bg-green-800 border-b-2 border-green-400">
                        <div className="flex justify-between items-center">
                            <h2 className="font-bold text-sm text-green-100 tracking-wider">CIVILIAN USER AUTHENTICATION</h2>
                            <div className="flex items-center text-xs">
                                <div className="w-2 h-2 bg-green-400 rounded-full mr-1 animate-pulse shadow-lg shadow-green-400/50"></div>
                                <span className="text-green-400">SECURE</span>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-4">
                        <button
                            onClick={() => setAuthType('select')}
                            className="text-xs text-green-500 hover:text-green-300 flex items-center space-x-1"
                        >
                            <span>←</span>
                            <span>BACK TO SELECTION</span>
                        </button>

                        <div className="text-center py-4">
                            <div className="text-5xl mb-3">👤</div>
                            <p className="text-green-300 text-xs">ENTER YOUR CREDENTIALS</p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs text-green-400 font-bold tracking-wider mb-2">
                                    [EMAIL ADDRESS]
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    placeholder="user@example.com"
                                    className="w-full p-3 bg-gray-900 border border-green-400 rounded text-green-300 focus:outline-none focus:ring-2 focus:ring-green-400 text-sm font-mono placeholder-green-600"
                                />
                            </div>

                            <div>
                                <label className="block text-xs text-green-400 font-bold tracking-wider mb-2">
                                    [PASSWORD]
                                </label>
                                <input
                                    type="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleInputChange}
                                    placeholder="••••••••"
                                    className="w-full p-3 bg-gray-900 border border-green-400 rounded text-green-300 focus:outline-none focus:ring-2 focus:ring-green-400 text-sm font-mono placeholder-green-600"
                                />
                            </div>

                            <button
                                onClick={handleUserLogin}
                                disabled={isLoading || !formData.email || !formData.password}
                                className={`
                  group relative w-full p-3 bg-green-700 hover:bg-green-600 text-white rounded font-bold text-sm transition-all duration-300 border border-green-400 overflow-hidden
                  ${isLoading || !formData.email || !formData.password ? 'opacity-50 cursor-not-allowed' : ''}
                `}
                            >
                                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500"></span>
                                <span className="relative flex items-center justify-center">
                                    {isLoading ? (
                                        <>
                                            <div className="flex space-x-1 mr-2">
                                                <div className="w-1 h-1 bg-white rounded-full animate-bounce"></div>
                                                <div className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                                <div className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                                            </div>
                                            AUTHENTICATING...
                                        </>
                                    ) : (
                                        'LOGIN'
                                    )}
                                </span>
                            </button>

                            {message && (
                                <div className="bg-green-900/30 border-l-4 border-green-400 p-3 rounded backdrop-blur-sm">
                                    <div className="text-xs text-green-400 font-bold mb-1">[SYSTEM MESSAGE]</div>
                                    <p className="text-green-200 text-sm">{message}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Official Registration Screen
    if (authType === 'official-register') {
        return (
            <div className="min-h-screen bg-gray-900 font-mono text-amber-400 relative overflow-hidden flex items-center justify-center min-w-screen">
                {/* Animated background grid - amber theme */}
                <div className="fixed inset-0 opacity-20 pointer-events-none">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-red-500/10"></div>
                    <div
                        className="absolute inset-0"
                        style={{
                            backgroundImage: `
                linear-gradient(rgba(251, 191, 36, 0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(251, 191, 36, 0.1) 1px, transparent 1px)
              `,
                            backgroundSize: '30px 30px'
                        }}
                    ></div>
                </div>

                {/* Official Registration Container */}
                <div className="relative z-10 bg-gray-800 border-2 border-amber-400 rounded w-11/12 max-w-md shadow-2xl shadow-amber-500/20">
                    {/* Header */}
                    <div className="px-4 py-3 bg-amber-900 border-b-2 border-amber-400">
                        <div className="flex justify-between items-center">
                            <h2 className="font-bold text-sm text-amber-100 tracking-wider">OFFICIAL ACCESS REQUEST</h2>
                            <div className="flex items-center text-xs">
                                <div className="w-2 h-2 bg-amber-400 rounded-full mr-1 animate-pulse shadow-lg shadow-amber-400/50"></div>
                                <span className="text-amber-400">TOP SECRET</span>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-4">
                        <button
                            onClick={() => setAuthType('select')}
                            className="text-xs text-amber-500 hover:text-amber-300 flex items-center space-x-1"
                        >
                            <span>←</span>
                            <span>BACK TO SELECTION</span>
                        </button>

                        <div className="text-center py-4">
                            <div className="text-5xl mb-3">🏛️</div>
                            <p className="text-amber-300 text-xs">REQUEST OFFICIAL CLEARANCE</p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs text-amber-400 font-bold tracking-wider mb-2">
                                    [FULL NAME]
                                </label>
                                <input
                                    type="text"
                                    name="fullName"
                                    value={formData.fullName}
                                    onChange={handleInputChange}
                                    placeholder="John Smith"
                                    className="w-full p-3 bg-gray-900 border border-amber-400 rounded text-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm font-mono placeholder-amber-700"
                                />
                            </div>

                            <div>
                                <label className="block text-xs text-amber-400 font-bold tracking-wider mb-2">
                                    [OFFICIAL ID]
                                </label>
                                <input
                                    type="text"
                                    name="officialId"
                                    value={formData.officialId}
                                    onChange={handleInputChange}
                                    placeholder="GOV-XXXX-XXXX"
                                    className="w-full p-3 bg-gray-900 border border-amber-400 rounded text-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm font-mono placeholder-amber-700"
                                />
                            </div>

                            <div>
                                <label className="block text-xs text-amber-400 font-bold tracking-wider mb-2">
                                    [DEPARTMENT]
                                </label>
                                <select
                                    name="department"
                                    value={formData.department}
                                    onChange={handleInputChange}
                                    className="w-full p-3.5 bg-gray-900 border border-amber-400 rounded text-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm font-mono"
                                >
                                    <option value="">SELECT DEPARTMENT</option>
                                    <option value="defense">DEFENSE</option>
                                    <option value="homeland">HOMELAND SECURITY</option>
                                    <option value="cyber">CYBER OPERATIONS</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs text-amber-400 font-bold tracking-wider mb-2">
                                    [PHONE NUMBER]
                                </label>
                                <input
                                    type="tel"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleInputChange}
                                    placeholder="+1234567890"
                                    className="w-full p-3 bg-gray-900 border border-amber-400 rounded text-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm font-mono placeholder-amber-700"
                                />
                            </div>

                            <div>
                                <label className="block text-xs text-amber-400 font-bold tracking-wider mb-2">
                                    [PASSWORD]
                                </label>
                                <input
                                    type="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleInputChange}
                                    placeholder="••••••••"
                                    className="w-full p-3 bg-gray-900 border border-amber-400 rounded text-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm font-mono placeholder-amber-700"
                                />
                            </div>

                            <div>
                                <label className="block text-xs text-amber-400 font-bold tracking-wider mb-2">
                                    [CONFIRM PASSWORD]
                                </label>
                                <input
                                    type="password"
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleInputChange}
                                    placeholder="••••••••"
                                    className="w-full p-3 bg-gray-900 border border-amber-400 rounded text-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm font-mono placeholder-amber-700"
                                />
                            </div>

                            <button
                                onClick={handleOfficialRegister}
                                disabled={isLoading || !formData.fullName || !formData.officialId || !formData.department || !formData.phone || !formData.password || !formData.confirmPassword}
                                className={`
                  group relative w-full p-3 bg-amber-700 hover:bg-amber-600 text-white rounded font-bold text-sm transition-all duration-300 border border-amber-400 overflow-hidden
                  ${isLoading || !formData.fullName || !formData.officialId || !formData.department || !formData.phone || !formData.password || !formData.confirmPassword ? 'opacity-50 cursor-not-allowed' : ''}
                `}
                            >
                                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500"></span>
                                <span className="relative flex items-center justify-center">
                                    {isLoading ? (
                                        <>
                                            <div className="flex space-x-1 mr-2">
                                                <div className="w-1 h-1 bg-white rounded-full animate-bounce"></div>
                                                <div className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                                <div className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                                            </div>
                                            SUBMITTING REQUEST...
                                        </>
                                    ) : (
                                        'SUBMIT REQUEST'
                                    )}
                                </span>
                            </button>

                            {message && (
                                <div className="bg-amber-900/30 border-l-4 border-amber-400 p-3 rounded backdrop-blur-sm">
                                    <div className="text-xs text-amber-400 font-bold mb-1">[SYSTEM MESSAGE]</div>
                                    <p className="text-amber-200 text-sm">{message}</p>
                                </div>
                            )}

                            <div className="bg-red-900/30 border-l-4 border-red-400 p-3 rounded backdrop-blur-sm">
                                <div className="text-xs text-red-400 font-bold mb-1">[SECURITY NOTICE]</div>
                                <p className="text-red-200 text-xs">All registration requests are subject to verification. False information will result in denial of access.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Official Login Screen
    if (authType === 'official') {
        return (
            <div className="min-h-screen bg-gray-900 font-mono text-amber-400 relative overflow-hidden flex items-center justify-center min-w-screen">
                {/* Animated background grid - amber theme */}
                <div className="fixed inset-0 opacity-20 pointer-events-none">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-red-500/10"></div>
                    <div
                        className="absolute inset-0"
                        style={{
                            backgroundImage: `
                linear-gradient(rgba(251, 191, 36, 0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(251, 191, 36, 0.1) 1px, transparent 1px)
              `,
                            backgroundSize: '30px 30px'
                        }}
                    ></div>
                </div>

                {/* Official Login Container */}
                <div className="relative z-10 bg-gray-800 border-2 border-amber-400 rounded w-11/12 max-w-md shadow-2xl shadow-amber-500/20">
                    {/* Header */}
                    <div className="px-4 py-3 bg-amber-900 border-b-2 border-amber-400">
                        <div className="flex justify-between items-center">
                            <h2 className="font-bold text-sm text-amber-100 tracking-wider">GOVERNMENT OFFICIAL CLEARANCE</h2>
                            <div className="flex items-center text-xs">
                                <div className="w-2 h-2 bg-amber-400 rounded-full mr-1 animate-pulse shadow-lg shadow-amber-400/50"></div>
                                <span className="text-amber-400">TOP SECRET</span>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-4">
                        <button
                            onClick={() => setAuthType('select')}
                            className="text-xs text-amber-500 hover:text-amber-300 flex items-center space-x-1"
                        >
                            <span>←</span>
                            <span>BACK TO SELECTION</span>
                        </button>

                        <div className="text-center py-4">
                            <div className="text-5xl mb-3">⭐</div>
                            <p className="text-amber-300 text-xs">AUTHORIZED PERSONNEL ONLY</p>
                        </div>

                        <div className="space-y-4">
                            <div className='flex flex-col space-y-2 gap-2'>
                                {!loginsuccess ? (
                                    <>
                                        <div>
                                            <label className="block text-xs text-amber-400 font-bold tracking-wider mb-2">
                                                [OFFICIAL ID]
                                            </label>
                                            <input
                                                type="text"
                                                name="officialId"
                                                value={formData.officialId}
                                                onChange={handleInputChange}
                                                placeholder="GOV-XXXX-XXXX"
                                                className="w-full p-3 bg-gray-900 border border-amber-400 rounded text-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm font-mono placeholder-amber-700"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs text-amber-400 font-bold tracking-wider mb-2">
                                                [DEPARTMENT]
                                            </label>
                                            <select
                                                name="department"
                                                value={formData.department}
                                                onChange={handleInputChange}
                                                className="w-full p-3.5 bg-gray-900 border border-amber-400 rounded text-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm font-mono"
                                            >
                                                <option value="">SELECT DEPARTMENT</option>
                                                <option value="defense">DEFENSE</option>
                                                <option value="homeland">HOMELAND SECURITY</option>
                                                <option value="cyber">CYBER OPERATIONS</option>
                                            </select>
                                        </div>
                                    </>
                                ) : (
                                    <></>
                                )}
                            </div>

                            <div className='flex flex-col space-y-2 gap-2'>
                                {loginsuccess ? (
                                    <div>
                                        <label className="block text-xs text-amber-400 font-bold tracking-wider mb-2">
                                            [SECURITY CODE]
                                        </label>
                                        <input
                                            type="password"
                                            name="securityCode"
                                            value={formData.securityCode}
                                            onChange={handleInputChange}
                                            placeholder="••••••••"
                                            className="w-full p-3 bg-gray-900 border border-amber-400 rounded text-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm font-mono placeholder-amber-700"
                                        />

                                        <button className="w-full p-3 bg-gray-900 border border-amber-400 rounded text-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm font-mono placeholder-amber-700"
                                            onClick={
                                                otpsent ? handleverifyotp : handleofficialsendotp
                                            }>
                                            {/* {sending ? "Sending OTP..." : "Send Code to Mobile Number"} */}
                                            {sending}
                                        </button>
                                    </div>

                                ) : (
                                    <></>
                                )}
                                {!loginsuccess
                                    ? (
                                        <div>
                                            <label className="block text-xs text-amber-400 font-bold tracking-wider mb-2">
                                                [PASSWORD]
                                            </label>
                                            <input
                                                type="password"
                                                name="password"
                                                value={formData.password}
                                                onChange={handleInputChange}
                                                placeholder="••••••••"
                                                className="w-full p-3 bg-gray-900 border border-amber-400 rounded text-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm font-mono placeholder-amber-700"
                                            />
                                        </div>
                                    ) : (
                                        <></>
                                    )
                                }
                            </div>

                            {
                                !loginsuccess ? (
                                    <button
                                        onClick={handleOfficialLogin}
                                        disabled={isLoading || !formData.officialId || !formData.department || !formData.password}
                                        className={`
                  group relative w-full p-3 bg-amber-700 hover:bg-amber-600 text-white rounded font-bold text-sm transition-all duration-300 border border-amber-400 overflow-hidden
                  ${isLoading || !formData.officialId || !formData.department || !formData.securityCode || !formData.password ? 'opacity-50 cursor-not-allowed' : ''}
                `}
                                    >
                                        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500"></span>
                                        <span className="relative flex items-center justify-center">
                                            {isLoading ? (
                                                <>
                                                    <div className="flex space-x-1 mr-2">
                                                        <div className="w-1 h-1 bg-white rounded-full animate-bounce"></div>
                                                        <div className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                                        <div className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                                                    </div>
                                                    VERIFYING CLEARANCE...
                                                </>
                                            ) : (
                                                'AUTHENTICATE'
                                            )}
                                        </span>
                                    </button>
                                ) : (
                                    <></>
                                )
                            }

                            {message && (
                                <div className="bg-amber-900/30 border-l-4 border-amber-400 p-3 rounded backdrop-blur-sm">
                                    <div className="text-xs text-amber-400 font-bold mb-1">[SYSTEM MESSAGE]</div>
                                    <p className="text-amber-200 text-sm">{message}</p>
                                </div>
                            )}

                            <div className="bg-red-900/30 border-l-4 border-red-400 p-3 rounded backdrop-blur-sm">
                                <div className="text-xs text-red-400 font-bold mb-1">[SECURITY NOTICE]</div>
                                <p className="text-red-200 text-xs">Unauthorized access attempts will be logged and prosecuted.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}