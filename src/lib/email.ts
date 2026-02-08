import { Resend } from "resend"

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

interface EmailOptions {
  to: string
  subject: string
  html: string
}

export async function sendEmail({ to, subject, html }: EmailOptions) {
  // If no Resend API key, log to console for development
  if (!resend || !process.env.RESEND_API_KEY) {
    console.log("📧 Email (simulated):")
    console.log(`To: ${to}`)
    console.log(`Subject: ${subject}`)
    console.log(`Body: ${html}`)
    return { success: true, simulated: true }
  }

  try {
    console.log(`📧 Sending email via Resend...`)
    console.log(`From: ${process.env.FROM_EMAIL}`)
    console.log(`To: ${to}`)
    console.log(`Subject: ${subject}`)

    const data = await resend.emails.send({
      from: process.env.FROM_EMAIL || "noreply@yourdomain.com",
      to,
      subject,
      html,
    })

    console.log("✅ Email sent successfully:", data)
    return { success: true, data }
  } catch (error) {
    console.error("❌ Failed to send email:", error)
    return { success: false, error }
  }
}

// Email templates
export const emailTemplates = {
  submissionReceived: (studentName: string, workbookTitle: string, weekNumber: number) => ({
    subject: "Workbook Submission Received",
    html: `
      <h2>Submission Confirmed</h2>
      <p>Hi ${studentName},</p>
      <p>We've received your submission for <strong>${workbookTitle}</strong> (Week ${weekNumber}).</p>
      <p>Your coach will review it soon and you'll be notified when the status changes.</p>
      <p>Thank you!</p>
    `,
  }),

  statusChanged: (
    studentName: string,
    workbookTitle: string,
    newStatus: string,
    feedback?: string
  ) => ({
    subject: `Submission Status Updated: ${newStatus}`,
    html: `
      <h2>Status Update</h2>
      <p>Hi ${studentName},</p>
      <p>Your submission <strong>${workbookTitle}</strong> has been updated to: <strong>${newStatus}</strong></p>
      ${feedback ? `<p><strong>Feedback:</strong> ${feedback}</p>` : ""}
      <p>Log in to view details and take any necessary action.</p>
    `,
  }),

  newReviewRequest: (
    coachName: string,
    studentName: string,
    workbookTitle: string,
    weekNumber: number
  ) => ({
    subject: "New Submission to Review",
    html: `
      <h2>New Review Request</h2>
      <p>Hi ${coachName},</p>
      <p>You have a new submission to review from <strong>${studentName}</strong>.</p>
      <p><strong>Workbook:</strong> ${workbookTitle}</p>
      <p><strong>Week:</strong> ${weekNumber}</p>
      <p>Log in to review and provide feedback.</p>
    `,
  }),

  headCoachReviewRequest: (
    headCoachName: string,
    studentName: string,
    workbookTitle: string,
    coachName: string
  ) => ({
    subject: "New Submission for Final Approval",
    html: `
      <h2>Final Review Request</h2>
      <p>Hi ${headCoachName},</p>
      <p>A submission has been approved by ${coachName} and is ready for your final review.</p>
      <p><strong>Student:</strong> ${studentName}</p>
      <p><strong>Workbook:</strong> ${workbookTitle}</p>
      <p>Log in to provide final approval.</p>
    `,
  }),

  studentDeactivated: (studentName: string) => ({
    subject: "Account Access Suspended",
    html: `
      <h2>Account Access Suspended</h2>
      <p>Hi ${studentName},</p>
      <p>Your account access has been temporarily suspended by the program manager.</p>
      <p>You will not be able to log in to the workbook submission system until your access is restored.</p>
      <p>If you have any questions, please contact the program manager.</p>
    `,
  }),

  studentReactivated: (studentName: string) => ({
    subject: "Account Access Restored",
    html: `
      <h2>Account Access Restored</h2>
      <p>Hi ${studentName},</p>
      <p>Good news! Your account access has been restored by the program manager.</p>
      <p>You can now log in to the workbook submission system and continue with your submissions.</p>
      <p>Welcome back!</p>
    `,
  }),

  userApproved: (userName: string, role: string, studentClass?: string | null) => {
    const roleText = role === "STUDENT" ? "Student" : role === "COACH" ? "Coach" : "Program Manager"
    let classInfo = ""
    if (role === "STUDENT" && studentClass) {
      const classNames: Record<string, string> = {
        PRE_CLARITY: "Pre-Clarity",
        STRATEGY_CLASS: "Strategy Class",
        FUNNEL_CLASS: "Funnel Class",
        LAUNCH_CLASS: "Launch Class",
      }
      classInfo = `<p><strong>Assigned Class:</strong> ${classNames[studentClass]}</p>`
    }

    return {
      subject: "Account Approved - Welcome!",
      html: `
        <h2>Account Approved!</h2>
        <p>Hi ${userName},</p>
        <p>Great news! Your ${roleText} account has been approved.</p>
        ${classInfo}
        <p>You can now log in to the workbook submission system and get started.</p>
        <p>Welcome to the program!</p>
      `,
    }
  },

  userRejected: (userName: string, role: string) => {
    const roleText = role === "STUDENT" ? "Student" : role === "COACH" ? "Coach" : "Program Manager"
    return {
      subject: "Account Registration - Update",
      html: `
        <h2>Registration Status Update</h2>
        <p>Hi ${userName},</p>
        <p>Thank you for your interest in registering as a ${roleText}.</p>
        <p>Unfortunately, your registration was not approved at this time.</p>
        <p>If you have any questions, please contact the program administrator.</p>
      `,
    }
  },

  staffDeactivated: (userName: string, role: string) => {
    const roleText = role === "COACH" ? "Coach" : "Program Manager"
    return {
      subject: "Account Access Suspended",
      html: `
        <h2>Account Access Suspended</h2>
        <p>Hi ${userName},</p>
        <p>Your ${roleText} account access has been temporarily suspended by the head coach.</p>
        <p>You will not be able to log in to the workbook submission system until your access is restored.</p>
        <p>If you have any questions, please contact the head coach.</p>
      `,
    }
  },

  staffReactivated: (userName: string, role: string) => {
    const roleText = role === "COACH" ? "Coach" : "Program Manager"
    return {
      subject: "Account Access Restored",
      html: `
        <h2>Account Access Restored</h2>
        <p>Hi ${userName},</p>
        <p>Good news! Your ${roleText} account access has been restored by the head coach.</p>
        <p>You can now log in to the workbook submission system and continue with your work.</p>
        <p>Welcome back!</p>
      `,
    }
  },

  passwordReset: (userName: string, resetLink: string) => ({
    subject: "Password Reset Request",
    html: `
      <h2>Password Reset Request</h2>
      <p>Hi ${userName},</p>
      <p>We received a request to reset your password for the workbook submission system.</p>
      <p>Click the link below to reset your password. This link will expire in 1 hour.</p>
      <p><a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">Reset Password</a></p>
      <p>Or copy and paste this URL into your browser:</p>
      <p>${resetLink}</p>
      <p>If you didn't request a password reset, you can safely ignore this email.</p>
    `,
  }),

  passwordResetSuccess: (userName: string) => ({
    subject: "Password Reset Successful",
    html: `
      <h2>Password Reset Successful</h2>
      <p>Hi ${userName},</p>
      <p>Your password has been successfully reset.</p>
      <p>You can now log in with your new password.</p>
      <p>If you didn't make this change, please contact support immediately.</p>
    `,
  }),
}
