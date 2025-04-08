import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Log environment variables on startup to help with debugging
console.log('Environment variables loaded:');
console.log('VITE_API_BASE_URL:', import.meta.env.VITE_API_BASE_URL || '(not set)');
console.log('NODE_ENV:', import.meta.env.MODE);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
