# 吉他指板训练器 — MVP 产品规格 (Phase 1)

> 这是一份给 coding agent 的实施规格。本文档只覆盖 Phase 1（单音识别 + 单音定位）。文末列出了未来阶段，**请勿提前实现**。

---

## 1. 产品概述

一个面向吉他手个人使用的指板训练 Web App。核心目标是把六根弦 0–12 品共 78 个音位的识别和定位训练到肌肉记忆级别——这是和弦识别、音阶导航、即兴 solo 等所有上层能力的底层字根。

**核心用户路径**：打开 App → 看到指板热力图（哪里熟、哪里冷一目了然）→ 点击「开始训练」→ 10 分钟训练 → 自动结束并更新热力图 → 关闭。

---

## 2. 设计哲学（实现时请遵守）

**反多邻国设计**。不要做连胜（streak）、心心、XP、联赛、徽章、每日任务等任何留存导向的游戏化机制。这些机制会污染数据、鼓励垃圾局、让用户为维持数字而硬刷。本产品是为单一用户的内驱型训练服务的，唯一的反馈应该是「我现在比昨天更熟」这件事本身。

**反应时间是主要指标**。准确率不够，因为慢慢想出来的答案不构成肌肉记忆。每个音位都有目标响应时间，超时即判错。这是产品和市面上简陋工具拉开差距的关键杠杆。

**间隔重复，不是均匀随机**。每个音位单独跟踪掌握度，弱的多出，强的少出但不消失。

**短而每天，强制结束**。单次训练限定 10 分钟，时间到自动结束，不允许延长。短而高频对运动记忆的固化远胜过长而稀疏。

---

## 3. MVP 功能范围

仅以下功能。其他一切——和弦训练、音阶 box、变调、左撇子模式、音色播放、账号、主题——都在范围外。

**3.1 主页**：指板热力图 + 一个「开始训练」按钮 + 总训练时长/总答题数等顶层统计。

**3.2 训练会话**：10 分钟定时，混合两种题型，每题答完立刻进入下一题。

**3.3 训练总结**：会话结束后展示本次表现 + 哪些格子的掌握度变化最大。

**3.4 数据持久化**：使用 localStorage，单用户，无云同步。

---

## 4. 核心训练循环

### 4.1 题型

每道题在两种模式中按 50/50 概率随机选择。

**模式 A — 识别 (Identify)**：在指板上高亮一个品位（包括开放弦），用户从 12 个音名按钮中选出正确答案。

**模式 B — 定位 (Locate)**：屏幕显示一个音名 + 指定弦号（例如「在 5 弦上找到 D」），用户在指板上点击该弦的正确品位。

### 4.2 单题流程

1. 选题算法挑选一个目标音位 cell（见 §6）。
2. 随机选定题型（A 或 B）。
3. 启动计时器，记录题目展示时刻 `t_shown`。
4. 用户作答，记录 `t_answered`，计算 `responseTimeMs = t_answered - t_shown`。
5. 判定正确与否：
   - 答案正确 **且** `responseTimeMs <= getTargetTime(cell)` → 算正确。
   - 答案正确但超时 → 算**错误**（这是关键设计，请勿改动）。
   - 答案错误 → 算错误。
6. 反馈展示：
   - 正确：绿色闪烁 ~400ms，自动进入下一题。
   - 错误：红色闪烁，在指板上以正确答案高亮 ~1500ms，再进入下一题。
7. 更新该 cell 的统计数据并持久化。

### 4.3 目标响应时间

```
function getTargetTime(cell):
  if cell.fret <= 5: return 1500  // ms
  else: return 2500  // ms
```

### 4.4 音名约定

仅使用升号（sharps），不使用降号。12 个音名固定为：`C, C#, D, D#, E, F, F#, G, G#, A, A#, B`。

### 4.5 标准调弦

固定 EADGBE（六弦最低 E2，一弦最高 E4）。MVP 不支持任何变调或替代调弦。

---

## 5. 数据模型

### 5.1 指板单元 (Cell)

指板共 6 弦 × 13 品（0 到 12）= 78 个 cell。每个 cell 唯一标识为 `${string}-${fret}`，例如 `6-0`（六弦空弦 = E2）、`1-12`（一弦 12 品 = E5）。

弦的编号约定：1 = 高音 E（细弦），6 = 低音 E（粗弦）。

```typescript
type Cell = {
  id: string;              // "6-0", "1-12", etc.
  string: 1 | 2 | 3 | 4 | 5 | 6;
  fret: 0 | 1 | 2 | ... | 12;
  noteName: string;        // "E", "F", "F#", etc. — 由 string + fret 推导，预先计算并固化
  recentAttempts: Attempt[]; // 环形缓冲区，保留最近 10 次
  totalAttempts: number;
  totalCorrect: number;
};

type Attempt = {
  correct: boolean;
  responseTimeMs: number;
  mode: 'A' | 'B';
  timestamp: number;
};
```

### 5.2 全局状态

```typescript
type AppState = {
  cells: Record<string, Cell>;  // 78 entries, keyed by cell.id
  totalSessionsCompleted: number;
  totalQuestionsAnswered: number;
  totalTimeMs: number;
  lastSessionDate: string | null;  // ISO date
};
```

### 5.3 持久化

使用 `localStorage`，单一 key `fretboard-trainer-state-v1`。整个 `AppState` 序列化为 JSON。每答完一题立即持久化（写入开销可忽略）。

### 5.4 标准调弦音名映射

预先计算并存为常量。六根弦各自的开放音名：

```
String 1: E (E4)
String 2: B
String 3: G
String 4: D
String 5: A
String 6: E (E2)
```

每根弦从开放（fret 0）起每升高一品升半音，按 12 半音循环。

---

## 6. 选题算法

这是产品的发动机，请精确按下面实现。

### 6.1 掌握度计算

```typescript
function masteryScore(cell: Cell): number | null {
  const recent = cell.recentAttempts;
  if (recent.length === 0) return null;  // unseen

  // Accuracy in recent window
  const accuracy = recent.filter(a => a.correct).length / recent.length;

  // Speed score: only count correct attempts (incorrect attempts don't have meaningful time)
  const correctAttempts = recent.filter(a => a.correct);
  let speedScore = 0;
  if (correctAttempts.length > 0) {
    const avgTime = correctAttempts.reduce((s, a) => s + a.responseTimeMs, 0) / correctAttempts.length;
    const targetTime = getTargetTime(cell);
    speedScore = Math.min(targetTime / avgTime, 1);
  }

  let mastery = 0.5 * accuracy + 0.5 * speedScore;

  // Penalize low sample sizes — don't trust mastery from < 5 attempts
  if (recent.length < 5) {
    mastery *= recent.length / 5;
  }

  return mastery;  // [0, 1]
}
```

### 6.2 选题逻辑

```typescript
function selectNextCell(cells: Cell[], lastCellId: string | null): Cell {
  // Cold-start: if there are unseen cells, prefer them most of the time
  const unseen = cells.filter(c => masteryScore(c) === null);
  if (unseen.length > 0 && Math.random() < 0.6) {
    return pickRandom(unseen);
  }

  // Otherwise, weighted random by mastery deficit
  const candidates = cells.filter(c => c.id !== lastCellId);  // avoid immediate repeat
  const weights = candidates.map(c => {
    const m = masteryScore(c) ?? 0;
    return Math.pow(1 - m, 2) + 0.1;  // 0.1 floor: even mastered cells appear sometimes
  });

  return weightedRandomChoice(candidates, weights);
}
```

行为说明：
- 完全未练过的格子有 60% 概率被优先选中。
- 已经练过但弱的格子（低 mastery）会被高频选中。
- 已经精通的格子（mastery ≈ 1）权重为 0.1，仍会偶尔出现以维持记忆。
- 不会连续两题选同一格子。

---

## 7. UI 规格

### 7.1 主页

```
┌─────────────────────────────────┐
│  Fretboard Trainer              │
│                                 │
│  [指板热力图 SVG]                │
│   6 strings × 13 frets          │
│   每格按掌握度上色               │
│                                 │
│  本周训练: 4 次 · 共 47 分钟     │
│  累计答题: 312 道 · 准确率 78%   │
│                                 │
│  ┌─────────────────────────┐    │
│  │   开始训练（10 分钟）    │    │
│  └─────────────────────────┘    │
└─────────────────────────────────┘
```

**热力图规格**：
- 横向 13 列代表 0–12 品，纵向 6 行代表 6 根弦（1 弦在顶或底由实现者决定，建议 1 弦在顶以匹配大多数吉他谱视角）。
- 每个格子的填充色按掌握度映射：
  - mastery === null（未练过）：深灰 `#2a2a2a`
  - mastery 0–1：从冷蓝 `#1e3a8a` 渐变到亮绿 `#22c55e`
- 每个格子内显示音名（小字号）。
- 第 3、5、7、9、12 品在格子下方加点状品记标记，匹配真实吉他视觉。
- 点击格子可弹出该格的详细统计（最近 10 次的准确率、平均响应时间、目标时间）。

### 7.2 训练页

```
┌─────────────────────────────────┐
│  剩余 8:42        第 23 题       │
│                                 │
│  [指板 SVG，高亮目标格子]         │
│                                 │
│  问题：这个音是什么？            │
│  （或：在 5 弦上找到 D）         │
│                                 │
│  [C] [C#] [D] [D#]              │
│  [E] [F] [F#] [G]               │
│  [G#] [A] [A#] [B]              │
│                                 │
│            [结束训练]            │
└─────────────────────────────────┘
```

**模式 A（识别）**：指板上高亮一个格子，下方 12 个音名按钮。
**模式 B（定位）**：屏幕顶部文字提示「在 X 弦上找到 Y」，指板该弦所有 13 个品位可点击。其他弦不可点。

**反馈**：答对时格子绿色闪烁 ~400ms；答错时红色闪烁，正确格子高亮 ~1500ms，然后进入下一题。

**计时器**：屏幕顶部倒计时显示剩余时间。10:00 开始递减。归零时强制结束当前题（不计入统计），跳转到总结页。

**结束按钮**：用户主动结束。已答题目正常计入。

### 7.3 总结页

```
┌─────────────────────────────────┐
│  训练完成                        │
│                                 │
│  本次：32 题 · 正确 24 (75%)     │
│  平均反应时间：1.8s              │
│                                 │
│  进步最大的格子：                │
│  · 5弦 7品 (D)  +0.42           │
│  · 3弦 4品 (B)  +0.31           │
│  · ...                          │
│                                 │
│  退步的格子：                    │
│  · 6弦 9品 (C#) -0.15           │
│                                 │
│         [返回主页]               │
└─────────────────────────────────┘
```

进步/退步通过对比会话开始前 vs 结束后的 mastery score 计算，列出 top 3。

---

## 8. 技术栈

- **框架**：React 18 + Vite + TypeScript
- **样式**：Tailwind CSS
- **持久化**：localStorage（直接 JSON.stringify/parse，不需要 IndexedDB）
- **指板渲染**：原生 SVG，不引入额外图形库
- **状态管理**：React useState/useReducer 即可，不需要 Redux/Zustand
- **路由**：单页三个视图（Home / Session / Summary），用 useState 切换即可，不需要 react-router
- **部署**：Vercel，配置为 PWA 以便加到 iOS/Android 主屏幕

整个项目应该在 1000 行 TypeScript 以内完成。如果实现远超这个数字，说明引入了不必要的复杂度。

---

## 9. 推荐实现顺序

1. 数据模型 + 78 个 cell 的初始化 + localStorage 读写。
2. SVG 指板组件（无交互），仅做渲染验证，每格显示音名。
3. 掌握度计算 + 选题算法（先用控制台输出验证逻辑，再接 UI）。
4. 训练页 — 模式 A 单题循环，无计时器，无样式。
5. 加上目标响应时间判定 + 反馈动画。
6. 加上模式 B。
7. 10 分钟会话计时器 + 总结页。
8. 主页热力图配色 + 顶层统计。
9. PWA 配置 + 部署。

每个步骤完成后让我手动测一下再进入下一步。

---

## 10. 不做什么（明确排除）

- ❌ 连胜计数、XP、心心、徽章、每日任务、排行榜
- ❌ 用户账号、登录、云同步
- ❌ 多种主题、深浅模式切换、字体设置
- ❌ 音色播放（midi/audio）
- ❌ 替代调弦（drop D 等）
- ❌ 左撇子模式
- ❌ 和弦识别、音阶训练、CAGED、五声 box（这些是 Phase 2+）
- ❌ 难度调节滑杆（让算法自己调节）
- ❌ 训练时长可配置（强制 10 分钟）
- ❌ 问题数量可配置（按时间走，不按题数）

---

## 11. 未来阶段（仅供参考，请勿实现）

- **Phase 2**：八度关联训练 — 显示一个音位，要求用户在 12 品内点出该音的所有其他位置。这是连接所有指板形状的隐形骨架。
- **Phase 3**：和弦根音定位 — 给一个和弦名（含色彩 m/maj7/7 等），要求在 5/6 弦上点出根音。
- **Phase 4**：五声音阶 box — 当用户能秒定位任意根音后，pentatonic 就只是相对形状的训练。

---

## 12. 验收标准

实现完成后，以下场景应当工作正常：

1. 全新打开（localStorage 空）：热力图全灰，开始训练后前几题应该是没练过的格子。
2. 答对一道 1.2 秒的低品位题：该格子的 mastery 上升，颜色变浅绿。
3. 故意慢答（>1.5 秒）即使答案正确也判错，且该格子 mastery 不升。
4. 关闭浏览器再打开，所有数据保留。
5. 训练 10 分钟到点自动跳转到总结页。
6. 总结页能正确列出进步/退步最大的格子。
7. 主页点击任意格子能看到该格子的详细统计。

---

文档结束。如果实现过程中发现规格内有矛盾或未覆盖的边缘情况，停下来问我，不要自行猜测。
