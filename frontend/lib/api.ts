export type InvoiceStatus = 'DRAFT'|'SENT'|'VIEWED'|'PENDING'|'PAID'|'PARTIALLY_PAID'|'OVERPAID'|'FAILED'|'CANCELLED'|'EXPIRED'|'OVERDUE';
export type PaymentStatus = 'DETECTED'|'VERIFYING'|'VERIFIED'|'REJECTED';
export type Token = {symbol:string; name:string; decimals:number; fiatCurrency?:string|null; locale?:string|null; local?:boolean};
export type Payment = {id:string;txHash:string;chainId:number;fromAddress:string;toAddress:string;tokenAddress:string;tokenSymbol?:string;amount:string;status:PaymentStatus;confirmations?:number;blockNumber?:number;rejectionReason?:string;detectedAt?:string;verifiedAt?:string};
export type ClientDecision = 'PENDING'|'ACCEPTED'|'DECLINED';
export type Recurrence = 'NONE'|'WEEKLY'|'BIWEEKLY'|'MONTHLY';
export type Invoice = {id:string;publicSlug:string;merchantId:string;clientName:string;clientContact?:string|null;clientEmail?:string|null;clientTelegram?:string|null;deliverEmail?:boolean;deliverTelegram?:boolean;clientDecision?:ClientDecision;clientDecisionAt?:string|null;recurrence?:Recurrence;recurrenceEndsAt?:string|null;amount:string|number;tokenSymbol:string;tokenAddress:string;chainId:number;receivingWallet:string;description?:string|null;dueDate?:string|null;status:InvoiceStatus;createdAt:string;updatedAt?:string;merchantDisplay?:{name:string;logoUrl?:string|null};payments?:Payment[]};
export type Merchant = {id:string;walletAddress:string;profile?:{businessName:string;slug?:string;tagline?:string|null;logoUrl?:string|null;description?:string|null;websiteUrl?:string|null;socialLinks?:Record<string,string>|null;preferredToken?:string;acceptedTokens?:string[]}|null};
export type Summary = {total:number;byStatus:Record<string,number>;outstandingTotal:number;outstandingByToken?:Record<string,number>};
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
async function request<T>(path:string, options:RequestInit={}) { const session=getSession(); const headers=new Headers(options.headers); headers.set('Content-Type','application/json'); if(session?.token) headers.set('Authorization',`Bearer ${session.token}`); const r=await fetch(`${API}${path}`,{...options,headers,cache:'no-store'}); const b=await r.json().catch(()=>({})); if(!r.ok) throw new Error(b.error||b.message||`Request failed (${r.status})`); return b as T; }
import {getSession,setSession,clearSession,WalletSession} from './session';

export const api={
 getTokens:()=>request<Token[]>('/api/tokens'),
 getStoredSession:()=>getSession(),
 setStoredSession:(s:WalletSession)=>setSession(s),
 clearStoredSession:()=>clearSession(),
 walletAuth:(data:{walletAddress:string;message:string;signature:string})=>request<{token:string;merchantId:string}>('/api/auth/wallet',{method:'POST',body:JSON.stringify(data)}),
 googleAuth:(credential:string)=>request<{token:string;merchantId:string;walletAddress:string|null;email?:string|null;name?:string|null}>('/api/auth/google',{method:'POST',body:JSON.stringify({credential})}),
 linkWallet:(data:{walletAddress:string;message:string;signature:string})=>request<{merchantId:string;walletAddress:string}>('/api/auth/link/wallet',{method:'POST',body:JSON.stringify(data)}),
 linkGoogle:(credential:string)=>request<{merchantId:string;email?:string|null;name?:string|null;walletAddress:string|null}>('/api/auth/link/google',{method:'POST',body:JSON.stringify({credential})}),
 getPayLink:(slug:string)=>request<{slug:string;businessName:string;logoUrl?:string|null;tagline?:string|null;preferredToken?:string|null;acceptedTokens?:string[];hasWallet:boolean}>(`/api/pay-links/${encodeURIComponent(slug)}`),
 payLink:(slug:string,data:{amount:string;tokenSymbol:string;clientName?:string})=>request<{slug:string}>(`/api/pay-links/${encodeURIComponent(slug)}`,{method:'POST',body:JSON.stringify(data)}),
 getMerchant:(id:string)=>request<Merchant>(`/api/merchants/${encodeURIComponent(id)}`),
 updateMerchant:(id:string,data:Partial<Merchant['profile']> & {username?:string})=>request<any>(`/api/merchants/${encodeURIComponent(id)}`,{method:'PATCH',body:JSON.stringify(data)}),
 createInvoice:(data:any)=>request<{id:string;publicUrl:string;status:InvoiceStatus}>('/api/invoices',{method:'POST',body:JSON.stringify(data)}),
 getInvoice:(id:string)=>request<Invoice>(`/api/invoices/${encodeURIComponent(id)}`),
 getInvoiceBySlug:(slug:string)=>request<Invoice>(`/api/invoices/by-slug/${encodeURIComponent(slug)}`),
 markViewed:(slug:string)=>request<{status:InvoiceStatus}>(`/api/invoices/by-slug/${encodeURIComponent(slug)}/view`,{method:'POST'}),
 setDecision:(slug:string,decision:'ACCEPTED'|'DECLINED')=>request<{clientDecision:ClientDecision;status:InvoiceStatus}>(`/api/invoices/by-slug/${encodeURIComponent(slug)}/decision`,{method:'POST',body:JSON.stringify({decision})}),
 getPaymentIntent:(id:string,payerAddress:string)=>request<{intentId:string;expiresAt:string;payerAddress:string;to:string;data:string;value:string;chainId:number}>(`/api/invoices/${encodeURIComponent(id)}/payment-intent?payerAddress=${encodeURIComponent(payerAddress)}`),
 verifyPayment:(invoiceId:string,intentId:string,txHash:string)=>request<{verified:boolean;invoiceStatus?:InvoiceStatus;reason?:string;status?:string;receivedAmount?:string;receivedToken?:string;remainingAmount?:string;overpaymentAmount?:string}>('/api/invoices/verify-payment',{method:'POST',body:JSON.stringify({invoiceId,intentId,txHash})}),
 listInvoices:(merchantId:string)=>request<Invoice[]>(`/api/invoices?merchantId=${encodeURIComponent(merchantId)}`),
 deleteInvoice:(id:string)=>request<{deleted:boolean}>(`/api/invoices/${encodeURIComponent(id)}`,{method:'DELETE'}),
 listOutstanding:(merchantId:string)=>request<Invoice[]>(`/api/invoices?merchantId=${encodeURIComponent(merchantId)}&status=outstanding`),
 getSummary:(merchantId:string)=>request<Summary>(`/api/invoices/summary/${encodeURIComponent(merchantId)}`),
 agent:(merchantId:string,message:string,history:{role:'user'|'assistant';content:string}[]=[])=>request<{reply:string;artifacts:any[]}>(`/api/agent`,{method:'POST',body:JSON.stringify({message,history})}),
};
// Local-currency display for Celo stablecoins. Mirrors the backend token
// registry (src/celo/tokens.ts) so money() can stay synchronous. wFIAT
// amounts render in their own currency, e.g. wBRL -> "R$ 1.500,00 wBRL".
const TOKEN_DISPLAY:Record<string,{currency:string;locale:string}>={
 USDm:{currency:'USD',locale:'en-US'},USDC:{currency:'USD',locale:'en-US'},USDT:{currency:'USD',locale:'en-US'},USAT:{currency:'USD',locale:'en-US'},
 NGNm:{currency:'NGN',locale:'en-NG'},
 EURm:{currency:'EUR',locale:'de-DE'},AUDm:{currency:'AUD',locale:'en-AU'},BRLm:{currency:'BRL',locale:'pt-BR'},CADm:{currency:'CAD',locale:'en-CA'},
 CHFm:{currency:'CHF',locale:'de-CH'},COPm:{currency:'COP',locale:'es-CO'},GBPm:{currency:'GBP',locale:'en-GB'},GHSm:{currency:'GHS',locale:'en-GH'},
 JPYm:{currency:'JPY',locale:'ja-JP'},KESm:{currency:'KES',locale:'en-KE'},PHPm:{currency:'PHP',locale:'en-PH'},XOFm:{currency:'XOF',locale:'fr-SN'},ZARm:{currency:'ZAR',locale:'en-ZA'},
 wBRL:{currency:'BRL',locale:'pt-BR'},wARS:{currency:'ARS',locale:'es-AR'},wMXN:{currency:'MXN',locale:'es-MX'},
 wCOP:{currency:'COP',locale:'es-CO'},wCLP:{currency:'CLP',locale:'es-CL'},wPEN:{currency:'PEN',locale:'es-PE'},
};
export function money(amount:string|number,symbol:string){
 const d=TOKEN_DISPLAY[symbol];const n=Number(amount);
 if(d&&Number.isFinite(n)){try{return `${new Intl.NumberFormat(d.locale,{style:'currency',currency:d.currency}).format(n)} ${symbol}`}catch{}}
 return `${n.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})} ${symbol}`;
}
export function shortAddress(a:string){return a?`${a.slice(0,6)}…${a.slice(-4)}`:''}
