import type { FieldTransform } from "@nucleus/shared";

export function applyTransform(
  value: unknown,
  transform: FieldTransform,
  transformArg?: string,
): unknown {
  if (value === null || value === undefined) {
    if (transform === "default" && transformArg !== undefined) return transformArg;
    return value;
  }

  const str = String(value);

  switch (transform) {
    case "none":
      return value;
    case "lowercase":
      return str.toLowerCase();
    case "uppercase":
      return str.toUpperCase();
    case "trim":
      return str.trim();
    case "regex": {
      if (!transformArg) return value;
      const [pattern, flags = ""] = transformArg.split("|");
      const match = str.match(new RegExp(pattern, flags));
      return match?.[1] ?? match?.[0] ?? value;
    }
    case "split": {
      const sep = transformArg ?? ",";
      return str.split(sep).map((s) => s.trim()).filter(Boolean);
    }
    case "default":
      return str.trim() === "" ? (transformArg ?? value) : value;
    default:
      return value;
  }
}
