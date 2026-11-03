import CollectClient from '../../../components/CollectClient';
export default function Page({params}:{params:{slug:string}}){return <CollectClient slug={params.slug}/>}
