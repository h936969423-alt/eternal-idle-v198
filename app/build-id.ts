// Replaced at build time (vite.config.ts `define`). Client and server of one deploy share the value,
// so a page left open across a deploy can tell that the server is newer than its own code.
declare const __APP_BUILD__:string|undefined;
export const APP_BUILD:string=typeof __APP_BUILD__==='string'&&__APP_BUILD__?__APP_BUILD__:'dev';
