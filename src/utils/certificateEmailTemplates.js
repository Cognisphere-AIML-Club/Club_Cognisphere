import { buildAddToLinkedInProfileUrl } from '../services/certificateService';

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function stripRoomMentions(str) {
  return String(str || '')
    .replace(/\s*\(\s*Room\b[^)]*\)/gi, '')
    .replace(/\s*[-–—•,]*\s*\bRoom\s+[A-Za-z0-9-]+\b/gi, '')
    .trim();
}

/**
 * Generate personalized email subject, plain text, rich HTML (for Gmail copy-paste),
 * LinkedIn profile add URL, and mailto URI for Participant, Winner, or Coordinator certificates.
 */
export function buildCertificateEmail({
  recipientType = 'participation', // 'participation' | 'winner' | 'coordinator'
  name = 'Participant',
  activityName = 'IGNITE 2026',
  rankLabel = '',
  certId = '',
  verifyUrl = ''
}) {
  const cleanName = (name || 'Participant').trim();
  const cleanActivity = stripRoomMentions(activityName) || 'IGNITE 2026';
  const cleanRank = (rankLabel || '').trim();

  // Configure certificate title & personalized copy per category
  let subject = '';
  let linkedInCertName = '';
  let openingPara = '';
  let milestonePara = '';
  let shareBullet1 = '';
  let closingLine = '';

  if (recipientType === 'winner') {
    const positionText = cleanRank || 'Winner';
    const isRunnerUp = positionText.toLowerCase().includes('runner');
    const titleLabel = positionText.toLowerCase() === 'winner'
      ? 'Winner'
      : isRunnerUp
      ? positionText
      : `Winner (${positionText})`;
    subject = `IGNITE 2026 ${titleLabel} Certificate — ${cleanActivity}`;
    linkedInCertName = `IGNITE 2026 ${titleLabel} — ${cleanActivity}`;
    openingPara = `Congratulations on securing ${positionText} in ${cleanActivity} at IGNITE 2026, organized by the Cognisphere AI & ML Club at Sambhram Institute of Technology. We are pleased to issue your official achievement certificate.`;
    milestonePara = `You can view, verify, and download your certificate directly from the Cognisphere portal:`;
    shareBullet1 = `Download a copy for your records or share your achievement on LinkedIn.`;
    closingLine = `Thank you for competing at IGNITE 2026. Wishing you continued success ahead.`;
  } else if (recipientType === 'coordinator') {
    const dutyText = cleanActivity && cleanActivity !== 'IGNITE 2026'
      ? cleanActivity
      : 'IGNITE 2026 event operations';
    subject = `IGNITE 2026 Coordinator Appreciation Certificate`;
    linkedInCertName = `IGNITE 2026 Event Coordinator — Cognisphere AI & ML Club`;
    openingPara = `Thank you for your active presence, dedicated monitoring, and coordination of ${dutyText} during IGNITE 2026 at Sambhram Institute of Technology. Your support played a key role in running the event smoothly.`;
    milestonePara = `Your official Coordinator Appreciation Certificate has been issued and is available at the link below:`;
    shareBullet1 = `Open your verification link to view or share your coordination credential on LinkedIn.`;
    closingLine = `We truly appreciate your contribution to Cognisphere and the Department of AI & ML.`;
  } else {
    subject = `IGNITE 2026 Participation Certificate — ${cleanActivity}`;
    linkedInCertName = `IGNITE 2026 Participation — ${cleanActivity}`;
    openingPara = `Thank you for attending and participating in ${cleanActivity} at IGNITE 2026, organized by the Cognisphere AI & ML Club at Sambhram Institute of Technology.`;
    milestonePara = `Your official participation certificate is ready. You can preview, verify, and download your high-resolution PNG/PDF anytime using the link below:`;
    shareBullet1 = `Save your PNG/PDF certificate and share it with your campus or professional network.`;
    closingLine = `Thank you for being a part of IGNITE 2026. Best regards from the department and club team.`;
  }

  const addToLinkedInUrl = buildAddToLinkedInProfileUrl({
    certName: linkedInCertName,
    certId,
    verifyUrl
  });

  // Plain Text Version (natural, human wording distinct from generic mass-mailer templates)
  const plainText = [
    `Hi ${cleanName},`,
    ``,
    openingPara,
    ``,
    milestonePara,
    `View Certificate: ${verifyUrl}`,
    ``,
    `Next steps:`,
    `- ${shareBullet1}`,
    `- Add to your LinkedIn profile under Licenses & Certifications: ${addToLinkedInUrl}`,
    ``,
    closingLine,
    ``,
    `Warm regards,`,
    `Team Cognisphere`,
    `Department of AI & ML, Sambhram Institute of Technology`,
    ...(certId ? [`Certificate ID: ${certId}`] : [])
  ].join('\n');

  // Clean conversational HTML (distinct wording + minimal styling for high inbox deliverability)
  const html = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1f2937; font-size: 14px; line-height: 1.65; max-width: 600px;">
  <p style="margin: 0 0 14px 0;">Hi <strong>${escapeHtml(cleanName)}</strong>,</p>
  <p style="margin: 0 0 14px 0;">${escapeHtml(openingPara)}</p>
  <p style="margin: 0 0 16px 0;">${escapeHtml(milestonePara)}</p>
  <p style="margin: 0 0 18px 0;">
    <a href="${escapeHtml(verifyUrl)}" style="display: inline-block; padding: 10px 20px; background-color: #2563eb; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 6px;"><span style="color: #ffffff;">View Certificate</span></a>
  </p>
  <p style="margin: 0 0 8px 0;"><strong>Next steps:</strong></p>
  <ul style="margin: 0 0 16px 0; padding-left: 20px;">
    <li style="margin-bottom: 10px;">${escapeHtml(shareBullet1)}</li>
    <li style="margin-bottom: 10px;">
      Add this credential to your LinkedIn profile:<br />
      <a href="${escapeHtml(addToLinkedInUrl)}" style="display: inline-block; margin-top: 8px; padding: 8px 16px; background-color: #0a66c2; color: #ffffff; font-size: 13px; font-weight: 600; text-decoration: none; border-radius: 6px;"><span style="color: #ffffff;">Add to LinkedIn</span></a>
    </li>
  </ul>
  <p style="margin: 0 0 14px 0;">${escapeHtml(closingLine)}</p>
  <p style="margin: 0 0 12px 0;">
    Warm regards,<br />
    <strong>Team Cognisphere</strong><br />
    <span style="color: #6b7280; font-size: 12px;">Department of AI &amp; ML, Sambhram Institute of Technology</span>
  </p>
  ${certId ? `<p style="margin: 0; padding-top: 10px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 11px;">Certificate ID: ${escapeHtml(certId)}</p>` : ''}
</div>`.trim();

  return {
    subject,
    plainText,
    html,
    verifyUrl,
    addToLinkedInUrl,
    linkedInCertName
  };
}

/**
 * Copy rich HTML + plain text fallback to clipboard so pasting into Gmail preserves styled buttons & clickable links
 */
export async function copyRichEmailToClipboard(html, plainText) {
  // 1. Modern ClipboardItem API (writes both text/html and text/plain)
  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof ClipboardItem !== 'undefined') {
    try {
      const item = new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([plainText], { type: 'text/plain' })
      });
      await navigator.clipboard.write([item]);
      return 'rich';
    } catch (_) {
      // Continue to DOM rich-copy fallback
    }
  }

  // 2. DOM Selection + execCommand('copy') fallback (reliably preserves rich HTML in Safari & older browsers)
  if (typeof document !== 'undefined' && typeof window !== 'undefined') {
    try {
      const container = document.createElement('div');
      container.innerHTML = html;
      container.style.position = 'fixed';
      container.style.left = '-9999px';
      container.style.top = '0';
      container.style.backgroundColor = '#ffffff';
      container.style.color = '#1f2937';
      document.body.appendChild(container);

      const range = document.createRange();
      range.selectNodeContents(container);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      const ok = document.execCommand('copy');
      selection.removeAllRanges();
      document.body.removeChild(container);
      if (ok) return 'rich';
    } catch (_) {
      // Fall through to plain text
    }
  }

  // 3. Final plain-text fallback
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(plainText);
    return 'plain';
  }
  throw new Error('Clipboard API unavailable in this browser');
}

/**
 * Build secured Google Apps Script code with an embedded API secret key,
 * POST-only authentication, script locking, and strict recipient validation.
 */
export function buildSecureClubGmailScript(apiSecret = '') {
  const escapedSecret = String(apiSecret || 'PASTE_YOUR_SECRET_KEY_HERE')
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"');

  return `/**
 * Cognisphere Official Club Gmail Certificate Mailer (Secured Executable API)
 * Deploy as Web App -> Execute as: Me (Club Official Email) -> Who has access: Anyone
 */
var API_SECRET = "${escapedSecret}";

function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (!a || !b || a.length !== b.length) return false;
  var diff = 0;
  for (var i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

// Select "authorizeMailer" in the Apps Script toolbar dropdown and click Run once to grant Gmail permissions!
function authorizeMailer() {
  GmailApp.getAliases();
  MailApp.getRemainingDailyQuota();
  Logger.log('GmailApp & MailApp authorized successfully!');
}

// Block unauthenticated browser GET requests
function doGet(e) {
  return jsonOut({
    success: false,
    error: 'Method Not Allowed: Use authenticated POST with API secret'
  });
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) {
    return jsonOut({ success: false, error: 'Server busy. Please retry.' });
  }

  try {
    if (!API_SECRET || API_SECRET === 'PASTE_YOUR_SECRET_KEY_HERE' || API_SECRET.length < 16) {
      return jsonOut({ success: false, error: 'Mailer API_SECRET is not configured properly.' });
    }

    var raw = (e && e.postData && e.postData.contents) ? e.postData.contents : '{}';
    var payload = JSON.parse(raw);

    // 1. Authenticate secret token
    if (!safeEqual(String(payload.apiKey || ''), API_SECRET)) {
      return jsonOut({ success: false, error: 'Unauthorized: Invalid API secret key.' });
    }

    // 2. Authenticated health & quota check
    if (payload.action === 'CHECK_STATUS') {
      return jsonOut({
        success: true,
        ready: true,
        mailerEngine: 'GmailApp-v2',
        remainingDailyQuota: MailApp.getRemainingDailyQuota()
      });
    }

    // 3. Send certificate email with validation
    if (payload.action === 'SEND_CERTIFICATE_EMAIL') {
      var to = String(payload.to || '').trim();
      var subject = String(payload.subject || '').trim().slice(0, 250);
      var senderName = String(payload.senderName || 'Team Cognisphere').trim().slice(0, 80);

      if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(to)) {
        return jsonOut({ success: false, error: 'Invalid recipient email address.' });
      }
      if (!subject || (!payload.html && !payload.plainText)) {
        return jsonOut({ success: false, error: 'Subject and email content are required.' });
      }

      // Use GmailApp so emails send directly through the club's authenticated Gmail account
      // (appears in Sent Mail with proper DKIM/SPF trust, avoiding MailApp noreply spam flags)
      GmailApp.sendEmail(
        to,
        subject,
        String(payload.plainText || ''),
        {
          htmlBody: String(payload.html || ''),
          name: senderName
        }
      );

      return jsonOut({
        success: true,
        to: to,
        mailerEngine: 'GmailApp-v2',
        remainingDailyQuota: MailApp.getRemainingDailyQuota()
      });
    }

    return jsonOut({ success: false, error: 'Unsupported action.' });
  } catch (err) {
    return jsonOut({ success: false, error: err.toString() });
  } finally {
    lock.releaseLock();
  }
}

function jsonOut(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}`;
}
