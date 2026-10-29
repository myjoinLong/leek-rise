# AGENTS.md — 《韭菜翻身》工程约束

## 项目一句话
一个讽刺 A 股收割生态的 H5 文字模拟游戏。玩家是韭菜，系统是镰刀。

## 当前阶段
**只实现 Trading Screen 的 UI 层**，用 mock 数据。不接 core 层、不接存档、不做其他 screen。

## 技术栈（不可更改）
- Vite + TypeScript（strict 模式）
- 原生 DOM（**禁止引入 React/Vue/Svelte/Solid 等任何 UI 框架**）
- Phaser 仅用于 K 线组件（不要在其他地方使用）
- CSS 变量 + 原生 CSS（**禁止引入 Tailwind/CSS-in-JS/styled-components**）
- 动画用 Web Animations API（**禁止引入 GSAP/framer-motion/anime.js**）
- 校验用 Zod，存档用 localForage（当前阶段不写）

## 目录与文件约定（只能在这些路径下工作）
- 组件：`src/ui/screens/Trading/components/<Name>.ts`，导出一个 class
- 组件必须实现 `src/components/Component.ts` 里的 `Component<S>` 接口
- 样式：写在 `src/ui/screens/Trading/styles/trading.css`（暂无此文件可建）
- 主入口：修改 `src/ui/screens/Trading/index.ts`
- 禁止新建 `views`, `pages`, `utils` 等无用目录

## 硬约束（违反任意一条就是错）
1. **禁止修改**以下文件（已锁定）：
   - `src/ui/screens/Trading/types.ts`
   - `src/ui/screens/Trading/mock.ts`
   - `src/ui/screens/Trading/styles/tokens.css`
   - `src/components/Component.ts`
   - `AGENTS.md`、`PROJECT.md`、`tsconfig.json`、`vite.config.ts`
2. **禁止新增 npm 依赖**。如果需要新库，停下来问我。
3. **禁止修改本批次任务之外的文件**。哪怕看到别的地方有 bug，不要动。写进回复末尾。
4. **禁止写超 250 行的单文件**。超了拆成多个子组件。
5. **禁止用 `any`**。遇到类型问题用 `unknown` + 类型守卫。
6. **禁止无意义注释**。只在"为什么这么写"处写注释。
7. **禁止留下 console.log**。调试用完删掉。
8. **禁止 git commit**。所有提交由人工确认后做。

## 代码风格
- 缩进 2 空格，单引号，分号结尾。
- 类成员顺序：`el` → `private state` → `constructor` → `bind*` → `update` → `destroy`
- 事件监听统一在 `bindEvents()` 里注册，不散落在 constructor。
- DOM 生成优先 `innerHTML` + 事件委托，超过 3 层嵌套才用 `createElement`。

## 命名约定
- 组件文件：`PascalCase.ts`（如 `OrderPanel.ts`）
- 组件类：同名 `PascalCase`（如 `export class OrderPanel`）
- 组件 CSS 类前缀：取组件缩写，如 OrderPanel → `op-`（`op-qty`, `op-actions`）
- 事件方法：`on<Event>`（`onSelectStock` `onSubmit`）

## 交互与动画约定
- 所有动画用 `el.animate(keyframes, options)`，不用 CSS transition 做入场。
- 动画时长从 `tokens.css` 的 `--dur-*` 变量读取。
- 反馈卡、Banner 类浮层用 `position: fixed`。

## 无障碍约定
- 所有按钮必须有 `aria-label` 或可见文字。
- 触摸目标最小 44×44（视觉可小，用透明 padding 撑开）。
- 涨跌不只靠颜色，加 ▲▼ 符号。

## 每次任务完成后你应该做的
1. 跑 `npm run build`，确保零 TS 错误。
2. 跑 `npm run lint`，确保零错误。
3. 在回复里列出：改了哪些文件、每个文件做了什么、遇到的任何不确定或需要人工决策的地方。
4. 不要 commit。

## 有疑问时
- 类型不明确 → 读 `types.ts`，不要自己发明字段。
- 样式不确定 → 读 `tokens.css`，不要硬编码颜色/尺寸。
- 交互不确定 → 在回复里问，不要猜。