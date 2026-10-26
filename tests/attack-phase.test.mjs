import test from 'node:test';
import assert from 'node:assert/strict';
import {rescaleAttackClock} from '../lib/game/combat-clock.ts';

test('player haste keeps elapsed attack fraction',()=>{
 assert.equal(rescaleAttackClock(0.6,1.2,0.6),0.3);
});
test('monster slow keeps elapsed attack fraction',()=>{
 assert.equal(rescaleAttackClock(0.5,1,2),1);
});
test('unchanged attack interval preserves the clock',()=>{
 assert.equal(rescaleAttackClock(0.25,1,1),0.25);
});
test('invalid and stale attack clocks reset safely',()=>{
 assert.equal(rescaleAttackClock(Number.NaN,1,2),0);
 assert.equal(rescaleAttackClock(99999,1,2),0);
});
test('new actor clock is clamped to the active period',()=>{
 assert.ok(rescaleAttackClock(3,undefined,1)<1);
});
