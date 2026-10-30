import {playerSpriteLayout,playerSpriteFootOffset} from '@/lib/game/player-sprite-layout';
import {morphCastLayers,type MorphCastClip} from '@/lib/game/morph-cast';
export default function PlayerSpriteFrame({src,formId,canvas,clip,frame=0,...props}:{src:string;formId?:string;canvas?:number[];clip?:MorphCastClip;frame?:number;className:string;'data-action'?:string;'data-direction'?:number;'data-polymorph'?:string;'data-target-uid'?:string;'data-mirrored'?:boolean;alt:string}){
 const normalized=playerSpriteLayout(formId);
 if(!formId&&!clip&&!normalized)return <img src={src} {...props}/>;
 // Keep one DOM host and one native canvas through idle/attack/cast. Switching
 // an img into an SVG span during a cast remounted the actor on mobile Safari.
 const {alt,...attributes}=props,nativeCanvas=canvas||clip?.layout.viewBox||[1,1];
 const layout=normalized||{viewBox:nativeCanvas,x:0,y:0,width:nativeCanvas[0],height:nativeCanvas[1]},{viewBox,...rect}=layout;
 const clipRect=clip?{x:clip.layout.x,y:clip.layout.y,width:clip.layout.width,height:clip.layout.height}:{};
 const layers=clip?morphCastLayers(clip,frame):undefined;
 const content=layers?<g transform={`translate(0 ${playerSpriteFootOffset(formId,layers.body)})`}>{layers.shadow&&<image className="polymorph-cast-shadow" href={layers.shadow} {...clipRect}/>}<image className="polymorph-cast-body" href={layers.body} {...clipRect}/>{layers.weapon&&<image className="polymorph-cast-weapon" href={layers.weapon} {...clipRect}/>}</g>:null;
 // Nested coordinates preserve the same sheet scale for idle, attack and cast.
 return <span {...attributes} className={`${props.className} polymorph-cast-sprite`} role="img" aria-label={alt}><svg viewBox={`0 0 ${viewBox.join(' ')}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true">{clip?(normalized?<svg {...rect} viewBox={`0 0 ${clip.layout.viewBox.join(' ')}`} overflow="visible">{content}</svg>:content):<image href={src} {...rect}/>}</svg></span>;
}


