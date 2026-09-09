import ProfileGate from '../../../components/ProfileGate';
export default function Page({searchParams}:{searchParams:{merchantId?:string}}){return <ProfileGate initialMerchantId={searchParams.merchantId}/>}
