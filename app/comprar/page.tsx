import Studio from '@/app/studio';
export default async function Page({searchParams}:{searchParams:Promise<{produto?:string}>}){const {produto}=await searchParams;return <Studio route={'/comprar/'+(typeof produto==='string'?produto:'')}/>}
