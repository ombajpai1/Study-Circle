import { Buffer } from 'buffer';

if (typeof window !== 'undefined') {
  (window as any).global = window;
  (window as any).Buffer = Buffer;
  (window as any).process = {
    env: {},
    version: '',
    nextTick: (fn: any, ...args: any[]) => setTimeout(() => fn(...args), 0),
  } as any;
}

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
