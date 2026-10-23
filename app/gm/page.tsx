import { getChatGPTUser, chatGPTSignInPath } from '../chatgpt-auth';
import { isGameMaster } from '@/lib/game/world-store';
import Admin from './admin';
export const dynamic='force-dynamic';
export default async function Page(){const user=await getChatGPTUser();if(!user)return <div className="gm-denied"><h1>GM 管理後台</h1><p>請登入管理者帳號。</p><a className="primary-link" href={chatGPTSignInPath('/gm')} target="_top">登入</a></div>;if(!isGameMaster(user))return <div className="gm-denied"><h1>沒有管理權限</h1><p>此後台僅限遊戲管理者使用。</p><a href="/">返回遊戲</a></div>;return <Admin/>;}
