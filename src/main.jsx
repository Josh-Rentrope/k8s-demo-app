import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
// The HTML file loads Tailwind via CDN, so no CSS import is needed here.

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
