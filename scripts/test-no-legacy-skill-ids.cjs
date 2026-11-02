// Saves store only Lineage W skill ids (canonical-skills-v1), and the 69 old ids no longer exist in the
// runtime skill table. A player rule written against an old id therefore never fires (dead code that
// looks alive). Old ids are allowed only where they name something else: the save migration, the
// legacy→W map, monster/pet/doll/weapon-proc spell catalogues, and sets that accept both ids.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const root=path.resolve(__dirname,'..');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);
const {W_LEGACY}=require(path.join(root,'lib/game/lineagew-skill-data.ts'));
const allowed={
 'lib/game/skill-id-migration.ts':'*','lib/game/lineagew-skill-data.ts':'*',
 'lib/game/affix-rules.ts':'*','lib/game/doll-combat.ts':'*','lib/game/doll-config.ts':'*',            // weapon / doll proc spell catalogues
 'lib/game/monster-config.ts':'*','lib/game/lineagew-mythic-procs.ts':'*', // monster spells and monster effects
 'app/mythic-target-status.tsx':['sk_holy_barrier'],
 'lib/game/npc-magic.ts':'*',                                            // canonicalised shop list
 'lib/game/projectile-timing.ts':['sk_elf_triple'],'lib/game/damage-display.ts':['sk_elf_triple','sk_shock_stun','sk_dark_crit','sk_counter_barrier'],
 'lib/game/engine.ts':['sk_lightarrow','sk_fireball','sk_earthquake','sk_holy_barrier'], // pet / monster spell visuals
};
const files=[];const walk=d=>{for(const n of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,n.name);if(n.isDirectory())walk(p);else if(/\.tsx?$/.test(n.name))files.push(p);}};
walk(path.join(root,'lib'));walk(path.join(root,'app'));
const found=[];
for(const f of files){const rel=path.relative(root,f).split(path.sep).join('/'),src=fs.readFileSync(f,'utf8'),allow=allowed[rel];if(allow==='*')continue;
 for(const old of Object.keys(W_LEGACY)){if(!new RegExp('\\b'+old+'\\b').test(src))continue;if(Array.isArray(allow)&&allow.includes(old))continue;found.push(`${rel}: ${old} (use ${W_LEGACY[old]})`);}}
assert.deepEqual(found,[],'player rules must use Lineage W ids:\n'+found.join('\n'));
console.log(`PASS no player rule checks one of the ${Object.keys(W_LEGACY).length} retired skill ids (${files.length} files scanned)`);
