const KEY='eternal-gm-return-character';

// Tab-local and one-shot: normal sign-in still opens the character picker.
export function rememberGmReturn(characterId?:string){
 try{if(characterId)window.sessionStorage.setItem(KEY,characterId);}catch{}
}

export function consumeGmReturn(activeId?:string,deleted=false):boolean{
 if(typeof window==='undefined')return false;
 let remembered:string|null=null;
 try{remembered=window.sessionStorage.getItem(KEY);window.sessionStorage.removeItem(KEY);}catch{}
 const url=new URL(window.location.href);
 const returning=url.searchParams.get('resume')==='gm';
 if(returning){url.searchParams.delete('resume');window.history.replaceState(window.history.state,'',url.pathname+url.search+url.hash);}
 return !!activeId&&!deleted&&(returning||remembered===activeId);
}
