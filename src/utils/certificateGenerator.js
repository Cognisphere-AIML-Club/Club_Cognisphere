/**
 * Canvas Certificate Generator for IGNITE-2026 (Club Cognisphere)
 * Renders high-resolution 3507x2480 print-ready certificates using the WebP template.
 * Client-side browser rendering: 0 server memory, instant generation.
 */
import { jsPDF } from 'jspdf';
import { QRCodeSVG } from 'qrcode.react';
import { getCurrentActivities } from '../data/activities';

/**
 * Extract only the day-of-month number (no month, no year) from an Event Hub date string (e.g. '2026-11-24' -> '24').
 */
function extractEventDayOnly(rawDate) {
  if (!rawDate) return '';
  const s = String(rawDate).trim();
  if (!s) return '';

  const isoMatch = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) return String(parseInt(isoMatch[3], 10));

  const dmyMatch = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (dmyMatch) return String(parseInt(dmyMatch[1], 10));

  const dayOnlyMatch = s.match(/^(\d{1,2})$/);
  if (dayOnlyMatch) return String(parseInt(dayOnlyMatch[1], 10));

  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) {
    return String(parsed.getDate());
  }
  return '';
}

function resolveEventDay({ eventDate = '', activityId = '', activityName = '' }) {
  const explicitDay = extractEventDayOnly(eventDate);
  if (explicitDay) return explicitDay;

  const list = getCurrentActivities() || [];
  const cleanId = String(activityId || '').trim().toLowerCase();
  const cleanName = String(activityName || '').trim().toLowerCase();

  const matched =
    (cleanId && list.find((a) => String(a.id || '').trim().toLowerCase() === cleanId)) ||
    (cleanName && list.find((a) => String(a.name || '').trim().toLowerCase() === cleanName)) ||
    null;

  return extractEventDayOnly(matched?.eventDate || '');
}

const templateCache = {
  participation: { webp: null, png: null },
  coordinator: { webp: null, png: null }
};

function loadImageElement(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load template image: ${src}`));
    img.src = src;
  });
}

/**
 * Preload and cache template image in browser memory by certificate type.
 * By default loads the lightweight WebP template for fast web display,
 * and loads the original PNG template on-demand when downloading.
 */
async function loadTemplateImage(useOriginalPng = false, certType = 'participation') {
  const kind = certType === 'coordinator' ? 'coordinator' : 'participation';
  const cache = templateCache[kind];
  const baseName = kind === 'coordinator'
    ? 'ignite_coordinator_template'
    : 'ignite_participation_template';
  const webpPath = `/certificates/${baseName}.webp`;
  const pngPath = `/certificates/${baseName}.png`;

  if (useOriginalPng) {
    if (cache.png?.complete && cache.png.naturalWidth > 0) {
      return cache.png;
    }
    try {
      cache.png = await loadImageElement(pngPath);
      return cache.png;
    } catch (pngErr) {
      if (cache.webp?.complete && cache.webp.naturalWidth > 0) {
        return cache.webp;
      }
      cache.webp = await loadImageElement(webpPath);
      return cache.webp;
    }
  }

  if (cache.webp?.complete && cache.webp.naturalWidth > 0) {
    return cache.webp;
  }
  try {
    cache.webp = await loadImageElement(webpPath);
    return cache.webp;
  } catch (webpErr) {
    if (cache.png?.complete && cache.png.naturalWidth > 0) {
      return cache.png;
    }
    cache.png = await loadImageElement(pngPath);
    return cache.png;
  }
}

function drawCenteredFittedName(ctx, {
  name,
  centerX,
  baselineY,
  initialFontSize = 164,
  minFontSize = 48,
  maxWidth = 2200
}) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#16224b';
  let fontSize = initialFontSize;
  ctx.font = `700 ${fontSize}px "Glacial Indifference", sans-serif`;
  while (ctx.measureText(name).width > maxWidth && fontSize > minFontSize) {
    fontSize -= 4;
    ctx.font = `700 ${fontSize}px "Glacial Indifference", sans-serif`;
  }
  ctx.fillText(name, centerX, baselineY);
  ctx.restore();
}

/**
 * Draw centered scannable verification QR code and bottom-center "Verify at: <url>" footer.
 */
function drawVerificationQrAndLink(ctx, { verifyUrl, canvasWidth = 3507 }) {
  if (!verifyUrl) return;

  const boxSize = 275;
  const pad = 14;
  const qrSize = boxSize - pad * 2;
  const boxX = (canvasWidth - boxSize) / 2;
  const boxY = 2075;

  let numCells = 0;
  let fgPath = '';
  try {
    const svgEl = QRCodeSVG({
      value: verifyUrl,
      level: 'M',
      includeMargin: false
    });
    const viewBox = svgEl?.props?.viewBox || '';
    const parts = String(viewBox).trim().split(/\s+/);
    if (parts.length === 4) {
      numCells = parseFloat(parts[2]) || 0;
    }
    const children = Array.isArray(svgEl?.props?.children) ? svgEl.props.children : [];
    fgPath = children[1]?.props?.d || '';
  } catch (err) {
    console.warn('QR generation warning:', err);
  }

  ctx.save();
  ctx.letterSpacing = '0.5px';

  if (numCells > 0 && fgPath && typeof Path2D !== 'undefined') {
    // Crisp white quiet-zone container for reliable phone scanning
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(boxX, boxY, boxSize, boxSize);
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2;
    ctx.strokeRect(boxX, boxY, boxSize, boxSize);

    ctx.save();
    ctx.translate(boxX + pad, boxY + pad);
    const scale = qrSize / numCells;
    ctx.scale(scale, scale);
    ctx.fillStyle = '#16224b';
    ctx.fill(new Path2D(fgPath));
    ctx.restore();
  }

  // Bottom-of-page verification line prefixed with "Verify at: "
  const verifyText = `Verify at: ${verifyUrl}`;
  let linkFontSize = 28;
  const maxLinkWidth = canvasWidth - 400;
  ctx.textAlign = 'center';
  ctx.font = `500 ${linkFontSize}px "Glacial Indifference", monospace, sans-serif`;
  while (ctx.measureText(verifyText).width > maxLinkWidth && linkFontSize > 16) {
    linkFontSize -= 1;
    ctx.font = `500 ${linkFontSize}px "Glacial Indifference", monospace, sans-serif`;
  }
  ctx.fillStyle = '#16224b';
  ctx.fillText(verifyText, canvasWidth / 2, 2455);

  ctx.restore();
}

/**
 * Generate high-resolution certificate data URL.
 * Renders WebP on page load for lightweight memory usage.
 * Renders original full-res PNG on-demand when downloading.
 */
export async function generateCertificateDataUrl({
  participantName = 'Participant Name',
  certType = 'participation', // 'participation' | 'coordinator'
  activityId = '',
  activityName = '',
  eventDate = '',
  certificateId = '',
  verifyUrl = '',
  format = 'image/png',
  useOriginalTemplate = false
}) {
  const canvas = document.createElement('canvas');
  const width = 3507;
  const height = 2480;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // 1. Ensure web fonts are rendered
  if (typeof document !== 'undefined' && document.fonts) {
    try {
      await Promise.all([
        document.fonts.load('700 124px "Glacial Indifference"'),
        document.fonts.load('italic 400 52px "Glacial Indifference"'),
        document.fonts.load('italic 700 52px "Glacial Indifference"'),
        document.fonts.load('400 20px "Glacial Indifference"'),
        document.fonts.ready
      ]);
    } catch {
      // Continue even if font loading times out
    }
  }

  // 2. Load and draw the certificate background
  const isCoordinatorCert = certType === 'coordinator';
  try {
    const templateImg = await loadTemplateImage(useOriginalTemplate, certType);
    ctx.drawImage(templateImg, 0, 0, width, height);
  } catch (err) {
    console.warn('Using canvas fallback gradient due to template load error:', err);
    // Graceful fallback if asset cannot be reached
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
  }

  // 3. Separate Render Paths for Coordinator vs Participation Certificates
  const cleanName = (participantName || 'Participant').trim().toUpperCase();
  const centerX = width / 2; // 1753.5

  if (isCoordinatorCert) {
    // Coordinator Certificate Render (independent baselineY & layout)
    const coordinatorNameBaselineY = 1560;
    drawCenteredFittedName(ctx, {
      name: cleanName,
      centerX,
      baselineY: coordinatorNameBaselineY
    });
  } else {
    // Participation Certificate Render
    const nameBaselineY = 1600;
    drawCenteredFittedName(ctx, {
      name: cleanName,
      centerX,
      baselineY: nameBaselineY
    });

    // 4. Render Dynamic Event Line: "in recognition of active participation in " + Event Name
    // Entire line is centered dynamically as a single block so event names of any length stay perfectly balanced
    const prefixText = 'in recognition of active participation in ';
    const eventText = (activityName || '').trim();
    const fullFallbackText = 'in recognition of active participation';

    let eventLineFontSize = 60;
    const maxLineContentWidth = 2650; // Safe width within certificate inner border
    const eventBaselineY = 1712;

    if (eventText) {
      ctx.font = `italic 300 ${eventLineFontSize}px "Glacial Indifference", sans-serif`;
      ctx.letterSpacing = '2px';
      let prefixWidth = ctx.measureText(prefixText).width;
      ctx.font = `italic 700 ${eventLineFontSize}px "Glacial Indifference", sans-serif`;
      ctx.letterSpacing = '6px';
      let eventWidth = ctx.measureText(eventText).width + (eventLineFontSize * 0.05);
      let totalLineWidth = prefixWidth + eventWidth;

      // Dynamically scale down font size if the combined line is long
      while (totalLineWidth > maxLineContentWidth && eventLineFontSize > 24) {
        eventLineFontSize -= 1;
        ctx.font = `italic 300 ${eventLineFontSize}px "Glacial Indifference", sans-serif`;
        ctx.letterSpacing = '2px';
        prefixWidth = ctx.measureText(prefixText).width;
        ctx.font = `italic 700 ${eventLineFontSize}px "Glacial Indifference", sans-serif`;
        ctx.letterSpacing = '6px';
        eventWidth = ctx.measureText(eventText).width + (eventLineFontSize * 0.05);
        totalLineWidth = prefixWidth + eventWidth;
      }

      // Centered start X for the entire composite line
      const lineStartX = (width - totalLineWidth) / 2;

      // Draw prefix in Italic 400
      ctx.textAlign = 'left';
      ctx.letterSpacing = '2px';
      ctx.fillStyle = '#16224b';
      ctx.font = `italic 300 ${eventLineFontSize}px "Glacial Indifference", sans-serif`;
      ctx.fillText(prefixText, lineStartX, eventBaselineY);

      // Draw Event Name in Italic Bold 700
      ctx.font = `italic 700 ${eventLineFontSize}px "Glacial Indifference", sans-serif`;
      ctx.lineWidth = eventLineFontSize * 0.035;
      ctx.letterSpacing = '6px';
      ctx.strokeStyle = '#16224b';
      ctx.strokeText(eventText, lineStartX + prefixWidth, eventBaselineY);
      ctx.fillText(eventText, lineStartX + prefixWidth, eventBaselineY);
    } else {
      // Fallback if no specific activity name
      ctx.textAlign = 'center';
      ctx.fillStyle = '#16224b';
      ctx.font = `italic 400 ${eventLineFontSize}px "Glacial Indifference", sans-serif`;
      ctx.fillText(fullFallbackText, centerX, eventBaselineY);
    }
    // 5. Render date of conducted event
    const date = resolveEventDay({ eventDate, activityId, activityName });
    if (date) {
      ctx.fillStyle = '#16224b';
      ctx.font = 'italic 700 54px "Glacial Indifference", sans-serif';
      ctx.fillText(date, 2044, eventBaselineY + 121);
    }
  }


  // 6. Verification QR Code (Centered) & Bottom Link
  drawVerificationQrAndLink(ctx, { verifyUrl, canvasWidth: width });

  return format === 'image/webp'
    ? canvas.toDataURL('image/webp', 0.88)
    : canvas.toDataURL('image/png');
}

/**
 * Triggers an instant high-resolution PNG download in the user's browser
 */
export function downloadCertificateImage(dataUrl, filename = 'IGNITE_2026_Certificate.png') {
  if (!dataUrl) return;
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Converts the certificate PNG directly to PDF with 100% exact dimensions (3507x2480 pt).
 * Zero page margins, zero cropping, and instant direct download.
 */
export async function printCertificate(dataUrl, title = 'IGNITE 2026 Certificate', filename = 'IGNITE_2026_Certificate.pdf') {
  if (!dataUrl) return;

  const width = 3507;
  const height = 2480;

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: [width, height]
  });

  doc.addImage(dataUrl, 'PNG', 0, 0, width, height, undefined, 'FAST');
  const safeFilename = filename.toLowerCase().endsWith('.pdf') ? filename : `${filename}.pdf`;
  doc.save(safeFilename);
}
