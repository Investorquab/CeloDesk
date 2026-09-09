export type InvoiceStatus = 'DRAFT'|'SENT'|'VIEWED'|'PENDING'|'PAID'|'PARTIALLY_PAID'|'OVERPAID'|'FAILED'|'CANCELLED'|'EXPIRED'|'OVERDUE';
export type PaymentStatus = 'DETECTED'|'VERIFYING'|'VERIFIED'|'REJECTED';
export type Token = {symbol:string; name:string; decimals:number};
export type Payment = {id:string;txHash:string;chainId:number;fromAddress:string;toAddress:string;tokenAddress:string;amount:string;status:PaymentStatus;confirmations?:number;blockNumber?:number;rejectionReason?:string;detectedAt?:string;verifiedAt?:string};
export type Invoice = {id:string;publicSlug:string;merchantId:string;clientName:string;clientContact?:string|null;amount:string|number;tokenSymbol:string;tokenAddress:string;chainId:number;receivingWallet:string;description?:string|null;dueDate?:string|null;status:InvoiceStatus;createdAt:string;updatedAt?:string;merchantDisplay?:{name:string;logoUrl?:string|null};payments?:Payment[]};
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
 getMerchant:(id:string)=>request<Merchant>(`/api/merchants/${encodeURIComponent(id)}`),
 updateMerchant:(id:string,data:Partial<Merchant['profile']> & {username?:string})=>request<any>(`/api/merchants/${encodeURIComponent(id)}`,{method:'PATCH',body:JSON.stringify(data)}),
 createInvoice:(data:any)=>request<{id:string;publicUrl:string;status:InvoiceStatus}>('/api/invoices',{method:'POST',body:JSON.stringify(data)}),
 getInvoice:(id:string)=>request<Invoice>(`/api/invoices/${encodeURIComponent(id)}`),
 getInvoiceBySlug:(slug:string)=>request<Invoice>(`/api/invoices/by-slug/${encodeURIComponent(slug)}`),
 markViewed:(slug:string)=>request<{status:InvoiceStatus}>(`/api/invoices/by-slug/${encodeURIComponent(slug)}/view`,{method:'POST'}),
 getPaymentIntent:(id:string,payerAddress:string)=>request<{intentId:string;expiresAt:string;payerAddress:string;to:string;data:string;value:string;chainId:number}>(`/api/invoices/${encodeURIComponent(id)}/payment-intent?payerAddress=${encodeURIComponent(payerAddress)}`),
 verifyPayment:(invoiceId:string,intentId:string,txHash:string)=>request<{verified:boolean;invoiceStatus?:InvoiceStatus;reason?:string;status?:string;receivedAmount?:string;receivedToken?:string;remainingAmount?:string;overpaymentAmount?:string}>('/api/invoices/verify-payment',{method:'POST',body:JSON.stringify({invoiceId,intentId,txHash})}),
 listInvoices:(merchantId:string)=>request<Invoice[]>(`/api/invoices?merchantId=${encodeURIComponent(merchantId)}`),
 deleteInvoice:(id:string)=>request<{deleted:boolean}>(`/api/invoices/${encodeURIComponent(id)}`,{method:'DELETE'}),
 listOutstanding:(merchantId:string)=>request<Invoice[]>(`/api/invoices?merchantId=${encodeURIComponent(merchantId)}&status=outstanding`),
 getSummary:(merchantId:string)=>request<Summary>(`/api/invoices/summary/${encodeURIComponent(merchantId)}`),
 agent:(merchantId:string,message:string,history:{role:'user'|'assistant';content:string}[]=[])=>request<{reply:string;artifacts:any[]}>(`/api/agent`,{method:'POST',body:JSON.stringify({message,history})}),
};
export function money(amount:string|number,symbol:string){return `${Number(amount).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})} ${symbol}`}
export function shortAddress(a:string){return a?`${a.slice(0,6)}…${a.slice(-4)}`:''}
