'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {Home,Receipt,Plus,Activity,User,MessageCircle} from './Icons';
import {TELEGRAM_BOT_URL} from '../lib/telegram';

export default function AppNav({merchantId}:{merchantId:string}){
 const pathname=usePathname();
 const items=[
  {label:'Home',href:`/dashboard?merchantId=${merchantId}`,icon:Home,active:pathname==='/dashboard'},
  {label:'Invoices',href:`/dashboard/invoices?merchantId=${merchantId}`,icon:Receipt,active:pathname.startsWith('/dashboard/invoices')},
  {label:'Create Invoice',href:`/dashboard/create?merchantId=${merchantId}`,icon:Plus,active:pathname.startsWith('/dashboard/create')},
  {label:'Activity',href:`/dashboard/activity?merchantId=${merchantId}`,icon:Activity,active:pathname.startsWith('/dashboard/activity')},
  {label:'Profile',href:`/dashboard/profile?merchantId=${merchantId}`,icon:User,active:pathname.startsWith('/dashboard/profile')},
 ];
 return <>
  <aside className="side">
   <div className="brand"><span className="brandMark"/>CeloDesk</div>
   {items.map(({label,href,icon:Icon,active})=><Link key={label} className={`sideLink ${active?'active':''}`} href={href}><Icon size={17}/>{label}</Link>)}
   <a className="sideTelegram" href={TELEGRAM_BOT_URL} target="_blank" rel="noreferrer"><span className="telegramMini"><MessageCircle size={15}/></span><span><strong>CeloDesk Telegram</strong><small>Open in Telegram</small></span></a>
  </aside>
  <nav className="mobileNav">
   {items.map(({label,href,icon:Icon,active})=><Link key={label} className={active?'active':''} href={href}><Icon size={label==='Create Invoice'?20:17}/><span>{label==='Create Invoice'?'Create':label}</span></Link>)}
  </nav>
 </>;
}
