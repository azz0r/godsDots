import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles/index.css'

// StrictMode disabled for Phaser compatibility (causes double initialization and crashes)
ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)