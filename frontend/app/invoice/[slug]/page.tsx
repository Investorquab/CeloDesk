import CheckoutClient from '../../../components/CheckoutClient';
export default function Page({params,searchParams}:{params:{slug:string};searchParams:{returnTo?:string}}){return <CheckoutClient slug={params.slug} returnTo={searchParams.returnTo}/> }
