import {getChatGPTUser,chatGPTSignInPath} from '../chatgpt-auth';
import {isGameMaster} from '@/lib/game/world-store';
import MapPreview from './map-preview';
export const dynamic='force-dynamic';
export default async function Page(){
 const user=await getChatGPTUser();
 if(!user)return <main style={{padding:24,color:'#eee',background:'#111',minHeight:'100dvh'}}><h1>地圖預覽</h1><a href={chatGPTSignInPath('/map-preview')} target="_top" style={{color:'#e7cb89'}}>請先登入</a></main>;
 if(!isGameMaster(user))return <main style={{padding:24,color:'#eee',background:'#111',minHeight:'100dvh'}}><h1>地圖預覽</h1><p>僅限管理者。</p></main>;
 return <MapPreview/>;
}
