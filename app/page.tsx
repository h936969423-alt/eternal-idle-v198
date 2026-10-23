import Game from './game';
import { isGameMaster } from '@/lib/game/world-store';
import { getChatGPTUser, chatGPTSignInPath } from './chatgpt-auth';
export const dynamic='force-dynamic';
export default async function Page(){const user=await getChatGPTUser();return <Game signedIn={!!user} gmAllowed={isGameMaster(user)} signIn={chatGPTSignInPath('/')} />;}
