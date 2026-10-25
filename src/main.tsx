import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './styles.css'

if ('serviceWorker' in navigator) window.addEventListener('load', () => {
  void navigator.serviceWorker.register('/sw.js').then(async () => {
    const registration = await navigator.serviceWorker.ready
    const urls = [...document.querySelectorAll('script[src], link[rel="modulepreload"][href], link[rel="stylesheet"][href]')]
      .map((element) => element instanceof HTMLScriptElement ? element.src : (element as HTMLLinkElement).href)
      .filter((url) => new URL(url).origin === location.origin)
      .map((url) => `${new URL(url).pathname}${new URL(url).search}`)
    registration.active?.postMessage({ type: 'PRECACHE_ASSETS', urls })
  }).catch(() => undefined)
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
