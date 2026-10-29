/** Display text only: retain stable IDs, asset paths and all numeric game data. */
export function cleanGameText(text:string):string{
 return text.replace(/阿肥大師/g,'卷軸大師').replace(/阿肥(?:放置天堂)?|日出(?:帝國)?|天堂\s*[wｗ]/gi,'').trim();
}
const displayKeys=new Set(['n','name','title','d','description','text','source','lwRuleText']);
export function cleanDisplayValue(key:string,value:unknown):unknown{
 return typeof value==='string'&&displayKeys.has(key)?cleanGameText(value):value;
}
