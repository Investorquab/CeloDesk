'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {Home,Receipt,Plus,Activity,User,Users} from './Icons';
import WalletConnect from './WalletConnect';
import {useTheme} from '../lib/theme';
import s from './AppShell.module.css';

// Shared top header + tab nav for the rebuilt app pages (CeloDesk V2).
export default function AppHeaderV2({merchantId,businessName}:{merchantId:string;businessName?:string}){
 const pathname=usePathname();
 const q=`?merchantId=${merchantId}`;
 const tabs=[
  {label:'Home',href:`/dashboard${q}`,icon:Home,on:pathname==='/dashboard'},
  {label:'Invoices',href:`/dashboard/invoices${q}`,icon:Receipt,on:pathname.startsWith('/dashboard/invoices')},
  {label:'Create',href:`/dashboard/create${q}`,icon:Plus,on:pathname.startsWith('/dashboard/create')},
  {label:'Batch Pay',href:`/dashboard/batch${q}`,icon:Users,on:pathname.startsWith('/dashboard/batch')},
  {label:'Activity',href:`/dashboard/activity${q}`,icon:Activity,on:pathname.startsWith('/dashboard/activity')},
  {label:'Profile',href:`/dashboard/profile${q}`,icon:User,on:pathname.startsWith('/dashboard/profile')},
 ];
 const name=businessName||'Your business';
 const {theme,toggle}=useTheme();
 return <header className={s.ahead}><div className={`${s.wrap} ${s.in}`}>
  <Link href={`/dashboard${q}`} className={s.brand}><span className={s.mark}>C</span> CeloDesk</Link>
  <nav className={s.atabs}>{tabs.map(t=><Link key={t.label} href={t.href} className={t.on?s.on:''}><t.icon size={16}/>{t.label}</Link>)}</nav>
  <div className={s.spacer}/>
  <button className={s.themeBtn} onClick={toggle} type="button" aria-label="Switch between dark and light">
   {theme==='dark'
    ? <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
    : <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>}
  </button>
  <WalletConnect compact/>
  <div className={s.me}><span className={s.name}>{name}</span><span className={s.av}>{name.slice(0,1).toUpperCase()}</span></div>
 </div></header>;
}
