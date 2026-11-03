/**
 * Interpolate {{variable}} placeholders in a notification template.
 *
 * Ported verbatim from Aura's render-template.ts. Rules:
 *  - {{name}} where name matches \w+ (letters, digits, underscore) is replaced.
 *  - Unknown / missing variables → empty string (never left as literal {{x}}).
 *  - Whitespaced or hyphenated placeholders ({{ name }}, {{a-b}}) are left as-is.
 *  - Case-sensitive keys. No escaping, no defaults, no conditionals.
 */
export function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? "")
}
