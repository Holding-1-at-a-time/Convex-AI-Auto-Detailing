export interface NotificationTemplate {
  subject: string
  emailTemplate: string
  smsTemplate: string
}

export const NOTIFICATION_TEMPLATES: Record<string, NotificationTemplate> = {
  appointment_confirmation: {
    subject: "Appointment Confirmed - {{businessName}}",
    emailTemplate: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Appointment Confirmation</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
            .appointment-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb; }
            .detail-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
            .detail-label { font-weight: bold; color: #475569; }
            .detail-value { color: #1e293b; }
            .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 14px; }
            .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Appointment Confirmed!</h1>
              <p>Your auto detailing appointment has been scheduled</p>
            </div>
            <div class="content">
              <p>Hello {{customerName}},</p>
              <p>Thank you for choosing {{businessName}}! Your appointment has been confirmed with the following details:</p>
              
              <div class="appointment-details">
                <h3>Appointment Details</h3>
                <div class="detail-row">
                  <span class="detail-label">Service:</span>
                  <span class="detail-value">{{serviceType}}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Date:</span>
                  <span class="detail-value">{{appointmentDate}}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Time:</span>
                  <span class="detail-value">{{appointmentTime}}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Duration:</span>
                  <span class="detail-value">{{duration}}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Price:</span>
                  <span class="detail-value">${{ price }}</span>
                </div>
                {{#if vehicleInfo}}
                <div class="detail-row">
                  <span class="detail-label">Vehicle:</span>
                  <span class="detail-value">{{vehicleInfo}}</span>
                </div>
                {{/if}}
                {{#if location}}
                <div class="detail-row">
                  <span class="detail-label">Location:</span>
                  <span class="detail-value">{{location}}</span>
                </div>
                {{/if}}
              </div>

              <p><strong>What to expect:</strong></p>
              <ul>
                <li>Our team will arrive on time and ready to work</li>
                <li>We'll bring all necessary equipment and supplies</li>
                <li>The service typically takes {{duration}}</li>
                <li>Payment can be made after service completion</li>
              </ul>

              <p><strong>Preparation:</strong></p>
              <ul>
                <li>Please remove all personal items from your vehicle</li>
                <li>Ensure access to water and electricity if needed</li>
                <li>Have your vehicle accessible for our team</li>
              </ul>

              {{#if rescheduleLink}}
              <p style="text-align: center;">
                <a href="{{rescheduleLink}}" class="button">Reschedule Appointment</a>
              </p>
              {{/if}}

              <p>If you have any questions or need to make changes, please contact us:</p>
              <p>📞 {{businessPhone}}<br>
              📧 {{businessEmail}}</p>

              <p>We look forward to making your vehicle shine!</p>
              <p>Best regards,<br>{{businessName}} Team</p>
            </div>
            <div class="footer">
              <p>{{businessName}} | {{businessAddress}}</p>
              <p>This email was sent regarding your appointment. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    smsTemplate:
      "Hi {{customerName}}! Your {{serviceType}} appointment with {{businessName}} is confirmed for {{appointmentDate}} at {{appointmentTime}}. Questions? Call {{businessPhone}}",
  },

  appointment_reminder: {
    subject: "Reminder: Your appointment tomorrow - {{businessName}}",
    emailTemplate: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Appointment Reminder</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #fffbeb; padding: 30px; border-radius: 0 0 8px 8px; }
            .reminder-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b; }
            .detail-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #fde68a; }
            .detail-label { font-weight: bold; color: #92400e; }
            .detail-value { color: #451a03; }
            .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #fde68a; color: #92400e; font-size: 14px; }
            .button { display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 5px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⏰ Appointment Reminder</h1>
              <p>Don't forget about your upcoming appointment!</p>
            </div>
            <div class="content">
              <p>Hello {{customerName}},</p>
              <p>This is a friendly reminder about your upcoming auto detailing appointment:</p>
              
              <div class="reminder-box">
                <h3>Tomorrow's Appointment</h3>
                <div class="detail-row">
                  <span class="detail-label">Service:</span>
                  <span class="detail-value">{{serviceType}}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Date:</span>
                  <span class="detail-value">{{appointmentDate}}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Time:</span>
                  <span class="detail-value">{{appointmentTime}}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Duration:</span>
                  <span class="detail-value">{{duration}}</span>
                </div>
                {{#if location}}
                <div class="detail-row">
                  <span class="detail-label">Location:</span>
                  <span class="detail-value">{{location}}</span>
                </div>
                {{/if}}
              </div>

              <p><strong>Please remember to:</strong></p>
              <ul>
                <li>Remove all personal items from your vehicle</li>
                <li>Ensure your vehicle is accessible</li>
                <li>Have water and electricity available if needed</li>
              </ul>

              <p style="text-align: center;">
                {{#if rescheduleLink}}
                <a href="{{rescheduleLink}}" class="button">Reschedule</a>
                {{/if}}
                {{#if cancelLink}}
                <a href="{{cancelLink}}" class="button" style="background: #dc2626;">Cancel</a>
                {{/if}}
              </p>

              <p>Questions? Contact us at {{businessPhone}} or {{businessEmail}}</p>
              <p>See you tomorrow!</p>
              <p>{{businessName}} Team</p>
            </div>
            <div class="footer">
              <p>{{businessName}} | {{businessAddress}}</p>
            </div>
          </div>
        </body>
      </html>
    `,
    smsTemplate:
      "Reminder: Your {{serviceType}} appointment with {{businessName}} is tomorrow {{appointmentDate}} at {{appointmentTime}}. Questions? {{businessPhone}}",
  },

  appointment_cancelled: {
    subject: "Appointment Cancelled - {{businessName}}",
    emailTemplate: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Appointment Cancelled</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #fef2f2; padding: 30px; border-radius: 0 0 8px 8px; }
            .cancellation-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626; }
            .detail-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #fecaca; }
            .detail-label { font-weight: bold; color: #991b1b; }
            .detail-value { color: #7f1d1d; }
            .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #fecaca; color: #991b1b; font-size: 14px; }
            .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Appointment Cancelled</h1>
              <p>Your appointment has been cancelled</p>
            </div>
            <div class="content">
              <p>Hello {{customerName}},</p>
              <p>We're writing to confirm that your appointment has been cancelled:</p>
              
              <div class="cancellation-box">
                <h3>Cancelled Appointment</h3>
                <div class="detail-row">
                  <span class="detail-label">Service:</span>
                  <span class="detail-value">{{serviceType}}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Date:</span>
                  <span class="detail-value">{{appointmentDate}}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Time:</span>
                  <span class="detail-value">{{appointmentTime}}</span>
                </div>
                {{#if cancellationReason}}
                <div class="detail-row">
                  <span class="detail-label">Reason:</span>
                  <span class="detail-value">{{cancellationReason}}</span>
                </div>
                {{/if}}
                {{#if refundAmount}}
                <div class="detail-row">
                  <span class="detail-label">Refund Amount:</span>
                  <span class="detail-value">${{ refundAmount }}</span>
                </div>
                {{/if}}
              </div>

              {{#if refundAmount}}
              <p><strong>Refund Information:</strong></p>
              <p>A refund of ${{ refundAmount }} will be processed within 3-5 business days to your original payment method.</p>
              {{/if}}

              <p>We're sorry we couldn't serve you this time. We'd love to help you in the future!</p>

              {{#if rebookLink}}
              <p style="text-align: center;">
                <a href="{{rebookLink}}" class="button">Book New Appointment</a>
              </p>
              {{/if}}

              <p>If you have any questions, please contact us:</p>
              <p>📞 {{businessPhone}}<br>
              📧 {{businessEmail}}</p>

              <p>Thank you for considering {{businessName}}.</p>
              <p>Best regards,<br>{{businessName}} Team</p>
            </div>
            <div class="footer">
              <p>{{businessName}} | {{businessAddress}}</p>
            </div>
          </div>
        </body>
      </html>
    `,
    smsTemplate:
      "Your {{serviceType}} appointment with {{businessName}} on {{appointmentDate}} has been cancelled. {{#if refundAmount}}Refund: ${{refundAmount}}{{/if}} Questions? {{businessPhone}}",
  },

  appointment_rescheduled: {
    subject: "Appointment Rescheduled - {{businessName}}",
    emailTemplate: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Appointment Rescheduled</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #7c3aed; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #faf5ff; padding: 30px; border-radius: 0 0 8px 8px; }
            .schedule-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #7c3aed; }
            .old-schedule { background: #fee2e2; border-left-color: #dc2626; }
            .new-schedule { background: #dcfce7; border-left-color: #16a34a; }
            .detail-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
            .detail-label { font-weight: bold; color: #374151; }
            .detail-value { color: #1f2937; }
            .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Appointment Rescheduled</h1>
              <p>Your appointment time has been updated</p>
            </div>
            <div class="content">
              <p>Hello {{customerName}},</p>
              <p>Your appointment with {{businessName}} has been rescheduled. Here are the updated details:</p>
              
              {{#if originalDate}}
              <div class="schedule-box old-schedule">
                <h3>❌ Previous Schedule</h3>
                <div class="detail-row">
                  <span class="detail-label">Date:</span>
                  <span class="detail-value">{{originalDate}}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Time:</span>
                  <span class="detail-value">{{originalTime}}</span>
                </div>
              </div>
              {{/if}}

              <div class="schedule-box new-schedule">
                <h3>✅ New Schedule</h3>
                <div class="detail-row">
                  <span class="detail-label">Service:</span>
                  <span class="detail-value">{{serviceType}}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Date:</span>
                  <span class="detail-value">{{appointmentDate}}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Time:</span>
                  <span class="detail-value">{{appointmentTime}}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Duration:</span>
                  <span class="detail-value">{{duration}}</span>
                </div>
                {{#if location}}
                <div class="detail-row">
                  <span class="detail-label">Location:</span>
                  <span class="detail-value">{{location}}</span>
                </div>
                {{/if}}
              </div>

              {{#if rescheduleReason}}
              <p><strong>Reason for reschedule:</strong> {{rescheduleReason}}</p>
              {{/if}}

              <p>Please make note of your new appointment time. We apologize for any inconvenience this may cause.</p>

              <p>If you have any questions or concerns, please contact us:</p>
              <p>📞 {{businessPhone}}<br>
              📧 {{businessEmail}}</p>

              <p>We look forward to seeing you at your new appointment time!</p>
              <p>Best regards,<br>{{businessName}} Team</p>
            </div>
            <div class="footer">
              <p>{{businessName}} | {{businessAddress}}</p>
            </div>
          </div>
        </body>
      </html>
    `,
    smsTemplate:
      "Your {{serviceType}} appointment with {{businessName}} has been rescheduled to {{appointmentDate}} at {{appointmentTime}}. Questions? {{businessPhone}}",
  },

  feedback_request: {
    subject: "How was your service? - {{businessName}}",
    emailTemplate: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Service Feedback Request</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #059669; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f0fdf4; padding: 30px; border-radius: 0 0 8px 8px; }
            .service-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #059669; }
            .detail-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #bbf7d0; }
            .detail-label { font-weight: bold; color: #065f46; }
            .detail-value { color: #064e3b; }
            .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #bbf7d0; color: #065f46; font-size: 14px; }
            .button { display: inline-block; background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0; }
            .stars { font-size: 24px; text-align: center; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⭐ How did we do?</h1>
              <p>Your feedback helps us improve our service</p>
            </div>
            <div class="content">
              <p>Hello {{customerName}},</p>
              <p>Thank you for choosing {{businessName}} for your auto detailing needs! We hope you're thrilled with the results.</p>
              
              <div class="service-box">
                <h3>Service Completed</h3>
                <div class="detail-row">
                  <span class="detail-label">Service:</span>
                  <span class="detail-value">{{serviceType}}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Date:</span>
                  <span class="detail-value">{{appointmentDate}}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Vehicle:</span>
                  <span class="detail-value">{{vehicleInfo}}</span>
                </div>
              </div>

              <p>We'd love to hear about your experience! Your feedback helps us continue providing excellent service.</p>

              <div class="stars">
                ⭐⭐⭐⭐⭐
              </div>

              {{#if feedbackLink}}
              <p style="text-align: center;">
                <a href="{{feedbackLink}}" class="button">Leave Feedback</a>
              </p>
              {{/if}}

              <p><strong>What we'd love to know:</strong></p>
              <ul>
                <li>How satisfied were you with the quality of service?</li>
                <li>Was our team professional and courteous?</li>
                <li>Did we arrive on time and complete the work as expected?</li>
                <li>Would you recommend us to friends and family?</li>
              </ul>

              <p>As a token of our appreciation, customers who leave feedback receive a 10% discount on their next service!</p>

              <p>Thank you for your business, and we look forward to serving you again!</p>
              <p>Best regards,<br>{{businessName}} Team</p>
            </div>
            <div class="footer">
              <p>{{businessName}} | {{businessAddress}}</p>
              <p>📞 {{businessPhone}} | 📧 {{businessEmail}}</p>
            </div>
          </div>
        </body>
      </html>
    `,
    smsTemplate:
      "Hi {{customerName}}! How was your {{serviceType}} service with {{businessName}}? We'd love your feedback: {{feedbackLink}}",
  },
}

export const renderTemplate = (template: string, data: Record<string, any>): string => {
  let rendered = template

  // Simple template rendering - replace {{variable}} with data values
  Object.keys(data).forEach((key) => {
    const regex = new RegExp(`{{${key}}}`, "g")
    rendered = rendered.replace(regex, data[key] || "")
  })

  // Handle conditional blocks {{#if variable}}...{{/if}}
  rendered = rendered.replace(/{{#if\s+(\w+)}}([\s\S]*?){{\/if}}/g, (match, variable, content) => {
    return data[variable] ? content : ""
  })

  return rendered
}
