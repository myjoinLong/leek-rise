# Trading 交互与验收规格（现状基线）

> 核对日期：2026-10-29；里程碑 P1-b。角色：产品/系统策划、UI 工程审查。  
> 交付的是交互与验收文档；没有修改运行代码，没有执行浏览器交互或截图验收。  
> 第1–8节为历史快照，后续结果见第9–20节；24项最新覆盖、证据层级和剩余缺口见 [04-Trading验收证据矩阵](04-Trading验收证据矩阵.md)（P1-b.13，2026-10-30）。历史组件/组合通过不代表真实入口或P1全部完成。

## 1. 范围与决定来源
- 本轮只整理 Trading 单屏。自动化明确授权文档更新；工程代码仍受 AGENTS.md 的 Trading UI/mock 限制。
- 已确认方向沿用工作稿：明亮 16-bit 像素风、A 股红盈绿亏、当日净资产变化驱动氛围，混色初值 24%。不据此改锁定 tokens 或制作新美术。
- PROJECT.md 的非冲突要求作为既有验收依据：滑点 0.1% 阈值、延迟超过 1.2 秒的提示、反馈停留时间、装死始终可点且无确认。
- PROJECT.md 的 emoji 最终美术和深色整款基调已被较新像素方向覆盖；现有深色 token 仅是代码事实，交易终端的最终视觉细则待定。
- 代码中已接 core、存档和其他屏幕，是既有原型，不表示本轮获得扩展它们的授权。
- 实施假设：先固定可追溯现状和测试输入，不将 100 股步长、融资 2x、费用或快捷仓位算法提升为产品定案。
- 待决规则：Tick/自动收盘/后台恢复、融资账务、交易单位、异常反馈分类、NPC 行为；详见第 7 节。
## 2. 类型与屏幕组成
以锁定的 `src/ui/screens/Trading/types.ts` 为 UI 合同，不添加字段。
| 区域 | 输入字段/组件 | 当前表现 |
|---|---|---|
| 顶栏 | day、phase、cash、debt / TopBar | 第几天/时段、整数现金与负债；⋮ 是 aria-hidden 装饰，无菜单操作 |
| 阶段条 | phase / PhaseNav | 早盘→白天→交易→结算；已过阶段有 ✓，当前 aria-current=step；均为 span，不可跳转 |
| 股票列表 | stocks、selectedStockId / Watchlist | 按钮卡片、价格、▲▼涨跌、持仓/未持仓、SVG 迷你线；aria-pressed 标选中 |
| 详情 | selectedDetail / StockDetailHeader | 名称、大号价格、带正负号涨跌额；没有显示涨跌百分比或 ▲▼ |
| 图表 | selectedDetail.priceHistory / PriceChart | Phaser 价格折线，不是 OHLC 蜡烛；markers 没有传入图表 |
| 行情四格 | open、high、low、volume / QuoteGrid | 今开、最高、最低、成交；成交量除 10000 后标“万手”，原始单位待核 |
| NPC 提示 | selectedDetail.newsHint / NewsHint | 只显示 NPC 名、时间、“提过这只”和 ›；text 未显示，没有点击处理 |
| 下单面板 | 数量、上限、融资、错误 / OrderPanel | 数量 ±100、½仓/全仓、融资 2x、预估、买入/卖出、去结算 |
| 反馈浮层 | lastOrder / OrderFeedbackCard | fixed 挂到 body，状态播报、关闭按钮、成交/部分成交/拒单 |
| 原型额外区域 | TapePanelVM（不在 TradingVM 内） | 盘口前三档和实时成交；当前从 core 独立传入，不把它视为新增 UI 合同 |
当前 DOM 滚动区顺序：列表→详情→图表→盘口→行情四格→NPC；顶栏、阶段条和订单面板在滚动区之外。
## 3. 操作与状态流（源码现状）
| 触发 | UI 回调/本地状态 | 当前结果及边界 |
|---|---|---|
| 选股票 | onSelectStock(id) | index 检查股票存在，再发送 SELECT_STOCK；刷新各区域；不重置数量 |
| 输入数量 | onInputShares(n) | Number(value)，非有限数转 0；reducer 原样保存；输入聚焦时 update 不覆盖文本 |
| 减/加 | onInputShares | 减少下限 100，增加 100；不按资金/持仓自动截断 |
| ½仓/全仓 | onQuickAmount(0.5/1) | 按 maxBuyShares×比例，向下取整到 100 股；不是卖出持仓比例，可得到 0 |
| 融资开关 | onToggleLeverage | index 的局部布尔值翻转并重算；UI checked 由 leverageOn 决定、disabled 由 leverageAvailable 决定 |
| 买入/卖出 | onSubmit(side) | 同步发送 PLACE_ORDER，随后刷新；原型下单后数量重置为 100；不是等待 latencyMs 后才入账 |
| 正常反馈到期 | 卡片定时器→dismiss | 开始退场动画，结束后移除并回调；index 仅清除仍匹配该 id 的反馈 |
| 手动关闭 | 卡片按钮→dismiss | 幂等退场；不是使用 TradingHandlers.onDismissFeedback 处理关闭按钮 |
| 新反馈 id | displayedFeedbackId | 旧卡 dismiss，新卡立即 mount；旧卡回调不应清除新 id；可能短暂同时存在退场卡和新卡 |
| 去结算 | onSkipDay | 设置 screenActive=false，停 ticker、关闭卡片、销毁图表，发送 ADVANCE_PHASE；无确认 |
| 每 3 秒 | syncTicker | TRADING 且 active 时 ADVANCE_TICK；无 60 Tick 上限；正式节奏仍待确认 |
### 下单可用性
- quantityIsValid：整数且 ≥100，并且浏览器没有 badInput/stepMismatch；买入另要求 ≤maxBuyShares，卖出另要求 ≤maxSellShares。
- inputError 仅控制提示与 aria-invalid，不直接参与按钮禁用。index 每次 render 按买入预估重算“资金不足”，即使当前想卖出也可能显示。
- UI 没有用 isHalted、phase 或 selectedDetail 是否存在来直接禁用订单；不可宣称已实现停牌或完整阶段保护。
- HTML min/step 是输入约束，不等于 core 已有同样校验；core 当前只校验正整数，交易单位仍待定。
- 装死按钮没有 disabled 条件；空数据、数量错误、资金不足或拒单时仍应保持入口可达。
### 空态与信息一致性

- stocks=[] 时列表标题为“我的自选 · 0”；详情与四格在 selectedDetail=null 时清空，NPC 隐藏，图表收到空数组。
- 无 newsHint 时隐藏提示；newsHint 有内容时不代表可打开对话，箭头当前没有交互语义。
- selectors 对无效 selectedStockId 回退首只股票，但 index 盘口/资金校验仍按原 id 查找，可能与详情不一致。
- selectors 当前总给 leverageAvailable=true、isHalted=false、固定龙哥提示、空 markers；mock.ts 也只提供两只股票的普通场景，不能代表异常态覆盖。
- Watchlist 每次 update 重建按钮；行情刷新后焦点是否丢失需浏览器验证。

## 4. 反馈显示合同与差异

slippagePct 在当前 core 中是绝对小数比例：0.001=0.1%，不是 0.1。测试直接构造 OrderFeedback，不依赖随机行情。

| 项目 | 既有文档依据 | 源码现状 / 缺口 |
|---|---|---|
| 价格对比 | 滑点 ≥0.1% 显示“委托价→成交价”；更低只显示成交价 | Math.abs(slippagePct) ≥0.002，即 0.2%；需修阈值 |
| 价差提示 | 委托/成交价不一致用琥珀 ⚠，不解释原因 | ⚠ 仅随 0.2% 阈值出现，ofc-warning 用 --danger；低于对比阈值时如何标价差待澄清 |
| 延迟文案 | 超过 1200ms 才显示“网络拥堵”，唯一允许的解释性文字 | showSlippage 或 >1200ms 均显示；且追加“成交价可能与委托价存在偏差”解释 |
| 正常/异常停留 | 正常 2500ms、异常 4000ms | 阈值为 slippagePct>0.01（严格大于 1%）或 PARTIAL 或 latencyMs>1200；异常分类并未在产品文档完整定义 |
| 拒单 | 必须手动关闭 | 不启动自动关闭计时器；新订单或去结算仍会调用 dismiss，替换规则待定 |
| 动画 | Web Animations API，时长读取 --dur-* | 卡片进入读 --dur-slow，退场读 --dur-base，行错峰读 --dur-fast；停留从 mount 计时，退场耗时另计 |
| 部分成交 | 类型有 requestedShares/filledShares | 标明已成交/申请数量、剩余数量并声称“已自动撤单”；该文案对应原型结果，不据此批准正式撮合规则 |
| 生命周期 | 组件实现 Component<S>（工程要求） | OrderFeedbackCard 未 implements Component，也无 update/destroy；不要把现状当作工程合规 |

延迟字段当前只是结果数据，UI 无 pending/提交中状态；不得据此新增异步委托、锁操作或延迟结算规则。

## 5. 可复现验收清单（全部待执行）

输入基底：createMockVM() 的返回值拷贝后按表覆盖；不要改锁定 mock.ts。随机价格不做精确值断言，反馈价用固定值。
反馈基底：任意固定 id/name，BUY，申请/成交 100 股，委托/成交 10，slippagePct=0，fee=1，latencyMs=300，FILLED，cashAfter=2199。
这里只定义测试夹具和观察点，没有新增测试入口，也没有声称用例已通过。

| ID | 输入/动作 | 验收观察点与当前结论 |
|---|---|---|
| T01 | 默认 VM；切换到第二只股票 | 卡片选中与详情、行情、图表一致；源码有选择回调；整体待运行 |
| T02 | changePct=+1/-1，详情涨跌额同向 | 涨红跌绿，按工程要求附 ▲▼；卡片已有，详情只有正负号，记录差异 |
| T03 | stocks=[]，selectedStockId/detail=null，买卖上限=0 | 不遗留旧详情/提示，不可下单，去结算可点；无专门空列表引导文案 |
| T04 | 选中 id 不在 stocks | 详情、盘口、可买上限应对应同一股票；现有回退不一致，待后续修复 |
| T05 | newsHint 缺省→存在→缺省 | 隐藏→显示 NPC/时间→清空隐藏；不要求未确认的 NPC 对话入口 |
| T06 | 输入空值、0、-100、50、150、100.5 | 非法数量禁用订单；空值回传 0；聚焦编辑文本与 VM 的差别待运行核对 |
| T07 | 数量100，点减/加；maxBuyShares=300，点½仓/全仓 | 现状期望依次100/200；快捷为100/300；这是回归基线，不是交易单位定案 |
| T08 | maxBuyShares=0、maxSellShares=800、inputShares=100 | 买禁用、卖可用、装死可用；核对买入资金提示是否误导卖出 |
| T09 | leverageAvailable=false | 复选框禁用；现状支持；融资借款/强平账务不在此用例 |
| T10 | isHalted=true | 当前卡片/按钮没有停牌处理；只登记缺口，禁买禁卖或展示方式待确认 |
| T11 | slippagePct=.00099、.001、.00101；成交价相应变化 | 按既有0.1%依据，边界及以上有价格对比；代码0.2%阈值不符 |
| T12 | slippagePct=.002、latencyMs=300 | 有价格对比，⚠ 应琥珀；不应出现网络拥堵；源码两处不符 |
| T13 | slippagePct=0，latencyMs=1199/1200/1201 | 只有1201显示网络拥堵；精简文案差异见第4节 |
| T14 | 普通 FILLED；观察2500ms | 到期开始退场，再按 --dur-base 移除；不能要求2500ms时已移除 |
| T15 | PARTIAL：申请100/成交60；或延迟1201 | 4000ms开始退场；部分成交数量正确；异常分类其余边界待定 |
| T16 | slippagePct=.01/.01001，FILLED，latencyMs=300 | 原型分别2500/4000ms；仅记录现状，正式时长分类待决 |
| T17 | REJECTED，rejectReason 含 <>& 引号 | 超过4000ms仍保留，文字转义；点击关闭只回调一次 |
| T18 | A卡退场时产生B卡；重复render同id | 同id不重复mount；A完成不清除B；拒单被替换是否允许待决 |
| T19 | 数量错/资金不足/拒单卡存在时点装死 | 始终可点、无二次确认；正常入口停计时并退卡，不验收其他 screen 内容 |
| T20 | 无持仓→有持仓，priceHistory=[]/[10]/[10,10] | 持仓文案切换；迷你线不产生NaN；图表为空/单点/水平线表现待运行 |
| T21 | 键盘Tab、Enter/Space选股；随后刷新行情 | 可见焦点、选中播报；重建按钮后的焦点保留待验证 |
| T22 | 触摸检查所有订单操作及关闭按钮 | 每个目标≥44×44；融资label当前min-height=20px，尚不满足；数量输入height=40px也需检查 |
| T23 | 建议测试视口320×568、390×844、480×800及软键盘 | 无横向溢出；订单/装死可达；固定卡不挡关键操作；这是QA覆盖建议，不是新美术规格 |
| T24 | 手动去结算及外部替换Trading节点 | 正常入口清理见源码；外部替换未统一调用destroy，生命周期完整性未通过验收 |

## 6. 视觉与工程验收口径

- 数字为主角，价格两位小数，金额千分位；颜色来自锁定 tokens，正文与数字底板保留可读性。
- 按已确认方向分别检视盈利、亏损、中性氛围；mock TradingVM 不含开盘净资产，不能靠单只股票涨跌伪造整日盈亏状态。
- 盈亏氛围已在主入口原型实现；本轮不改入口、不造新的 TradingVM 字段，也不认定现有 CSS 已完成像素美术验收。
- 全部交互按钮有可见文字或 aria-label；检查触摸尺寸、键盘焦点、状态播报。卡片与订单已有部分语义，不等于已完成无障碍验收。
- 图表当前无成交标记，属于价格折线原型；是否需 OHLC 字段涉及锁定类型变更，先待决，不伪称 K 线完成。
- 组件现有内联 style、大量硬编码尺寸、TopBar 的类名前缀与工程约定有差距；后续代码批次应限定组件与 trading.css，不能顺手改锁定文件。
- 图表使用 Phaser tween 的3000ms，不符合所有动画读 token/使用 WAAPI 的字面工程约束；图表位于当前允许路径之外，本轮只登记。

## 7. 待决点与可独立后续工作

| 问题 | 可供讨论的选项（不是定案） | 决策前界限 |
|---|---|---|
| 异常卡分类 | 任意可见价差/部分成交/超时算异常；或保留单独滑点门槛 | 不把源码1%门槛当成正式规则 |
| 拒单与连续下单 | 保留拒单直到手动关闭；或允许新单替换，需明确“手动关闭”的范围 | 不自行引入队列、阻塞下单或自动替换定案 |
| 低于0.1%的价差 | 仅⚠且无价格对比；或低于阈值完全不标 | 先修无歧义的对比阈值，不猜隐藏标记规则 |
| 数量、停牌、快捷比例 | 100股整手或允许零股；停牌仅展示或禁交易；快捷按买入上限或卖出持仓 | 规格保留现状；不改core和锁定类型 |
| NPC提示与图表 | 纯提示或打开消息；保留折线或扩展OHLC | 不增对话路由、字段或依赖 |
| 响应式与视觉 | 明亮城市基础上交易终端局部深色；具体像素尺寸/字体待美术规格 | 不重画整屏、不修改锁定tokens |

下一阶段候选 **P1-b.1：反馈卡无歧义差异修复**：0.1%价格对比阈值、琥珀⚠、严格超过1200ms才显示简短网络拥堵文案。
这些已有文档依据、位于允许组件路径，可独立实现并用固定反馈验证；本次只完成P1-b文档，不预记代码修复完成。
其他屏幕规格、系统规则表、数值参数表以及整个 P1 均未完成；经济/重组/Tick 的实现继续等待 P0 决定。

## 8. 源码追溯索引

- `src/ui/screens/Trading/types.ts`、`mock.ts`：锁定的 UI 字段/回调及默认场景。
- `src/ui/screens/Trading/index.ts`：render、handlers、syncTicker、反馈 id 生命周期与正常退出。
- `src/ui/screens/Trading/selectors.ts`：首只股票回退、资金上限和固定 NPC/融资/停牌值。
- `src/ui/screens/Trading/components/OrderPanel.ts`：onClick/onInput、update 的数量校验与按钮条件。
- `src/ui/screens/Trading/components/OrderFeedbackCard.ts`：mount、renderFilledRows、getCardClassName、dismiss。
- `src/ui/screens/Trading/components/{TopBar,PhaseNav,Watchlist,StockDetailHeader,QuoteGrid,NewsHint,TapePanel}.ts`：区域表现与空态。
- `src/ui/screens/Trading/styles/{tokens,trading}.css`：当前布局、颜色、时长与安全区。
- `src/ui/render/PriceChart.ts`：折线、空历史过滤、tween 与销毁；仅只读核对。
- `src/core/{reducer.ts,systems/tradeEngine.ts}`、`src/main.ts`：数量存储/重置、滑点单位、同步成交与路由生命周期；仅只读核对。
- 决定来源：AGENTS.md、PROJECT.md、工作稿第6/9/10节；状态/结算细节复用P1-a，不重复定义经济规则。

## 9. P1-b.1 修复与验收结果（2026-10-29）

- 已修复：价格对比阈值改为Math.abs(slippagePct)≥0.001；⚠使用--warn；仅latencyMs>1200显示“网络拥堵”，不附加原因解释。
- 反馈CSS从组件style块移至trading.css；部分成交小字使用ofc-remaining。位置与间距复用既有token，未重画视觉或修改锁定token。
- 已执行环境：本地隔离Vite夹具，浏览器加载真实OrderFeedbackCard和tokens/trading.css，不加载游戏主入口、随机撮合或存档；夹具仅运行时存在。
- T11显示范围：.00099无对比、.001/.00101有对比，均通过；额外-.001及SELL方向检查通过。低于阈值是否另标⚠仍待决，未将保留现状视为定案。
- T12显示范围：.002且300ms有对比、琥珀⚠、无网络拥堵，通过；T13的1199/1200/1201ms仅末项有提示，通过。
- 补充回归：部分成交60/100保留数量文案；拒单含HTML/引号按文本显示，无img节点；总共11组固定输入全部通过。
- 每组同时检查fixed、关闭按钮≥44×44；普通预览点击关闭后节点移除。这不等同于T17/T22完整验收。
- 未执行：T14–T16自动停留计时、T17拒单长时保留及回调次数、T18替换/重复渲染和其余整屏用例。T11–T13仅在隔离反馈范围已验收。
- build/lint通过；现存大包体提示保留。异常停留分类、拒单替换、Component接口和销毁缺口继续登记，不扩core或新交互规则。

## 10. P1-b.2 组件生命周期与验收（2026-10-29）

- OrderFeedbackCard实现Component<OrderFeedback>；update重绘展示，关闭事件委托给卡片根节点，重绘不会丢失关闭行为。已退场或销毁的实例忽略update/mount。
- update不重启完整停留周期：用当前原型分类计算首次mount后的剩余时长，REJECTED取消到期计时。此为组件刷新实施约定，不定义新订单替换规则；入口当前不调用update而是每单创建新实例。
- dismiss幂等，取消旧计时和入场动画，退场按--dur-base，完成后先释放资源再且仅回调一次；未mount时dismiss仍保留原有立即回调语义。
- destroy幂等，立即清理计时、根节点事件、全部持有的WAAPI动画和DOM；不调用onDismiss。退场完成已排队但随后destroy时，也不回调。
- 确定性验证12组通过：正常2500+200ms、部分成交4000+200ms、延迟1200/1201、滑点.01/.01001原型时长、拒单10000ms保留/重复关闭、入场销毁、退场销毁、已完成微任务销毁、刷新不延时、刷新后关闭、拒单/成交刷新切换、重复mount及未挂载关闭/销毁。
- 验证直接转译真实组件，使用时钟/DOM/WAAPI替身；覆盖T14–T17的组件计时和关闭逻辑，不代表浏览器动画、布局或整屏用例已验收。复现脚本保留在自动化目录feedback-p1-b2-test.mjs，未新增仓库测试入口或依赖。
- 入口未修改：正常退出仍dismiss；外部替换Trading节点仍缺统一destroy合同。接入destroy需同步考虑原有CLEAR_ORDER_FEEDBACK业务回调，不把组件资源释放误当全屏生命周期已完成。
- build/lint通过；其余P0、异常分类/拒单替换、低于0.1%标记和其他UI差异仍待决或后续处理。

## 11. P1-b.3 局部可访问性与浏览器验证（2026-10-29）

- OrderPanel样式移至trading.css；数量输入高/最小宽44px，融资label最小44×44且不收缩，复选框保留16px视觉、标签整体可点；融资焦点使用--info。
- 面板高度取原token与“四行44px+--sp-3错误区+1px边框”的较大值，再加安全区；错误提示独占底部预留区，反馈卡底部用相同公式。未修改锁定token或融资行为。
- StockDetailHeader按changePct正负显示▲/▼，保留原涨跌额正负号及颜色；零值保留+0.00且不加方向符号，null仍清空，不添加百分比字段。
- 隔离浏览器实际加载OrderPanel/StockDetailHeader/OrderFeedbackCard、createMockVM、tokens/trading.css，不加载主入口、global.css、core或存档。三种视口320×568/390×844/480×800，各覆盖safe-bottom=0/34，共6组布局通过。
- 每组检查所有订单按钮/输入/融资label≥44×44、页面无横向溢出、融资/买卖/结算行不重叠、反馈入场完成后不挡面板。另检查错误文字不覆盖结算。
- 交互通过：上涨/下跌/零值/空详情；融资不可用时点击标签不回调，可用时标签及Space各回调一次，焦点有outline；输入/加量/买卖/错误态结算回调与原型一致，destroy后无回调。
- build/lint通过；截图a11y-p1-b3.png和可复现脚本a11y-p1-b3-test.cjs在自动化目录。仅覆盖T02/T09/T22/T23的局部组件范围，不标整项通过；未测全屏、Tab顺序、软键盘、读屏及长卡/动画重叠。
- 既有待决和范围外问题保持登记；下一阶段候选为Watchlist行情刷新焦点保留核验/必要修复。本轮没有新增经济/交互定案。

## 12. P1-b.4 Watchlist刷新焦点与浏览器验证（2026-10-29）

- 历史问题已复现：原update重建按钮，键盘Enter选股同步刷新后activeElement为body。第1–8节保留历史快照，此节为修复后结果。
- 更新前只记录列表内实际聚焦按钮的stock.id；重绘后按id查找并focus({preventScroll:true})，不使用id拼接CSS选择器。外部输入聚焦时不恢复；股票移除或空列表不跳到其他卡片，不新增选股业务规则。
- 真实组件、createMockVM和tokens的隔离Vite浏览器8组检查通过：Tab/Enter/Space及focus-visible/aria-pressed；20次报价刷新保留焦点并更新价格、不发选择回调；外部输入焦点和文本保留；重排按id保留且后续Tab按新顺序；含引号/尖括号id；移除与空列表；滚动容器位置；子节点点击委托、重复destroy后无回调。
- 夹具不加载游戏主入口、core、存档或其他屏幕；复现脚本watchlist-p1-b4-test.cjs及结果watchlist-p1-b4-results.json位于自动化目录，不新增仓库测试入口或依赖。
- build/lint退出0；现存大包体提示保留。此为T21列表组件范围通过，读屏播报、完整Trading选股同步、软键盘和全屏生命周期尚未验收，不能将T21整项或24项清单标为完成。
- 仅修改Watchlist焦点与两份文档；既有渲染/样式/回调保留，无新增产品决定。下一阶段候选为mock下列表/详情/行情/NPC的选股与空态一致性核验；未决交易/经济/视觉规则继续等待确认。
## 13. P1-b.5 四组件选股与空态浏览器核验（2026-10-29）

- 只核验Watchlist、StockDetailHeader、QuoteGrid、NewsHint，不改运行代码。真实组件及锁定createMockVM/tokens、trading.css通过隔离Vite加载；mock随机行情替换为固定价格/历史/详情后才渲染。
- 8组全部通过：A默认选中/详情/四格/提示一致；子节点点击B再A切换并清除旧提示；20次VM刷新列表/详情价格与四格更新且不多发选择事件；newsHint无→有→无显隐与文本清理；非空列表下null详情清空依赖区且不自动选股；全空后恢复B；零值、空/单点/水平迷你线无NaN/Infinity及持仓清除；股票名/NPC/时间特殊HTML按文本转义。
- 浏览器pageerror为0；记录网络请求确认没有加载core、save、main或Trading入口。脚本selection-p1-b5-test.cjs与selection-p1-b5-results.json保留于C:/Users/75151/.codex/automations/automation，不增加仓库依赖或运行入口；服务测试后关闭。
- 验证边界：夹具自行按id供给匹配selectedDetail，只证明四组件对一致VM的显示和委托合同，不证明生产index/selectors集成；T01仅四组件范围、T03仅显示空态、T20仅列表迷你线/持仓范围，T05显示合同已验证。订单空态、盘口/图表同步、无效id回退、完整屏幕布局/生命周期、读屏和其余用例仍未验收。
- 已确认依据为锁定UI类型及现有空态合同；成交量“万手”、零值符号和提示无点击行为仅保留现状，不构成新规则。无需为产出而修改已通过的组件；已知停牌/交易单位、反馈分类及经济/重组/Tick规则缺口不在此阶段补猜。
- build/lint退出0；现存chunk>500kB提示保留。下一阶段候选P1-b.6为OrderPanel数量输入/刷新/上限显示的mock隔离核验，未预记修复或验收完成。

## 14. P1-b.6 订单面板浏览器合同核验（2026-10-29）

- 真实OrderPanel、createMockVM及tokens/trading.css通过隔离Vite加载；固定价格10、数量100、买上限300、卖上限800。9组浏览器检查通过，无运行代码修改；测试后关闭服务。
- T06组件范围通过：空文本回传0；0、-100、50、150、100.5禁买卖，恢复100可用。输入聚焦时保留编辑文本；20次行情更新保焦点且不额外发回调。聚焦期间外部VM数量变化不覆盖文本，离焦后下一次update同步；未增加blur同步需求。
- T07组件范围通过：嵌套加减点击各回调一次，100减仍100、加至200；快捷只验证0.5/1回调，夹具按既有算法模拟300上限取100/300。T08通过独立上限为0、恰好上限与超限的买卖可用性；买上限0不影响卖800。
- 错误按文本显示、aria-invalid及错误样式同步，清除后文本/样式/可见性复原；资金错误状态下可卖且可结算。外传估算0优先于回退，自定义1234.4显示1,234，融资文案/可用性和回调正常；不验证费用或融资账务。
- 一致空VM（stocks空、id/detail空、买卖上限0）禁买卖且估算0；非法输入及REJECTED元数据不锁结算。只覆盖T03订单区域与T19部分条件，未挂载拒单反馈卡、不证明入口跳转或整屏并存行为。重复destroy后input/change/click均不再回调。
- 浏览器pageerror=0，网络确认无core/save/main/Trading入口。脚本order-p1-b6-test.cjs和order-p1-b6-results.json位于C:/Users/75151/.codex/automations/automation；未新增仓库测试入口或依赖。build/lint退出0，现存大包体提示保留。
- 已确认依据为锁定UI类型及现状规格；数量单位/快捷比例/默认估算公式保留为原型，夹具不构成经济规则定案。完整Trading、软键盘/读屏、真实交易和现有未决项继续未完成；下一阶段候选P1-b.7为反馈卡真实浏览器计时/退场与销毁核验。

## 15. P1-b.7 反馈卡真实浏览器计时与销毁核验（2026-10-30）
- 真实OrderFeedbackCard及tokens/trading.css通过隔离Vite加载，Chrome headless使用原生Date/performance/setTimeout和真实WAAPI；7组检查通过，无运行代码变更，服务已关闭。对计时/动画做观察包装，不替换为虚拟时间或动画替身。
- T14–T16组件浏览器范围通过：2200ms时卡片尚未退场；FILLED普通/.01为2500ms开始退场，PARTIAL/latency1201/.01001为4000ms；退场duration实际读取200ms，完成后移除节点再且仅回调一次，回调时无非idle动画。定时起点断言允许-20/+500ms，退场完成允许180–700ms；实测时间存结果JSON，不声称毫秒精确验收。
- update在700ms刷新手续费，未新增入场或延长首次mount的停留；.01/.01001异常分类及刷新计时是现状回归，仍非新产品决定。未新增异步下单或pending规则。
- 手动关闭后重复dismiss只有一次退场/回调。入场和退场中重复destroy取消持有动画及计时，超过原到期时间仍无回调；销毁后旧按钮点击/update/mount不复活实例。完成动画微任务的精确竞态仍只由第10节确定性替身测试覆盖。
- T17组件浏览器范围通过：拒单4500ms后仍挂载且无自动计时或退场，HTML拒单原因未生成img；实际浏览器点击44px关闭按钮后退场回调一次。未定义拒单遇新订单、去结算或路由替换的规则。
- pageerror=0，网络无core/save/main/Trading入口；独立卡并行挂到body，仅用于观察各自计时，不验证多卡并存视觉或生产入口替换。脚本feedback-p1-b7-test.cjs、结果feedback-p1-b7-results.json在C:/Users/75151/.codex/automations/automation，未新增仓库入口/依赖。build/lint退出0，现存大包体提示保留。
- 整屏生命周期、后台节流/恢复、完整T18/T19、读屏及响应式仍未完成；下一阶段候选P1-b.8是拒单卡与OrderPanel同时存在时的去结算可达性组件核验，不把夹具跳转当作生产路由通过。现有经济/交易/视觉待决保持不变，无新增已知产品偏离。
## 16. P1-b.8 拒单卡与结算入口并存核验（2026-10-30）
- 真实OrderPanel/OrderFeedbackCard、锁定createMockVM/tokens及trading.css在隔离Vite+Chrome加载；拒单卡挂body，面板位于trading-screen和空的弹性滚动区下方。8组检查通过，无运行代码变更，服务已关闭。
- 6组布局为320×568/390×844/480×800各safe-bottom=0/34；每组覆盖数量0/-100/50/150/100.5及实际填空、资金不足且买上限0卖上限800、一致空VM。禁买卖条件不阻止去结算，鼠标实际点击每次仅记录一次skip；拒单卡仍挂载，未调用submit或dismiss。记录按钮≥44×44且完全位于视口内、fixed卡静止后不与按钮重叠。
- 另2组：拒单与空态并存，Enter/Space各触发一次skip，焦点可见；面板重复destroy后鼠标点击不再回调，独立卡仍能点击关闭并仅回调一次。pageerror=0、dialog=0；网络无core/save/main/Trading入口。脚本skip-p1-b8-test.cjs与results.json位于C:/Users/75151/.codex/automations/automation。
- 已确认依据为PROJECT“装死始终可点、无二次确认”及AGENTS触摸/键盘要求；测试数量、上限和资金错误语义为mock输入，不确认正式交易单位/资金校验。夹具skip只记录回调，不导航/退卡；拒单去结算后的清理方式未在此定案，生产入口现有dismiss仅为源码事实。
- T19仅双组件并存时的可达性与回调通过，不代表真实阶段切换、停ticker、退卡或结算页通过。未覆盖完整Tab顺序、软键盘/读屏、长拒单原因、入退场遮挡或完整屏幕；未新增已知产品偏离。build/lint退出0，现存大包体提示保留。
- 下一阶段候选P1-b.9：固定mock组合Trading组件的Tab顺序与固定区域布局核验，图表仅占位；不加载core/save、不把夹具当生产入口。经济/重组/Tick、数量/停牌、反馈分类/拒单替换等继续待决。
## 17. P1-b.9 mock组合布局与键盘核验（2026-10-30）
- 9组隔离Vite+Chrome检查通过，无运行代码变更。组合TopBar、PhaseNav、Watchlist、StockDetailHeader、TapePanel、QuoteGrid、NewsHint、OrderPanel及拒单卡，加载真实tokens/global/trading.css，图表仅180px占位；global.css只读使用，不构成视觉改版验收。
- 6组布局：320×568/390×844/480×800各safe-bottom=0/34，并分别safe-top=0/44。页面无横溢、无额外纵向滚动，内部滚动区高度为正且可滚动；滚到底前后顶栏、阶段条、订单面板矩形不变；结算按钮在视口内。未挂拒单卡时测量布局，不外推长反馈/动画中遮挡。
- 键盘组1：列表A/B→减→数量→加→半仓→全仓→融资→买→卖→结算，11个控件Tab顺序及focus-visible匹配，Shift+Tab原序返回；每个控件聚焦后20次组合update保持焦点。仅证明焦点标记及保留，不证明反馈遮挡时焦点完全可见或读屏播报。
- 键盘组2：Enter选A、Tab至B后Space选B，各一次委托且刷新保焦点。夹具只改selectedStockId，不供给新详情；本组不测试详情/盘口/图表选股同步，也不将这种夹具简化当作产品规则。
- 键盘组3：融资不可用、买卖上限0/资金错误、拒单卡并存时，从全仓Tab跳过禁用项到结算，Enter一次skip；再Tab到反馈关闭、Shift+Tab回结算，鼠标关闭仅一次dismiss。夹具不导航/退卡于skip，不新增焦点陷阱或模态策略；盘口只用固定档位与空成交。
- pageerror=0，请求无core/save/main/Trading入口，服务关闭；截图composite-p1-b9.png已目视检查，脚本与composite-p1-b9-results.json在C:/Users/75151/.codex/automations/automation。build/lint退出0，现存大包体提示保留；仅T21/T23组合范围补充，不能宣称整屏或24项全部通过。
- 已确认要求及现有DOM顺序作为依据，无新产品决定或新增已知偏离。软键盘/读屏、长文本、真实图表、生产路由/生命周期、经济与反馈待决仍未完成；下一阶段候选P1-b.10为mock组合全空与恢复后的键盘可达性/布局核验。
## 18. P1-b.10 mock组合全空与恢复核验（2026-10-30）
- 10组隔离Vite+Chrome检查通过，无运行代码变更。沿用第17节真实组件/CSS组合与180px图表占位，新增一致空VM和恢复快照；盘口由夹具独立传空/固定档位，不加载生产入口/core/save。
- 6组视口/安全区同第17节：旧列表/详情/四格/NPC/盘口清除、实时成交显示“等待成交”、预估0、买卖/融资禁用，结算鼠标点击只一次skip；恢复后两只股票、详情/行情/NPC/盘口和买卖可用性复原。页面无横溢/额外纵向滚动、滚动区高度正、顶栏/阶段条/订单区位置不变，结算≥44×44且在视口内；输入聚焦清空不丢焦点，结算聚焦恢复不丢焦点。
- 键盘组1：空态Chrome原生可滚动容器先成为Tab停靠点，其后减/输入/加/半仓/全仓/结算；正反序、focus-visible与每停靠点20次组合刷新保焦点通过，Enter/Space各一次skip，无确认弹窗。该原生停靠点不新增tabindex或焦点策略，未跨浏览器验证。
- 键盘组2：空态输入150后恢复，聚焦文本150保留且stepMismatch禁买；手动改100后Enter买入一次。恢复后的卖出重新进入结算之前的逆向Tab序。数量100/150及费用估算只回归原型，不定交易单位或纠错规则。
- 键盘组3：列表按钮聚焦后清空，焦点落body且无自动选股；显式聚焦订单输入后恢复不夺焦点，Space选第二股票一次、aria-pressed与焦点恢复。仅记录删除控件现状，未声称自动恢复原列表焦点或生产详情同步通过。
- 键盘组4：拒单卡挂载于空态，恢复后保持可见，结算与关闭正反Tab可达；Enter结算一次且夹具卡保留，点击关闭一次dismiss。skip只记录不导航/退卡，不把夹具当作产品清理规则。
- pageerror=0、dialog=0，请求无core/save/main/Trading入口，服务关闭；脚本empty-p1-b10-test.cjs、results.json及empty/restored PNG保留在C:/Users/75151/.codex/automations/automation，截图已目视检查。build/lint退出0，原大包体提示保留。仅补充T03/T21/T23组合范围；软键盘/读屏、真实图表/入口/生命周期仍未验收，无新增产品决定或已知偏离。下一阶段候选P1-b.11为长文本布局与关闭/结算可达性核验。
## 19. P1-b.11 长文本布局修复与核验（2026-10-30）
- 隔离Vite+Chrome沿用第17节真实组件/CSS组合及180px图表占位，中文与连续英文长串各重复40次；供给股票名、详情名、NPC姓名/时间/text、拒单原因。修复前中文长卡在320/390及480安全区下关闭移出视口，英文原因横溢；baseline.json保留矩形与溢出证据。
- 仅trading.css修复：底部偏移局部变量复用既有公式；最大卡高为100dvh减底部偏移/safe-top/sp-4，overflow-y:auto及overflow-wrap:anywhere；sticky卡头带不透明背景，顶padding移至卡头，滚动后关闭仍可见。未改token、反馈内容/停留/类别/更新合同、core或其他screen。
- 12组通过：320×568/390×844/480×800各safe-bottom=0/34、safe-top=0/44，每组中/英文；页面无横溢/额外纵向滚动，卡和原因无横溢，详情名边界在视口内，列表名与NPC提示保留省略样式及完整DOM文字，原因末尾<>& END原样保留。卡可到滚底（无需滚动的480中文也允许），sticky关闭命中测试通过，关闭≥44px，结算不遮挡且可点击。
- 各组鼠标结算一次，关闭一次；末组从结算Tab到关闭、Shift+Tab返回、Space结算再Enter关闭，focus-visible与回调通过。skip仅记录不导航/退卡；选股夹具只改id，NPC text虽传入但原型不展示，不声称其完整可读。长串为QA输入，不新增长度限制、业务规则或交互入口。
- 另跑第17节普通组合9组全部通过；pageerror=0，请求无core/save/main/Trading入口，服务关闭。long-p1-b11-test.cjs、baseline/results.json、scrolled.png及普通回归结果在C:/Users/75151/.codex/automations/automation；截图已目视检查。build/lint退出0，原chunk>500kB提示保留。
- 仅补充T17/T22/T23组合范围；读屏/软键盘、真实图表/生产路由/完整生命周期、动画中遮挡仍未验收；无新产品决定或已知产品偏离。下一阶段候选P1-b.12为反馈卡update刷新关闭按钮的焦点保持核验，拒单替换/异常分类等规则仍待决。
## 20. P1-b.12 反馈卡刷新焦点修复（2026-10-30）
- 修复前真实Chrome中Tab聚焦关闭后update，activeElement变为BODY；baseline.json保留证据。仅OrderFeedbackCard.update重绘前记录关闭是否聚焦，重绘后对新按钮focus({preventScroll:true})；外部焦点不恢复到卡内，无新焦点陷阱或自动关闭/返回焦点策略。
- 11项隔离Vite+Chrome检查通过：刷新拒单文案保焦点；20次刷新后Enter/Space各一次dismiss且可见焦点；外部输入20次刷新不被夺焦点；320×568/390×844/480×800各safe-bottom=0/34、safe-top=0/44，长拒单滚底后刷新保持卡scrollTop与页面scrollY，关闭仍聚焦且命中；销毁后update不复活或回调。
- 另跑第15节反馈计时7组浏览器回归全部通过。pageerror=0，请求无core/save/main/Trading入口，服务关闭；focus-p1-b12-test.cjs、baseline/results.json保留在C:/Users/75151/.codex/automations/automation。build/lint退出0，现存chunk>500kB提示保留。
- 仅补充T21的反馈卡更新合同；生产入口每单新建卡，当前不调用update，不能声称生产新单替换焦点已修。既有2500/4000ms、拒单手关与异常分类保留，非新增产品定案；读屏/软键盘/后台恢复、真实图表/路由生命周期仍未验收，无新增已知偏离。下一阶段候选为汇总24项证据与缺口，P1仍未完成。
