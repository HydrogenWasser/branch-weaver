# Branch Weaver 性能注意事项

## 已实施的优化

### Store 订阅收窄

- **CanvasGraph**：从订阅整个 `project` 对象改为只订阅 `project.nodes` 和 `project.globals`。这样 metadata 标题修改、globals 外的字段变化不会触发整张图的节点/边重建。
- **ExportChecksPanel**：从 `App.tsx` 顶层预计算改为独立组件内部计算。只有面板实际可见时才执行 `exportValidationErrors()`。

### 搜索索引依赖收窄

- `buildNodeSearchIndex` 的签名从接收 `StoryProject` 改为接收 `StoryNode[]`，调用方的 `useMemo` 依赖从 `project` 精确到 `nodes`。

### StoryNodeCard 内部更新

- 移除了 `JSON.stringify(data.storyNode.choices)` 作为 `useEffect` 依赖。
- 改用轻量签名：`data.storyNode.choices.map((c) => c.text).join("|")`，只捕获影响节点尺寸的 choice text 变化。
- 移除了 `colorToken`（颜色不影响尺寸）和 `tags.join("|")`（改为 `tags.length`）。

### 历史系统止损

- **Inspector 文本输入**：title 和 body 改为本地 state + `onBlur` 提交，不再逐字符写入历史快照。
- **节点拖拽**：`handleNodeDragStop` 增加了位置变化检查，只有拖拽后位置确实改变时才调用 `moveNode`。

## 设计决策与权衡

### 深拷贝快照 vs Patch-based History

当前使用 `JSON.parse(JSON.stringify(project))` 做整项目深拷贝。优点是实现简单、无引用泄漏风险；缺点是：
- 高频操作时（如拖拽、快速输入）CPU 和内存开销明显
- 历史栈增长速度与操作频率成正比

**后续如需进一步优化**，可考虑：
- 对文本输入使用 debounce 合并历史（已在 Inspector 中部分实施）
- 引入 patch-based history（只记录变更 diff）
- 对节点拖拽使用批量提交（拖拽开始时不写历史，结束后再写一次）

### React Flow 的 `canvasNodes` State

`CanvasGraph` 内部维护 `canvasNodes` state，用于接收 React Flow 的内部变更（选中状态、临时位置）。`projectNodes` 作为只读派生数据，只在 `project.nodes` 变化时重建。这个双层结构是有意的：
- `projectNodes` 保证 React Flow 看到的数据始终与 store 一致
- `canvasNodes` 允许 React Flow 在拖拽过程中自由修改节点位置而不触发 store 写入

### memo 与 useCallback

- `StoryNodeCard` 使用 `memo`，减少不必要的重新渲染。
- `CanvasGraph` 中的事件 handler（`handleNodeBodyClick`、`handleChoiceClick` 等）使用 `useCallback`，保持引用稳定，减少 `projectNodes` 的重建频率。

## 应避免的反模式

1. **不要恢复 `JSON.stringify` 作为 effect 依赖**：它比轻量签名重得多，且随数据量增长。
2. **不要在顶层订阅整个 `project`**：如果只需要 `nodes` 或 `globals`，应使用精确 selector。
3. **不要在高频事件中直接调用 store mutation**：如文本输入、持续拖拽，应使用本地缓冲或批量提交。
4. **不要让 `useMemo` 依赖比实际需要的更宽**：如搜索索引只依赖 `nodes`，不应依赖整个 `project`。
