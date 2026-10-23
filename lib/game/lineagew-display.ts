import {lineageWEquipmentReference} from './lineagew-equipment';
/** Display the currently equipped stage, adding enhancement values to base attributes. */
export function lineageWDisplayedAbilities(item:any,en:number){
 const r=lineageWEquipmentReference(item);if(!r)return [];
 const max=Math.max(0,...Object.keys(r.enhancements).map(Number)),stage=Math.min(max,Math.max(0,Math.floor(Number.isFinite(en)?en:0)));
 const rows=new Map<string,{value?:number;text:string}>();
 for(const text of [...r.attributes,...(r.enhancements[String(stage)]||[])]){
  const m=text.match(/^(.*?)\s+([+-]?\d+(?:\.\d+)?)(%)?$/);
  if(!m){rows.set(text,{text});continue;}
  const key=m[1]+(m[3]||''),value=(rows.get(key)?.value||0)+Number(m[2]);
  rows.set(key,{value,text:`${m[1]} ${m[1].includes('發動機率')?'':value>=0?'+':''}${Number(value.toFixed(4))}${m[3]||''}`});
 }
 if(item.lwGrade==='mythic'&&item.type==='wpn'){
  const g=r.growth[String(stage)]||{};
  if(g.undead){for(const [key,value]of rows)if(value.text.startsWith('不死族追加傷害'))rows.delete(key);rows.set('不死族追加傷害',{text:'不死族追加傷害 '+(r.stats.undead?2:1)+'~'+((r.stats.undead||0)+g.undead)});}
  for(const [key,value]of rows)if(/增加[大小]型目標傷害(?:最大|最小)值/.test(value.text))rows.delete(key);
  for(const [label,size]of [['小型目標傷害','S'],['大型目標傷害','L']]){const base=label+' '+(r.stats['min'+size]||1)+'~'+r.stats['max'+size];rows.set(base,{text:label+' '+((r.stats['min'+size]||1)+(g['min'+size]||0))+'~'+(r.stats['max'+size]+(g['max'+size]||0))});}
 }
 return [...rows.values()].map(r=>r.text);
}
