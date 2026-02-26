import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import nodemailer from 'nodemailer';
import QRCode from 'qrcode';

export async function POST(request: NextRequest) {
  try {
    const { participant_id } = await request.json();
    const supabase = createServiceClient();

    // Fetch participant
    const { data: participant, error } = await supabase
      .from('participants')
      .select('*')
      .eq('participant_id', participant_id)
      .single();

    if (error || !participant) {
      return NextResponse.json({ success: false, error: 'Participant not found' });
    }

    if (!participant.email) {
      return NextResponse.json({ success: false, error: 'No email address' });
    }

    // Generate QR code as base64
    const qrDataUrl = await QRCode.toDataURL(participant.participant_id, {
      width: 300,
      margin: 2,
      color: { dark: '#0A0A0F', light: '#FFFFFF' },
    });

    const qrBase64 = qrDataUrl.replace(/^data:image\/png;base64,/, '');

    // Setup transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const eventName = process.env.EVENT_NAME || 'The Event';

    // Send email
    await transporter.sendMail({
      from: `"${eventName}" <${process.env.SMTP_USER}>`,
      to: participant.email,
      subject: `Your Entry QR Code — ${eventName} [${participant.participant_id}]`,
      html: `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="margin:0;padding:0;background:#0A0A0F;font-family:'DM Sans',Arial,sans-serif;">
          <div style="max-width:560px;margin:0 auto;padding:40px 20px;">
            <div style="background:linear-gradient(135deg,#0F0F1A,#1a1a2e);border:1px solid rgba(59,130,246,0.3);border-radius:16px;padding:40px;text-align:center;">
              <h1 style="color:#3B82F6;font-size:24px;margin:0 0 8px;font-weight:700;">${eventName}</h1>
              <p style="color:#94A3B8;margin:0 0 32px;font-size:14px;">Your personal entry QR code</p>
              <div style="background:white;border-radius:12px;padding:16px;display:inline-block;margin-bottom:32px;">
                <img src="cid:qrcode" alt="QR Code" width="200" height="200" style="display:block;" />
              </div>
              <div style="background:rgba(59,130,246,0.1);border:1px solid rgba(59,130,246,0.2);border-radius:10px;padding:20px;margin-bottom:24px;text-align:left;">
                <p style="color:#94A3B8;font-size:12px;margin:0 0 8px;text-transform:uppercase;letter-spacing:0.08em;">Participant Details</p>
                <p style="color:#F1F5F9;font-size:16px;font-weight:600;margin:0 0 4px;">${participant.name}</p>
                <p style="color:#94A3B8;font-size:13px;margin:0 0 4px;">${participant.college_name || ''}</p>
                <p style="color:#3B82F6;font-size:12px;font-family:monospace;margin:0;">ID: ${participant.participant_id}</p>
              </div>
              <p style="color:#475569;font-size:12px;margin:0;">Present this QR code at the entrance gate for check-in.</p>
            </div>
          </div>
          <div style="display:none;white-space:nowrap;font:15px courier;line-height:0;">
            &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; 
            &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; 
            &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;
          </div>
          <span style="display:none !important; opacity:0; color:transparent; font-size:0px;">${Date.now()}-${participant.participant_id}</span>
        </body>
        </html>
      `,
      attachments: [{
        filename: 'qrcode.png',
        content: qrBase64,
        encoding: 'base64',
        cid: 'qrcode',
      }],
    });

    // Update participant
    await supabase
      .from('participants')
      .update({ email_sent: true, email_sent_at: new Date().toISOString() })
      .eq('participant_id', participant_id);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg });
  }
}