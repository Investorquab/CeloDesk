import DashboardGate from '../../components/DashboardGate';
export default function Page({searchParams}:{searchParams:{merchantId?:string}}){return <DashboardGate initialMerchantId={searchParams.merchantId}/>}
