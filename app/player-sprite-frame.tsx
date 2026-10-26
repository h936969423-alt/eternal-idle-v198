import {playerSpriteLayout,playerSpriteFootOffset} from '@/lib/game/player-sprite-layout';
import {morphCastLayers,type MorphCastClip} from '@/lib/game/morph-cast';
export default function PlayerSpriteFrame({src,formId,clip,frame=0,...props}:{src:string;formId?:string;clip?:MorphCastClip;frame?:number;className:string;'data-action'?:string;'data-direction'?:number;'data-polymorph'?:string;alt:string}){
 const normalized=playerSpriteLayout(formId);
 if(!clip&&!normalized)return <img src={src} {...props}/>;
 const {alt,...attributes}=props,layout=normalized||clip!.layout,{viewBox,...rect}=layout;
 const clipRect=clip?{x:clip.layout.x,y:clip.layout.y,width:clip.layout.width,height:clip.layout.height}:{};
 const layers=clip?morphCastLayers(clip,frame):undefined;
 const content=layers?<g transform={`translate(0 ${playerSpriteFootOffset(formId,layers.body)})`}>{layers.shadow&&<image className="polymorph-cast-shadow" href={layers.shadow} {...clipRect}/>}<image className="polymorph-cast-body" href={layers.body} {...clipRect}/>{layers.weapon&&<image className="polymorph-cast-weapon" href={layers.weapon} {...clipRect}/>}</g>:null;
 // Nested coordinates preserve the same sheet scale for idle, attack and cast.
 return <span {...attributes} className={`${props.className} polymorph-cast-sprite`} role="img" aria-label={alt}><svg viewBox={`0 0 ${viewBox.join(' ')}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true">{clip?(normalized?<svg {...rect} viewBox={`0 0 ${clip.layout.viewBox.join(' ')}`} overflow="visible">{content}</svg>:content):<image href={src} {...rect}/>}</svg></span>;
}
