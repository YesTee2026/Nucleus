import { z } from "zod";

export const ciFieldDataTypeSchema = z.enum([
  "string",
  "number",
  "boolean",
  "date",
  "enum",
  "ip",
  "reference",
  "json",
]);

export const createFieldDefinitionSchema = z.object({
  classId: z.string().uuid(),
  name: z.string().min(1),
  displayName: z.string().min(1),
  dataType: ciFieldDataTypeSchema,
  isRequired: z.boolean().default(false),
  isStandard: z.boolean().default(false),
  isDiscoveryKey: z.boolean().default(false),
  validationRules: z.record(z.unknown()).default({}),
});

export type CiFieldDataType = z.infer<typeof ciFieldDataTypeSchema>;
