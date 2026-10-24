import test from 'node:test';
import assert from 'node:assert/strict';
import {pushCue,advanceMotion,durationFor} from '../lib/game/animation-clock.ts';

const duration=kind=>durationFor(kind,4);
const cue=(seq,kind)=>({seq,kind,at:seq*100});

test('monster attack during spawn is queued then played',()=>{
 let state={kind:'spawn',at:0,duration:500,pending:[]};
 state=pushCue(state,cue(1,'attack'),100,duration,true,false);
 assert.equal(state.kind,'spawn');
 assert.equal(state.pending[0].kind,'attack');
 state=advanceMotion(state,501,duration);
 assert.equal(state.kind,'attack');
});
test('monster attack during skill is queued then played',()=>{
 let state={kind:'skill',at:100,duration:500,pending:[]};
 state=pushCue(state,cue(2,'attack'),200,duration,true,false);
 assert.equal(advanceMotion(state,601,duration).kind,'attack');
});
test('dead monster ignores subsequent attacks',()=>{
 const state={kind:'death',at:0,duration:500,pending:[]};
 assert.deepEqual(pushCue(state,cue(3,'attack'),200,duration,true,false),state);
});
test('attack animation has finite duration',()=>{
 assert.equal(durationFor('attack',4),500);
});

test('rapid monster attacks stay queued in order after spawn',()=>{
 let state={kind:'spawn',at:0,duration:500,pending:[]};
 for(let i=1;i<=3;i++)state=pushCue(state,cue(i,'attack'),i*50,duration,true,false);
 assert.deepEqual(state.pending.map(e=>e.seq),[1,2,3]);
 state=advanceMotion(state,501,duration);
 assert.equal(state.kind,'attack');
 assert.deepEqual(state.pending.map(e=>e.seq),[2,3]);
 state=advanceMotion(state,1002,duration);
 assert.deepEqual(state.pending.map(e=>e.seq),[3]);
 state=advanceMotion(state,1503,duration);
 assert.deepEqual(state.pending,[]);
});
test('monster pending attack queue remains bounded',()=>{
 let state={kind:'spawn',at:0,duration:500,pending:[]};
 for(let i=1;i<=10;i++)state=pushCue(state,cue(i,'attack'),i*10,duration,true,false);
 assert.deepEqual(state.pending.map(e=>e.seq),[7,8,9,10]);
});
