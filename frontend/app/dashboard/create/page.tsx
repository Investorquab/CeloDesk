import CreateGate from '../../../components/CreateGate';
export default function Page({searchParams}:{searchParams:{merchantId?:string}}){return <CreateGate initialMerchantId={searchParams.merchantId}/>}
