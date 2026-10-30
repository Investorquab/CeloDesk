'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {Home,Receipt,Plus,Activity,User} from './Icons';
import WalletConnect from './WalletConnect';
import s from './AppShell.module.css';

// Shared top header + tab nav for the rebuilt app pages (CeloDesk V2).
export default function AppHeaderV2({merchantId,businessName}:{merchantId:string;businessName?:string}){
 const pathname=usePathname();
 const q=`?merchantId=${merchantId}`;
 const tabs=[
  {label:'Home',href:`/dashboard${q}`,icon:Home,on:pathname==='/dashboard'},
  {label:'Invoices',href:`/dashboard/invoices${q}`,icon:Receipt,on:pathname.startsWith('/dashboard/invoices')},
  {label:'Create',href:`/dashboard/create${q}`,icon:Plus,on:pathname.startsWith('/dashboard/create')},
  {label:'Activity',href:`/dashboard/activity${q}`,icon:Activity,on:pathname.startsWith('/dashboard/activity')},
  {label:'Profile',href:`/dashboard/profile${q}`,icon:User,on:pathname.startsWith('/dashboard/profile')},
 ];
 const name=businessName||'Your business';
 return <header className={s.ahead}><div className={`${s.wrap} ${s.in}`}>
  <Link href={`/dashboard${q}`} className={s.brand}><span className={s.mark}>C</span> CeloDesk</Link>
  <nav className={s.atabs}>{tabs.map(t=><Link key={t.label} href={t.href} className={t.on?s.on:''}><t.icon size={16}/>{t.label}</Link>)}</nav>
  <div className={s.spacer}/>
  <WalletConnect compact/>
  <div className={s.me}><span className={s.name}>{name}</span><span className={s.av}>{name.slice(0,1).toUpperCase()}</span></div>
 </div></header>;
}
