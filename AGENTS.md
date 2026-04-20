<!-- From: D:\Projects\Just-For-Fun\branch-weaver\AGENTS.md -->
# Branch Weaver — Agent 指南

## 项目概述

Branch Weaver 是一款轻量级的、基于浏览器的可视化编辑器，用于纯文本分支冒险游戏。作者通过在画布上排列节点、编写场景文本与选项、并将节点相互连接来构建故事。编辑器支持基于全局变量（布尔值与数字）的条件可见性与条件路由，并支持导出/导入经过验证的 JSON 项目文件。

本应用是一个单页 React 应用，完全在浏览器中运行，没有后端，也没有桌面壳集成。文件读写完全依赖浏览器：打开时使用浏览器的文件选择器，保存时触发下载。

## 第一性原理

- 你不能假设我总是完全清楚自己想要什么以及如何实现，因此当你认为我的目标不够明确、动机不够清晰、表述存在歧义的时候，立刻停下来问我。
- 多反问我。
- 当我提出更新时，你永远应该先使用计划模式（Plan Mode），先拟定好计划，告诉我并得到我的允许后，再执行修改。
- 你的所有回答、提问、思考、计划等，都必须使用中文。

## 技术栈

- **框架：** React 18.3.1 + TypeScript 5.5.4
- **构建工具：** Vite 5.4.21（`@vitejs/plugin-react`）
- **画布/图：** React Flow 11.11.4
- **状态管理：** Zustand 4.5.5
- **验证：** Zod 3.23.8
- **自动布局：** Dagre（`@dagrejs/dagre`）
- **样式：** 单个全局 CSS 文件（`src/styles.css`）—— 不使用 CSS-in-JS 或 Tailwind

## 目录结构

```
src/
  components/        React UI 组件
    App.tsx          根组件；连接 store、侧边栏、画布与快捷键
    CanvasGraph.tsx  React Flow 画布；渲染节点/边并处理平移/缩放/拖拽
    StoryNodeCard.tsx 自定义 React Flow 节点渲染器，用于故事节点
    Inspector.tsx    右侧边栏，用于编辑选中的节点/选项
    TopBar.tsx       顶部栏：新建 / 打开 / 保存 / 另存为 / 示例
    GlobalsPanel.tsx 左侧边栏面板，用于管理项目全局变量
    SearchPanel.tsx  左侧边栏，用于跨节点搜索
    PreviewPlayer.tsx 应用内试玩预览弹窗
    ConditionEditor.tsx 可复用的条件构建器 UI
    ChoicesEditor.tsx 选项编辑器弹窗
    ChoiceVisibilityEditor.tsx 可见性条件编辑子组件
    ChoiceEffectsEditor.tsx  Effects 编辑子组件
    ChoiceRouteEditor.tsx  路由编辑子组件
    ExportChecksPanel.tsx  导出检查面板
    DraggablePanel.tsx     可拖拽排序的面板容器
    FileTriggersEditor.tsx 文件触发器编辑器
    GlobalsEditor.tsx      全局变量编辑器弹窗
  hooks/             通用 React hooks
    useEditorShortcuts.ts  全局快捷键监听
    usePanelOrder.ts       面板排序与 localStorage 持久化
    useProjectFileActions.ts 文件操作 handler 聚合
  store/             Zustand store
    types.ts         EditorStore 类型定义
    storeUtils.ts    共享辅助函数（withProjectMutation、resetState 等）
    editorStore.ts   Store 创建与合并入口
    slices/          按功能拆分的 slice
      coreSlice.ts   项目加载、标题、选择、视口
      globalSlice.ts 全局变量增删改查
      nodeSlice.ts   节点增删改查、标签、颜色、fileTriggers
      choiceSlice.ts 选项增删改查、条件、effects、路由
      historySlice.ts 撤销/重做、删除选中项、导出检查
  types/
    story.ts         领域类型与 StoryProject v1/v2 的 Zod schema
  lib/
    story.ts         项目的增删改查辅助函数、验证、导入/导出、v1→v2 迁移
    conditions.ts    条件求值、格式化、强制转换、路由解析
    layout.ts        基于 Dagre 的自动节点布局
    search.ts        节点搜索索引与结果排序
    fileIO.ts        浏览器文件打开与 JSON 下载辅助函数
    nodeAppearance.ts 节点颜色主题与 CSS 变量映射
    nodeTags.ts      标签规范化与排序
  data/
    exampleProject.ts 硬编码的示例项目（The Locked Room）
public/
  examples/
    locked-room.json 旧版 v1 示例文件（与 exampleProject.ts 对应）
```

## 数据模型（StoryProject v2）

一个项目包含：

- **元数据：** `title`、`startNodeId`
- **全局变量：** 带默认值的强类型变量（`boolean` 或 `number`），在条件中被引用
- **节点：** 故事场景，包含 `title`、`body`、`position`、`tags`、`colorToken` 与 `choices`
- **选项：** 文本 + 可选的 `visibilityCondition` + `effects` + `route`
  - `visibilityCondition` 可以是单个原子条件或嵌套的 `all`/`any` 组合条件
  - `route.mode === "direct"` → 单个 `targetNodeId`
  - `route.mode === "conditional"` → 有序的 `branches`（每个 branch 包含 `condition` 与 `targetNodeId`）以及 `fallbackTargetNodeId`，branch 的 `condition` 同样支持组合条件

JSON v1（旧版）仍会被解析，并在导入时自动迁移到 v2。

## 构建与运行命令

```bash
# 安装依赖
npm install

# 启动开发服务器（固定端口 1420）
npm run dev

# 类型检查并构建生产包到 dist/
npm run build

# 本地预览生产构建
npm run preview
```

本项目**没有测试套件**。验证方式是通过开发服务器和应用内预览播放器进行手动测试。

## 代码风格与约定

- **语言：** TypeScript，启用 `strict: true`。所有新代码都应有类型；避免使用 `any`。
- **导入：** 适用时使用显式 `type` 导入（`import type { Foo } from "..."`）。
- **引号：** TS/TSX 中使用双引号。
- **分号：** 必须。
- **格式化：** 遵循现有的 2 空格缩进。
- **组件风格：** 函数组件，带显式的 props 类型接口。页面级组件使用默认导出；工具函数使用命名导出。
- **CSS：** 样式统一放在 `src/styles.css` 中。类名使用类 BEM 风格的小写命名与双下划线（如 `story-node-card__header`）。CSS 自定义属性用于动态节点主题。
- **ID：** 通过 `src/lib/story.ts` 中的 `createId(prefix)` 生成，格式为 `prefix_${Date.now().toString(36)}_${random}`。

## 状态管理规范

Zustand store 是唯一数据源，定义在 `src/store/` 下。

- **组织方式：** `editorStore.ts` 作为合并入口，实际逻辑按功能拆分为 `src/store/slices/` 下的 core / global / node / choice / history slice。各 slice 通过共享的 `EditorSet` / `EditorGet` 类型接入 store。
- **不可变性辅助：** `duplicateProject(project)` 通过 `JSON.parse(JSON.stringify(...))` 进行深拷贝。
- **历史/撤销重做：** 每次变更操作都会将当前项目快照推入 `historyPast`，并清空 `historyFuture`。撤销/重做通过恢复快照实现，并将选中项重置为起始节点。
- **脏跟踪：** 将项目序列化为字符串，与 `lastSavedSnapshot` 比较。
- **选中项：** 可以是 `null`、 `{ type: "node", nodeId }` 或 `{ type: "choice", nodeId, choiceId }`。
- **错误处理：** `lastError` 是一个字符串，在错误横幅中显示；大多数变更操作在成功时会清除它。

添加新的变更操作时，请在对应 slice 中用 `withProjectMutation(state, mutate)` 包裹，以确保历史记录与脏状态保持一致。`withProjectMutation` 和 `resetState` 定义在 `src/store/storeUtils.ts`。

## 条件逻辑与全局变量

全局变量通过 ID 在 `StoryCondition` 对象中被引用。条件系统支持嵌套组合：

```ts
type StoryCondition =
  | { type: "atomic"; globalId: string; operator: "eq" | "neq" | "gt" | "gte" | "lt" | "lte"; value: boolean | number }
  | { type: "all"; conditions: StoryCondition[] }
  | { type: "any"; conditions: StoryCondition[] };
```

- `atomic`：单个原子条件，比较一个全局变量与目标值。
- `all`：所有子条件都为 true（逻辑 AND）。
- `any`：任一子条件为 true（逻辑 OR）。
- 组合条件可以无限嵌套，例如 `(A > 5 AND B = true) OR C < 10`。
- 布尔类型全局变量只允许 `eq` 和 `neq`。
- 数字类型全局变量允许全部六种运算符。
- 当有任何选项仍引用该全局变量时，store 会阻止更改其类型或删除它。
- 当全局变量发生变化时，所有条件（包括嵌套在组合条件内的原子条件）会被递归规范化为安全值。
- 向后兼容：旧版 JSON 中的条件对象缺少 `type` 字段，Zod schema 会在解析时自动补全 `type: "atomic"`。

## 文件读写行为

- **打开：** `lib/fileIO.ts` 创建一个隐藏的 `<input type="file">`，使用 `FileReader` 读取文本，并返回 `{ path: null, text }`。在浏览器中，path 始终为 `null`。
- **保存 / 另存为：** 通过 `<a download="...">` 和 `Blob` 触发下载。由于浏览器无法覆盖现有路径，`saveJsonFile` 返回当前路径不变，`saveJsonFileAs` 返回 `null`。
- **保存时验证：** 序列化前会运行 `exportValidationErrors(project)`。如果存在问题，保存将被阻止，并通过错误横幅说明需要修复的内容。

## 键盘快捷键

快捷键逻辑封装在 `src/hooks/useEditorShortcuts.ts` 中，由 `App.tsx` 挂载。文件操作 handler 聚合在 `src/hooks/useProjectFileActions.ts` 中。

| 快捷键 | 动作 |
|--------|------|
| Ctrl/Cmd + N | 新建项目 |
| Ctrl/Cmd + O | 打开 JSON |
| Ctrl/Cmd + S | 保存 |
| Ctrl/Cmd + Shift + S | 另存为 |
| Ctrl/Cmd + Z | 撤销 |
| Ctrl/Cmd + Y | 重做 |
| Delete | 删除选中的节点或选项 |

## 添加新功能

- **新的领域逻辑** → 添加到 `src/lib/`，然后在 store 中导入使用。
- **新的 UI 面板** → 在 `src/components/` 下添加组件，并在 `App.tsx` 的侧边栏或主工作区中挂载。
- **新的项目字段** → 更新 `src/types/story.ts` 的类型与 Zod schema，然后更新 `src/lib/story.ts` 的辅助函数与 store。
- **样式变更** → 优先将规则添加到 `src/styles.css`，并使用 BEM 风格类名。保持与现有暖色调、纸质感的视觉风格一致。

## 常见陷阱

- 不要假设有文件系统访问权限。本应用刻意设计为纯浏览器应用。

- 修改项目对象前务必进行深拷贝（使用 `duplicateProject`）。

- 修改选项时，使用 `updateChoiceInProject` 或类似的不可变映射模式，以避免陈旧引用。

- 当节点数据的变化可能影响尺寸（body、choices、tags）时，记得在 `StoryNodeCard` 中调用 `updateNodeInternals`。

- `StoryNodeCard` 中的条件路由 handle **不可连接**（`isConnectable={false}`）；只有直接路由允许从选项 handle 拖拽出一条边。

- `StoryNodeCard` 调用 `updateNodeInternals` 的 effect 依赖使用轻量签名（如 `choices.map(c => c.text).join("|")`），不要恢复为 `JSON.stringify`。

- Inspector 中的 title / body 输入使用本地 state + `onBlur` 提交，避免逐字符触发历史快照。

  
