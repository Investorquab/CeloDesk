import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import QRCode from 'qrcode';

export type TelegramInvoiceCard = {
  clientName: string;
  amount: string;
  tokenSymbol: string;
  description: string;
  dueDate?: string | null;
  publicUrl: string;
  paymentQrValue: string;
};

function esc(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export async function renderTelegramInvoiceCard(data: TelegramInvoiceCard): Promise<Buffer> {
  const qrData = await QRCode.toDataURL(data.paymentQrValue, { margin: 1, width: 380, errorCorrectionLevel: 'M' });
  const logoPath = path.resolve(process.cwd(), 'src/assets/celodesk-logo.png');
  const logo = await fs.readFile(logoPath);
  const logoData = `data:image/png;base64,${logo.toString('base64')}`;
  const due = data.dueDate ? new Date(data.dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Pay on receipt';
  const description = data.description || 'Payment request';

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
  <svg width="1600" height="1000" viewBox="0 0 1600 1000" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#071d16"/><stop offset="1" stop-color="#0b6f50"/></linearGradient>
      <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#16c784"/><stop offset="1" stop-color="#8cff5a"/></linearGradient>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="12" stdDeviation="18" flood-opacity="0.18"/></filter>
    </defs>
    <rect width="1600" height="1000" fill="#eef7f3"/>
    <rect x="55" y="55" width="1490" height="890" rx="44" fill="#ffffff" filter="url(#shadow)"/>
    <rect x="55" y="55" width="1490" height="220" rx="44" fill="url(#bg)"/>
    <rect x="55" y="185" width="1490" height="90" fill="url(#bg)"/>
    <image href="${logoData}" x="105" y="105" width="72" height="72" preserveAspectRatio="xMidYMid meet"/>
    <text x="200" y="151" font-family="Arial, sans-serif" font-size="42" font-weight="800" fill="#ffffff">CeloDesk</text>
    <text x="200" y="188" font-family="Arial, sans-serif" font-size="17" font-weight="700" letter-spacing="3" fill="#b7ddcf">PAYMENT REQUEST</text>
    <text x="1450" y="128" text-anchor="end" font-family="Arial, sans-serif" font-size="15" font-weight="700" letter-spacing="2" fill="#b7ddcf">INVOICE</text>
    <text x="1450" y="162" text-anchor="end" font-family="Arial, sans-serif" font-size="21" font-weight="700" fill="#ffffff">SECURE ON CELO</text>

    <text x="105" y="350" font-family="Arial, sans-serif" font-size="16" font-weight="700" letter-spacing="2" fill="#71837b">BILL TO</text>
    <text x="105" y="400" font-family="Arial, sans-serif" font-size="38" font-weight="800" fill="#10221c">${esc(data.clientName)}</text>
    <text x="105" y="438" font-family="Arial, sans-serif" font-size="21" fill="#64736d">${esc(description)}</text>

    <text x="105" y="510" font-family="Arial, sans-serif" font-size="16" font-weight="700" letter-spacing="2" fill="#71837b">AMOUNT DUE</text>
    <text x="105" y="590" font-family="Arial, sans-serif" font-size="70" font-weight="800" fill="#10221c">${esc(data.amount)} ${esc(data.tokenSymbol)}</text>
    <text x="105" y="630" font-family="Arial, sans-serif" font-size="19" fill="#64736d">${esc(due)}</text>

    <line x1="105" y1="680" x2="900" y2="680" stroke="#dce9e3" stroke-width="2"/>
    <text x="105" y="722" font-family="Arial, sans-serif" font-size="15" font-weight="700" fill="#71837b">NETWORK</text>
    <text x="250" y="722" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#10221c">Celo Mainnet</text>
    <text x="105" y="760" font-family="Arial, sans-serif" font-size="15" font-weight="700" fill="#71837b">SETTLEMENT</text>
    <text x="250" y="760" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#10221c">Non-custodial</text>
    <text x="105" y="798" font-family="Arial, sans-serif" font-size="15" font-weight="700" fill="#71837b">PAYMENT</text>
    <text x="250" y="798" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#10221c">Wallet · MiniPay · QR</text>

    <rect x="1015" y="315" width="390" height="500" rx="32" fill="#f4faf7" stroke="#d4e6dd" stroke-width="2"/>
    <text x="1210" y="365" text-anchor="middle" font-family="Arial, sans-serif" font-size="17" font-weight="800" fill="#0b7d5a">SCAN TO PAY</text>
    <rect x="1085" y="395" width="250" height="250" rx="20" fill="#ffffff"/>
    <image href="${qrData}" x="1105" y="415" width="210" height="210"/>
    <text x="1210" y="690" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" font-weight="800" fill="#10221c">Open your secure invoice</text>
    <text x="1210" y="725" text-anchor="middle" font-family="Arial, sans-serif" font-size="15" fill="#71837b">${esc(data.publicUrl.length > 48 ? data.publicUrl.slice(0, 48) + '…' : data.publicUrl)}</text>
    <rect x="1090" y="755" width="240" height="38" rx="19" fill="url(#accent)"/>
    <text x="1210" y="780" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" font-weight="800" fill="#062118">PAY SECURELY</text>

    <line x1="105" y1="855" x2="1450" y2="855" stroke="#dce9e3" stroke-width="2"/>
    <text x="105" y="895" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#10221c">Thank you for your business.</text>
    <text x="1450" y="895" text-anchor="end" font-family="Arial, sans-serif" font-size="15" fill="#71837b">One secure link · Celo settlement · CeloDesk</text>
  </svg>`;

  return sharp(Buffer.from(svg)).png().toBuffer();
}
