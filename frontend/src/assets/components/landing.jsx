import { useState } from 'react';
import './main.css'
import uploadtoipfs from './Hooks/ipfs'
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { userStore } from "./store"
import imgleft from '../../../public/imgleft.png'
import imgright from '../../../public/imgright.png'

import Rolling from './rolling'
export default function MessageClassifier() {
  const [message, setMessage] = useState('');
  const [file, setFile] = useState(null);
  const [isTextLoading, setIsTextLoading] = useState(false);
  const [isFileLoading, setIsFileLoading] = useState(false);
  const [containerTransform, setContainerTransform] = useState('perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)');
  const [currentStage, setCurrentStage] = useState('Analyzing')
  const { user, setUser, clearUser } = userStore()
  const navigate = useNavigate()
  // useEffect(()=>{
  //   uploadtoipfs(file)
  // },[file])

  const mladress = import.meta.VITE_ML_ADDRESS || "127.0.0.1"
  const mlport = import.meta.VITE_ML_PORT || 5000

  const [filetype, setfiletype] = useState("image")
  const handleFileTypeChange = (e) => {
    setfiletype(e.target.value)
  }


  // dont use this 
  const handleTextSubmit = async () => {
    if (!message.trim()) return;

    setIsTextLoading(true);

    // Simulate API call
    try {
      const response = await fetch(`http://${mladress}:${mlport}/predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: message
      });
      const data = response.json()
      console.log(data)
      // Handle response here
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsTextLoading(false);
    }
  };
  // block chain 
  const blockchainipfsandmlresult = async (cid, note) => {
    const blockaddress = import.meta.VITE_ADDRESS || 'localhost'
    const blockport = import.meta.VITE_PORT || 9000
    const blockbackend = `http://${blockaddress}:${blockport}/insert`
    console.log(blockbackend, cid)
    const response = await fetch(blockbackend, {
      method: "POST",
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ cid, note })
    })
    const data = await response.json()
    console.log(data)
  }


  const handletextipfs = async () => {
    setCurrentStage('Uploading to IPFS...')
    const address = import.meta.VITE_ADDRESS || 'localhost'
    const port = import.meta.VITE_PORT || 8000
    const backend = `http://${address}:${port}/uploadtext`
    const respone = await fetch(backend, {
      method: "POST",
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `message=${encodeURIComponent(message)}`
    })
    const data = await respone.json()
    console.log(data)
    if (data.status) {
      setMessage('')
      setIsTextLoading(false)
      setcid(data.cid)
      setcidlnk(data.url)
      handleAiPart(data.cid)
      setCurrentStage('')
    }
  }
  const [mailres, setMailRes] = useState("")
  // Top-level state
  const [chatVisible, setChatVisible] = useState(false);
  const [chatCountdown, setChatCountdown] = useState(10);

  // Top-level useEffect for countdown
  useEffect(() => {
    if (!chatVisible) return;

    if (chatCountdown <= 0) {
      setChatVisible(false);
      navigate('/chat');
      return;
    }

    const timer = setTimeout(() => setChatCountdown(chatCountdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [chatCountdown, chatVisible, navigate]);

  // sendmail function
  const sendmail = async (text) => {
    setCurrentStage('Sending mail...')
    const address = import.meta.env.VITE_IPFS_ADDRESS || 'localhost';
    const port = import.meta.env.VITE_IPFS_PORT || 8000;
    const backend = `http://${address}:${port}/sendmail`;
    console.log('in the mail', backend, text);

    try {
      const response = await fetch(backend, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });
      const data = await response.json();
      console.log(data);

      if (data.status) {
        setChatVisible(true);          // trigger countdown
        setChatCountdown(10);          // reset timer
        // localStorage.setItem('report', text);
        setMailRes(
          "We detected a threat and sent the mail to the government.\nPlease follow the rules mentioned."
        );
        setCurrentStage('')
      }
    } catch (error) {
      console.error('Mail sending error:', error);
    }
  };

  // ml part 

  const [riskcolor, setRiskColor] = useState("")
  const handleAiPart = async (cid) => {
    setCurrentStage('Analyzing...')
    if (!file && !message && !audio) return;
    console.log('in ml par', cid)
    setIsFileLoading(true);
    console.log('file: ', file)
    let name = ''
    if (file) {
      name = 'file'
      if (file.type.startsWith('audio')) {
        name = 'audio'
      }
      else if (file.type.startsWith('video')) {
        name = 'video'
      }

    }
    else {
      name = 'message'
    }
    console.log('type: ', name)

    const mladress = import.meta.VITE_ML_ADDRESS || "192.168.154.134"
    const mlport = import.meta.VITE_ML_PORT || 5000
    let formData = new FormData();
    if (name === "message") {
      formData.append('message', message);
    } else {
      formData.append(name, file);
    }
    console.log(formData)
    try {
      const response = await fetch(`http://${mladress}:${mlport}/predict`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json()
      console.log('m; rsukt is ', data)
      const note = String(data.final_confidence) + " " + String(data.final_prediction) + " " + String(name);
      console.log('just before', cid, note)
      if (!cid){
      alert("No cid")
      return
      }
      if (!note){
      alert("No note")
      return
      }
      blockchainipfsandmlresult(cid, note)
      if (localStorage.getItem('record')) {
        localStorage.removeItem('record')
      }
      localStorage.setItem('record', JSON.stringify(data))
      if (data.final_risk_score >= 80) {
        setRiskColor("red")
        sendmail(note)
      }else{
        alert("No threat detected")
      }
      setCurrentStage('')
      if (data.status) {
        setFile(null)
        setIsFileLoading(false)
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsFileLoading(false);
    }
  };


  const logincheck = async () => {
    console.log('in login check')
    const address = 'localhost'
    const port = 8000
    console.log(`http://${address}:${port}/getcredentials`)
    try {
      const res = await fetch(`http://${address}:${port}/getcredentials`, {
        method: 'GET',
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      })
      const data = await res.json()
      console.log(data)
      setUser({
        _id: data.userfromdb._id,
        name: data.userfromdb.name,
        email: data.userfromdb.email,
        // role:data.userfromdb.role
      })
    }
    catch (error) {
      console.log(error)
    }
  }
  useEffect(() => {
    const { user } = userStore.getState()
    console.log(user)
    // if (!user.name) {
    //   logincheck()
    // }
    logincheck()
  }, [])
  const handleFileChange = (e) => {
    console.log('in the file change')
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
  };

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const angleX = (y - centerY) / 30;
    const angleY = (centerX - x) / 30;

    setContainerTransform(`perspective(1000px) rotateX(${angleX}deg) rotateY(${angleY}deg) translateY(-5px)`);
  };

  const handleMouseLeave = () => {
    setContainerTransform('perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)');
  };
  const [cid, setcid] = useState(null)
  const [cidlink, setcidlnk] = useState("")
  // for media ipfs
  const uploadinipfs = async (file) => {
    const data = await uploadtoipfs(file)
    console.log(data)
    if (data.status) {
      setcid(data.cid)
      setcidlnk(data.url)
      handleAiPart(data.cid)
    }
  }

  const logout = async () => {
    const address = 'localhost'
    const port = 8000
    console.log(`http://${address}:${port}/logout`)
    try {
      const res = await fetch(`http://${address}:${port}/logout`, {
        method: 'GET',
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      })
      const data = await res.json()
      if (data.status) {
        console.log(data)
        clearUser()
        localStorage.clear()
        navigate('/')
      } else {
        alert(data.msg)
      }

    }
    catch (error) {
      console.log(error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 font-mono text-green-400 relative overflow-hidden flex items-center justify-center min-w-screen ">
      {/* Animated background grid */}
      <img src={imgleft} alt="" className="absolute top-14 left-8 w-1/12 h-1/6" />
      <img src={imgright} alt="" className="absolute top-14 right-8 w-1/12 h-1/6" />
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

      {/* Main Container */}
      <div className="relative z-10 bg-gray-800 border-2 border-green-400 rounded min-w-8/12 max-w-12/12 shadow-2xl shadow-green-500/20 top-0">
        {/* Terminal Header */}
        <div className="px-4 py-3 bg-green-800 border-b-2 border-green-400">
          <div className="flex justify-between items-center">
            <h2 className="font-bold text-2xl text-green-100 tracking-wider">NETGENX DEFENCE CYBER SHIELD</h2>

            {/* <div className="flex items-center text-xs">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-1 animate-pulse shadow-lg shadow-green-400/50"></div>
              <span className="text-2xl text-green-400">SECURE</span>
            </div> */}

            <button onClick={logout}>Logout</button>

          </div>
        </div>
        <div className='p-4 font-bold text-green-400 text-2xl ml-3'>
          Welcome {JSON.parse(localStorage.getItem('user-storage'))?.state?.user.name}
        </div>
        {/* Content Area */}
        <div className="p-6 space-y-6">
          {/* Text Input Section */}
          <div className="space-y-3">
            <label className="block text-1xl text-green-400 font-bold tracking-wider">
              [ENTER THE TEXT EVIDENCE]
            </label>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="ENTER MESSAGE FOR THREAT ANALYSIS..."
              name="message"
              className="w-full p-4 bg-gray-900 border-2 border-green-400 rounded text-green-300 focus:outline-none focus:ring-2 focus:ring-green-400 text-sm font-mono placeholder-green-600"
            />
            <button
              onClick={handletextipfs}
              disabled={isTextLoading || !message.trim()}
              className={`
                group relative w-full p-3 bg-green-700 hover:bg-green-600 text-white rounded font-bold text-sm transition-all duration-300 border border-green-400 overflow-hidden
                ${isTextLoading || !message.trim() ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500"></span>
              <span className="relative flex items-center justify-center">
                {isTextLoading ? (
                  <>
                    <div className="flex space-x-1 mr-2">
                      <div className="w-1 h-1 bg-white rounded-full animate-bounce"></div>
                      <div className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                    {/* ANALYZING... */}
                    {currentStage ? currentStage : 'Analyzing...'}
                  </>
                ) : (
                  'ANALYZE TEXT'
                )}
              </span>
            </button>
          </div>





          {/* Divider */}
          <div className="flex items-center opacity-40">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-green-400 to-transparent"></div>
            <span className="px-4 text-xs uppercase tracking-widest text-green-400">OR</span>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-green-400 to-transparent"></div>
          </div>

          {/* File Upload Section */}
          <div className="space-y-3">
            <label className="block text-1xl text-green-400 font-bold tracking-wider">
              [UPLOAD {filetype.toUpperCase()} EVIDENCE]
            </label>
            <div className="relative flex flex-row">
              <input
                type="file"
                accept={filetype + "/*"}
                onChange={handleFileChange}
                name="file"
                className="w-full p-3  bg-gray-900 border-2 border-green-400 rounded text-green-300 text-sm font-mono cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-green-700 file:text-white hover:file:bg-green-600 file:cursor-pointer"
              />
              <select name="fileType" className="w-1/8 p-3 m-1  bg-gray-900 border-2 border-green-400 rounded text-green-300 text-sm font-mono cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-green-700 file:text-white hover:file:bg-green-600 file:cursor-pointer"
                onChange={handleFileTypeChange}>
                {/* <option value="">Select File Type</option> */}
                <option value="image">IMAGE</option>
                <option value="video">VIDEO</option>
                <option value="audio">AUDIO</option>
              </select>
            </div>
            <button
              onClick={() => uploadinipfs(file)}
              disabled={isFileLoading || !file}
              className={`
                group relative w-full p-3 bg-green-700 hover:bg-green-600 text-white rounded font-bold text-sm transition-all duration-300 border border-green-400 overflow-hidden
                ${isFileLoading || !file ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500"></span>
              <span className="relative flex items-center justify-center">
                {isFileLoading ? (
                  <>
                    <div className="flex space-x-1 mr-2">
                      <div className="w-1 h-1 bg-white rounded-full animate-bounce"></div>
                      <div className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                    {/* UPLOADING... */}
                    {currentStage ? currentStage : 'Analyzing...'}
                  </>
                ) : (
                  'UPLOAD & ANALYZE'
                )}
              </span>
            </button>
            {/* Results */}
            {cidlink && (
              <div className="bg-gray-900/50 border-l-4 border-green-400 p-3 rounded backdrop-blur-sm">
                <div className="text-xs text-green-400 font-bold mb-1">[FILE LINK]</div>
                <a
                  href={cidlink}
                  className="text-green-300 text-sm hover:text-green-200 underline break-all"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {cidlink}
                </a>
              </div>
            )}

            {mailres && (
              <div className={`bg-${riskcolor ? 'red' : 'green'}-900/30 border-l-4 border-red-400 p-3 rounded backdrop-blur-sm space-y-2`}>
                <div className="text-xs text-red-400 font-bold">[SYSTEM STATUS]</div>
                <p className="text-red-200 text-sm">{mailres}</p>
                <div className="flex items-center space-x-2 text-xs text-red-300">
                  <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
                  <span>Redirecting to chat in {chatCountdown}s</span>
                </div>
              </div>
            )}
            {/* start of rolling text */}
            


          </div>
        </div>
        {/* <div className="text-center text-white mb-32">
          <h1 className="text-4xl font-bold mb-4">Security Tips</h1>
          <p className="text-gray-400">Watch the rolling banner below</p>
        </div> */}

        <div className="animate-roll fixed bottom-0 left-0 right-0 w-full h-16 bg-transparent bottom-1 absolute top-2">
          <p className="text-2xl font-bold text-green-400 whitespace-nowrap">
            Implement multi-factor authentication (MFA) and enforce strong password policies across all systems and accounts. |||
            Secure all endpoints (laptops, mobile devices) with robust anti-malware, encryption, and regular patching.
          </p>
        </div>
      </div>

    </div>
  );
}