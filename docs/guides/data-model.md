# Branch Weaver 数据模型说明

## StoryProject v2 结构

一个合法的项目对象包含以下顶层字段：

```ts
{
  version: 2,
  metadata: {
    title: string,
    startNodeId: string
  },
  globals: StoryGlobal[],
  nodes: StoryNode[]
}
```

### 元数据约束
- `title`：任意字符串，导出时用于生成文件名。
- `startNodeId`：必须指向 `nodes` 中存在的某个节点的 `id`。
- 有且仅有一个节点带有 `"Start"` tag；如果 tag 与 `startNodeId` 不一致，导入校验会自动修正。

### 全局变量（StoryGlobal）

`StoryGlobal` 是**判别联合**，由 `valueType` 字段区分：

```ts
// boolean 分支
{ id: string; name: string; valueType: "boolean"; defaultValue: boolean }

// number 分支
{ id: string; name: string; valueType: "number"; defaultValue: number }
```

约束：
- `id` 全局唯一。
- `name` 去重空白后非空，且全局唯一（不区分大小写）。
- boolean 全局的 `defaultValue` 必须是布尔值。
- number 全局的 `defaultValue` 必须是有限数字（`Number.isFinite`）。
- Zod schema 使用 `z.discriminatedUnion("valueType", [...])`，导入时会在解析层拒绝类型不匹配的数据。

### 节点（StoryNode）

```ts
{
  id: string,
  title: string,
  body: string,
  position: { x: number, y: number },
  tags: string[],
  colorToken: "sand" | "amber" | "clay" | "sage" | "slate" | "rosewood",
  choices: StoryChoice[],
  fileTriggers: string[]
}
```

约束：
- `id` 在项目内唯一。
- `tags` 经过规范化（trim、去重、空串过滤）和排序；`"Start"` 标签的语义特殊。
- `fileTriggers` 经过 trim 和去重，空串被过滤。
- `colorToken` 不在合法列表中时，导入校验会回退为 `"sand"`。

### 选项（StoryChoice）

```ts
{
  id: string,
  text: string,
  visibilityCondition: StoryCondition | null,
  effects: StoryEffect[],
  route: StoryChoiceRoute
}
```

约束：
- `id` 在所属节点内唯一。
- `visibilityCondition` 为 `null` 时表示始终可见。
- `effects` 按顺序应用。

### 条件（StoryCondition）

```ts
{ globalId: string; operator: ConditionOperator; value: boolean | number }
```

运算符规则：
- 引用 **boolean** 全局时，只允许 `"eq"` 和 `"neq"`。
- 引用 **number** 全局时，允许全部六种：`"eq" | "neq" | "gt" | "gte" | "lt" | "lte"`。
- `value` 的类型必须与全局变量的类型匹配。

### 效果（StoryEffect）

```ts
{ globalId: string; operator: "set" | "change"; value: boolean | number }
```

运算符规则：
- 引用 **boolean** 全局时，只允许 `"set"`。
- 引用 **number** 全局时，允许 `"set"` 和 `"change"`。
- `value` 的类型必须与全局变量的类型匹配。

### 路由（StoryChoiceRoute）

```ts
// 直接路由
{ mode: "direct"; targetNodeId: string | null }

// 条件路由
{
  mode: "conditional";
  branches: Array<{ condition: StoryCondition; targetNodeId: string | null }>;
  fallbackTargetNodeId: string | null;
}
```

语义：
- **direct**：选项被选中后直接跳转到 `targetNodeId`。
- **conditional**：按 `branches` 的顺序逐条求值，第一条满足条件的分支决定目标节点；如果所有分支都不满足，则跳转到 `fallbackTargetNodeId`。

## v1 → v2 迁移

导入旧版 v1 JSON 时，系统会自动迁移：

| v1 字段 | v2 处理 |
|---------|---------|
| `version: 1` | 升级为 `version: 2` |
| 无 `globals` | 补空数组 `[]` |
| `choice.targetNodeId`（旧版直接目标） | 转换为 `route: { mode: "direct", targetNodeId }` |
| 无 `visibilityCondition` | 设为 `null` |
| 无 `effects` | 设为空数组 `[]` |
| 无 `fileTriggers` | 设为空数组 `[]`（节点级别） |

v2 项目导入时，已有的 `fileTriggers` 会被保留，不会被覆盖。
