import X402PayClient from '../../../components/X402PayClient';
export default function Page({params}:{params:{id:string}}){return <X402PayClient invoiceId={params.id}/>}
