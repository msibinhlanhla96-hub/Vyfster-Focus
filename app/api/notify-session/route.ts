import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { format } from 'date-fns';
import { Resend } from 'resend';
import nodemailer from 'nodemailer';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      title,
      description,
      start_time,
      end_time,
      grace_period_mins = 5,
      radius_meters = 100,
      late_fine_amount = 5,
      absent_fine_amount = 20,
    } = body;

    if (!title || !start_time || !end_time) {
      return NextResponse.json(
        { error: 'Missing required session details (title, start_time, end_time).' },
        { status: 400 }
      );
    }

    // 1. Initialize Supabase client (prefer service role key if available, fallback to anon key)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 2. Fetch all registered corridor users
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('email, full_name, room_number');

    if (userError || !users) {
      return NextResponse.json(
        { error: 'Failed to retrieve corridor members: ' + (userError?.message || 'No users found') },
        { status: 500 }
      );
    }

    const recipients = users
      .map(u => u.email?.trim())
      .filter((e): e is string => Boolean(e && e.includes('@')));

    if (recipients.length === 0) {
      return NextResponse.json({
        success: true,
        sent: 0,
        message: 'No registered corridor members with valid email addresses found.',
      });
    }

    // 3. Format date & 24h times
    const startDate = new Date(start_time);
    const endDate = new Date(end_time);
    const dateFormatted = format(startDate, 'EEEE, dd MMMM yyyy');
    const startTimeFormatted = format(startDate, 'HH:mm');
    const endTimeFormatted = format(endDate, 'HH:mm');

    // 4. Generate High-Contrast Cyber-Streetwear Branded HTML Email
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mandatory Study Session Scheduled</title>
</head>
<body style="margin: 0; padding: 0; background-color: #09090B; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #FFFFFF;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #09090B; padding: 30px 10px;">
    <tr>
      <td align="center">
        <!-- Main Card -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; background-color: #18181B; border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.8);">
          
          <!-- Banner Header -->
          <tr>
            <td style="padding: 28px 32px; background: linear-gradient(135deg, #18181B 0%, #27272A 100%); border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>
                    <div style="font-size: 11px; font-weight: 800; letter-spacing: 2px; color: #EF4444; text-transform: uppercase; margin-bottom: 6px;">
                      🚨 MANDATORY STUDY SESSION SCHEDULED
                    </div>
                    <div style="font-size: 24px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.5px;">
                      VYFSTER FOCUS
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 700; color: #FFFFFF;">
                ${title}
              </h2>
              ${description ? `<p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #A1A1AA;">${description}</p>` : '<div style="margin-bottom: 20px;"></div>'}

              <!-- Schedule Box -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="padding-bottom: 10px; font-size: 12px; color: #A1A1AA; font-weight: 600;">DATE</td>
                        <td align="right" style="padding-bottom: 10px; font-size: 14px; color: #FFFFFF; font-weight: 700;">${dateFormatted}</td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 10px; font-size: 12px; color: #A1A1AA; font-weight: 600;">TIME (24-HOUR)</td>
                        <td align="right" style="padding-bottom: 10px; font-size: 16px; color: #FFFFFF; font-weight: 700; font-family: monospace;">${startTimeFormatted} – ${endTimeFormatted}</td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 10px; font-size: 12px; color: #A1A1AA; font-weight: 600;">GRACE PERIOD</td>
                        <td align="right" style="padding-bottom: 10px; font-size: 13px; color: #D4D4D8; font-weight: 600;">${grace_period_mins} minutes</td>
                      </tr>
                      <tr>
                        <td style="font-size: 12px; color: #A1A1AA; font-weight: 600;">LOCATION GEOFENCE</td>
                        <td align="right" style="font-size: 13px; color: #D4D4D8; font-weight: 600;">Within ±${radius_meters}m GPS range</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Fines Warning Callout -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.25); border-radius: 12px; margin-bottom: 28px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <div style="font-size: 12px; font-weight: 800; color: #EF4444; letter-spacing: 1px; margin-bottom: 6px; text-transform: uppercase;">
                      ⚖️ Punctuality & Fine Enforcement
                    </div>
                    <div style="font-size: 13px; color: #FCA5A5; line-height: 1.5;">
                      • <strong>Late Clock-in (> ${grace_period_mins} min grace):</strong> Automatic R${Number(late_fine_amount).toFixed(2)} fine.<br>
                      • <strong>Failure to Attend (Absence):</strong> Automatic R${Number(absent_fine_amount).toFixed(2)} absence penalty.<br>
                      • Make sure to enable GPS permissions on your device when clicking "Clock In".
                    </div>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <a href="https://vyfster-focus.vercel.app/dashboard" style="display: inline-block; background-color: #FFFFFF; color: #09090B; font-size: 14px; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 10px; letter-spacing: 0.2px;">
                      Open Vyfster Focus →
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; background-color: #121215; border-top: 1px solid rgba(255, 255, 255, 0.08); text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #71717A;">
                Vyfster Corridor Study Tracker & Attendance System<br>
                This automated notification was dispatched to all registered corridor members.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    // 5. Send via configured email provider
    const resendApiKey = process.env.RESEND_API_KEY;
    const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER;
    const smtpPass = process.env.SMTP_PASS || process.env.EMAIL_PASS;
    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = Number(process.env.SMTP_PORT) || 465;

    let sentProvider = '';

    if (resendApiKey) {
      // Send via Resend
      const resend = new Resend(resendApiKey);
      const fromEmail = process.env.RESEND_FROM_EMAIL || 'Vyfster Focus <onboarding@resend.dev>';

      // Resend allows sending in batch or to multiple recipients
      await resend.emails.send({
        from: fromEmail,
        to: recipients,
        subject: `🚨 Mandatory Study Session: ${title} (${dateFormatted})`,
        html: emailHtml,
      });
      sentProvider = 'Resend';
    } else if (smtpUser && smtpPass) {
      // Send via Nodemailer (e.g. Gmail App Password or SMTP)
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      await transporter.sendMail({
        from: `"Vyfster Focus" <${smtpUser}>`,
        bcc: recipients, // Use BCC so students don't expose each other's emails
        subject: `🚨 Mandatory Study Session: ${title} (${dateFormatted})`,
        html: emailHtml,
      });
      sentProvider = 'SMTP';
    } else {
      // Neither email service is configured yet
      return NextResponse.json({
        success: true,
        notConfigured: true,
        recipientCount: recipients.length,
        message: 'Email service credentials not yet configured. Please set RESEND_API_KEY or SMTP_USER/SMTP_PASS in Vercel to activate automated emails.',
      });
    }

    return NextResponse.json({
      success: true,
      provider: sentProvider,
      recipientCount: recipients.length,
      message: `Notification successfully sent to ${recipients.length} corridor member(s).`,
    });
  } catch (error: any) {
    console.error('Error dispatching session email:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send session notification emails.' },
      { status: 500 }
    );
  }
}
