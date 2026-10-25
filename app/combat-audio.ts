import sounds from '@/lib/game/sounds.json';
import raw from '@/lib/game/gamedata.json';
import { baseItem } from '@/lib/game/gear';
import type { Character,CombatEvent } from '@/lib/game/engine';
const S=sounds as Record<string,Record<string,string|number>>,items=raw.items as Record<string,any>,mobs=raw.mobs as Record<string,any>;let voices:HTMLAudioElement[]=[];let context:AudioContext|null=null;let enabled=false;let generation=0;let masterGain:GainNode|null=null;const fallbackVolumes=new WeakMap<HTMLAudioElement,number>();const buffers=new Map<string,Promise<AudioBuffer>>();const active=new Set<AudioBufferSourceNode>();
export function stopCombatVoices(){generation++;for(const source of active){try{source.stop();}catch{}}active.clear();for(const audio of voices)audio.pause();voices=[];}
export function unlockCombatAudio(on:boolean){
 if(enabled!==on)generation++;enabled=on;if(!on){stopCombatVoices();return;}
 const C=window.AudioContext||(window as any).webkitAudioContext;
 if(C&&!context){context=new C();masterGain=context!.createGain();masterGain.gain.value=masterVolume;masterGain.connect(context!.destination);document.addEventListener('visibilitychange',()=>{if(document.hidden)stopCombatVoices();});}
 void context?.resume().catch(()=>{});
}
function play(path:string,volume=.3){
 const requested=performance.now(),epoch=generation;if(!enabled||document.visibilityState==='hidden')return;
 if(context){const ctx=context;if(!buffers.has(path))buffers.set(path,fetch(path).then(r=>{if(!r.ok)throw Error('sound unavailable');return r.arrayBuffer();}).then(b=>ctx.decodeAudioData(b)));
 void buffers.get(path)!.then(buffer=>{if(!enabled||epoch!==generation||document.visibilityState==='hidden'||active.size>=12||performance.now()-requested>500)return;
 const source=ctx.createBufferSource(),gain=ctx.createGain();source.buffer=buffer;gain.gain.value=volume;source.connect(gain);gain.connect(masterGain||ctx.destination);active.add(source);
 source.onended=()=>{active.delete(source);source.disconnect();gain.disconnect();};source.start();
 }).catch(()=>{buffers.delete(path);});return;}
 voices=voices.filter(a=>!a.paused);if(voices.length>=12)return;const audio=new Audio(path);fallbackVolumes.set(audio,volume);audio.volume=volume*masterVolume;voices.push(audio);void audio.play().catch(()=>{});
}
function mapped(map:Record<string,string|number>,name:string){return map[name]||map[name.replace(/[（(][^）)]*[）)]/g,'').replace(/^(遺忘之島|夢幻之島|變種|強化|巨大|冰原)/,'').trim()];}
function number(id:string|number|undefined,volume=.3){if(id!==undefined)play(`/assets/sfx/${id}.ogg`,volume);}
const spellTimes=new Map<string,number>();
let masterVolume=1;
export function setCombatVolume(value:number){masterVolume=Math.max(0,Math.min(1,Number.isFinite(value)?value:1));if(masterGain&&context){masterGain.gain.setValueAtTime(masterVolume,context.currentTime);}for(const audio of voices)audio.volume=(fallbackVolumes.get(audio)||0)*masterVolume;}
export function sceneSound(kind:'transform'){if(kind==='transform')play('/assets/client-audio/124.wav',.3);}
function spell(e:CombatEvent,owner:string){if(!e.skill||e.source==='summon'||e.source==='poison')return;const key=owner+':'+e.skill+':'+e.at;if(spellTimes.has(key))return;spellTimes.set(key,e.at);if(spellTimes.size>100)spellTimes.delete(spellTimes.keys().next().value!);number(S.SPELL_SFX[(raw.skills as any)[e.skill]?.n],.4);}
export function combatSound(c:Character,e:CombatEvent){

 const name=e.mob?mobs[e.mob]?.n||'':'';const poly=e.polyName;const special=poly&&['黃金死亡騎士','赤紅刺客首領','蒼藍歐瑞','凱莉紗','地獄傑克'].includes(poly);
 if(e.kind==='attack'){
  // Arrow impacts are a second visual phase, not another weapon swing.
  // Play the launch sound only once and reserve the impact for monster hit SFX.
  if(e.visualPhase==='impact'){
   if(!e.miss&&e.damage){number(mapped(S.MOB_HURT_SFX,name),.2);if(e.mobHp===0)number(S.MOB_KILL_SFX[name]||57,.25);}
   return;
  }
  if(e.skill){spell(e,c.id);}
  else if(e.source==='doll'){}
  else if(e.source==='pet')number(mapped(S.MOB_ATTACK_SFX,e.petName||e.pet||''),.25);
  else if(e.source==='summon')number(mapped(S.MOB_ATTACK_SFX,e.summonName||e.pet||''),.25);
  else if(special)play(`/assets/morphsnd/${poly}/attack.ogg`,.35);
  else if(poly==='死亡騎士')play('/assets/sprites/deathknight/attack/86.wav',.35);
  else {const w=items[baseItem(c.equipment.weapon?.id||'')];number(poly&&mapped(S.MOB_ATTACK_SFX,poly)||(w?S.WPN_CAT_SFX[w.wcat]:'attack_unarmed')||S.WPN_SFX[w?.isBow?'bow':c.cls==='mage'?'blunt':c.cls==='knight'?'sword2':'sword1'],.35);}
  if(e.visualPhase!=='launch'&&!e.miss&&e.damage){number(mapped(S.MOB_HURT_SFX,name),.2);if(e.mobHp===0)number(S.MOB_KILL_SFX[name]||57,.25);}
 }
 if(e.kind==='magic'&&e.skill)spell(e,c.id);
 if(e.kind==='hurt'){number(mapped(S.MOB_ATTACK_SFX,name),.25);if(!e.miss&&e.damage){if(special)play(`/assets/morphsnd/${poly}/hurt.ogg`,.3);else if(poly==='死亡騎士')play('/assets/sprites/deathknight/hurt/88.wav',.3);else{const cls={knight:'騎士',elf:'妖精',mage:'法師',dark:'妖精'}[c.cls];number(poly&&mapped(S.MOB_HURT_SFX,poly)||S.HURT_SFX[(c.gender==='f'?'女':'男')+cls],.3);}}}
}

export function preloadCombatAudio(c:Character){
 if(!context)return;const ctx=context;const ids=new Set<string>();
 for(const id of c.skills||[]){const sound=S.SPELL_SFX[(raw.skills as any)[id]?.n];if(sound!==undefined)ids.add(String(sound));}
 const weapon=items[baseItem(c.equipment.weapon?.id||'')];const weaponSound=(weapon&&S.WPN_CAT_SFX[weapon.wcat])||S.WPN_SFX[weapon?.isBow?'bow':c.cls==='mage'?'blunt':c.cls==='knight'?'sword2':'sword1'];if(weaponSound!==undefined)ids.add(String(weaponSound));
 for(const mob of c.arena||[]){const name=mobs[mob.id]?.n;for(const map of [S.MOB_ATTACK_SFX,S.MOB_HURT_SFX,S.MOB_KILL_SFX]){const sound=name&&mapped(map,name);if(sound!==undefined)ids.add(String(sound));}}
 for(const summon of c.summonContract?.entities||[]){for(const map of [S.MOB_ATTACK_SFX,S.MOB_HURT_SFX]){const sound=mapped(map,summon.form);if(sound!==undefined)ids.add(String(sound));}}
 for(const id of ids){const path=`/assets/sfx/${id}.ogg`;if(!buffers.has(path))buffers.set(path,fetch(path).then(r=>{if(!r.ok)throw Error('sound unavailable');return r.arrayBuffer();}).then(b=>ctx.decodeAudioData(b)).catch(error=>{buffers.delete(path);throw error;}));void buffers.get(path)!.catch(()=>{});}
 const transform='/assets/client-audio/124.wav';if(!buffers.has(transform))buffers.set(transform,fetch(transform).then(r=>r.arrayBuffer()).then(b=>ctx.decodeAudioData(b)));void buffers.get(transform)!.catch(()=>{buffers.delete(transform);});
}
