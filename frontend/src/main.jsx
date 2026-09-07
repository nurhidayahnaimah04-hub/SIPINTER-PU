import './index.css'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { PeriodeProvider } from './context/PeriodeContext.jsx'
import { BrowserRouter } from 'react-router-dom'

ReactDOM.createRoot(document.getElementById('root')).render(
    <BrowserRouter>
      <AuthProvider>
        <PeriodeProvider>
          <App />
        </PeriodeProvider>
      </AuthProvider>
    </BrowserRouter>
)
