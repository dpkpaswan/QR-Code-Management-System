const express = require("express");
const nodemailer = require("nodemailer");
const QRCode = require("qrcode");
const supabase = require("../lib/supabase");
const { authMiddleware } = require("./auth");

const router = express.Router();

/* ================================
   Helper: Send SSE Event
================================ */
const sendSSE = (res, data) => {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
};

/* ================================
   Helper: Create Transporter
================================ */
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_PORT == 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

/* ================================
   Helper: Generate HTML Email
================================ */
const generateEmailTemplate = (participant) => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f0f2f5; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.1); }
    
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 32px 24px; text-align: center; }
    .header h1 { margin: 0 0 4px; font-size: 28px; font-weight: 800; letter-spacing: 2px; }
    .header p { margin: 0; opacity: 0.9; font-size: 15px; font-weight: 500; }
    .header .college { margin: 8px 0 0; opacity: 0.8; font-size: 13px; }

    .greeting { padding: 28px 28px 0; }
    .greeting p { color: #334155; font-size: 15px; line-height: 1.7; margin: 0 0 12px; }

    .qr-section { padding: 20px 28px; text-align: center; }
    .qr-label { font-size: 13px; color: #64748b; margin-bottom: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
    .qr-box { background: #f8f9ff; border: 2px dashed #667eea; border-radius: 16px; padding: 24px; display: inline-block; }
    .qr-box img { width: 220px; height: 220px; display: block; }
    .qr-warning { margin-top: 12px; font-size: 12px; color: #94a3b8; }

    .participant-card { margin: 0 28px 24px; background: #f8faff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 20px; }
    .participant-card .row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
    .participant-card .row:last-child { border-bottom: none; }
    .participant-card .label { color: #64748b; font-weight: 500; }
    .participant-card .value { color: #1e293b; font-weight: 600; text-align: right; }

    .instructions { margin: 0 28px 24px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 16px 20px; }
    .instructions h3 { margin: 0 0 12px; font-size: 14px; font-weight: 700; color: #92400e; text-transform: uppercase; letter-spacing: 0.5px; }
    .instructions ul { margin: 0; padding-left: 20px; }
    .instructions ul li { color: #78350f; font-size: 13px; line-height: 1.8; }

    .schedule { margin: 0 28px 24px; }
    .schedule h3 { font-size: 15px; font-weight: 700; color: #1e293b; margin: 0 0 12px; padding-bottom: 8px; border-bottom: 2px solid #667eea; }
    
    .day-block { margin-bottom: 20px; }
    .day-header { background: linear-gradient(90deg, #667eea, #764ba2); color: white; padding: 8px 14px; border-radius: 8px 8px 0 0; font-size: 13px; font-weight: 700; letter-spacing: 0.5px; }
    .day-table { width: 100%; border-collapse: collapse; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px; overflow: hidden; }
    .day-table th { background: #f1f5f9; padding: 8px 12px; text-align: left; font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e2e8f0; }
    .day-table td { padding: 9px 12px; font-size: 13px; color: #334155; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
    .day-table tr:last-child td { border-bottom: none; }
    .day-table tr:nth-child(even) td { background: #f8faff; }
    .time-cell { white-space: nowrap; font-weight: 600; color: #4f46e5; min-width: 80px; }
    .venue-cell { color: #64748b; font-size: 12px; }

    .contact { margin: 0 28px 24px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 14px 20px; }
    .contact p { margin: 0 0 6px; font-size: 13px; color: #166534; }
    .contact p:last-child { margin: 0; }
    .contact strong { color: #14532d; }

    .footer { background: #1e293b; color: #94a3b8; padding: 20px 24px; text-align: center; font-size: 12px; line-height: 1.6; }
    .footer strong { color: #cbd5e1; }
  </style>
</head>
<body>
  <div class="container">

    <!-- Header -->
    <div class="header">
      <h1>SARDAR 2026</h1>
      <p>Inter College Cultural Fest</p>
      <p class="college">Agurchand Manmull Jain College</p>
    </div>

    <!-- Greeting -->
    <div class="greeting">
      <p>Dear <strong>${participant.name}</strong>,</p>
      <p>
        Warm Greetings from <strong>Agurchand Manmull Jain College!</strong><br>
        We are delighted to confirm your registration for <strong>SARDAR 2026</strong> — 
        the grand Inter College Cultural Fest. Thank you for your enthusiasm and interest 
        in being a part of this exciting celebration of talent and creativity.
      </p>
      <p>Please find your unique Entry QR Code attached with this email. This QR code is your <strong>official entry pass</strong>.</p>
    </div>

    <!-- QR Code -->
    <div class="qr-section">
      <p class="qr-label">Your Official Entry Pass</p>
      <div class="qr-box">
        <img src="cid:qrcode" alt="Entry QR Code" />
      </div>
      <p class="qr-warning">📱 Screenshot this QR code for offline access</p>
    </div>

    <!-- Participant Details -->
    <div class="participant-card">
      <div class="row">
        <span class="label">Participant ID</span>
        <span class="value" style="color:#667eea;">${participant.participant_id}</span>
      </div>
      <div class="row">
        <span class="label">Name</span>
        <span class="value">${participant.name}</span>
      </div>
      <div class="row">
        <span class="label">College</span>
        <span class="value">${participant.college_name}</span>
      </div>
    </div>

    <!-- Important Instructions -->
    <div class="instructions">
      <h3>⚠️ Important Instructions</h3>
      <ul>
        <li>You must bring this QR code (printed or on your mobile) on the event day.</li>
        <li>The QR code will be scanned and verified at the entry point for your participation.</li>
        <li>Kindly also carry your <strong>college ID card</strong> for identification.</li>
        <li>Entry will be permitted only after successful verification.</li>
        <li>This QR code is valid for <strong>both days</strong> of the event.</li>
        <li><strong>Reporting Time for Registration: 09:00 AM</strong></li>
      </ul>
    </div>

    <!-- Excitement Message -->
    <div class="greeting" style="padding-top:0;">
      <p>
        We're excited to have you join us for this vibrant celebration of talent and creativity.
        We look forward to welcoming you to our campus.
      </p>
    </div>

    <!-- Event Schedule -->
    <div class="schedule">
      <h3>📅 Event Schedule</h3>

      <!-- Day 1 -->
      <div class="day-block">
        <div class="day-header">DAY 1 — 27 February 2026</div>
        <table class="day-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Event</th>
              <th>Venue</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="time-cell">10:30 AM</td>
              <td>Dance Deja Vu <span style="color:#94a3b8;font-size:12px;">(Recreating a Movie Song - CCP)</span></td>
              <td class="venue-cell">Annex Ground</td>
            </tr>
            <tr>
              <td class="time-cell">11:00 AM</td>
              <td>Sixty Second Spotlight <span style="color:#94a3b8;font-size:12px;">(Talent Show)</span></td>
              <td class="venue-cell">Gyan Bhavan</td>
            </tr>
            <tr>
              <td class="time-cell">11:00 AM</td>
              <td>Tune Twins <span style="color:#94a3b8;font-size:12px;">(Dual Adaptune)</span></td>
              <td class="venue-cell">Indoor Stadium</td>
            </tr>
            <tr>
              <td class="time-cell">11:00 AM</td>
              <td>PhotoPhoria <span style="color:#94a3b8;font-size:12px;">(Photography)</span></td>
              <td class="venue-cell">Main Block Seminar Hall</td>
            </tr>
            <tr>
              <td class="time-cell">11:00 AM</td>
              <td>Bin to Brilliance <span style="color:#94a3b8;font-size:12px;">(Art from Junk)</span></td>
              <td class="venue-cell">Viscom Block</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Day 2 -->
      <div class="day-block">
        <div class="day-header">DAY 2 — 28 February 2026</div>
        <table class="day-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Event</th>
              <th>Venue</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="time-cell">09:30 AM</td>
              <td>AMJ Premier League <span style="color:#94a3b8;font-size:12px;">(APL Auction)</span></td>
              <td class="venue-cell">Indoor Stadium</td>
            </tr>
            <tr>
              <td class="time-cell">09:30 AM</td>
              <td>Plug and Play <span style="color:#94a3b8;font-size:12px;">(Music Band - Vocal & Instrumental)</span></td>
              <td class="venue-cell">Annex Ground</td>
            </tr>
            <tr>
              <td class="time-cell">10:00 AM</td>
              <td>Sail or Sink <span style="color:#94a3b8;font-size:12px;">(Shipwreck)</span></td>
              <td class="venue-cell">Main Block Seminar Hall</td>
            </tr>
            <tr>
              <td class="time-cell">11:00 AM</td>
              <td>Reel to Real <span style="color:#94a3b8;font-size:12px;">(LCA - Movie Spoof 15min)</span></td>
              <td class="venue-cell">Annex Ground</td>
            </tr>
            <tr>
              <td class="time-cell">12:30 PM</td>
              <td>Finesse & Fabulous <span style="color:#94a3b8;font-size:12px;">(Ramp Walk)</span></td>
              <td class="venue-cell">Gyan Bhavan</td>
            </tr>
            <tr>
              <td class="time-cell">12:30 PM</td>
              <td>Sync & Spin <span style="color:#94a3b8;font-size:12px;">(Group Dance)</span></td>
              <td class="venue-cell">Annex Ground</td>
            </tr>
            <tr>
              <td class="time-cell">02:00 PM</td>
              <td>Snap & Solve <span style="color:#94a3b8;font-size:12px;">(Connexions)</span></td>
              <td class="venue-cell">Main Block Seminar Hall</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Contact -->
    <div class="contact">
      <p>📞 For any queries, feel free to contact:</p>
      <p><strong>Mr. Alwin Infant E</strong> — +91 7708179387</p>
      <p><strong>Mr. Siddarth G</strong> — +91 6369-825339</p>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p><strong>SARDAR 2026</strong> — Inter College Cultural Fest</p>
      <p>Agurchand Manmull Jain College</p>
      <p style="margin-top:8px; font-size:11px;">
        This is an automated email. Please do not reply to this email.
      </p>
    </div>

  </div>
</body>
</html>`;
};

/* ================================
   ROUTE: Send Emails (SSE)
================================ */
router.post("/send", authMiddleware, async (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  try {
    // Validate environment
    if (
      !process.env.SMTP_HOST ||
      !process.env.SMTP_USER ||
      !process.env.SMTP_PASS ||
      !process.env.SUPABASE_URL ||
      !process.env.SUPABASE_SERVICE_ROLE_KEY
    ) {
      sendSSE(res, {
        type: "error",
        message: "Server configuration missing environment variables.",
      });
      return res.end();
    }

    const transporter = createTransporter();
    await transporter.verify();

    const { data: participants, error } = await supabase
      .from("participants")
      .select("*")
      .eq("email_sent", false);

    if (error) {
      sendSSE(res, { type: "error", message: error.message });
      return res.end();
    }

    if (!participants.length) {
      sendSSE(res, {
        type: "complete",
        message: "No pending emails",
        sent: 0,
        failed: 0,
      });
      return res.end();
    }

    sendSSE(res, { type: "start", total: participants.length });

    let sent = 0;
    let failed = 0;

    for (const participant of participants) {
      try {
        // Generate QR
        const qrDataUrl = await QRCode.toDataURL(
          participant.participant_id
        );
        const qrBase64 = qrDataUrl.split(",")[1];

        await transporter.sendMail({
          from: `"SARDAR 2026" <${process.env.SMTP_USER}>`,
          to: participant.email,
          subject: `Your Entry Pass — SARDAR 2026 | ${participant.name}`,
          html: generateEmailTemplate(participant),
          attachments: [
            {
              filename: "qrcode.png",
              content: qrBase64,
              encoding: "base64",
              cid: "qrcode",
            },
          ],
        });

        await supabase
          .from("participants")
          .update({
            email_sent: true,
            email_sent_at: new Date().toISOString(),
          })
          .eq("participant_id", participant.participant_id);

        sent++;
        sendSSE(res, {
          type: "progress",
          participant_id: participant.participant_id,
          status: "sent",
          sent,
          failed,
        });
      } catch (err) {
        failed++;
        sendSSE(res, {
          type: "progress",
          participant_id: participant.participant_id,
          status: "failed",
          error: err.message,
          sent,
          failed,
        });
      }
    }

    sendSSE(res, {
      type: "complete",
      sent,
      failed,
      total: participants.length,
    });

    res.end();
  } catch (err) {
    sendSSE(res, { type: "error", message: err.message });
    res.end();
  }
});

module.exports = router;