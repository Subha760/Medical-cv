import { useEffect, useRef, useState } from 'react';
declare global { interface Window { adsbygoogle?: Record<string, unknown>[]; } }
export default function AdSlot({ placement }: { placement: 'home' | 'editor' | 'preview' }) {
  const client = import.meta.env.VITE_ADSENSE_CLIENT_ID || '';
  const slot = import.meta.env.VITE_ADSENSE_SLOT_ID || '';
  const [allowed, setAllowed] = useState(() => localStorage.getItem('medcv:adsConsent') === 'yes');
  const pushed = useRef(false);
  const configured = /^ca-pub-\d{16}$/.test(client) && /^\d+$/.test(slot) && !window.MedCVAndroid && placement === 'home';
  useEffect(() => {
    if (!configured || !allowed || pushed.current) return;
    const push = () => { if (!pushed.current) { try { (window.adsbygoogle ||= []).push({}); pushed.current = true; } catch { /* ad blockers must not interrupt the app */ } } };
    let script = document.querySelector<HTMLScriptElement>('#medcv-adsense');
    if (!script) {
      script = document.createElement('script'); script.id = 'medcv-adsense'; script.async = true;
      script.crossOrigin = 'anonymous'; script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`;
      document.head.appendChild(script);
    }
    script.addEventListener('load', push); if (window.adsbygoogle) push();
    return () => script?.removeEventListener('load', push);
  }, [configured, allowed, client]);
  if (!configured) return null;
  return <aside className="ad-slot" aria-label="Advertisement">
    {allowed ? <><small>Advertisement</small><ins className="adsbygoogle" style={{display:'block'}} data-ad-client={client} data-ad-slot={slot} data-ad-format="auto" data-full-width-responsive="true" /></> : <><p>Optional Google advertising uses third-party cookies and network requests.</p><button className="btn btn-secondary" onClick={() => { localStorage.setItem('medcv:adsConsent', 'yes'); setAllowed(true); }}>Allow ads</button></>}
  </aside>;
}
