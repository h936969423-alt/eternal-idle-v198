# 連線恢復修正（2026-10-25）

永夜以 HTTP 輪詢同步，沒有 WebSocket PING/PONG 端點。

- pageshow、focus 與切回前景會取消尚未完成的舊讀取；同一批喚醒事件合併為一次後續同步。
- offline 暫停輪詢；online 立即同步。背景頁面不持續讀取，卸載時清除計時器、事件及舊讀取。
- 一般同步每次嘗試限 8 秒，首次讀檔每次嘗試限 15 秒；只讀請求最多兩次嘗試，之間等待 650 毫秒。
- 備援 recovery 請求含讀取本文限 8 秒，使用相同取消訊號，不會無限卡住遊戲請求佇列。
- 所有請求的本文解析都受逾時保護；重試等待可被取消；401 不自動重試。
- 購買、強化、施法等 POST 操作不自動重送。結果不明時由後續讀取取得已提交的伺服器狀態。

驗證：stable-connection、startup-recovery、save-conflicts、offline-income、offline-income-notices、manual-triple-latency 通過；TypeScript 與完整建置通過。
喚醒與網路事件以可控制的事件／計時器模擬驗證，未在實體 iPhone 上測試。未部署雲端版本；前次已記錄的 combat-smoothness 既有失敗未在此次修改。
