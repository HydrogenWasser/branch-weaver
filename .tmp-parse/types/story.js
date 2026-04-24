import { z } from "zod";
export const nodeColorTokens = ["sand", "amber", "clay", "sage", "slate", "rosewood"];
export const globalValueTypes = ["boolean", "number"];
export const conditionOperators = ["eq", "neq", "gt", "gte", "lt", "lte"];
const positionSchema = z.object({
    x: z.number(),
    y: z.number()
});
const nodeColorTokenSchema = z.enum(nodeColorTokens);
const globalValueTypeSchema = z.enum(globalValueTypes);
const conditionOperatorSchema = z.enum(conditionOperators);
const conditionValueSchema = z.union([z.boolean(), z.number()]);
const storyConditionSchema = z.lazy(() => z.union([
    z.object({
        type: z.literal("atomic").default("atomic"),
        globalId: z.string().min(1),
        operator: conditionOperatorSchema,
        value: conditionValueSchema
    }),
    z.object({
        type: z.literal("all"),
        conditions: z.array(storyConditionSchema)
    }),
    z.object({
        type: z.literal("any"),
        conditions: z.array(storyConditionSchema)
    })
]));
const storyEffectSchema = z.object({
    globalId: z.string().min(1),
    operator: z.enum(["set", "change"]).default("set"),
    value: conditionValueSchema
});
const booleanGlobalSchema = z.object({
    id: z.string().min(1),
    name: z.string(),
    valueType: z.literal("boolean"),
    defaultValue: z.boolean()
});
const numberGlobalSchema = z.object({
    id: z.string().min(1),
    name: z.string(),
    valueType: z.literal("number"),
    defaultValue: z.number().refine((v) => Number.isFinite(v), {
        message: "Number global default value must be finite"
    })
});
const globalSchema = z.discriminatedUnion("valueType", [
    booleanGlobalSchema,
    numberGlobalSchema
]);
const legacyChoiceSchema = z.object({
    id: z.string().min(1),
    text: z.string(),
    targetNodeId: z.string().min(1).nullable()
});
const directRouteSchema = z.object({
    mode: z.literal("direct"),
    targetNodeId: z.string().min(1).nullable()
});
const conditionalRouteSchema = z.object({
    mode: z.literal("conditional"),
    branches: z.array(z.object({
        condition: storyConditionSchema,
        targetNodeId: z.string().min(1).nullable()
    })),
    fallbackTargetNodeId: z.string().min(1).nullable()
});
const choiceRouteSchema = z.discriminatedUnion("mode", [directRouteSchema, conditionalRouteSchema]);
const choiceSchemaV2 = z.object({
    id: z.string().min(1),
    text: z.string(),
    visibilityCondition: storyConditionSchema.nullable().default(null),
    effects: z.array(storyEffectSchema).default([]),
    route: choiceRouteSchema
});
const nodeSchemaV2 = z.object({
    id: z.string().min(1),
    title: z.string(),
    body: z.string(),
    position: positionSchema,
    tags: z.array(z.string()).default([]),
    colorToken: nodeColorTokenSchema.default("sand"),
    choices: z.array(choiceSchemaV2),
    fileTriggers: z.array(z.string()).default([])
});
const nodeSchemaV1 = z.object({
    id: z.string().min(1),
    title: z.string(),
    body: z.string(),
    position: positionSchema,
    tags: z.array(z.string()).default([]),
    colorToken: nodeColorTokenSchema.default("sand"),
    choices: z.array(legacyChoiceSchema)
});
const projectMetadataSchema = z.object({
    title: z.string(),
    startNodeId: z.string().min(1)
});
const storyProjectSchemaV1 = z.object({
    version: z.literal(1),
    metadata: projectMetadataSchema,
    nodes: z.array(nodeSchemaV1)
});
const storyProjectSchemaV2 = z.object({
    version: z.literal(2),
    metadata: projectMetadataSchema,
    globals: z.array(globalSchema).default([]),
    nodes: z.array(nodeSchemaV2)
});
export const storyProjectSchema = z.union([storyProjectSchemaV1, storyProjectSchemaV2]);
