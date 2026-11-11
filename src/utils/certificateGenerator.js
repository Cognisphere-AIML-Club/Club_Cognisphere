/**
 * Canvas Certificate Generator for Club Games 2026
 * Generates an ultra high-resolution 1920x1280 print-ready certificate.
 */

export function generateCertificateDataUrl({
  participantName = 'Participant Name',
  participantUsn = '',
  activityName = 'Competition Event',
  rankLabel = '',
  isWinner = false,
  dateString = 'November 2026',
  certificateId = ''
}) {
  const canvas = document.createElement('canvas');
  const width = 1920;
  const height = 1280;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // 1. Background Gradient
  const bgGrad = ctx.createRadialGradient(width / 2, height / 2, 200, width / 2, height / 2, width * 0.7);
  bgGrad.addColorStop(0, '#0c1527');
  bgGrad.addColorStop(1, '#020617');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // 2. Subtle Background Grid / Mesh Accent
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
  ctx.lineWidth = 1;
  const gridSize = 40;
  for (let x = 0; x < width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // 3. Elegant Gold Double Border
  const pad = 60;
  const innerPad = 75;

  // Outer border
  ctx.strokeStyle = isWinner ? '#f59e0b' : '#10b981';
  ctx.lineWidth = 5;
  ctx.strokeRect(pad, pad, width - pad * 2, height - pad * 2);

  // Inner border
  ctx.strokeStyle = isWinner ? 'rgba(245, 158, 11, 0.4)' : 'rgba(16, 185, 129, 0.4)';
  ctx.lineWidth = 2;
  ctx.strokeRect(innerPad, innerPad, width - innerPad * 2, height - innerPad * 2);

  // Corner Accents (Corner flourishes)
  const drawCorner = (x, y, dx, dy) => {
    ctx.strokeStyle = isWinner ? '#fbbf24' : '#34d399';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x, y + dy * 40);
    ctx.lineTo(x, y);
    ctx.lineTo(x + dx * 40, y);
    ctx.stroke();
  };
  drawCorner(innerPad + 10, innerPad + 10, 1, 1);
  drawCorner(width - innerPad - 10, innerPad + 10, -1, 1);
  drawCorner(innerPad + 10, height - innerPad - 10, 1, -1);
  drawCorner(width - innerPad - 10, height - innerPad - 10, -1, -1);

  // 4. Header Seal / Brand Emblem
  ctx.textAlign = 'center';

  // Club Name
  ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = isWinner ? '#fbbf24' : '#34d399';
  ctx.letterSpacing = '6px';
  ctx.fillText('CLUB GAMES 2026 • OFFICIAL MERIT RECORD', width / 2, 160);

  // Main Certificate Title
  ctx.font = '900 58px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.letterSpacing = '2px';
  const certTypeTitle = isWinner ? 'CERTIFICATE OF MERIT & EXCELLENCE' : 'CERTIFICATE OF PARTICIPATION';
  ctx.fillText(certTypeTitle, width / 2, 245);

  // Decorative Accent Bar under title
  const barGrad = ctx.createLinearGradient(width / 2 - 250, 0, width / 2 + 250, 0);
  barGrad.addColorStop(0, 'rgba(245, 158, 11, 0)');
  barGrad.addColorStop(0.5, isWinner ? '#f59e0b' : '#10b981');
  barGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');
  ctx.fillStyle = barGrad;
  ctx.fillRect(width / 2 - 250, 275, 500, 3);

  // Sub-title
  ctx.font = '500 20px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.letterSpacing = '4px';
  ctx.fillText('THIS IS PROUDLY PRESENTED TO', width / 2, 350);

  // 5. Participant Name (Huge High-Impact Typography)
  ctx.font = '900 72px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = isWinner ? '#fef08a' : '#ffffff';
  ctx.letterSpacing = '1px';
  ctx.fillText(participantName.toUpperCase(), width / 2, 450);

  // USN Tag
  if (participantUsn) {
    ctx.font = 'bold 24px monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.letterSpacing = '3px';
    ctx.fillText(`COLLEGE USN: ${participantUsn.toUpperCase()}`, width / 2, 510);
  }

  // 6. Body Text
  ctx.font = '400 24px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#cbd5e1';
  ctx.letterSpacing = '0.5px';

  let bodyLine1 = 'for outstanding dedication and active participation in the competition';
  if (isWinner && rankLabel) {
    bodyLine1 = `for exemplary performance and successfully securing ${rankLabel.toUpperCase()} in`;
  }
  ctx.fillText(bodyLine1, width / 2, 600);

  // Competition Name (Big & Highlighted)
  ctx.font = '900 48px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = isWinner ? '#f59e0b' : '#34d399';
  ctx.letterSpacing = '1px';
  ctx.fillText(activityName.toUpperCase(), width / 2, 675);

  // Body Line 2
  ctx.font = '400 20px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.fillText('held under the rules and regulations of Club Games 2026 at the College Campus.', width / 2, 735);

  // 7. Golden Stamp Emblem in center-bottom
  const emblemY = 880;
  ctx.beginPath();
  ctx.arc(width / 2, emblemY, 55, 0, Math.PI * 2);
  ctx.fillStyle = isWinner ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)';
  ctx.fill();
  ctx.strokeStyle = isWinner ? '#f59e0b' : '#10b981';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.font = '900 28px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = isWinner ? '#f59e0b' : '#10b981';
  ctx.letterSpacing = '2px';
  ctx.fillText(isWinner ? '★ WINNER ★' : '★ VERIFIED ★', width / 2, emblemY + 8);

  // 8. Signatures & Date Lines
  const sigY = 1060;

  // Left Signature: Faculty Coordinator
  ctx.beginPath();
  ctx.moveTo(280, sigY);
  ctx.lineTo(580, sigY);
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.font = 'italic bold 28px serif';
  ctx.fillStyle = '#e2e8f0';
  ctx.fillText('Dr. S. K. Sharma', 430, sigY - 20);

  ctx.font = '600 16px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.letterSpacing = '1px';
  ctx.fillText('FACULTY COORDINATOR', 430, sigY + 30);

  // Center: Date & Issue Reference
  ctx.font = '500 15px monospace';
  ctx.fillStyle = '#64748b';
  ctx.fillText(`ISSUED: ${dateString.toUpperCase()}`, width / 2, sigY + 15);
  if (certificateId) {
    ctx.fillText(`VERIFY: ${certificateId}`, width / 2, sigY + 40);
  }

  // Right Signature: Event Head
  ctx.beginPath();
  ctx.moveTo(width - 580, sigY);
  ctx.lineTo(width - 280, sigY);
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.font = 'italic bold 28px serif';
  ctx.fillStyle = '#e2e8f0';
  ctx.fillText('Ananya Patel', width - 430, sigY - 20);

  ctx.font = '600 16px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.letterSpacing = '1px';
  ctx.fillText('EVENT ORGANIZER & HEAD', width - 430, sigY + 30);

  return canvas.toDataURL('image/png');
}

/**
 * Triggers a direct high-res PNG download
 */
export function downloadCertificateImage(dataUrl, filename = 'Certificate.png') {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Prints the certificate directly to browser PDF
 */
export function printCertificate(dataUrl, title = 'Certificate') {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to print/save your certificate as a PDF.');
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title} - Club Games 2026</title>
        <style>
          @page {
            size: landscape;
            margin: 0;
          }
          body {
            margin: 0;
            padding: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #000;
            height: 100vh;
          }
          img {
            width: 100%;
            height: 100%;
            object-fit: contain;
          }
        </style>
      </head>
      <body>
        <img src="${dataUrl}" onload="window.print();window.close();" />
      </body>
    </html>
  `);
  printWindow.document.close();
}

