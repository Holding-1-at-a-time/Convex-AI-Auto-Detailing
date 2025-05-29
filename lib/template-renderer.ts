import type { NotificationData } from "./notification-providers/types"

export function renderTemplate(template: string, data: NotificationData): string {
  let rendered = template

  // Simple mustache-style template rendering
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      const regex = new RegExp(`{{${key}}}`, "g")
      rendered = rendered.replace(regex, String(value))
    }
  })

  // Handle conditional blocks {{#key}}...{{/key}}
  Object.entries(data).forEach(([key, value]) => {
    const conditionalRegex = new RegExp(`{{#${key}}}([\\s\\S]*?){{/${key}}}`, "g")
    if (value) {
      rendered = rendered.replace(conditionalRegex, "$1")
    } else {
      rendered = rendered.replace(conditionalRegex, "")
    }
  })

  // Clean up any remaining template variables
  rendered = rendered.replace(/{{[^}]+}}/g, "")

  return rendered
}
