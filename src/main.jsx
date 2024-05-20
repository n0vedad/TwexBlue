// main.jsx

import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './TwexBlue.landingpage'; 
import GetHandles from './TwexBlue.gethandles';
import SearchAccounts from './TwexBlue.searchaccounts'
import './index.css'

const App = () => {
  return (
    <div className="App">
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/gethandles" element={<GetHandles />} />
        <Route path="/searchaccounts" element={<SearchAccounts />} />
      </Routes> 
    </BrowserRouter>
    <footer>
      Made with ❤️ by <a href="https://bsky.app/profile/hello.its.katerstrophal.me" target="_blank" rel="noopener noreferrer">@hello.its.katerstrophal.me</a>
    </footer>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)