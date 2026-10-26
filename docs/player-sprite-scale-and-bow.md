# 黑暗精靈比例與射箭顯示修正

黑暗精靈 darkelf 變身原畫布 59×66，待機人物 alpha 身高 56；死亡騎士畫布 113×102，人物 alpha 身高 58。相同 CSS 框會將前者放大約兩倍。本次保留死亡騎士的既有尺寸，以 113×102 顯示座標、黑暗精靈原像素比例及腳底 y=90 對齊。待機、受傷、攻擊與施法共用顯示框；攻擊／施法保留原始身體、武器、影子分層，按實際 alpha 底部修正每幀腳底偏移，避免拉弓時上下漂移。村莊共用顯示元件。

普通箭先前指向不存在的 plain/0.png～3.png，本次補入程式繪製的 arrow.svg 實體箭。箭頭按目標角度旋轉，在攻擊動作約一半（黑暗精靈第 4／8 幀放箭）發射。從保留五秒的動作事件掛載，避免較慢射擊被 800ms 傷害字生命週期提前移除；requestAnimationFrame 在飛行結束後停止並清空可見箭矢。過期怪物 UID、夥伴及武器魔法事件不重複產生普通箭。

本次只修改顯示，保留怪物尺寸、死亡騎士尺寸、傷害、攻速、加速倍率與掉落結算。普通箭以外的魔法投射物保留既有方向素材。

驗證：test-player-sprite-layout.cjs、test-polymorph-animation.cjs、test-polymorph-cast-assets.cjs、test-combat-smoothness.cjs；使用實際素材離線檢查比例與腳底。未做 Safari 實機動畫驗證。


## Sunrise source dimensions (2026-10-26)

The battlefield is 800 CSS pixels wide (max 100%) with a 16:9 aspect ratio and a
242px ground band. Player PNGs render at natural pixel size; layered polymorph
SVGs use their source canvas dimensions, retaining the audited layer/foot anchor.
The old portrait, landscape, five-slot and boss square-box rules are overridden
in the battle scope. Atlas monsters use their source frame aspect ratio and
never scale up. Normal art uses a stable 134px allowance within the ground band
(the reference CSS documents approximately 134px after its UI rows); bosses and
the source large-canvas list use 185px. This fixed normal allowance adapts the
reference's dynamic remaining image height to Eternal's different status rows.
All 293 imported monster animation groups share one canvas size across actions.
The 3.81 renderer retains its source coordinate system inside an 185px viewport;
its older additional 1.5x boss transform is removed in this layout. Dragon effect
origins and destinations are measured from displayed actors, including the
bottom-anchored player, rather than the old hardcoded player position.

The lower-left hunt/return controls and upper-left HP/MP remain in place.
