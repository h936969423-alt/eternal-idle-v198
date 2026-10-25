import test from 'node:test';
import assert from 'node:assert/strict';
import {parseRecoveryStatus} from '../lib/game/recovery-status.ts';

test('recovery accepts the no-save API response and normalizes its missing estimate',()=>{
 assert.deepEqual(parseRecoveryStatus({available:false,pending:false,characters:[]}),{available:false,pending:false,characters:[],remainingSeconds:null});
});
test('recovery retains valid character summaries without exposing extra fields',()=>{
 const value={available:true,pending:true,characters:[{id:'a',name:'騎士',level:10,running:true}],remainingSeconds:120};
 assert.deepEqual(parseRecoveryStatus({...value,owner:'private'}),value);
});
test('malformed recovery data cannot enter the loading UI',()=>{
 for(const value of [null,{},'error',{available:true,pending:true,characters:[{}]},{available:true,pending:true,characters:[],remainingSeconds:-1},{available:true,pending:true,characters:[],remainingSeconds:NaN}])assert.equal(parseRecoveryStatus(value),null);
});
