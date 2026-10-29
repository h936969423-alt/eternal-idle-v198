/** Source _vec2dir: NW,N,NE,E,SE,S,SW,W. Existing polymorph sheets have
 * NW/N/NE folders (0/1/2); fold other vectors as Sunrise ANIM_DIR_SFX3 does. */
export function playerTargetDirection(dx:number,dy:number,eight=false,previous=2){
 if(Math.abs(dx)<4&&Math.abs(dy)<4)return previous;
 const oct=Math.round(Math.atan2(dy,dx)*4/Math.PI);
 const full=({0:3,1:4,2:5,3:6,4:7,'-4':7,'-3':0,'-2':1,'-1':2} as Record<string,number>)[oct]??2;
 return eight?full:[0,1,2,2,2,2,0,0][full];
}
