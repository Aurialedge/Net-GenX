import Landing from "./assets/components/landing";
import './App.css'
import ChatInterface from "./assets/components/chatting";
import Auth from "./assets/components/auth";
import Testing from "./assets/components/testing";
import OfficialPage from "./assets/components/officialPage";
import WorkflowAnimation from "./assets/components/WorkflowAnimation";
import SecuritySystemExplainer from "./assets/components/SecuritySystemExplainer";
import NotFound from "./assets/components/404";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";

import Main from "./assets/components/main";
const App = () => {
    return (
        <Router>
            <Routes>
                <Route path="/upload" element={<Landing />} />
                <Route path="/chat" element={<ChatInterface />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/testing" element={<Testing />} />
                <Route path="/" element={<Main />} />
                <Route path="/officialpage" element={<OfficialPage />} />
                <Route path="/workflow" element={<WorkflowAnimation />} />
                <Route path="/explainer" element={<SecuritySystemExplainer />} />
                <Route path="*" element={<NotFound />} />
            </Routes>
        </Router>
    )
}

export default App