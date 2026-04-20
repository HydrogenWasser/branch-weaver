# Branch Weaver Store 设计说明

## 总体架构

Store 基于 Zustand，采用**单一数据源 + 功能切片（slice）**的混合模式：

- `src/store/editorStore.ts`：合并入口，负责 `create<EditorStore>()` 和 `getSelectedChoiceTarget()`。
- `src/store/types.ts`：共享类型定义，包括 `EditorStore`、`EditorSet`、`EditorGet`。
- `src/store/storeUtils.ts`：共享辅助函数，包括 `withProjectMutation`、`resetState`、`syncStartTag`、`updateChoiceInProject` 等。
- `src/store/slices/*.ts`：按功能域拆分的 slice，每个 slice 导出 `createXxxSlice(set, get)`。

## Slice 划分

| Slice | 文件 | 职责 |
|-------|------|------|
| Core | `coreSlice.ts` | 新建/加载项目、修改标题、保存标记、错误管理、selection、viewport |
| Global | `globalSlice.ts` | 全局变量的增删改查 |
| Node | `nodeSlice.ts` | 节点的增删改查、标签、颜色、fileTriggers、布局应用 |
| Choice | `choiceSlice.ts` | 选项的增删改查、条件、effects、路由模式 |
| History | `historySlice.ts` | 撤销/重做、删除选中项、导出检查辅助方法 |

Slice 之间通过 Zustand 的 `get()` 互相访问。例如 `historySlice.deleteSelection` 通过 `get().removeNode()` 和 `get().removeChoice()` 调用其他 slice 的 action，无需循环导入。

## 核心辅助函数

### `withProjectMutation(state, mutate)`

所有会修改项目数据的 action 都必须经过此函数包装。它负责：

1. **深拷贝项目**：`duplicateProject(state.project)`，防止直接修改现有状态。
2. **执行变更**：调用 `mutate(nextBase)`，返回 `{ project, selection? }`。
3. **推入历史**：将变更前的项目快照推入 `historyPast`，清空 `historyFuture`。
4. **脏状态比较**：将新项目序列化为字符串，与 `lastSavedSnapshot` 比较，决定 `dirty` 标志。
5. **错误清理**：成功时清除 `lastError`。

### `resetState(project, filePath?)`

用于新建、加载、重置项目时一次性初始化所有基础状态字段：
- `project`：深拷贝后的项目
- `selection`：自动指向 start node
- `viewport`：重置为 `{ x: 0, y: 0, zoom: 1 }`
- `historyPast` / `historyFuture`：清空
- `dirty` / `lastSavedSnapshot`：初始化

## Undo / Redo 机制

- **快照方式**：每次 `withProjectMutation` 将当前项目的完整深拷贝推入 `historyPast`。
- **Undo**：从 `historyPast` 弹出最后一个快照，恢复 `project`，将当前项目推入 `historyFuture`。
- **Redo**：从 `historyFuture` 取出快照恢复，将当前项目推回 `historyPast`。
- **Selection 回退**：undo/redo 后，selection 被重置为恢复后项目的 start node（简化一致性管理）。
- **性能权衡**：当前使用整项目快照，在节点数量很大时内存和 CPU 成本会上升。后续如需优化，可考虑 patch-based 或 debounce 策略。

## 不变量保护

Store 层硬编码了以下关键不变量：

- **至少保留一个节点**：`removeNode` 在 `nodes.length <= 1` 时直接返回错误，不执行删除。
- **Start tag 一致性**：删除开始节点时，`syncStartTag` 会自动将 Start tag 移到 fallback 节点。
- **全局变量引用保护**：`removeGlobal` 和 `updateGlobalValueType` 在全局仍被条件引用时阻止操作。
- **标签规范化**：`addNodeTag` / `removeNodeTag` 通过 `normalizeNodeTag` 处理空值和特殊字符。
