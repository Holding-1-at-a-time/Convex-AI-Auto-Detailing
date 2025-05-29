import type { NotificationTemplate, NotificationData } from "@/types/notification"

export const NOTIFICATION_TEMPLATES: Record<string, NotificationTemplate> = {
  booking_confirmation: {
    type: "booking_confirmation",
    subject: "Booking Confirmed - {{businessName}}",
    emailTemplate: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">Booking Confirmed!</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Your auto detailing appointment is all set</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
          <div style="background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h2 style="color: #333; margin: 0 0 20px 0; font-size: 22px;">Appointment Details</h2>
            
            <div style="border-left: 4px solid #16a34a; padding-left: 20px; margin: 20px 0;">
              <p style="margin: 5px 0; font-size: 16px;"><strong>Service:</strong> {{serviceType}}</p>
              <p style="margin: 5px 0; font-size: 16px;"><strong>Date:</strong> {{date}}</p>
              <p style="margin: 5px 0; font-size: 16px;"><strong>Time:</strong> {{startTime}} - {{endTime}}</p>
              <p style="margin: 5px 0; font-size: 16px;"><strong>Location:</strong> {{businessName}}</p>
              {{#if vehicleInfo}}<p style="margin: 5px 0; font-size: 16px;"><strong>Vehicle:</strong> {{vehicleInfo}}</p>{{/if}}
              {{#if bundleName}}<p style="margin: 5px 0; font-size: 16px;"><strong>Package:</strong> {{bundleName}}</p>{{/if}}
              <p style="margin: 5px 0; font-size: 18px; color: #16a34a;"><strong>Total: ${{ price }}</strong></p>
            </div>
            
            <div style="background: #e0f2fe; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <p style="margin: 0; color: #0277bd; font-size: 14px;">
                <strong>Confirmation #:</strong> {{appointmentId}}
              </p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              {{#if confirmationUrl}}
              <a href="{{confirmationUrl}}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; margin: 5px;">View Details</a>
              {{/if}}
              {{#if rescheduleUrl}}
              <a href="{{rescheduleUrl}}" style="background: #f59e0b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; margin: 5px;">Reschedule</a>
              {{/if}}
            </div>
            
            <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 20px;">
              <p style="margin: 0; color: #6b7280; font-size: 14px;">
                We'll send you a reminder 24 hours before your appointment. Please ensure your vehicle is accessible and ready for service.
              </p>
            </div>
          </div>
        </div>
        
        <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 12px;">
          <p>Thank you for choosing {{businessName}}!</p>
        </div>
      </div>
    `,
    smsTemplate:
      "Booking confirmed! {{serviceType}} on {{date}} at {{startTime}} with {{businessName}}. Confirmation #{{appointmentId}}. Total: ${{price}}. We'll send a reminder 24hrs before.",
  },

  booking_reminder: {
    type: "booking_reminder",
    subject: "Reminder: Your appointment is tomorrow - {{businessName}}",
    emailTemplate: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">Appointment Reminder</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Your auto detailing appointment is tomorrow</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
          <div style="background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h2 style="color: #333; margin: 0 0 20px 0; font-size: 22px;">Tomorrow's Appointment</h2>
            
            <div style="border-left: 4px solid #f59e0b; padding-left: 20px; margin: 20px 0;">
              <p style="margin: 5px 0; font-size: 16px;"><strong>Service:</strong> {{serviceType}}</p>
              <p style="margin: 5px 0; font-size: 16px;"><strong>Date:</strong> {{date}}</p>
              <p style="margin: 5px 0; font-size: 16px;"><strong>Time:</strong> {{startTime}} - {{endTime}}</p>
              <p style="margin: 5px 0; font-size: 16px;"><strong>Location:</strong> {{businessName}}</p>
              {{#if vehicleInfo}}<p style="margin: 5px 0; font-size: 16px;"><strong>Vehicle:</strong> {{vehicleInfo}}</p>{{/if}}
            </div>
            
            <div style="background: #fef3c7; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <h3 style="margin: 0 0 10px 0; color: #92400e;">Preparation Checklist:</h3>
              <ul style="margin: 0; padding-left: 20px; color: #92400e;">
                <li>Ensure your vehicle is accessible</li>
                <li>Remove personal items from the car</li>
                <li>Have your keys ready</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              {{#if rescheduleUrl}}
              <a href="{{rescheduleUrl}}" style="background: #f59e0b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; margin: 5px;">Reschedule</a>
              {{/if}}
              {{#if cancelUrl}}
              <a href="{{cancelUrl}}" style="background: #dc2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; margin: 5px;">Cancel</a>
              {{/if}}
            </div>
          </div>
        </div>
      </div>
    `,
    smsTemplate:
      "Reminder: {{serviceType}} appointment tomorrow {{date}} at {{startTime}} with {{businessName}}. Please have your vehicle ready and accessible.",
  },

  booking_cancelled: {
    type: "booking_cancelled",
    subject: "Appointment Cancelled - {{businessName}}",
    emailTemplate: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">Appointment Cancelled</h1>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
          <div style="background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <p style="font-size: 16px; color: #333;">Hi {{customerName}},</p>
            <p style="font-size: 16px; color: #333;">Your appointment has been cancelled:</p>
            
            <div style="border-left: 4px solid #dc2626; padding-left: 20px; margin: 20px 0;">
              <p style="margin: 5px 0; font-size: 16px;"><strong>Service:</strong> {{serviceType}}</p>
              <p style="margin: 5px 0; font-size: 16px;"><strong>Original Date:</strong> {{date}}</p>
              <p style="margin: 5px 0; font-size: 16px;"><strong>Original Time:</strong> {{startTime}} - {{endTime}}</p>
              {{#if reason}}<p style="margin: 5px 0; font-size: 16px;"><strong>Reason:</strong> {{reason}}</p>{{/if}}
            </div>
            
            <p style="font-size: 16px; color: #333;">We apologize for any inconvenience. If you'd like to book a new appointment, please visit our booking page.</p>
          </div>
        </div>
      </div>
    `,
    smsTemplate:
      "Your {{serviceType}} appointment on {{date}} at {{startTime}} has been cancelled. {{#if reason}}Reason: {{reason}}.{{/if}} Book again anytime!",
  },

  booking_rescheduled: {
    type: "booking_rescheduled",
    subject: "Appointment Rescheduled - {{businessName}}",
    emailTemplate: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">Appointment Rescheduled</h1>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
          <div style="background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <p style="font-size: 16px; color: #333;">Hi {{customerName}},</p>
            <p style="font-size: 16px; color: #333;">Your appointment has been rescheduled:</p>
            
            <div style="border-left: 4px solid #0ea5e9; padding-left: 20px; margin: 20px 0;">
              <p style="margin: 5px 0; font-size: 16px;"><strong>Service:</strong> {{serviceType}}</p>
              <p style="margin: 5px 0; font-size: 16px;"><strong>New Date:</strong> {{newDate}}</p>
              <p style="margin: 5px 0; font-size: 16px;"><strong>New Time:</strong> {{newStartTime}} - {{newEndTime}}</p>
              <p style="margin: 5px 0; font-size: 16px;"><strong>Location:</strong> {{businessName}}</p>
              {{#if reason}}<p style="margin: 5px 0; font-size: 16px;"><strong>Reason:</strong> {{reason}}</p>{{/if}}
            </div>
            
            <p style="font-size: 16px; color: #333;">We'll send you a reminder 24 hours before your new appointment time.</p>
          </div>
        </div>
      </div>
    `,
    smsTemplate:
      "Your {{serviceType}} appointment has been rescheduled to {{newDate}} at {{newStartTime}} with {{businessName}}. {{#if reason}}Reason: {{reason}}.{{/if}}",
  },
}

export const renderTemplate = (template: string, data: NotificationData): string => {
  let rendered = template

  // Simple template rendering (replace with a proper template engine in production)
  Object.entries(data).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, "g")
    rendered = rendered.replace(regex, String(value || ""))
  })

  // Handle conditional blocks (simplified)
  rendered = rendered.replace(/{{#if\s+(\w+)}}(.*?){{\/if}}/gs, (match, condition, content) => {
    return data[condition as keyof NotificationData] ? content : ""
  })

  return rendered
}
