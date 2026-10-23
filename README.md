# 永夜放置

目前版本：三怪同場、擊殺 600ms 後補位、逐刀傷害與 HP 事件播放、變身音效、裝備工坊及掛機自動販賣。此戰鬥模式已取代先前雙倍重生等待。

Private, server-backed idle RPG using the public afei.gg client snapshot collected on 2026-10-05. This is a reconstruction, not an exact copy of the unavailable server implementation.

## Source-preserved values

- Four classes and both genders, initial attributes, class allocation totals, initial attribute cap 20 and complete allocation requirement.
- Original 658 items, 248 mobs, 123 skills, 93 map spawn configurations, 12 sets, towns/NPCs, 22 world-boss records and 53 doll identifiers.
- Item prices, weapon small/large damage, weapon speed/hit/enhancement-safe values, armor contributions, class restrictions.
- Mob HP, level, AC/MR, physical attack range/speed, experience and gold range.
- Red/orange/white healing potion values 15/40/60, bravery/haste speed 33%, elf cookie speed 15%, specified potion durations and class restrictions, cautious potion +2 magic damage and +2 MP recovery, manual fruit healing 44–107.
- Original provided portrait/icon/animation/background assets. Missing icon mappings use an explicit generic icon rather than inventing an original asset.

## Reconstructed mechanics

The source server was not provided. HP/MP progression, XP curve, ordinary equipment drops (12%), damage and hit formulas, spell formulas, some buff semantics, blue potion scaling, store assortment, resale price, enhancement above safety, skill learning prices, personal bank and offline calculations are this implementation's rules. They are disclosed in the in-game rules dialog.

Unavailable: multiplayer world-boss battles, global respawn scheduler, complete loot tables, doll names/abilities, NPC crafting/exchange recipes, social systems, private player DB, pet mechanics, special monster spells/status effects and special/passive skills. Catalog records are retained but are not presented as functional server implementations. Doll draw/activation has no UI and does not grant invented doll effects.

## Progress and runtime

Game state is authoritative on the server. D1 stores each authenticated user's save; optimistic revisions prevent concurrent requests from overwriting a newer save. No browser storage is used for progress. The game supports four independent characters and offline settling up to 12 hours, using the same sequential battle loop as online play. Death stops that character's hunt. Viewing another character does not stop characters already hunting.

## Validation

- TypeScript check and Worker-compatible production build.
- Core checks: source class values/caps, potion amounts, class restrictions, 33% speed and buff expiry, armor reducing AC, online/offline deterministic equivalence, 12-hour cap, death stopping hunting and fractional time carry.
- Route integration with real SQLite and emulated D1/auth adapters: identity required, persisted create/read, purchases, failed-action save preservation, character selection, potion settings, offline settlement/rewards and user isolation. Managed preview HTTP access was unavailable.
- Browser visual interaction QA and WebMCP execution were unavailable; WebMCP tools feature-detect support and do not affect normal gameplay.

## GM world management

`/gm` and `/api/gm` require authenticated platform identity matching the secret `GM_OWNER_EMAIL`. Every management read/write checks server-side authorization; request bodies cannot grant a role. Normal game responses expose only the current public world rules and GM eligibility.

All 93 hunting maps use real per-character spawn-slot pools: 684 original entries × 2 = 1,368 slots across maps. Each slot records its death time. Base respawn is the previous one-second target-generation cadence; multiplier 2 gives two seconds. Cooldowns persist across map travel and reloads. Each map stays a private single-player instance; additional monsters are available targets, not simultaneous attackers. Villages have no monster pool. Multiplayer world bosses are still not implemented.

World settings default to count ×2 and respawn time ×2, are persisted separately in D1, and can be changed from the GM panel. Their timestamped history applies the corresponding rules during offline simulation, so a later configuration change does not rewrite earlier offline time. Changes use optimistic revision checks to reject stale updates. Existing character saves remain compatible.

GM 角色管理：僅伺服器驗證的管理者可管理自己帳號的角色。支援提升 1 級、提升至指定等級（上限 99，補發能力點）、搜尋裝備並贈送 1–100 件到背包，以及每次固定發放 50,000 金幣。操作與存檔以 D1 transaction 原子寫入，UUID 收據防止同一次請求重複發放；最近 20 次操作可在後台查看。

## 變身系統

新增獨立「變身」分頁，保留 49 種公開外觀與待機／攻擊／受傷圖，共新增 768 張 PNG。`lib/game/polymorph.json` 明列來源欄位與重建欄位，未聲稱取得原站完整伺服器規則。

已確認來源：卷軸 1,800 秒／1,300 金幣；控制戒指 50,000 金幣、攜帶即可指定變身；解鎖為角色永久可用；外觀開關不影響能力；Lv55 專屬變身需 5 顆 BOSS 結晶，但其他配方材料未公開。原站變身能力、階級與完整清單由 `polyMenu` 伺服器事件下發，公開 gamedata.json 沒有包含。

本版重建：一般外觀 Lv1、死亡騎士／黑暗精靈 Lv52、五種專屬外觀 Lv55；專屬以 5 結晶永久解鎖。攻速隨等級為 +10%／+20%／+35%／+40%，與其他攻速相乘；Lv45 以上魔物 1% 掉 BOSS 結晶，提供單人取得方式。這些設定集中在 polymorph.json，可換成日後取得的真實規則。

所有變身、解鎖、材料消耗與自動續用由遊戲 API 驗證。狩獵中自動續用可依選項購買卷軸；沒有控制戒指會隨機選擇已符合資格的外觀。解除會停止自動續用。存檔增加可選欄位，舊角色不需重建；離線結算逐秒處理到期和續用。驗證涵蓋所有圖片格式、1800 秒到期、舊存檔、持續／停止狩獵、攻速、控制戒指、材料與等級、防偽造請求、自動購買及 GM 操作回歸。

## 逐刀戰鬥、四怪與裝備工坊（2026-10-05 更新）

最新要求優先於先前的雙倍怪物與雙倍重生：狩獵同場固定四隻，依該地圖原始配置選怪；擊杀立即原位補怪，無重生等待。先前 GM 倍率保留歷史，GM 頁面改為顯示四怪即時補位模式。

每次物理攻擊、魔法傷害、怪物攻擊／MISS、補血與補怪都有伺服器事件序號及實際 HP 快照。前端依事件時間逐筆播放，不再以最近一次傷害值每次輪詢重播。人物揮刀動畫只由新攻擊序號觸發；傷害顯示為實際扣除量（包含過量傷害截斷），浮字與 HP 使用同一筆結果。四隻怪物分別攻擊，死亡的旧怪物不會繼續出手。每角色保留最近 160 筆；登入、切換角色與長時間離線直接採最新狀態，不重播陳舊刀數。

使用原站公開 `MOB_ATTACK_SFX`／`MOB_HURT_SFX`／`MOB_KILL_SFX`、武器類別／人物受傷／魔法音效，以及五種專屬變身 attack/hurt 音檔；死亡騎士專用音效也接入。音效在使用者啟用後透過 WebAudio 播放，關閉後不再播放；音效不產生額外攻擊。所有已下載音檔核對 Ogg/WAV 格式。

強化保留原始安定值、禁止強化、上限、活動成功率、祝福 +1～+3 與精煉必成描述；通用超安定機率為本版重建。飾品改用原始飾品卷軸。一次強化／賦予只處理一件，建立唯一實例鍵，其他同名副本不受影響；破壞後卸下該件，不會借用另一副本的強化值。裝備 `enBonus` 與賦予詞綴在穿戴後實際納入能力。

賦予使用原始武器／盔甲／飾品賦予卷軸，每次重洗替换一項詞綴；詞綴池、均等機率與 50,000 特別訂購價為重建設定，原站伺服器詞綴表未公開。自動販賣按種類加入清單，仅在狩獵中出售可賣的未改造副本；保留穿戴数量、已強化、詞綴、鎖定與變形控制戒指。出售收入寫入角色金幣與日誌。

檢查：93 張地圖同場數量、獨立 UID、每刀事件與實扣 HP、一刀殺怪立即同時刻補位、剩餘攻擊預算、MISS／過量傷害、12 小時離線、同名装備隔離、各類卷軸與安全／祝福／精煉模式、破壞只作用一件、賦予／重洗與能力、自動販賣保護、GM 發放／權限回歸。原站未公開的傷害公式、強化機率與賦予數值仍不宣稱完全一致。

## 背包、登入與村莊（最新更新）

所有地圖固定三個怪物槽，擊殺後精確 600ms 更換 UID；死亡回銀騎士村並停止狩獵。人物受傷保留實際 HP 與音效，隱藏受傷浮字。戰鬥支援不足一秒的連續結算，API 輪詢 300ms。

`inventories[characterId]` 提供 `inv` 陣列、`eq`、`autoSell`；列包含 key（獨立實例）、id（來源 ID）、n、cnt、en、lock、cat、sell、safe、enhanceable、noBless、equipped、affix、stats。裝備點擊顯示公開屬性及該實例的強化、詞綴、鎖定、穿戴與回收價。自動賣裝在狩獵中執行，保護穿戴副本、鎖定、強化、詞綴、控制戒指及來源排除 wpn_22。

遊戲帳號額外綁定平台身分，不取代私人網站平台登入，也不修改既有存檔 owner。每個私人身分一個遊戲帳號，PBKDF2-SHA256 100000 次、隨機 salt、HttpOnly Secure SameSite Strict session；伺服器只存 token SHA256，連錯五次暫鎖五分鐘。記住密碼使用瀏覽器 PasswordCredential / autocomplete，不存明文密碼；記住登入 30 天，未記住 cookie 為瀏覽器 session 且伺服器最長 12 小時。首次註冊沿用原有角色。

村莊 shop NPC 可開啟實際購買商店，依公開職稱及道具種類重建庫存，伺服器驗證 NPC 與當前村莊；原站完整庫存未公開。既有工坊特別訂購保留。舊四怪模式敘述為歷史，最新三怪 / 600ms 優先。

## 魔法、藥水與背包（最新更新）

背包依公开 renderBag 的三欄裝備格、五欄物品格、空位、數量、強化與鎖定標示製作，提供背包／裝備欄／藥水／卷軸分頁。原站裝備槽順序與資料由伺服器下發，本版依公開道具槽名稱排列，非聲稱取得原站完整 eq 回應。左右戒指可穿戴兩件，存檔中的舊欄位沿用。

一鍵販售先預覽，再由遊戲 API 重算價格、數量並保存；預設保留穿戴副本、鎖定、強化、詞綴與控制戒指，只賣普通裝備，其他物品須明確勾選。

施法事件包含魔法名稱、實際效果、MP、HP、目標槽與剩餘持續時間。攻擊、治癒、能力狀態與轉換仍依已說明的重建公式；公開 buff 的能力與持續時間直接採用。原站公開 MAGIC_FX／SELF_FX PNG 特效逐幀導入；沒有完整可驗證素材的魔法保留名称與實際效果顯示。魔法音效使用既有來源對照表。

紅／橙／白水按原值15／40／60 HP；勇敢與加速33%、餅乾15%、慎重魔伤與 MP回復各+2，持续300秒；藍水600秒，精神回復係數仍為重建值；水果手動44–107，經驗藥水500000 EXP。誘捕肉只實作公開的300秒狀態，捕捉與哨子寵物服務仍缺完整規則。卷軸在卷軸頁使用；變形卷軸沿用變身，魔法屏障16秒抵擋一次魔法並冷卻3秒。為使屏障有實際效果，帶公開 dmg 的怪物魔法加入戰鬥時序；cd解讀為秒、命中與MR減傷是本版重建規則，不聲稱原站完整施法邏輯。瞬移卷軸本版回銀騎士村。

## 記住帳號、村莊販售與 GM 自訂發放

登入 checkbox 改成記住帳號，只保存帳號；取消立即清除記錄。密碼不寫入瀏覽器儲存，不再由此選項建立30天登入。

11村莊的全部NPC逐一顯示，包含活動商人；可前往村莊、開啟一般商店，特殊服務仍標示範圍。庫存依來源職稱与道具類別重建。布料商依公開布料／線及價格，冰涼活動商供應不可出售的活動武器，購買仍需NPC及村莊驗證。

物品詳情新增一般、祝福、一鍵安定、精煉按鈕，各自顯示強化前後、所需卷軸、數量與成功率。冰涼武器安定6，+6後33%、上限9；一般機率未公開，繼續採既有重建公式。強化請求携帶expectedEn，過期頁面不能衝到已變動的強化值。

GM 金額可自填正整數，服務器檢查安全整數與金幣總額；預設50000。装備可指定0到來源上限（本版最多12），+N副本逐件獨立key與enh，舊同名裝備不變。發放仍有GM平台身分、CAS交易與receipt去重。

## 參考圖片介面與有效狀態列

金棕色單欄介面、上方角色肖像／經驗／金幣／AC MR及HP MP、固定底部現有功能導覽；角色配置保留四角色管理與完整能力資料。村莊在狩獵頁中央顯示當前NPC雙欄卡，村莊名綠色，卡片區獨立滾動。未實作的聊天、交易或假人數不新增。

activeStatuses 僅傳回 buffs.until>now 的已使用效果，以及未到期的實際poly；背包持有或技能已學會不列狀態。狀態列500ms更新剩餘時間，點圖示可查看能力與秒數，空狀態顯示「無」。未使用、到期、解除與角色切換均以當前角色實際存檔狀態為準。

## GM 強化與世界王調整（2026-10-18）

GM 發放所有可穿戴武器、防具及飾品時，可指定可精確儲存的非負整數強化值，包含原本禁止一般強化的裝備；原玩家卷軸限制不變。世界王本體、陰影及附著圖層放大為 150%，保留原始腳底錨點，生命條、控制介面、召喚小怪及戰鬥數值不放大。

四龍暫只開放來源名稱標示「恐怖的」的安塔瑞斯、林德拜爾及巴拉卡斯。來源沒有此名稱的法利昂，因此不額外命名或建立一個版本。其他四龍王房與舊三龍棲息地暫停，前台與 GM 入口隱藏，後端拒絕進入；已在停用地圖的角色於同步時回銀騎士村並停止狩獵。原資料與素材仍完整保留。

## 物品圖示清晰度（2026-10-18）

量測原始物品圖示尺寸，背包、裝備欄、詳細視窗、圖鑑、商店、倉庫、獎勵、賦予及 GM 發放預覽共用 ItemIcon。低解析像素圖以原尺寸或最多兩倍整數倍率顯示，避免拉伸至整個格子或 100×100；較大的素材等比例縮小。保留 3.81 原圖，沒有重繪或聲稱增加原圖細節。背包圖示限制 32px，詳細視窗限制 64px，例如 24×18 的變形控制戒指顯示為 48×36。

## 高清圖示樣本套用（2026-10-18）

變形控制戒指圖示 1195 採用使用者確認的高清重製樣本（透明 PNG）；原始 3.81 WebP、道具名稱與能力不變。共用 ItemIcon 透過 item-icon-hd.json 對應，套用於各物品介面；詳細視窗可顯示 96px，其他未重製素材仍遵守原圖整數倍限制。此版本只新增這張戒指樣本，未宣稱其他裝備已完成高清重製。

## 裝備高清重製第一批（2026-10-18）

新增武士刀、黑暗雙刀、抗魔法斗篷、力量手套、力量項鍊及殷海薩的力量腰帶，連同已確認的變形控制戒指，共 7 張獨立圖示。各來源的祝福／詛咒等共圖裝備一併套用；裝備能力不變。原始高解析 PNG 保留於 source-assets/equipment-hd，遊戲使用最長邊 384px、保留透明度的 WebP，避免載入完整大圖。完整 2,248 件、1,046 張圖的待辦與 ready 狀態記錄於 docs/equipment-hd-progress.json；其餘未重製圖示仍使用原圖。
