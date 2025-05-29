import type { NotificationTemplate } from "./notification-providers/types"

export const notificationTemplates: Record<string, NotificationTemplate> = {
  appointment_confirmation: {
    subject: "Appointment Confirmed - {{businessName}}",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Appointment Confirmed!</h1>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <p style="font-size: 18px; color: #333; margin-bottom: 20px;">Hi {{customerName}},</p>
          
          <p style="color: #666; line-height: 1.6;">Your auto detailing appointment has been confirmed! We're excited to service {{vehicleInfo}} and make it shine like new.</p>
          
          <div style="background: #f8f9fa; padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #28a745;">
            <h3 style="color: #28a745; margin: 0 0 15px 0; font-size: 20px;">{{serviceType}}</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <p style="margin: 5px 0;"><strong>Date:</strong> {{date}}</p>
              <p style="margin: 5px 0;"><strong>Time:</strong> {{startTime}} - {{endTime}}</p>
              <p style="margin: 5px 0;"><strong>Location:</strong> {{businessName}}</p>
              <p style="margin: 5px 0;"><strong>Price:</strong> ${{ price }}</p>
            </div>
            {{#bundleName}}
            <p style="margin: 10px 0 5px 0;"><strong>Bundle:</strong> {{bundleName}}</p>
            {{/bundleName}}
            <p style="margin: 15px 0 5px 0; font-size: 14px; color: #666;"><strong>Confirmation #:</strong> {{appointmentId}}</p>
          </div>
          
          <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h4 style="color: #1976d2; margin: 0 0 10px 0;">What to expect:</h4>
            <ul style="color: #666; line-height: 1.6; margin: 0; padding-left: 20px;">
              <li>Our team will arrive at the scheduled time</li>
              <li>Please ensure your vehicle is accessible</li>
              <li>We'll send you a reminder 24 hours before your appointment</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            {{#confirmationUrl}}
            <a href="{{confirmationUrl}}" style="background: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 5px;">Manage Booking</a>
            {{/confirmationUrl}}
            {{#rescheduleUrl}}
            <a href="{{rescheduleUrl}}" style="background: #ffc107; color: #212529; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 5px;">Reschedule</a>
            {{/rescheduleUrl}}
          </div>
          
          <p style="color: #666; font-size: 14px; line-height: 1.6;">Need to make changes? Contact us at least 24 hours in advance to avoid any cancellation fees.</p>
          
          <p style="color: #333; margin-top: 25px;">Thank you for choosing {{businessName}}!</p>
        </div>
      </div>
    `,
    sms: "Hi {{customerName}}! Your {{serviceType}} appointment is confirmed for {{date}} at {{startTime}} with {{businessName}}. Total: ${{price}}. We'll send a reminder 24hrs before. Confirmation #{{appointmentId}}",
  },

  appointment_reminder: {
    subject: "Reminder: Your Auto Detailing Appointment Tomorrow",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #ff9a56 0%, #ff6b6b 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Appointment Reminder</h1>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <p style="font-size: 18px; color: #333; margin-bottom: 20px;">Hi {{customerName}},</p>
          
          <p style="color: #666; line-height: 1.6;">This is a friendly reminder about your upcoming auto detailing appointment tomorrow!</p>
          
          <div style="background: #fff3cd; padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #ffc107;">
            <h3 style="color: #856404; margin: 0 0 15px 0; font-size: 20px;">{{serviceType}}</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <p style="margin: 5px 0;"><strong>Date:</strong> {{date}}</p>
              <p style="margin: 5px 0;"><strong>Time:</strong> {{startTime}} - {{endTime}}</p>
              <p style="margin: 5px 0;"><strong>Location:</strong> {{businessName}}</p>
              <p style="margin: 5px 0;"><strong>Vehicle:</strong> {{vehicleInfo}}</p>
            </div>
          </div>
          
          <div style="background: #d1ecf1; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h4 style="color: #0c5460; margin: 0 0 10px 0;">Preparation checklist:</h4>
            <ul style="color: #0c5460; line-height: 1.6; margin: 0; padding-left: 20px;">
              <li>Remove all personal items from your vehicle</li>
              <li>Ensure your vehicle is accessible at the scheduled time</li>
              <li>Have your keys ready for our team</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            {{#rescheduleUrl}}
            <a href="{{rescheduleUrl}}" style="background: #ffc107; color: #212529; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 5px;">Reschedule</a>
            {{/rescheduleUrl}}
            {{#cancelUrl}}
            <a href="{{cancelUrl}}" style="background: #dc3545; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 5px;">Cancel</a>
            {{/cancelUrl}}
          </div>
          
          <p style="color: #333; margin-top: 25px;">Looking forward to serving you!</p>
          <p style="color: #333;">- The {{businessName}} Team</p>
        </div>
      </div>
    `,
    sms: "Reminder: Your {{serviceType}} appointment is tomorrow {{date}} at {{startTime}} with {{businessName}}. Please have {{vehicleInfo}} ready and accessible. Need to reschedule? Reply HELP",
  },

  appointment_cancelled: {
    subject: "Appointment Cancelled - {{businessName}}",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Appointment Cancelled</h1>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <p style="font-size: 18px; color: #333; margin-bottom: 20px;">Hi {{customerName}},</p>
          
          <p style="color: #666; line-height: 1.6;">Your auto detailing appointment has been cancelled.</p>
          
          <div style="background: #f8d7da; padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #dc3545;">
            <h3 style="color: #721c24; margin: 0 0 15px 0; font-size: 20px;">Cancelled Appointment</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <p style="margin: 5px 0;"><strong>Service:</strong> {{serviceType}}</p>
              <p style="margin: 5px 0;"><strong>Date:</strong> {{date}}</p>
              <p style="margin: 5px 0;"><strong>Time:</strong> {{startTime}} - {{endTime}}</p>
              <p style="margin: 5px 0;"><strong>Location:</strong> {{businessName}}</p>
            </div>
            {{#reason}}
            <p style="margin: 15px 0 5px 0;"><strong>Reason:</strong> {{reason}}</p>
            {{/reason}}
          </div>
          
          <p style="color: #666; line-height: 1.6;">We apologize for any inconvenience this may cause. If you'd like to book a new appointment, we'd be happy to help you find a suitable time.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{confirmationUrl}}" style="background: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">Book New Appointment</a>
          </div>
          
          <p style="color: #333; margin-top: 25px;">Thank you for your understanding.</p>
          <p style="color: #333;">- The {{businessName}} Team</p>
        </div>
      </div>
    `,
    sms: "Your {{serviceType}} appointment on {{date}} at {{startTime}} with {{businessName}} has been cancelled. {{#reason}}Reason: {{reason}}.{{/reason}} Book again anytime!",
  },

  appointment_rescheduled: {
    subject: "Appointment Rescheduled - {{businessName}}",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #17a2b8 0%, #138496 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Appointment Rescheduled</h1>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <p style="font-size: 18px; color: #333; margin-bottom: 20px;">Hi {{customerName}},</p>
          
          <p style="color: #666; line-height: 1.6;">Your auto detailing appointment has been rescheduled to a new date and time.</p>
          
          <div style="background: #d1ecf1; padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #17a2b8;">
            <h3 style="color: #0c5460; margin: 0 0 15px 0; font-size: 20px;">{{serviceType}}</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <p style="margin: 5px 0;"><strong>New Date:</strong> {{date}}</p>
              <p style="margin: 5px 0;"><strong>New Time:</strong> {{startTime}} - {{endTime}}</p>
              <p style="margin: 5px 0;"><strong>Location:</strong> {{businessName}}</p>
              <p style="margin: 5px 0;"><strong>Vehicle:</strong> {{vehicleInfo}}</p>
            </div>
            {{#reason}}
            <p style="margin: 15px 0 5px 0;"><strong>Reason:</strong> {{reason}}</p>
            {{/reason}}
          </div>
          
          <p style="color: #666; line-height: 1.6;">We'll send you a reminder 24 hours before your new appointment time. Thank you for your flexibility!</p>
          
          <div style="text-align: center; margin: 30px 0;">
            {{#confirmationUrl}}
            <a href="{{confirmationUrl}}" style="background: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 5px;">Manage Booking</a>
            {{/confirmationUrl}}
          </div>
          
          <p style="color: #333; margin-top: 25px;">Looking forward to serving you at the new time!</p>
          <p style="color: #333;">- The {{businessName}} Team</p>
        </div>
      </div>
    `,
    sms: "Your {{serviceType}} appointment has been rescheduled to {{date}} at {{startTime}} with {{businessName}}. {{#reason}}Reason: {{reason}}.{{/reason}} We'll send a reminder 24hrs before.",
  },
}
