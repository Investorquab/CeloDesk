'use client';

import {useEffect,useState} from 'react';
import Link from 'next/link';
import {api,Invoice,money,shortAddress} from '../../../../lib/api';
import AppNav from '../../../../components/AppNav';
import {ArrowLeft,Copy,Receipt} from '../../../../components/Icons';
import {StatusBadge} from '../../../../components/StatusBadge';
import {userFacingError} from '../../../../lib/userFacingError';

export default function Page({params,searchParams}:{params:{id:string};searchParams:{merchantId?:string}}){
 const merchantId=searchParams.merchantId||'';
 const [invoice,setInvoice]=useState<Invoice|null>(null);
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');

 useEffect(()=>{
   api.getInvoice(params.id)
     .then(setInvoice)
     .catch(e=>setError(userFacingError(e,'Could not load this invoice.')));
 },[params.id]);

 async function copyLink(){
   if(!invoice)return;
   const url=`${window.location.origin}/invoice/${invoice.publicSlug}`;
   try{
     await navigator.clipboard?.writeText(url);
     setNotice('Payment link copied');
     setTimeout(()=>setNotice(''),1800);
   }catch{
     setError('Could not copy the payment link. Please try again shortly.');
   }
 }

 if(error)return <div className="appShell"><div className="topbar"><div className="topbarInner"><Link href={`/dashboard/invoices?merchantId=${merchantId}`} className="btn btnGhost"><ArrowLeft size={16}/>Back</Link></div></div><main className="main container"><div className="formError"><strong>{error}</strong><div className="checkoutErrorActions"><button className="btn btnBrand" onClick={()=>window.location.reload()}>Try again</button><Link className="btn btnSoft" href={`/dashboard/invoices?merchantId=${merchantId}`}>Cancel</Link></div></div></main></div>;

 return <div className="appShell">
   <div className="topbar">
     <div className="topbarInner">
       <Link href={`/dashboard/invoices?merchantId=${merchantId}`} className="brand"><span className="brandMark"/>CeloDesk</Link>
       <Link href={`/dashboard/invoices?merchantId=${merchantId}`} className="btn btnGhost"><ArrowLeft size={16}/>Back</Link>
     </div>
   </div>
   <div className="appPage">
     <div className="container appGrid">
       <AppNav merchantId={merchantId}/>
       <main className="main invoiceDetailPage">
         {notice&&<div className="successToast">{notice}</div>}
         <div className="pageTitleRow invoiceDetailHeader">
           <div>
             <div className="muted invoiceEyebrow">INVOICE DETAILS</div>
             <h1>{invoice?.clientName||'Invoice'}</h1>
             <p className="muted">Manage this payment request and track its payments.</p>
           </div>
           {invoice&&<button className="btn btnBrand" onClick={copyLink}><Copy size={15}/>Copy payment link</button>}
         </div>

         {invoice?
           <section className="panel invoiceDetailCard">
             <div className="invoiceDetailSummary">
               <div>
                 <span className="muted invoiceMetaLabel">Amount due</span>
                 <div className="invoiceDetailAmount">{money(invoice.amount,invoice.tokenSymbol)}</div>
               </div>
               <div className="invoiceDetailStatus">
                 <span className="muted invoiceMetaLabel">Status</span>
                 <StatusBadge status={invoice.status}/>
               </div>
             </div>

             <div className="invoiceDetailMeta">
               <div><span className="muted invoiceMetaLabel">Client</span><strong>{invoice.clientName}</strong></div>
               <div><span className="muted invoiceMetaLabel">Created</span><strong>{new Date(invoice.createdAt).toLocaleString()}</strong></div>
               <div><span className="muted invoiceMetaLabel">Due date</span><strong>{invoice.dueDate?new Date(invoice.dueDate).toLocaleDateString():'No due date'}</strong></div>
               <div><span className="muted invoiceMetaLabel">Receiving wallet</span><strong>{shortAddress(invoice.receivingWallet)}</strong></div>
               <div><span className="muted invoiceMetaLabel">Network</span><strong>Celo Mainnet</strong></div>
               <div><span className="muted invoiceMetaLabel">Payment token</span><strong>{invoice.tokenSymbol}</strong></div>
             </div>

             <div className="invoiceDetailDescription">
               <span className="muted invoiceMetaLabel">Description</span>
               <p>{invoice.description||'Payment request'}</p>
             </div>

             <div className="invoicePayments">
               <div className="invoicePaymentsHeader">
                 <div><h2>Payment history</h2><span className="muted">{invoice.payments?.length||0} recorded payments</span></div>
               </div>
               {invoice.payments?.length?
                 <div className="invoicePaymentList">
                   {invoice.payments.map(p=><div key={p.id} className="invoicePaymentItem">
                     <span className="paymentHistoryIcon"><Receipt size={15}/></span>
                     <div className="invoicePaymentMain">
                       <strong>{money(p.amount,p.tokenSymbol||invoice.tokenSymbol)}</strong>
                       <span className="muted">{shortAddress(p.txHash)}</span>
                     </div>
                     <span className="paymentHistoryStatus">{p.status}</span>
                   </div>)}
                 </div>
                 :<div className="invoiceEmptyPayments"><Receipt size={18}/><span>No payments recorded yet.</span></div>
               }
             </div>
           </section>
           :<section className="panel invoiceDetailCard"><div className="invoiceLoading">Loading invoice...</div></section>
         }
       </main>
     </div>
   </div>
 </div>
}
