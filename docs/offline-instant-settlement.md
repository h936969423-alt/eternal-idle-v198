# 登入即時結算（測試階段）

離線超過 30 秒的同步請求直接使用時間差計算；收益不足整分鐘不發放。
伺服器存檔的 save.at 是毫秒時間戳，等同 last_save_time，不採用客戶端時間。
每段離線最多 86400 秒。金幣、經驗、時間戳及收益收據以現有 D1 revision CAS 同筆更新。
失敗的競爭請求捨棄試算結果並讀取已提交的存檔。

不啟用月卡門檻，40 級以上正常領取。僅離線前已狩獵的角色受益。
話島每分鐘經驗 100、金幣 50；龍谷每分鐘經驗 800、金幣 500，每小時死亡機率 5%。
其他已知一般獵場暫用話島基準。村莊、世界王、關閉或未知地圖不發放固定離線收益。
死亡時間採固定風險率抽樣，收益計算到死亡前的完整分鐘，並使用既有死亡返回村莊流程。
本方案只發放金幣及經驗，不模擬離線擊殺、消耗品或新掉落。既有 catchup 已入帳數值及掉落保留在收據，不再加發。
角色升級沿用能力點數與 99 級上限。日後可獨立擴充 offline-gains.ts 的效率設定。

後台結算 Worker 已改成無資料庫操作的空處理函式，wrangler.offline-test.json 的 crons 為空。
必須另行部署該 Worker 設定才能移除現有雲端排程；僅提交程式碼不會停掉舊雲端排程。

## 驗證（2026-10-25）

- TypeScript --noEmit 通過；完整 pnpm run build 通過。
- offline-catchup、offline-income、offline-income-notices、save-conflicts 通過。
- character-menu、account-theme、post-cast-continuity、auto-spell-timing、respawn-rules、triple-impact-sync、manual-triple-latency 通過。
- 本機實際 Worker HTTP：註冊、登入、創角、登出重登存檔、60 級無月卡、25 小時封頂 24 小時、單次結算、重試、防重複收據、關閉後重登記錄均通過；該次結算請求 15.1 ms，並非線上或 iPhone 效能數據。
- combat-smoothness 仍有既有失敗：動畫長積壓末事件 due=9000，測試預期 6500；此次未修改其排程行為。
- 未部署雲端版本，未修改遠端玩家資料。

HTTP 測試：先對本機 D1 套用 drizzle/0000–0004，再完成 build，於專案根目錄執行 python3 tests/offline-http-smoke.py。只使用 --local 資料庫與臨時帳號。
