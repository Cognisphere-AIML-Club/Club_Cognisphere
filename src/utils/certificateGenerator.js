/**
 * Canvas Certificate Generator for IGNITE-2026 (Club Cognisphere)
 * Renders high-resolution 3507x2480 print-ready certificates using the WebP template.
 * Client-side browser rendering: 0 server memory, instant generation.
 */
import { jsPDF } from 'jspdf';

let cachedWebpTemplate = null;
let cachedPngTemplate = null;

/**
 * Preload and cache template image in browser memory.
 * By default loads the lightweight WebP template for fast web display.
 * Loads the original PNG template only on-demand when downloading.
 */
function loadTemplateImage(useOriginalPng = false) {
  if (useOriginalPng) {
    if (cachedPngTemplate && cachedPngTemplate.complete && cachedPngTemplate.naturalWidth > 0) {
      return Promise.resolve(cachedPngTemplate);
    }
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        cachedPngTemplate = img;
        resolve(img);
      };
      img.onerror = () => {
        // Fallback to webp if original png cannot be reached
        if (cachedWebpTemplate) return resolve(cachedWebpTemplate);
        loadTemplateImage(false).then(resolve).catch(reject);
      };
      img.src = '/certificates/ignite_participation_template.png';
    });
  }

  // Lightweight WebP for fast on-page viewing
  if (cachedWebpTemplate && cachedWebpTemplate.complete && cachedWebpTemplate.naturalWidth > 0) {
    return Promise.resolve(cachedWebpTemplate);
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      cachedWebpTemplate = img;
      resolve(img);
    };
    img.onerror = () => {
      // Fallback to PNG if WebP fails in legacy environments
      loadTemplateImage(true).then(resolve).catch(reject);
    };
    img.src = '/certificates/ignite_participation_template.webp';
  });
}

/**
 * Generate high-resolution certificate data URL.
 * Renders WebP on page load for lightweight memory usage.
 * Renders original full-res PNG on-demand when downloading.
 */
export async function generateCertificateDataUrl({
  participantName = 'Participant Name',
  activityName = '',
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
  try {
    const templateImg = await loadTemplateImage(useOriginalTemplate);
    ctx.drawImage(templateImg, 0, 0, width, height);
  } catch (err) {
    console.warn('Using canvas fallback gradient due to template load error:', err);
    // Graceful fallback if asset cannot be reached
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
  }

  // 3. Render Participant Name (Dynamic from profile.certificateName)
  // Positioned in the designated blank zone between "This certificate is proudly presented to" and the event line
  const cleanName = (participantName || 'Participant').trim();
  const centerX = width / 2; // 1753.5
  const nameBaselineY = 1615; // Centered in the open space

  ctx.textAlign = 'center';
  ctx.fillStyle = '#16224b'; // Deep prestigious navy extracted from template

  // Dynamically calculate font size to fit comfortably between borders
  let fontSize = 164;
  ctx.font = `700 ${fontSize}px "Glacial Indifference", sans-serif`;
  while (ctx.measureText(cleanName).width > 2200 && fontSize > 48) {
    fontSize -= 4;
    ctx.font = `700 ${fontSize}px "Glacial Indifference", sans-serif`;
  }
  ctx.fillText(cleanName, centerX, nameBaselineY);

  // 4. Render Dynamic Event Line: "in recognition of active participation in " + Event Name
  // Entire line is centered dynamically as a single block so event names of any length stay perfectly balanced
  const prefixText = 'in recognition of active participation in ';
  const eventText = (activityName || '').trim();
  const fullFallbackText = 'in recognition of active participation';

  let eventLineFontSize = 60;
  const maxLineContentWidth = 2650; // Safe width within certificate inner border
  const eventBaselineY = 1734;

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
    ctx.strokeStyle = '#0b091f';
    ctx.strokeText(eventText, lineStartX + prefixWidth, eventBaselineY);
    ctx.fillText(eventText, lineStartX + prefixWidth, eventBaselineY);
  } else {
    // Fallback if no specific activity name
    ctx.textAlign = 'center';
    ctx.fillStyle = '#0b091f';
    ctx.font = `italic 400 ${eventLineFontSize}px "Glacial Indifference", sans-serif`;
    ctx.fillText(fullFallbackText, centerX, eventBaselineY);
  }

  // 5. Verification Footer (Official Authenticity Line)
  // Placed subtly at the bottom center to provide verifiable credential proof without cluttering the artwork
  if (verifyUrl) {
    ctx.textAlign = 'center';
    ctx.font = '400 25px "Glacial Indifference", monospace, sans-serif';
    ctx.fillStyle = '#16181aff';
    const verifyText = `Verify at: ${verifyUrl}`;
    ctx.fillText(verifyText, centerX, 2457);
  }

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
