export type WalletSession = { merchantId: string; walletAddress: string; token: string };
const KEY = 'celodesk.session';
export function getSession(): WalletSession | null { if (typeof window==='undefined') return null; try { const raw=localStorage.getItem(KEY); return raw?JSON.parse(raw):null; } catch { return null; } }
export function setSession(s: WalletSession){ localStorage.setItem(KEY, JSON.stringify(s)); }
export function clearSession(){ localStorage.removeItem(KEY); }
