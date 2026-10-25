/**
 * Dedicated offline settlement Worker for the isolated v198 test D1.
 *
 * Runs on a one-minute Cron Trigger, independent of user login requests.
 * Uses the same game engine as /api/game; D1 revision compare-and-swap makes
 * simultaneous login/cron settlement safe from lost updates or double awards.
 */
import {getGameSettings} from '../lib/game/game-settings';
import {advance,type Save} from '../lib/game/engine';
import {persistedSave} from '../lib/game/state-sync';

type DbRow={owner:string;payload:string;revision:number};
type WorkerEnv={DB:D1Database};
const MAX_ACCOUNTS=5;
const STALE_MS=45_000;
// Small budgets prevent a busy character from monopolizing the cron Worker.
// advance() stops on whole-second boundaries; unfinished work stays in catchup.
const SIMULATION_BUDGET_MS=35;

function attachSettings(save:Save,settings:Awaited<ReturnType<typeof getGameSettings>>){
 for(const c of save.characters){
  c.npcConfig={...settings.npcs,history:[]};
  c.mapAccess=settings.mapAccess;
  c.lootAppearance={...settings.appearance,history:[]};
  c.dollDefinitions=settings.dolls.definitions;
  c.mapPools=settings.maps.maps;
  c.bossGeneration=settings.maps.bosses;
  c.monsterDefinitions=settings.monsters.definitions;
  c.bossDropDefinitions=settings.monsters.bossDrops;
 }
}
export default {
 async scheduled(_event:ScheduledController,workerEnv:WorkerEnv,_ctx:ExecutionContext){
  const now=Date.now();
  // Ignore recently active accounts. Only offline hunters or interrupted
  // catchups are eligible. This query has no migrations or writes.
  const candidates=await workerEnv.DB.prepare(`
   SELECT owner,payload,revision FROM game_saves
   WHERE updated_at < ?
   AND (json_extract(payload,'$.catchup.targetAt') IS NOT NULL
    OR EXISTS (SELECT 1 FROM json_each(payload,'$.characters') AS c
               WHERE json_extract(c.value,'$.running') = 1))
   ORDER BY updated_at ASC LIMIT ?
  `).bind(now-STALE_MS,MAX_ACCOUNTS).all<DbRow>();
  if(!candidates.results?.length)return;
  const settings=await getGameSettings();
  for(const row of candidates.results){
   try{
    const save=JSON.parse(row.payload) as Save;
    if(!save.characters?.length)continue;
    // A candidate can be stale and still have no running hunter due to
    // corrupt/legacy markers; do not synthesize a new award in that case.
    if(!save.catchup&&!save.characters.some(c=>c.running))continue;
    attachSettings(save,settings);
    const previousAt=save.at;
    const report=advance(save,now,Math.random,settings.world,SIMULATION_BUDGET_MS);
    if(save.at<=previousAt)continue;
    const payload=JSON.stringify(persistedSave(save));
    const result=await workerEnv.DB.prepare(
     'UPDATE game_saves SET payload=?,revision=revision+1,updated_at=? WHERE owner=? AND revision=?'
    ).bind(payload,save.at,row.owner,row.revision).run();
    if(!result.meta.changes){
     // User login or another invocation already won the update race.
     // Discard this simulation rather than award it again.
     console.info('offline-cron-conflict',{settledSeconds:report.seconds});
    }else{
     console.info('offline-cron-commit',{settledSeconds:report.seconds,pendingSeconds:report.pendingSeconds});
    }
   }catch(e){
    // One broken save must not prevent other accounts from progressing.
    console.error('offline-cron-error',e instanceof Error?e.message:String(e));
   }
  }
 }
} satisfies ExportedHandler<WorkerEnv>;

