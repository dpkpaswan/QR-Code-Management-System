const express = require('express');
const nodemailer = require('nodemailer');
const QRCode = require('qrcode');
const supabase = require('../lib/supabase');
const { authMiddleware } = require('./auth');

const router = express.Router();

// POST /api/email/send - Send QR codes via SSE for real-time updates
router.post('/send', authMiddleware, async (req, res) => {
    // Set up SSE
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
    });

    const sendEvent = (data) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    try {
        // Validate supabase config early to provide a helpful error over SSE
        if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.SUPABASE_URL) {
            sendEvent({ type: 'error', message: 'Server misconfigured: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing' });
            res.end();
            return;
        }

        logger.info('Starting email dispatch (SSE)');
        // Create transporter
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT),
            secure: false,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        // Verify transporter
        await transporter.verify();

        // Get unsent participants
        const { data: participants, error } = await supabase
            .from('participants')
            .select('*')
            .eq('email_sent', false);

        if (error) {
            sendEvent({ type: 'error', message: error.message });
            res.end();
            return;
        }

        if (!participants || participants.length === 0) {
            sendEvent({ type: 'complete', message: 'No pending emails to send', sent: 0, failed: 0 });
            res.end();
            return;
        }

        sendEvent({ type: 'start', total: participants.length });

        let sent = 0;
        let failed = 0;
        const eventName = process.env.EVENT_NAME || 'Event';

        for (const participant of participants) {
            try {
                // Generate QR code as base64 data URL
                const qrDataUrl = await QRCode.toDataURL(participant.participant_id, {
                    width: 300,
                    margin: 2,
                    color: { dark: '#000000', light: '#ffffff' },
                });

                // Convert data URL to buffer for attachment
                const qrBase64 = qrDataUrl.split(',')[1];

                // HTML email template
                const htmlBody = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f0f2f5; margin: 0; padding: 20px; }
            .container { max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 32px 24px; text-align: center; }
            .header h1 { margin: 0; font-size: 24px; font-weight: 700; }
            .header p { margin: 8px 0 0; opacity: 0.9; font-size: 14px; }
            .body { padding: 32px 24px; text-align: center; }
            .body h2 { color: #1a1a2e; margin: 0 0 8px; font-size: 20px; }
            .body .pid { color: #667eea; font-size: 16px; font-weight: 600; margin-bottom: 24px; }
            .qr-box { background: #f8f9ff; border: 2px dashed #667eea; border-radius: 12px; padding: 24px; margin: 20px 0; display: inline-block; }
            .qr-box img { width: 250px; height: 250px; }
            .info { background: #f0f2f5; border-radius: 8px; padding: 16px; margin: 20px 0; text-align: left; }
            .info p { margin: 4px 0; color: #555; font-size: 14px; }
            .info strong { color: #1a1a2e; }
            .instructions { color: #666; font-size: 13px; margin: 20px 0; line-height: 1.6; }
            .footer { background: #1a1a2e; color: #aaa; padding: 20px 24px; text-align: center; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎫 ${eventName}</h1>
              <p>Your Entry Pass</p>
            </div>
            <div class="body">
              <h2>Hello ${participant.name}! 👋</h2>
              <p class="pid">Participant ID: ${participant.participant_id}</p>
              <p style="color: #666; margin-bottom: 16px;">Show this QR Code at the entry gate:</p>
              <div class="qr-box">
                <img src="cid:qrcode" alt="QR Code" />
              </div>
              <div class="info">
                <p><strong>Name:</strong> ${participant.name}</p>
                <p><strong>College:</strong> ${participant.college_name}</p>
                <p><strong>Participant ID:</strong> ${participant.participant_id}</p>
              </div>
              <p class="instructions">
                🎟️ <strong>This QR code is valid for both days of the event.<br>
                Please present it at the entry gate each morning.</strong><br><br>
                📌 Please keep this email handy and show the QR code at the entry gate.<br>
                📌 Screenshot the QR code for offline access.<br>
                📌 Arrive 15 minutes before the event starts.
              </p>
            </div>
            <div class="footer">
              <p>${eventName} | Powered by QR Code Management System</p>
            </div>
          </div>
        </body>
        </html>`;

                // Send email
                await transporter.sendMail({
                    from: `"${eventName}" <${process.env.SMTP_USER}>`,
                    to: participant.email,
                    subject: `Your Entry Pass - ${eventName}`,
                    html: htmlBody,
                    attachments: [
                        {
                            filename: 'qrcode.png',
                            content: qrBase64,
                            encoding: 'base64',
                            cid: 'qrcode',
                        },
                    ],
                });

                // Update Supabase
                await supabase
                    .from('participants')
                    .update({
                        email_sent: true,
                        email_sent_at: new Date().toISOString(),
                    })
                    .eq('participant_id', participant.participant_id);

                sent++;
                sendEvent({
                    type: 'progress',
                    participant_id: participant.participant_id,
                    status: 'sent',
                    sent,
                    failed,
                    total: participants.length,
                });
            } catch (emailError) {
                failed++;
                console.error(`Failed to send to ${participant.email}:`, emailError.message);
                sendEvent({
                    type: 'progress',
                    participant_id: participant.participant_id,
                    status: 'failed',
                    error: emailError.message,
                    sent,
                    failed,
                    total: participants.length,
                });
            }
        }

        sendEvent({ type: 'complete', sent, failed, total: participants.length });
        res.end();
    } catch (error) {
        console.error('Email send error:', error);
        sendEvent({ type: 'error', message: error.message });
        res.end();
    }
});

module.exports = router;
