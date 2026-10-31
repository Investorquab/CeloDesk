import PayLinkClient from '../../../components/PayLinkClient';
export default function Page({params}:{params:{slug:string}}){return <PayLinkClient slug={params.slug}/>}
