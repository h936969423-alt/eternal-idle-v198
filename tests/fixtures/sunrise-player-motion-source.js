// Test oracle: verbatim player motion functions from pp771007/idle-lineage-class
// commit 5f00f4a86389aaa7309c24d7a7c1ab060c47b500, js/09-vfx-render.js.
function _pmCurActivePrio() {   // 目前「仍在播放中」動作的權重（已播完/待機→0）
    let st = _pmState;
    if (!st.act || st.act === 'idle') return 0;
    if (st.act === 'death') return _PM_PRIO.death;   // 死亡鎖定
    let form = _playerBattleForm(); let a = form && _morphBattleCache[form.key];
    if (!a || a === 'probing') return 0;
    let seq = (st.act === 'skill' && !st.skGen && a.wskill) ? a.wskill : a[st.act];
    if (!seq || !seq.length) return 0;
    let fms = (st.act === 'attack') ? _atkFrameMs((player.d && player.d.aspd) || 0, seq.length)
        : (st.act === 'skill') ? _skillFrameMs(seq.length) : (1000 / MOB_ANIM_FPS);
    return ((Date.now() - st.t) < seq.length * fms) ? (_PM_PRIO[st.act] || 0) : 0;   // 仍在播→其權重·已播完→0(idle)
}
function _playerMorphTrigger(k, skId) {   // js/04 attack／castSkill·manualCast 包裝 skill／HP-delta hurt 呼叫（🗡️ v3.0.67 職業形態亦適用·呼叫端零改動）
    let form = _playerBattleForm(); if (!form) return;
    let st = _pmState;
    if (st.act === 'death') return;   // 死亡鎖定：復活前不接受任何動作（最高權重）
    let newP = _PM_PRIO[k] || 0, curP = _pmCurActivePrio();   // 🎬 v3.0.106 依權重決定是否打斷（hurt>skill>attack）
    if (newP < curP) { if (k === 'attack') st.pendAtk = true; return; }   // 權重較低→不打斷（attack 排隊·hurt/skill 直接略過）
    if (k === 'skill') st.skGen = (skId === 'sk_warrior_roar');   // 🗡️ v3.0.70 戰士咆哮用「通用」skill 動作（CSV 規則）·其餘技能優先武器專屬 wskill
    st.act = k; st.t = Date.now(); st.pendAtk = false;   // 🔮 新動作生效→清掉排隊中的攻擊（已被取代）
}
function _atkFrameMs(intervalSec, seqLen) {
    let base = 1000 / MOB_ANIM_FPS;   // 預設 125ms/幀（8fps）
    if (!(intervalSec > 0) || !(seqLen > 0)) return base;
    return Math.max(45, Math.min(base, intervalSec * 1000 / seqLen));
}
function _skillFrameMs(seqLen, lockTicks) { return _atkFrameMs((lockTicks != null ? lockTicks : ((player && player.d && player.d.castLock) || 12)) / 10, seqLen); }
function _playerMorphApply() {   // 8fps ticker 驅動（🗡️ v3.0.67 形態＝變身優先→職業動態·key 含武器變體→換武器自動重建）
    let form = _playerBattleForm();
    let bv = document.getElementById('battle-view');
    let inBattle = bv && !bv.classList.contains('hidden') && bv.classList.contains('area-fit');
    if (!form || !inBattle) { if (_pmState.el) _playerMorphRemove(); return; }
    // 🌀 v3.0.102 傳送術特效期間：暫時隱藏玩家 sprite（特效結束自動恢復·期間跳過渲染）
    if (_teleportFxUntil > Date.now()) { if (_pmState.el) _pmState.el.style.visibility = 'hidden'; return; }
    if (_pmState.el && _pmState.el.style.visibility === 'hidden') _pmState.el.style.visibility = '';
    let a = _morphBattleCache[form.key];
    if (a === undefined) { _battleSpriteProbe(form); return; }
    if (!a || a === 'probing') return;
    if (_pmState.name !== form.domKey) { _playerMorphRemove(); _pmState.name = form.domKey; }   // 🧭 v3.2.12 只在武器/變身(domKey)變時重建·換朝向(form.key 變·domKey 不變)只換幀
    // 受擊：HP-delta 偵測（涵蓋物理/魔法/DoT 所有傷害落點）
    let hp = player.hp;
    if (_pmState.prevHp != null && hp < _pmState.prevHp && hp > 0) _playerMorphTrigger('hurt');
    _pmState.prevHp = hp;
    // 死亡/復活：以遊戲的 player.dead 旗標為準（手動改 hp 不觸發·regen 亦不誤判）；復活(revive 清旗標)→解除凍結回待機
    let _dead = !!player.dead || hp <= 0;
    if (_dead) { if (_pmState.act !== 'death') { _pmState.act = 'death'; _pmState.t = Date.now(); _pmState.pendAtk = false; try { if (typeof playMorphDeathSfx === 'function') playMorphDeathSfx(); } catch (e) {} } }   // 🧝 v3.0.47 變身死亡音（該怪物死亡音·一次）
    else if (_pmState.act === 'death') _pmState.act = null;
    // 建立 DOM（懶建·battle-view 直屬子節點·renderMobs 只重建 #mob-list 不動此層）
    if (!_pmState.el) {
        let el = document.createElement('div');
        el.id = 'player-morph-sprite';
        let sh = document.createElement('img'); sh.className = 'pm-shadow';
        let bd = document.createElement('img'); bd.className = 'pm-body';
        let wp = document.createElement('img'); wp.className = 'pm-weapon';
        let cr = document.createElement('img'); cr.className = 'pm-castle-crown'; cr.src = 'assets/ui/castle-crown.gif?v=v3.6.22'; cr.style.visibility = 'hidden';
        [sh, bd, wp, cr].forEach(i => { i.alt = ''; i.draggable = false; });
        el.append(sh, bd, wp, cr);
        bv.appendChild(el);
        _pmState.el = el; _pmState.imgs = { sh: sh, bd: bd, wp: wp, cr: cr };
        let w = (a.idle && a.idle[0]) ? a.idle[0].naturalWidth : 100;
        el.style.width = w + 'px';
    } else if (_pmState.el.parentElement !== bv) bv.appendChild(_pmState.el);
    // 🗡️ v3.0.71 每輪更新：站怪物格縫隙(依 5格/3格版面動態)·免 transform；🤝 v3.6.89 固定站位＝玩家恆前排中央（bottom/zIndex 一併固定）
    // 🚶 v3.7.64 主角走位（取代 v3.6.89 玩家固定站位·僅主玩家；傭兵仍固定站位）：_playerMoveStep 每輪步進·CSS 補間平滑（同寵物 .14s linear）
    {
        let _pw = (a.idle && a.idle[0]) ? a.idle[0].naturalWidth : 100;
        if (PLAYER_BATTLE_WALK) {
            _playerMoveStep(bv);
            if (!_pmState.el._moveTrans) { _pmState.el.style.transition = 'left .14s linear, bottom .14s linear'; _pmState.el._moveTrans = true; }
            _pmState.el.style.left = 'calc(' + (_pmState.mx * 100).toFixed(2) + '% - ' + Math.round(_pw / 2) + 'px)';
            _pmState.el.style.bottom = (Math.round(_pmState.mb) - _playerMorphYOffset(form)) + 'px';
            _pmState.el.style.zIndex = String(Math.max(1, 30 - Math.round(_pmState.mb)));
        } else {   // 🧍 v3.7.81 固定站位（v3.6.89 原制·同傭兵那行）：不步進、不補間、moving 恆 false→朝向恆對目標且待機播 idle
            let _pp = _partySpritePos().P;
            if (_pmState.el._moveTrans) { _pmState.el.style.transition = ''; _pmState.el._moveTrans = false; }
            _pmState.moving = false; _pmState.mx = null;   // mx 清空＝開關切回 true 時重新以固定站位起步
            _pmState.el.style.left = 'calc(' + _pp.x + ' - ' + Math.round(_pw / 2) + 'px)';
            _pmState.el.style.bottom = (_pp.b - _playerMorphYOffset(form)) + 'px';
            _pmState.el.style.zIndex = String(30 - _pp.b);
        }
    }
    // 🧭 v3.7.65 朝向：移動中已由 _playerMoveStep 依移動向量寫入 player._faceD（走路面向前進方向）→ 只有停下時才轉向攻擊目標
    //    🧍 v3.7.81 固定站位下 moving 恆 false → 這行每輪都跑＝朝向永遠對著攻擊目標（同傭兵）
    if (!_pmState.moving && (CLASS_ANIM_8DIR.has(player.avatar) || MORPH_ANIM_3DIR.has(_playerMorphName() || ''))) _classFacing8(player, _pmState.el);
    // 動作＋幀（比照 _mobAnimApply：單次動作播一輪回待機·death 凍結最後一幀）
    let act = null, f = 0, _useW = false;
    if (_pmState.act) {
        let seq = a[_pmState.act];
        if (_pmState.act === 'skill' && !_pmState.skGen && a.wskill) { seq = a.wskill; _useW = true; }   // 🗡️ v3.0.70 武器專屬 skill 優先（戰士咆哮 skGen→通用）
        if (seq) {
            let _fms = (_pmState.act === 'attack') ? _atkFrameMs((player.d && player.d.aspd) || 0, seq.length)   // ⚔️ v3.0.91 攻擊動畫隨攻速加速
                : (_pmState.act === 'skill') ? _skillFrameMs(seq.length)   // 🔮 v3.0.94 技能動畫隨施法速度加速（castLock 內播完）
                : (1000 / MOB_ANIM_FPS);
            let ff = Math.floor((Date.now() - _pmState.t) / _fms);
            if (_pmState.act === 'death') { act = 'death'; f = Math.min(ff, seq.length - 1); }
            else if (ff < seq.length) { act = _pmState.act; f = ff; }
            else {
                _pmState.act = null;
                if (_pmState.pendAtk && a.attack) { _pmState.pendAtk = false; _pmState.act = 'attack'; _pmState.t = Date.now(); act = 'attack'; f = 0; _useW = false; }   // 🎬 v3.0.106 skill／hurt 播完→接播排隊中的攻擊動畫
                else _pmState.pendAtk = false;
            }
        } else if (_pmState.act !== 'death') _pmState.act = null;   // 該動作無序列→回待機（death 無序列則維持 idle）
        else act = null;
    }
    // 🚶 v3.7.65 待機層：移動中且有行走幀→播 walk（8fps 循環）·否則 idle
    if (act === null) {
        let mv = _pmState.moving && a.walk && a.walk.length;
        let base = mv ? a.walk : a.idle;
        if (base) { act = mv ? 'walk' : 'idle'; f = Math.floor(Date.now() / (1000 / MOB_ANIM_FPS)) % base.length; _useW = false; }
    }
    if (act === null) return;
    let seq = (act === 'skill' && _useW) ? a.wskill : a[act]; if (!seq || !seq[f]) return;
    let I = _pmState.imgs;
    if (!I.cr && _pmState.el) {
        let cr = document.createElement('img'); cr.className = 'pm-castle-crown'; cr.src = 'assets/ui/castle-crown.gif?v=v3.6.22'; cr.alt = ''; cr.draggable = false; cr.style.visibility = 'hidden';
        _pmState.el.appendChild(cr); I.cr = cr;
    }
    if (I.bd.src !== seq[f].src) I.bd.src = seq[f].src;
    _playerBattleCrownApply(I.cr, form, act);
    let ss = (act === 'skill' && _useW) ? a.shadow.wskill : a.shadow[act];   // 影子：寬容（幀數不足取模·缺動作隱藏）
    if (ss && ss.length) { let sf = f < ss.length ? f : (f % ss.length); if (I.sh.style.visibility === 'hidden') I.sh.style.visibility = ''; if (I.sh.src !== ss[sf].src) I.sh.src = ss[sf].src; }
    else if (I.sh.style.visibility !== 'hidden') I.sh.style.visibility = 'hidden';
    let ws = a.weapon[act];   // 武器：嚴格 1:1（本動作本幀無 _w→隱藏·v2.7.36 規則）
    if (ws && ws[f]) { if (I.wp.style.visibility === 'hidden') I.wp.style.visibility = ''; if (I.wp.src !== ws[f].src) I.wp.src = ws[f].src; }
    else if (I.wp.style.visibility !== 'hidden') I.wp.style.visibility = 'hidden';
}
