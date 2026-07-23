import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { applyTheme, getStoredTheme } from '@/lib/theme'

// Sync theme class + meta color from storage (the inline head script sets the
// class pre-paint; this keeps meta theme-color and localStorage consistent).
applyTheme(getStoredTheme())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
