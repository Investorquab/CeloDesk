'use client';
import {useEffect, useRef, useState} from 'react';
import {api} from '../lib/api';
import {userFacingError} from '../lib/userFacingError';

// "Continue with Google" using Google Identity Services. The button returns a
// signed ID token (credential); the backend verifies it and issues a CeloDesk
// session, exactly like wallet sign-in. If a session already exists without an
// email (a wallet user), we LINK Google onto that same account instead.

declare global { interface Window { google?: any } }

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

let gisPromise: Promise<void> | null = null;
function loadGis(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!gisPromise) {
    gisPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.defer = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Could not load Google sign-in.'));
      document.head.appendChild(s);
    });
  }
  return gisPromise;
}

export default function GoogleSignIn() {
  const ref = useRef<HTMLDivElement>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    let cancelled = false;
    loadGis()
      .then(() => {
        if (cancelled || !ref.current || !window.google?.accounts?.id) return;
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: async (resp: any) => {
            try {
              const credential = resp?.credential;
              if (!credential) throw new Error('No Google credential received.');
              const existing = api.getStoredSession();
              if (existing?.token && !existing.email) {
                // A signed-in wallet user adding "Continue with Google".
                const r = await api.linkGoogle(credential);
                api.setStoredSession({
                  ...existing,
                  email: r.email ?? null,
                  name: r.name ?? null,
                  walletAddress: r.walletAddress || existing.walletAddress || '',
                });
              } else {
                const r = await api.googleAuth(credential);
                api.setStoredSession({
                  merchantId: r.merchantId,
                  walletAddress: r.walletAddress || '',
                  token: r.token,
                  email: r.email ?? null,
                  name: r.name ?? null,
                });
              }
              window.dispatchEvent(new Event('celodesk-session'));
            } catch (e: any) {
              setErr(userFacingError(e, 'Google sign-in failed.'));
            }
          },
        });
        window.google.accounts.id.renderButton(ref.current, {
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'pill',
          logo_alignment: 'center',
          width: 240,
        });
      })
      .catch((e) => setErr(userFacingError(e, 'Could not load Google sign-in.')));
    return () => {
      cancelled = true;
    };
  }, []);

  if (!GOOGLE_CLIENT_ID) return null;
  return (
    <div className="googleSignIn">
      <div ref={ref} />
      {err && <span className="walletError">{err}</span>}
    </div>
  );
}
