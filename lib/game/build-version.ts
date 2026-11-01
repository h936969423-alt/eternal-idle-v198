/** The server runs a different deploy than the code in this page (a dev build never prompts). */
export function isNewerBuild(own:string,server:unknown):boolean{return own!=='dev'&&typeof server==='string'&&server.length>0&&server!=='dev'&&server!==own;}
