/**
 * Email Service for Cron Sync Reports
 *
 * Sends detailed sync reports via email after each daily sync.
 * Supports multiple email providers (SendGrid, Mailgun, Resend, etc.)
 */

import axios from 'axios'

// Email configuration from environment
const EMAIL_API_KEY = process.env.EMAIL_API_KEY || ''
const EMAIL_FROM = process.env.EMAIL_FROM || 'gshoihet@gmail.com'
const EMAIL_TO = process.env.EMAIL_TO || 'gshoihet@gmail.com'
const EMAIL_PROVIDER = process.env.EMAIL_PROVIDER || 'gmail' // gmail, resend, sendgrid, mailgun

// Gmail SMTP with App Password (simpler than OAuth2)
const GMAIL_USER = process.env.GMAIL_USER || ''
const GMAIL_PWD = process.env.GMAIL_PWD || ''

// API Debug log entry
interface ApiDebugLogEntry {
  timestamp: string
  service: 'google_search' | 'youtube_search' | 'youtube_comments'
  eventName?: string
  query: string
  domain?: string
  status: 'success' | 'error' | 'no_results' | 'quota_exceeded'
  resultsCount: number
  matchesAccepted: number
  error?: string
  results?: Array<{
    title: string
    url: string
    score?: number
    accepted: boolean
    rejectReason?: string
  }>
}

interface SyncReportData {
  success: boolean
  timestamp: string
  duration: string
  eventSync: {
    total: number
    new: number
    updated: number
    removed: number
    newEventsList?: Array<{ name: string; date: string; url: string }>
  }
  competitorSearch: {
    processed: number
    queriesUsed: number
    remaining: number
    matchesFound: number
    topMatches?: Array<{ event: string; competitor: string; url: string; score: number }>
  }
  youtubeVideos: {
    eventsProcessed: number
    videosFound: number
    cacheHits: number
    newVideos?: Array<{ event: string; title: string; url: string; channel: string }>
  }
  youtubeComments: {
    videosProcessed: number
    commentsFetched: number
    cacheHits: number
    topComments?: Array<{ video: string; author: string; text: string; likes: number }>
  }
  errors?: string[]
  debugLogs?: ApiDebugLogEntry[]
}

/**
 * Generate HTML email from sync report data
 */
function generateEmailHTML(data: SyncReportData): string {
  const statusIcon = data.success ? '✅' : '❌'
  const statusColor = data.success ? '#10b981' : '#ef4444'

  return `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>דוח סנכרון יומי - kids.ticketsnow.co.il</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; direction: rtl;">

  <!-- Header -->
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; margin-bottom: 30px;">
    <h1 style="margin: 0; font-size: 28px;">${statusIcon} דוח סנכרון יומי</h1>
    <p style="margin: 10px 0 0 0; opacity: 0.9;">kids.ticketsnow.co.il</p>
    <p style="margin: 5px 0 0 0; opacity: 0.8; font-size: 14px;">${data.timestamp}</p>
  </div>

  <!-- Status Badge -->
  <div style="background: ${statusColor}; color: white; padding: 15px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
    <strong style="font-size: 18px;">${data.success ? 'סנכרון הושלם בהצלחה' : 'שגיאה בסנכרון'}</strong>
    <br>
    <span style="font-size: 14px; opacity: 0.9;">משך הרצה: ${data.duration}</span>
  </div>

  <!-- Summary Stats -->
  <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 30px;">

    <!-- Events Card -->
    <div style="background: #f0f9ff; border: 2px solid #3b82f6; border-radius: 8px; padding: 20px;">
      <h3 style="margin: 0 0 10px 0; color: #1e40af; font-size: 16px;">📅 אירועים</h3>
      <div style="font-size: 32px; font-weight: bold; color: #1e40af; margin-bottom: 10px;">${data.eventSync.total}</div>
      <div style="font-size: 14px; color: #64748b;">
        <span style="color: #10b981;">+${data.eventSync.new} חדש</span> •
        <span style="color: #f59e0b;">${data.eventSync.updated} עודכן</span> •
        <span style="color: #ef4444;">-${data.eventSync.removed} הוסר</span>
      </div>
    </div>

    <!-- Competitors Card -->
    <div style="background: #fef3c7; border: 2px solid #f59e0b; border-radius: 8px; padding: 20px;">
      <h3 style="margin: 0 0 10px 0; color: #92400e; font-size: 16px;">🔍 מתחרים</h3>
      <div style="font-size: 32px; font-weight: bold; color: #92400e; margin-bottom: 10px;">${data.competitorSearch.processed}</div>
      <div style="font-size: 14px; color: #64748b;">
        <span>${data.competitorSearch.queriesUsed} שאילתות</span> •
        <span style="color: ${data.competitorSearch.remaining > 20 ? '#10b981' : '#ef4444'};">${data.competitorSearch.remaining} נותרו</span>
      </div>
    </div>

    <!-- YouTube Videos Card -->
    <div style="background: #fee2e2; border: 2px solid #ef4444; border-radius: 8px; padding: 20px;">
      <h3 style="margin: 0 0 10px 0; color: #991b1b; font-size: 16px;">🎥 סרטוני YouTube</h3>
      <div style="font-size: 32px; font-weight: bold; color: #991b1b; margin-bottom: 10px;">${data.youtubeVideos.videosFound}</div>
      <div style="font-size: 14px; color: #64748b;">
        <span>${data.youtubeVideos.eventsProcessed} אירועים</span> •
        <span>${data.youtubeVideos.cacheHits} מהמטמון</span>
      </div>
    </div>

    <!-- Comments Card -->
    <div style="background: #f0fdf4; border: 2px solid #10b981; border-radius: 8px; padding: 20px;">
      <h3 style="margin: 0 0 10px 0; color: #065f46; font-size: 16px;">💬 תגובות</h3>
      <div style="font-size: 32px; font-weight: bold; color: #065f46; margin-bottom: 10px;">${data.youtubeComments.commentsFetched}</div>
      <div style="font-size: 14px; color: #64748b;">
        <span>${data.youtubeComments.videosProcessed} סרטונים</span> •
        <span>${data.youtubeComments.cacheHits} מהמטמון</span>
      </div>
    </div>

  </div>

  ${data.eventSync.newEventsList && data.eventSync.newEventsList.length > 0 ? `
  <!-- New Events -->
  <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
    <h3 style="margin: 0 0 15px 0; color: #1f2937; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">
      🆕 אירועים חדשים (${data.eventSync.newEventsList.length})
    </h3>
    ${data.eventSync.newEventsList.map(event => `
      <div style="padding: 10px; margin-bottom: 10px; background: #f9fafb; border-right: 4px solid #3b82f6; border-radius: 4px;">
        <div style="font-weight: bold; color: #1f2937; margin-bottom: 5px;">
          <a href="${event.url}" style="color: #3b82f6; text-decoration: none;">${event.name}</a>
        </div>
        <div style="font-size: 14px; color: #6b7280;">📅 ${event.date}</div>
      </div>
    `).join('')}
  </div>
  ` : ''}

  ${data.competitorSearch.topMatches && data.competitorSearch.topMatches.length > 0 ? `
  <!-- Top Competitor Matches -->
  <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
    <h3 style="margin: 0 0 15px 0; color: #1f2937; border-bottom: 2px solid #f59e0b; padding-bottom: 10px;">
      🎯 התאמות מתחרים מובילות
    </h3>
    ${data.competitorSearch.topMatches.map(match => `
      <div style="padding: 10px; margin-bottom: 10px; background: #fffbeb; border-right: 4px solid #f59e0b; border-radius: 4px;">
        <div style="font-weight: bold; color: #1f2937; margin-bottom: 5px;">${match.event}</div>
        <div style="font-size: 14px; color: #6b7280;">
          <a href="${match.url}" style="color: #f59e0b; text-decoration: none;">${match.competitor}</a>
          <span style="background: #10b981; color: white; padding: 2px 8px; border-radius: 12px; margin-right: 10px; font-size: 12px;">
            ${(match.score * 100).toFixed(0)}% התאמה
          </span>
        </div>
      </div>
    `).join('')}
  </div>
  ` : ''}

  ${data.youtubeVideos.newVideos && data.youtubeVideos.newVideos.length > 0 ? `
  <!-- New YouTube Videos -->
  <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
    <h3 style="margin: 0 0 15px 0; color: #1f2937; border-bottom: 2px solid #ef4444; padding-bottom: 10px;">
      🎬 סרטונים חדשים
    </h3>
    ${data.youtubeVideos.newVideos.slice(0, 10).map(video => `
      <div style="padding: 10px; margin-bottom: 10px; background: #fef2f2; border-right: 4px solid #ef4444; border-radius: 4px;">
        <div style="font-weight: bold; color: #1f2937; margin-bottom: 5px;">
          <a href="${video.url}" style="color: #ef4444; text-decoration: none;">${video.title}</a>
        </div>
        <div style="font-size: 14px; color: #6b7280;">
          📺 ${video.channel} • 🎭 ${video.event}
        </div>
      </div>
    `).join('')}
  </div>
  ` : ''}

  ${data.youtubeComments.topComments && data.youtubeComments.topComments.length > 0 ? `
  <!-- Top Comments -->
  <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
    <h3 style="margin: 0 0 15px 0; color: #1f2937; border-bottom: 2px solid #10b981; padding-bottom: 10px;">
      ⭐ תגובות מובילות
    </h3>
    ${data.youtubeComments.topComments.slice(0, 5).map(comment => `
      <div style="padding: 10px; margin-bottom: 10px; background: #f0fdf4; border-right: 4px solid #10b981; border-radius: 4px;">
        <div style="font-size: 14px; color: #6b7280; margin-bottom: 5px;">
          <strong>${comment.author}</strong> • 👍 ${comment.likes}
        </div>
        <div style="color: #1f2937; font-size: 14px;">${comment.text.substring(0, 200)}${comment.text.length > 200 ? '...' : ''}</div>
        <div style="font-size: 12px; color: #9ca3af; margin-top: 5px;">📹 ${comment.video}</div>
      </div>
    `).join('')}
  </div>
  ` : ''}

  ${data.errors && data.errors.length > 0 ? `
  <!-- Errors -->
  <div style="background: #fef2f2; border: 2px solid #ef4444; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
    <h3 style="margin: 0 0 15px 0; color: #991b1b;">⚠️ שגיאות</h3>
    ${data.errors.map(error => `
      <div style="padding: 10px; margin-bottom: 10px; background: white; border-right: 4px solid #ef4444; border-radius: 4px;">
        <code style="color: #991b1b; font-size: 14px;">${error}</code>
      </div>
    `).join('')}
  </div>
  ` : ''}

  ${data.debugLogs && data.debugLogs.length > 0 ? `
  <!-- Debug Logs Section -->
  <div style="background: #f8fafc; border: 2px solid #94a3b8; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
    <h3 style="margin: 0 0 15px 0; color: #475569; border-bottom: 2px solid #94a3b8; padding-bottom: 10px;">
      🔧 Debug Logs - API Requests (${data.debugLogs.length})
    </h3>

    ${data.debugLogs.map(log => `
      <div style="padding: 12px; margin-bottom: 12px; background: white; border-radius: 6px; border: 1px solid #e2e8f0;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <span style="font-weight: bold; color: #1e293b;">
            ${log.service === 'google_search' ? '🔍' : log.service === 'youtube_search' ? '🎥' : '💬'}
            ${log.service === 'google_search' ? 'Google Search' : log.service === 'youtube_search' ? 'YouTube Search' : 'YouTube Comments'}
            ${log.domain ? `→ ${log.domain}` : ''}
          </span>
          <span style="padding: 2px 8px; border-radius: 12px; font-size: 12px;
            ${log.status === 'success' ? 'background: #dcfce7; color: #166534;' :
              log.status === 'no_results' ? 'background: #fef3c7; color: #92400e;' :
              log.status === 'quota_exceeded' ? 'background: #fce7f3; color: #9d174d;' :
              'background: #fee2e2; color: #991b1b;'}">
            ${log.status === 'success' ? 'Success' :
              log.status === 'no_results' ? 'No Results' :
              log.status === 'quota_exceeded' ? 'Quota Exceeded' : 'Error'}
          </span>
        </div>

        <div style="font-size: 13px; color: #64748b; margin-bottom: 8px;">
          <div><strong>Event:</strong> ${log.eventName || 'N/A'}</div>
          <div><strong>Query:</strong> ${log.query.substring(0, 80)}${log.query.length > 80 ? '...' : ''}</div>
          <div><strong>Results:</strong> ${log.resultsCount} found, ${log.matchesAccepted} accepted</div>
          ${log.error ? `<div style="color: #dc2626;"><strong>Error:</strong> ${log.error}</div>` : ''}
        </div>

        ${log.results && log.results.length > 0 ? `
          <details style="margin-top: 8px;">
            <summary style="cursor: pointer; color: #3b82f6; font-size: 13px;">View ${log.results.length} results</summary>
            <div style="margin-top: 8px; padding: 8px; background: #f1f5f9; border-radius: 4px; font-size: 12px;">
              ${log.results.map(r => `
                <div style="padding: 6px; margin-bottom: 4px; border-bottom: 1px solid #e2e8f0;">
                  <div style="color: ${r.accepted ? '#166534' : '#991b1b'};">
                    ${r.accepted ? '✓' : '✗'} ${r.title.substring(0, 60)}${r.title.length > 60 ? '...' : ''}
                  </div>
                  <div style="color: #64748b; font-size: 11px;">
                    ${r.url.substring(0, 70)}${r.url.length > 70 ? '...' : ''}
                    ${r.score !== undefined ? ` | Score: ${(r.score * 100).toFixed(0)}%` : ''}
                    ${r.rejectReason ? ` | ${r.rejectReason}` : ''}
                  </div>
                </div>
              `).join('')}
            </div>
          </details>
        ` : ''}
      </div>
    `).join('')}
  </div>
  ` : ''}

  <!-- Footer -->
  <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 14px; border-top: 1px solid #e5e7eb;">
    <p style="margin: 0 0 10px 0;">דוח אוטומטי מ-kids.ticketsnow.co.il</p>
    <p style="margin: 0;">
      <a href="https://kids.ticketsnow.co.il" style="color: #3b82f6; text-decoration: none;">בקר באתר</a> •
      <a href="https://kids.ticketsnow.co.il/api/cron/status" style="color: #3b82f6; text-decoration: none;">סטטוס מערכת</a>
    </p>
  </div>

</body>
</html>
  `.trim()
}

/**
 * Generate plain text email from sync report data
 */
function generateEmailText(data: SyncReportData): string {
  const statusIcon = data.success ? '✅' : '❌'

  let text = `
${statusIcon} דוח סנכרון יומי - kids.ticketsnow.co.il
${data.timestamp}
משך הרצה: ${data.duration}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📅 אירועים: ${data.eventSync.total}
   • חדש: ${data.eventSync.new}
   • עודכן: ${data.eventSync.updated}
   • הוסר: ${data.eventSync.removed}

🔍 חיפוש מתחרים:
   • אירועים שעובדו: ${data.competitorSearch.processed}
   • שאילתות שנעשו: ${data.competitorSearch.queriesUsed}
   • נותרו היום: ${data.competitorSearch.remaining}

🎥 סרטוני YouTube:
   • אירועים שעובדו: ${data.youtubeVideos.eventsProcessed}
   • סרטונים שנמצאו: ${data.youtubeVideos.videosFound}
   • פגיעות במטמון: ${data.youtubeVideos.cacheHits}

💬 תגובות YouTube:
   • סרטונים שעובדו: ${data.youtubeComments.videosProcessed}
   • תגובות שנמשכו: ${data.youtubeComments.commentsFetched}
   • פגיעות במטמון: ${data.youtubeComments.cacheHits}
`

  if (data.eventSync.newEventsList && data.eventSync.newEventsList.length > 0) {
    text += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
    text += `\n🆕 אירועים חדשים (${data.eventSync.newEventsList.length}):\n\n`
    data.eventSync.newEventsList.forEach(event => {
      text += `   • ${event.name}\n     ${event.date}\n     ${event.url}\n\n`
    })
  }

  if (data.errors && data.errors.length > 0) {
    text += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
    text += `\n⚠️ שגיאות:\n\n`
    data.errors.forEach(error => {
      text += `   • ${error}\n`
    })
  }

  text += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
  text += `\nבקר באתר: https://kids.ticketsnow.co.il\n`
  text += `סטטוס מערכת: https://kids.ticketsnow.co.il/api/cron/status\n`

  return text.trim()
}

/**
 * Send email via Gmail SMTP with App Password
 * Much simpler than OAuth2 - just needs email and app password
 */
async function sendViaGmail(
  to: string,
  subject: string,
  html: string,
  text: string
): Promise<void> {
  const nodemailer = require('nodemailer')

  const GMAIL_USER = process.env.GMAIL_USER || EMAIL_FROM
  const GMAIL_PWD = process.env.GMAIL_PWD || ''

  if (!GMAIL_PWD) {
    throw new Error('GMAIL_PWD (App Password) not configured')
  }

  // Create SMTP transporter
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_PWD
    }
  })

  try {
    const info = await transporter.sendMail({
      from: EMAIL_FROM,
      to: to,
      subject: subject,
      text: text,
      html: html
    })

    console.log(`Email sent via Gmail SMTP: ${info.messageId}`)
  } catch (error) {
    console.error('Gmail SMTP error:', error)
    throw error
  }
}

/**
 * Send email via Resend API
 */
async function sendViaResend(
  to: string,
  subject: string,
  html: string,
  text: string
): Promise<void> {
  const response = await axios.post(
    'https://api.resend.com/emails',
    {
      from: EMAIL_FROM,
      to: [to],
      subject,
      html,
      text
    },
    {
      headers: {
        'Authorization': `Bearer ${EMAIL_API_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  )

  if (response.status !== 200) {
    throw new Error(`Resend API error: ${response.status} ${response.statusText}`)
  }
}

/**
 * Send email via SendGrid API
 */
async function sendViaSendGrid(
  to: string,
  subject: string,
  html: string,
  text: string
): Promise<void> {
  const response = await axios.post(
    'https://api.sendgrid.com/v3/mail/send',
    {
      personalizations: [{ to: [{ email: to }] }],
      from: { email: EMAIL_FROM },
      subject,
      content: [
        { type: 'text/plain', value: text },
        { type: 'text/html', value: html }
      ]
    },
    {
      headers: {
        'Authorization': `Bearer ${EMAIL_API_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  )

  if (response.status !== 202) {
    throw new Error(`SendGrid API error: ${response.status} ${response.statusText}`)
  }
}

/**
 * Send email via Mailgun API
 */
async function sendViaMailgun(
  to: string,
  subject: string,
  html: string,
  text: string
): Promise<void> {
  const domain = process.env.MAILGUN_DOMAIN || 'kids.ticketsnow.co.il'
  const url = `https://api.mailgun.net/v3/${domain}/messages`

  const formData = new URLSearchParams()
  formData.append('from', EMAIL_FROM)
  formData.append('to', to)
  formData.append('subject', subject)
  formData.append('text', text)
  formData.append('html', html)

  const response = await axios.post(url, formData, {
    auth: {
      username: 'api',
      password: EMAIL_API_KEY
    },
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  })

  if (response.status !== 200) {
    throw new Error(`Mailgun API error: ${response.status} ${response.statusText}`)
  }
}

/**
 * Send sync report email
 */
export async function sendSyncReport(reportData: SyncReportData): Promise<void> {
  // Check credentials based on provider
  const provider = EMAIL_PROVIDER.toLowerCase()

  if (provider === 'gmail') {
    if (!GMAIL_PWD) {
      console.warn('GMAIL_PWD not configured, skipping email report')
      return
    }
  } else if (!EMAIL_API_KEY) {
    console.warn('EMAIL_API_KEY not configured, skipping email report')
    return
  }

  try {
    const subject = reportData.success
      ? `✅ סנכרון יומי הושלם בהצלחה - ${new Date().toLocaleDateString('he-IL')}`
      : `❌ שגיאה בסנכרון יומי - ${new Date().toLocaleDateString('he-IL')}`

    const html = generateEmailHTML(reportData)
    const text = generateEmailText(reportData)

    console.log(`Sending email report to ${EMAIL_TO} via ${EMAIL_PROVIDER}`)

    // Send based on provider
    switch (EMAIL_PROVIDER.toLowerCase()) {
      case 'gmail':
        await sendViaGmail(EMAIL_TO, subject, html, text)
        break
      case 'resend':
        await sendViaResend(EMAIL_TO, subject, html, text)
        break
      case 'sendgrid':
        await sendViaSendGrid(EMAIL_TO, subject, html, text)
        break
      case 'mailgun':
        await sendViaMailgun(EMAIL_TO, subject, html, text)
        break
      default:
        throw new Error(`Unknown email provider: ${EMAIL_PROVIDER}`)
    }

    console.log('Email report sent successfully')

  } catch (error) {
    console.error('Failed to send email report:', error)
    // Don't throw - email failure shouldn't fail the sync
  }
}
