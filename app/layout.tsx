import {INTERFACE_THEME_SCRIPT} from '@/lib/interface-preferences';
import {STARTUP_RECOVERY_SCRIPT} from '@/lib/game/startup-recovery';
import type { Metadata } from 'next';
import './globals.css';
import './ice-blue.css';
import InterfaceTheme from './interface-theme';
export const metadata:Metadata={title:'永夜放置｜冒險之書',description:'四職業放置冒險，自動狩獵、裝備、技能與離線成長。',icons:{icon:'/favicon.svg'},manifest:'/manifest.webmanifest'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="zh-Hant"><body suppressHydrationWarning><script id="interface-theme-startup" dangerouslySetInnerHTML={{__html:INTERFACE_THEME_SCRIPT}}/><script id="game-startup-guard" dangerouslySetInnerHTML={{__html:STARTUP_RECOVERY_SCRIPT}}/><InterfaceTheme/>{children}<aside id="game-startup-recovery" className="game-startup-recovery" hidden suppressHydrationWarning role="alert"><h2>遊戲啟動逾時</h2><p>載入時間較長，請稍候；若仍無法進入，可按下方按鈕重新載入。</p><a id="game-startup-reload" className="primary-link" href="/?__game_reload=manual" target="_top">重新載入遊戲</a></aside></body></html>;}
