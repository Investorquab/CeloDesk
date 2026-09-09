import ActivityClient from '../../../components/ActivityClient';
export default function Page({searchParams}:{searchParams:{merchantId?:string}}){return <ActivityClient merchantId={searchParams.merchantId||''}/>}

