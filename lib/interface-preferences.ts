export type InterfaceThemeName='classic'|'ice';
export type InterfacePreferences=Record<string,any>&{theme:InterfaceThemeName;paletteVersion:number};
const KEY='eternal-interface';
let memory:InterfacePreferences|undefined;
export function normalizeInterfaceTheme(value:unknown):InterfaceThemeName{return value==='classic'?'classic':'ice';}
/** Keep explicit supported choices, including legacy saves without a palette version. */
export function interfacePreferences():InterfacePreferences{
 let prefs:Record<string,any>=memory||{};
 try{const raw=localStorage.getItem(KEY);prefs={};const saved=JSON.parse(raw||'{}');if(saved&&typeof saved==='object'&&!Array.isArray(saved))prefs=saved;}catch{}
 const normalized={...prefs,theme:normalizeInterfaceTheme(prefs.theme),paletteVersion:1};
 if(prefs.theme!==normalized.theme||prefs.paletteVersion!==1){try{localStorage.setItem(KEY,JSON.stringify(normalized));}catch{}}
 memory=normalized;return normalized;
}
/** Save synchronously on selection so closing the page cannot lose the last choice. */
export function saveInterfacePreferences(update:Record<string,unknown>){
 const next={...interfacePreferences(),...update};next.theme=normalizeInterfaceTheme(next.theme);next.paletteVersion=1;
 memory=next;try{localStorage.setItem(KEY,JSON.stringify(next));}catch{}
 if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent('eternal-interface-change',{detail:next}));
 return next;
}
/** Apply the saved palette before the game renders, without forcing ice on hydration. */
export const INTERFACE_THEME_SCRIPT=`(()=>{let theme='ice';try{const p=JSON.parse(localStorage.getItem('eternal-interface')||'{}');if(p&&p.theme==='classic')theme='classic';}catch{}document.body.classList.toggle('ice-blue',theme==='ice');})();`;
