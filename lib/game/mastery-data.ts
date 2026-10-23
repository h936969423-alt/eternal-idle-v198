// Source: https://zxc518zxc.github.io/mastery.html (2026-10-12).
export type Material={name:string;qty:number;en?:number;blessed?:boolean;plain?:boolean;bound?:boolean};
export type MasteryStep={need:number;feed?:string[];zone?:string;gold?:number;materials:Material[]};
export type MasteryDefinition={id:string;name:string;cls:string;max:number;effect?:string;values?:number[];choice?:boolean;weapon?:boolean;fee:'flat'|'level'|'summon';steps:MasteryStep[]};
const mat=(name:string,qty:number,en?:number,blessed=false):Material=>({name,qty,en,blessed});
const steps=(needs:number[],materials:Material[][],feeds?:string[][],zones?:string[],gold?:number[]):MasteryStep[]=>needs.map((need,i)=>({need,materials:materials[i],feed:feeds?.[i],zone:zones?.[i],gold:gold?.[i]}));
const helmet=(name:string)=>steps([5,15,30],[1,2,3].map(n=>[mat(name,n,undefined,true)]),[0,1,2].map(()=>[name]));
const scrollNeeds=[10,50,100,200,500],scrollFeeds=scrollNeeds.map(()=>['對武器施法的卷軸','對盔甲施法的卷軸']);
const elfNeeds=[2000,2000,5000,5000,10000],elfFeeds=elfNeeds.map((_,i)=>[i%2?'金屬塊':'粗糙的米索莉塊']);
const weaponMaterials:Material[][]=[[],[mat('綁定武器',1,7)],[mat('綁定武器',1,8)],[mat('綁定武器',1,9)],[mat('綁定武器',2,9)]];
weaponMaterials.flat().forEach(m=>m.bound=true);
export const MASTERIES:MasteryDefinition[]=[
 {id:'k_str',name:'力量精通',cls:'knight',max:3,effect:'meleeDmg',values:[3,6,10],fee:'flat',steps:helmet('力量魔法頭盔')},
 {id:'k_dex',name:'敏捷精通',cls:'knight',max:3,effect:'meleeHit',values:[2,5,10],fee:'flat',steps:helmet('敏捷魔法頭盔')},
 {id:'k_dawn',name:'礦道不滅曙光',cls:'knight',max:5,effect:'potionBonus',values:[5,10,15,20,40],fee:'flat',steps:steps(scrollNeeds,[1,2,3,5,1].map((n,i)=>[mat('治癒魔法頭盔',n,undefined,i===4)]),scrollFeeds)},
 {id:'d_potion',name:'暗夜秘藥',cls:'dark',max:5,effect:'potionBonus',values:[5,10,15,20,40],fee:'flat',steps:steps(scrollNeeds,[1,2,3,5,2].map((n,i)=>[mat('暗影鋼爪',n,undefined,i===4)]),scrollFeeds,undefined,[1,2,3,4,5].map(n=>n*1000000))},
 {id:'k_weapon1',name:'武器大師（第一精通）',cls:'knight',max:5,choice:true,weapon:true,fee:'flat',steps:steps([666,6666,16888,66666,88888],weaponMaterials,undefined,['zone_22','zone_23','zone_25','zone_04','zone_04'],[1000000,0,0,0,0])},
 {id:'k_weapon2',name:'武器大師（第二精通）',cls:'knight',max:5,choice:true,weapon:true,fee:'flat',steps:steps([6666,16888,66666,26888,26888],weaponMaterials,undefined,['training','zone_08','dragon_valley','zone_41','dream_island'],[1000000,0,0,0,0])},
 {id:'m_drain',name:'魔力奪取',cls:'mage',max:5,effect:'manaDrainBonus',values:[2,4,10,14,20],fee:'flat',steps:steps([666,2500,12345,30000,77777],[1,1,2,2,3].map(n=>[mat('魔法書(魔力奪取)',n)]),undefined,undefined,[2,4,6,8,10].map(n=>n*1000000))},
 {id:'m_summon',name:'召喚精通',cls:'mage',max:5,effect:'summonBonus',values:[4,8,12,16,25],fee:'summon',steps:steps([0,0,0,0,0],[[mat('魔法書(召喚術)',1),mat('瑪那魔杖',1,7)],[mat('魔法書(召喚術)',1),mat('萬能藥(CHA)',2)],[mat('魔法書(召喚術)',2),mat('萬能藥(CHA)',5)],[mat('魔法書(召喚術)',1),mat('瑪那魔杖',1,9)],[mat('魔法書(召喚術)',3),mat('瑪那魔杖',1,9),mat('萬能藥(CHA)',10)]])},
 {id:'m_hit',name:'精準打擊',cls:'mage',max:3,effect:'meleeHit',values:[2,5,10],fee:'level',steps:steps([0,0,0],[[mat('鎖子甲破壞者',1,6),mat('瑪那魔杖',1,6),mat('魔法書(通暢氣脈術)',10)],[mat('鎖子甲破壞者',1,7),mat('瑪那魔杖',1,7),mat('魔法書(通暢氣脈術)',50)],[mat('鎖子甲破壞者',1,9),mat('瑪那魔杖',1,8),mat('魔法書(通暢氣脈術)',80)]])},
 {id:'e_wind',name:'願風神護佑你',cls:'elf',max:5,choice:true,fee:'level',steps:steps(elfNeeds,[[mat('精靈水晶(暴風神射)',2)],[mat('精靈水晶(三重矢)',3)],[mat('十字弓',2,8)],[mat('精靈水晶(暴風神射)',3),mat('精靈水晶(三重矢)',2)],[mat('十字弓',2,9)]],elfFeeds)},
 {id:'e_fire',name:'火之意志',cls:'elf',max:5,choice:true,fee:'level',steps:steps(elfNeeds,[[mat('武士刀',2,7)],[mat('鎖子甲破壞者',2,7)],[mat('武士刀',2,8)],[mat('鎖子甲破壞者',2,8)],[mat('武士刀',1,9),mat('鎖子甲破壞者',1,9)]],elfFeeds)},
 {id:'d_assassin',name:'暗殺之術',cls:'dark',max:5,choice:true,fee:'level',steps:steps([5000,5000,10000,10000,15000],[1,2,1,2,1].map((n,i)=>[mat('黑暗雙刀',n,[7,7,8,8,9][i])]),elfFeeds)},
];
export const CHOICE_VALUES={balance:[1,2,3,5,9],damage:[3,5,7,10,15],hit:[3,5,7,10,15]};
export const MASTERY_EFFECT_NAMES:Record<string,string>={meleeDmg:'近距離傷害',meleeHit:'近距離命中',rangedDmg:'遠距離傷害',rangedHit:'遠距離命中',potionBonus:'藥水恢復量 %',manaDrainBonus:'吸取魔力量',summonBonus:'召喚獸命中／傷害'};
