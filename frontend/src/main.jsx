import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { PlayerProvider } from './hooks/usePlayer';
import { AuthProvider } from './context/AuthContext';
import { applyTheme } from './utils/theme';
import './index.css';

// 첫 paint 전에 캐시된 테마를 적용해 색상 깜빡임 방지 (있을 때만)
try {
  const cachedTheme = localStorage.getItem('cachedSiteTheme');
  if (cachedTheme) applyTheme(JSON.parse(cachedTheme));
} catch {}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <PlayerProvider>
          <App />
        </PlayerProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
