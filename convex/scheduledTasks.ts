import { cronJobs } from "convex/server"
import { internal } from "./_generated/api"

const crons = cronJobs()

// Send reminder emails daily at 9 AM
crons.daily("send reminder emails", { hourUTC: 9, minuteUTC: 0 }, internal.emailNotifications.scheduleReminderEmails)

export default crons
