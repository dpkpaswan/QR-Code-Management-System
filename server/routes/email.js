const express = require("express");
const nodemailer = require("nodemailer");
const QRCode = require("qrcode");
const supabase = require("../lib/supabase");
const { authMiddleware, roleMiddleware } = require("./auth");

const router = express.Router();

const sendSSE = (res, data) => {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
};

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

/*
  ROOT CAUSE OF GMAIL CLIPPING:
  Gmail clips any email over 102KB.

  OLD code: QRCode.toDataURL() → base64 string embedded in HTML = ~50KB just for QR
  OLD code: <style> block with all CSS = ~8KB extra
  Total old size: ~80-100KB+ → Gmail clips it

  FIX:
  1. Use QRCode.toBuffer() → PNG binary buffer → attach as file (cid:qrcode)
     PNG buffer = only ~3-5KB vs 50KB base64 string
  2. Remove <style> block entirely → all styles inline
  3. Minify inline styles (no extra whitespace)
  Total new size: ~25-35KB → well under 102KB → no clipping
*/
const generateEmailHTML = (participant) => `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:16px;background:#f0f2f5;font-family:Segoe UI,Arial,sans-serif;">
<div style="max-width:580px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.1);">

  <div style="background:linear-gradient(135deg,#667eea,#764ba2);padding:28px 24px;text-align:center;">
    <h1 style="margin:0 0 4px;color:#fff;font-size:26px;font-weight:800;letter-spacing:3px;">SARDAR 2026</h1>
    <p style="margin:0 0 3px;color:rgba(255,255,255,0.92);font-size:14px;font-weight:500;">Inter College Cultural Fest</p>
    <p style="margin:0;color:rgba(255,255,255,0.72);font-size:12px;font-style:italic;">Agurchand Manmull Jain College</p>
  </div>

  <div style="padding:22px 22px 0;">
    <p style="margin:0 0 10px;color:#334155;font-size:15px;line-height:1.7;">Dear <strong>${participant.name}</strong>,</p>
    <p style="margin:0 0 10px;color:#334155;font-size:14px;line-height:1.7;">Warm Greetings from <strong>Agurchand Manmull Jain College!</strong> We are delighted to confirm your registration for <strong>SARDAR 2026</strong> — the grand Inter College Cultural Fest. Thank you for your enthusiasm in being part of this exciting celebration of talent and creativity.</p>
    <p style="margin:0;color:#334155;font-size:14px;line-height:1.7;">Your unique Entry QR Code is below. This is your <strong>official entry pass</strong>.</p>
  </div>

  <div style="padding:20px 22px;text-align:center;">
    <p style="margin:0 0 10px;color:#64748b;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;">Your Official Entry Pass</p>
    <div style="display:inline-block;border:3px solid #667eea;border-radius:12px;padding:14px;background:#f8f9ff;">
      <img src="cid:qrcode" alt="Entry QR Code" width="200" height="200" style="display:block;"/>
    </div>
    <p style="margin:8px 0 0;color:#94a3b8;font-size:12px;">📱 Screenshot or print this QR for offline access</p>
  </div>

  <div style="margin:0 22px 18px;border-radius:10px;overflow:hidden;border:1px solid #c7d2fe;">
    <div style="background:linear-gradient(90deg,#667eea,#764ba2);padding:7px 14px;">
      <span style="color:#fff;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Participant Details</span>
    </div>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      <tr style="border-bottom:1px solid #e0e7ff;">
        <td style="padding:9px 14px;color:#6366f1;font-size:11px;font-weight:700;text-transform:uppercase;width:38%;">Participant ID</td>
        <td style="padding:9px 14px;color:#7c3aed;font-size:14px;font-weight:800;font-family:Courier New,monospace;">${participant.participant_id}</td>
      </tr>
      <tr style="border-bottom:1px solid #e0e7ff;background:#f8faff;">
        <td style="padding:9px 14px;color:#6366f1;font-size:11px;font-weight:700;text-transform:uppercase;">Name</td>
        <td style="padding:9px 14px;color:#1e293b;font-size:14px;font-weight:700;">${participant.name}</td>
      </tr>
      <tr>
        <td style="padding:9px 14px;color:#6366f1;font-size:11px;font-weight:700;text-transform:uppercase;">College</td>
        <td style="padding:9px 14px;color:#1e293b;font-size:14px;font-weight:700;">${participant.college_name}</td>
      </tr>
    </table>
  </div>

  <div style="margin:0 22px 18px;background:#fffbeb;border:1px solid #fde68a;border-left:4px solid #f59e0b;border-radius:10px;padding:14px 16px;">
    <p style="margin:0 0 8px;color:#92400e;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:1px;">⚠️ Important Instructions</p>
    <ul style="margin:0;padding-left:16px;">
      <li style="color:#78350f;font-size:13px;line-height:1.9;">Bring this QR code <strong>(printed or on mobile)</strong> on both event days.</li>
      <li style="color:#78350f;font-size:13px;line-height:1.9;">Carry your <strong>college ID card</strong> for identification.</li>
      <li style="color:#78350f;font-size:13px;line-height:1.9;">This QR is valid for <strong>both days</strong> of the event.</li>
      <li style="color:#78350f;font-size:13px;line-height:1.9;"><strong>Reporting Time: 09:00 AM</strong></li>
    </ul>
  </div>

  <div style="margin:0 22px 18px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:12px 16px;">
    <p style="margin:0;color:#166534;font-size:13px;line-height:1.7;">🎉 We're excited to have you join us! We look forward to welcoming you to our campus.</p>
  </div>

  <div style="margin:0 22px 18px;">
    <p style="margin:0 0 12px;color:#1e293b;font-size:14px;font-weight:800;padding-bottom:8px;border-bottom:3px solid #667eea;">📅 Event Schedule</p>

    <div style="margin-bottom:14px;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0;">
      <div style="background:linear-gradient(90deg,#667eea,#764ba2);padding:8px 14px;">
        <span style="color:#fff;font-size:12px;font-weight:800;">📌 DAY 1 — Thursday, 27 February 2026</span>
      </div>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
        <tr style="background:#f1f5f9;">
          <th style="padding:7px 10px;text-align:left;font-size:10px;color:#475569;font-weight:700;text-transform:uppercase;border-bottom:1px solid #e2e8f0;">Time</th>
          <th style="padding:7px 10px;text-align:left;font-size:10px;color:#475569;font-weight:700;text-transform:uppercase;border-bottom:1px solid #e2e8f0;">Event</th>
          <th style="padding:7px 10px;text-align:left;font-size:10px;color:#475569;font-weight:700;text-transform:uppercase;border-bottom:1px solid #e2e8f0;">Venue</th>
        </tr>
        <tr style="border-bottom:1px solid #f1f5f9;">
          <td style="padding:8px 10px;color:#4f46e5;font-size:11px;font-weight:700;white-space:nowrap;">10:30 AM</td>
          <td style="padding:8px 10px;color:#1e293b;font-size:12px;">Dance Deja Vu <span style="color:#94a3b8;font-size:11px;">(Movie Song - CCP)</span></td>
          <td style="padding:8px 10px;color:#64748b;font-size:11px;">Annex Ground</td>
        </tr>
        <tr style="background:#f8faff;border-bottom:1px solid #f1f5f9;">
          <td style="padding:8px 10px;color:#4f46e5;font-size:11px;font-weight:700;white-space:nowrap;">11:00 AM</td>
          <td style="padding:8px 10px;color:#1e293b;font-size:12px;">Sixty Second Spotlight <span style="color:#94a3b8;font-size:11px;">(Talent Show)</span></td>
          <td style="padding:8px 10px;color:#64748b;font-size:11px;">Gyan Bhavan</td>
        </tr>
        <tr style="border-bottom:1px solid #f1f5f9;">
          <td style="padding:8px 10px;color:#4f46e5;font-size:11px;font-weight:700;white-space:nowrap;">11:00 AM</td>
          <td style="padding:8px 10px;color:#1e293b;font-size:12px;">Tune Twins <span style="color:#94a3b8;font-size:11px;">(Dual Adaptune)</span></td>
          <td style="padding:8px 10px;color:#64748b;font-size:11px;">Indoor Stadium</td>
        </tr>
        <tr style="background:#f8faff;border-bottom:1px solid #f1f5f9;">
          <td style="padding:8px 10px;color:#4f46e5;font-size:11px;font-weight:700;white-space:nowrap;">11:00 AM</td>
          <td style="padding:8px 10px;color:#1e293b;font-size:12px;">PhotoPhoria <span style="color:#94a3b8;font-size:11px;">(Photography)</span></td>
          <td style="padding:8px 10px;color:#64748b;font-size:11px;">Main Block Seminar Hall</td>
        </tr>
        <tr>
          <td style="padding:8px 10px;color:#4f46e5;font-size:11px;font-weight:700;white-space:nowrap;">11:00 AM</td>
          <td style="padding:8px 10px;color:#1e293b;font-size:12px;">Bin to Brilliance <span style="color:#94a3b8;font-size:11px;">(Art from Junk)</span></td>
          <td style="padding:8px 10px;color:#64748b;font-size:11px;">Viscom Block</td>
        </tr>
      </table>
    </div>

    <div style="margin-bottom:14px;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0;">
      <div style="background:linear-gradient(90deg,#667eea,#764ba2);padding:8px 14px;">
        <span style="color:#fff;font-size:12px;font-weight:800;">📌 DAY 2 — Friday, 28 February 2026</span>
      </div>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
        <tr style="background:#f1f5f9;">
          <th style="padding:7px 10px;text-align:left;font-size:10px;color:#475569;font-weight:700;text-transform:uppercase;border-bottom:1px solid #e2e8f0;">Time</th>
          <th style="padding:7px 10px;text-align:left;font-size:10px;color:#475569;font-weight:700;text-transform:uppercase;border-bottom:1px solid #e2e8f0;">Event</th>
          <th style="padding:7px 10px;text-align:left;font-size:10px;color:#475569;font-weight:700;text-transform:uppercase;border-bottom:1px solid #e2e8f0;">Venue</th>
        </tr>
        <tr style="border-bottom:1px solid #f1f5f9;">
          <td style="padding:8px 10px;color:#4f46e5;font-size:11px;font-weight:700;white-space:nowrap;">09:30 AM</td>
          <td style="padding:8px 10px;color:#1e293b;font-size:12px;">AMJ Premier League <span style="color:#94a3b8;font-size:11px;">(APL Auction)</span></td>
          <td style="padding:8px 10px;color:#64748b;font-size:11px;">Indoor Stadium</td>
        </tr>
        <tr style="background:#f8faff;border-bottom:1px solid #f1f5f9;">
          <td style="padding:8px 10px;color:#4f46e5;font-size:11px;font-weight:700;white-space:nowrap;">09:30 AM</td>
          <td style="padding:8px 10px;color:#1e293b;font-size:12px;">Plug and Play <span style="color:#94a3b8;font-size:11px;">(Music Band)</span></td>
          <td style="padding:8px 10px;color:#64748b;font-size:11px;">Annex Ground</td>
        </tr>
        <tr style="border-bottom:1px solid #f1f5f9;">
          <td style="padding:8px 10px;color:#4f46e5;font-size:11px;font-weight:700;white-space:nowrap;">10:00 AM</td>
          <td style="padding:8px 10px;color:#1e293b;font-size:12px;">Sail or Sink <span style="color:#94a3b8;font-size:11px;">(Shipwreck)</span></td>
          <td style="padding:8px 10px;color:#64748b;font-size:11px;">Main Block Seminar Hall</td>
        </tr>
        <tr style="background:#f8faff;border-bottom:1px solid #f1f5f9;">
          <td style="padding:8px 10px;color:#4f46e5;font-size:11px;font-weight:700;white-space:nowrap;">11:00 AM</td>
          <td style="padding:8px 10px;color:#1e293b;font-size:12px;">Reel to Real <span style="color:#94a3b8;font-size:11px;">(Movie Spoof 15min)</span></td>
          <td style="padding:8px 10px;color:#64748b;font-size:11px;">Annex Ground</td>
        </tr>
        <tr style="border-bottom:1px solid #f1f5f9;">
          <td style="padding:8px 10px;color:#4f46e5;font-size:11px;font-weight:700;white-space:nowrap;">12:30 PM</td>
          <td style="padding:8px 10px;color:#1e293b;font-size:12px;">Finesse &amp; Fabulous <span style="color:#94a3b8;font-size:11px;">(Ramp Walk)</span></td>
          <td style="padding:8px 10px;color:#64748b;font-size:11px;">Gyan Bhavan</td>
        </tr>
        <tr style="background:#f8faff;border-bottom:1px solid #f1f5f9;">
          <td style="padding:8px 10px;color:#4f46e5;font-size:11px;font-weight:700;white-space:nowrap;">12:30 PM</td>
          <td style="padding:8px 10px;color:#1e293b;font-size:12px;">Sync &amp; Spin <span style="color:#94a3b8;font-size:11px;">(Group Dance)</span></td>
          <td style="padding:8px 10px;color:#64748b;font-size:11px;">Annex Ground</td>
        </tr>
        <tr>
          <td style="padding:8px 10px;color:#4f46e5;font-size:11px;font-weight:700;white-space:nowrap;">02:00 PM</td>
          <td style="padding:8px 10px;color:#1e293b;font-size:12px;">Snap &amp; Solve <span style="color:#94a3b8;font-size:11px;">(Connexions)</span></td>
          <td style="padding:8px 10px;color:#64748b;font-size:11px;">Main Block Seminar Hall</td>
        </tr>
      </table>
    </div>
  </div>

  <div style="margin:0 22px 18px;background:#f0fdf4;border:1px solid #bbf7d0;border-left:4px solid #10b981;border-radius:10px;padding:12px 16px;">
    <p style="margin:0 0 6px;color:#065f46;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">📞 Contact Us</p>
    <p style="margin:0 0 4px;color:#166534;font-size:13px;">For any queries, feel free to contact:</p>
    <p style="margin:0 0 3px;color:#166534;font-size:13px;"><strong>Mr. Alwin Infant E</strong> — +91 7708179387</p>
    <p style="margin:0;color:#166534;font-size:13px;"><strong>Mr. Siddarth G</strong> — +91 6369-825339</p>
  </div>

  <div style="background:#1e293b;padding:18px 24px;text-align:center;">
    <p style="margin:0 0 4px;color:#e2e8f0;font-size:13px;font-weight:700;">SARDAR 2026 — Inter College Cultural Fest</p>
    <p style="margin:0 0 8px;color:#94a3b8;font-size:12px;">Agurchand Manmull Jain College</p>
    <p style="margin:0;color:#475569;font-size:11px;">This is an automated email. Please do not reply.</p>
  </div>

</div>
</body>
</html>`;

/* ================================
   ROUTE: POST /api/email/send (SSE)
================================ */
router.post("/send", authMiddleware, roleMiddleware("admin", "data_upload"), async (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  try {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      sendSSE(res, { type: "error", message: "SMTP environment variables missing." });
      return res.end();
    }

    const transporter = createTransporter();
    try {
      await transporter.verify();
    } catch (verifyErr) {
      sendSSE(res, { type: "error", message: `SMTP connection failed: ${verifyErr.message}` });
      return res.end();
    }

    const { data: participants, error } = await supabase
      .from("participants")
      .select("*")
      .eq("email_sent", false);

    if (error) {
      sendSSE(res, { type: "error", message: error.message });
      return res.end();
    }

    if (!participants || participants.length === 0) {
      sendSSE(res, { type: "complete", message: "No pending emails.", sent: 0, failed: 0, total: 0 });
      return res.end();
    }

    sendSSE(res, { type: "start", total: participants.length });

    let sent = 0;
    let failed = 0;

    for (const participant of participants) {
      try {
        /*
          KEY FIX: QRCode.toBuffer() generates a PNG binary buffer (~3-5KB)
          instead of QRCode.toDataURL() which gives a base64 string (~50KB in HTML).
          Attach as CID attachment → <img src="cid:qrcode"> in HTML.
          This alone reduces email size by ~45KB → no Gmail clipping.
        */
        const qrBuffer = await QRCode.toBuffer(participant.participant_id, {
          width: 250,
          margin: 2,
          errorCorrectionLevel: "H",
          color: { dark: "#000000", light: "#ffffff" },
        });

        await transporter.sendMail({
          from: `"SARDAR 2026" <${process.env.SMTP_USER}>`,
          to: participant.email,
          subject: `🎫 Your Entry Pass — SARDAR 2026 | ${participant.name}`,
          html: generateEmailHTML(participant),
          attachments: [
            {
              filename: "entry-qrcode.png",
              content: qrBuffer,
              contentType: "image/png",
              cid: "qrcode",
            },
          ],
        });

        await supabase
          .from("participants")
          .update({ email_sent: true, email_sent_at: new Date().toISOString() })
          .eq("participant_id", participant.participant_id);

        sent++;
        sendSSE(res, {
          type: "progress",
          participant_id: participant.participant_id,
          name: participant.name,
          email: participant.email,
          status: "sent",
          sent,
          failed,
          total: participants.length,
        });

      } catch (err) {
        failed++;
        console.error(`Failed to send to ${participant.email}:`, err.message);
        sendSSE(res, {
          type: "progress",
          participant_id: participant.participant_id,
          name: participant.name,
          email: participant.email,
          status: "failed",
          error: err.message,
          sent,
          failed,
          total: participants.length,
        });
      }
    }

    sendSSE(res, {
      type: "complete",
      sent,
      failed,
      total: participants.length,
      message: `Done! ${sent} sent${failed > 0 ? `, ${failed} failed` : ""}.`,
    });

    res.end();

  } catch (err) {
    console.error("Email route error:", err);
    sendSSE(res, { type: "error", message: err.message });
    res.end();
  }
});

module.exports = router;