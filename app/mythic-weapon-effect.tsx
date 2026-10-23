'use client';
import {mythicProcDefinition} from '@/lib/game/lineagew-mythic-procs';
import type {CombatEvent} from '@/lib/game/engine';
export default function MythicWeaponEffect({event}:{event:CombatEvent}){
 const definition=mythicProcDefinition(event.skill);if(!definition)return null;
 const {kind,name}=definition;
 return <span className={`mythic-weapon-fx mythic-fx-${kind}`} role="img" aria-label={`${name}觸發動畫`}>
  <svg viewBox="0 0 128 128" aria-hidden="true">
   {kind==='lightning'?<><circle className="mythic-fx-halo" cx="64" cy="75" r="35"/><path className="mythic-fx-bolt" d="M78 5 34 66h28l-9 57 44-72H70Z"/></>:kind==='holy'?<><circle className="mythic-fx-ring" cx="64" cy="64" r="40"/><path className="mythic-fx-holy-cross" d="M57 23h14v34h34v14H71v34H57V71H23V57h34Z"/></>:kind==='chaos'?<><circle className="mythic-fx-halo" cx="64" cy="64" r="38"/><path className="mythic-fx-slash" d="M102 18 40 76 18 110 88 53 105 19Z"/><path className="mythic-fx-slash second" d="m22 33 84 60-55-57Z"/></>:kind==='gaia'?<><ellipse className="mythic-fx-ring" cx="64" cy="88" rx="50" ry="18"/><path className="mythic-fx-crystal" d="M40 95 32 44 47 58 64 10 79 58 96 39 88 95 64 112Z"/><path className="mythic-fx-rays" d="m64 88-4-40m18 38 12-24M49 87 37 65"/></>:kind==='dispel'?<><circle className="mythic-fx-ring" cx="64" cy="64" r="43"/><path className="mythic-fx-shatter" d="m64 20 31 14v30L78 92 64 108 42 84 33 61V34Zm0 0-6 37 20 7-22 26m2-33L33 61m45 3 17-30"/></>:<><ellipse className="mythic-fx-ring" cx="64" cy="64" rx="51" ry="30"/><path className="mythic-fx-eye" d="M12 64Q64 12 116 64 64 116 12 64Z"/><circle className="mythic-fx-pupil" cx="64" cy="64" r="16"/></>}
  </svg><small>{name}</small>
 </span>;
}
