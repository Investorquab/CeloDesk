import {InvoiceStatus,Invoice} from '../lib/api';
import {Telegram,Gmail} from './Icons';
export function StatusBadge({status}:{status:InvoiceStatus}){const c=status==='PAID'||status==='OVERPAID'?'paid':status==='PENDING'?'pending':status==='OVERDUE'||status==='FAILED'||status==='EXPIRED'?'overdue':status==='SENT'||status==='VIEWED'||status==='PARTIALLY_PAID'?'sent':'draft'; return <span className={`pill ${c}`}>{status.replace('_',' ')}</span>}

// Decision-aware status. Payment outcome always wins; otherwise the client's
// accept/decline decision is the most useful state to show the merchant, so a
// request waiting on the client reads "AWAITING ACCEPT" / "ACCEPTED" / "DECLINED".
export function invoiceDisplay(i:Invoice):{label:string;cls:string}{
 const s=i.status;
 if(s==='PAID'||s==='OVERPAID')return{label:s.replace('_',' '),cls:'paid'};
 if(s==='CANCELLED'||s==='EXPIRED'||s==='FAILED')return{label:s,cls:'overdue'};
 if(i.clientDecision==='DECLINED')return{label:'DECLINED',cls:'overdue'};
 if(s==='PARTIALLY_PAID')return{label:'PARTIALLY PAID',cls:'sent'};
 if(i.clientDecision==='ACCEPTED')return{label:'ACCEPTED',cls:'sent'};
 if(s==='OVERDUE')return{label:'OVERDUE',cls:'overdue'};
 if(i.clientDecision==='PENDING'&&(s==='SENT'||s==='VIEWED'||s==='PENDING'))return{label:'AWAITING ACCEPT',cls:'pending'};
 return{label:s.replace('_',' '),cls:s==='DRAFT'?'draft':'sent'};
}
export function InvoiceStatusBadge({invoice}:{invoice:Invoice}){const d=invoiceDisplay(invoice);return <span className={`pill ${d.cls}`}>{d.label}</span>}

// Compact marker of the channels an invoice was sent through. Returns null when
// it was shared by link only, so rows without delivery stay clean.
export function SentVia({invoice}:{invoice:Invoice}){
 const parts:string[]=[]; const icons:JSX.Element[]=[];
 if(invoice.deliverEmail){parts.push('email');icons.push(<Gmail key="e" size={12}/>)}
 if(invoice.deliverTelegram){parts.push('Telegram');icons.push(<Telegram key="t" size={12}/>)}
 if(!icons.length)return null;
 return <span className="sentVia" title={`Sent via ${parts.join(' + ')}`} style={{display:'inline-flex',alignItems:'center',gap:4,flex:'0 0 auto',color:'var(--muted)',opacity:.8}}>{icons}</span>;
}
