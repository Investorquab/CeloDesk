import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy - CeloDesk',
  description: 'How CeloDesk collects, uses, and protects your information.',
};

const UPDATED = 'November 1, 2026';

const wrap: React.CSSProperties = {
  minHeight: '100vh',
  background: '#FCFCFA',
  color: '#102019',
  fontFamily: "'Inter', system-ui, sans-serif",
};
const bar: React.CSSProperties = {
  background: '#0A1C14',
  color: '#fff',
  padding: '18px 24px',
  display: 'flex',
  alignItems: 'center',
  gap: 12,
};
const mark: React.CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: 9,
  background: '#13915F',
  display: 'grid',
  placeItems: 'center',
  color: '#fff',
  fontFamily: "'Bricolage Grotesque', sans-serif",
  fontWeight: 800,
  fontSize: 16,
};
const container: React.CSSProperties = {
  maxWidth: 760,
  margin: '0 auto',
  padding: '48px 24px 80px',
};
const h1: React.CSSProperties = {
  fontFamily: "'Bricolage Grotesque', sans-serif",
  fontWeight: 800,
  fontSize: 38,
  margin: '0 0 8px',
  color: '#0A1C14',
};
const h2: React.CSSProperties = {
  fontFamily: "'Bricolage Grotesque', sans-serif",
  fontWeight: 700,
  fontSize: 22,
  margin: '36px 0 10px',
  color: '#0C6A45',
};
const p: React.CSSProperties = { fontSize: 16, lineHeight: 1.7, color: '#2B3A33', margin: '0 0 14px' };
const li: React.CSSProperties = { fontSize: 16, lineHeight: 1.7, color: '#2B3A33', margin: '0 0 8px' };
const soft: React.CSSProperties = { color: '#5A6B62', fontSize: 14 };

export default function PrivacyPage() {
  return (
    <div style={wrap}>
      <div style={bar}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#fff', textDecoration: 'none' }}>
          <span style={mark}>C</span>
          <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 18 }}>CeloDesk</span>
        </Link>
      </div>

      <main style={container}>
        <h1 style={h1}>Privacy Policy</h1>
        <p style={soft}>Last updated: {UPDATED}</p>

        <p style={{ ...p, marginTop: 20 }}>
          CeloDesk is a stablecoin invoicing and payments tool built on the Celo blockchain. This policy
          explains what information we collect when you use CeloDesk, how we use it, and the choices you have.
          By using CeloDesk you agree to the practices described here.
        </p>

        <h2 style={h2}>Information we collect</h2>
        <ul>
          <li style={li}><strong>Account information.</strong> When you sign in, we store your wallet address, and if you use Google sign-in, the email address and name provided by Google.</li>
          <li style={li}><strong>Invoice data.</strong> Details you enter to create and send invoices, such as client names, client email or Telegram handles, amounts, currencies, and descriptions.</li>
          <li style={li}><strong>Delivery information.</strong> If you choose to deliver an invoice by email or Telegram, we store the recipient contact you provide so we can send it and any unpaid reminders.</li>
          <li style={li}><strong>Technical data.</strong> A session token kept in your browser to keep you signed in, and basic logs needed to operate the service.</li>
        </ul>

        <h2 style={h2}>How we use your information</h2>
        <ul>
          <li style={li}>To create, deliver, and track your invoices.</li>
          <li style={li}>To process payments you and your clients make on the Celo network.</li>
          <li style={li}>To send invoice delivery messages and unpaid payment reminders that you enable.</li>
          <li style={li}>To operate, secure, and improve the service.</li>
        </ul>

        <h2 style={h2}>Service providers we use</h2>
        <ul>
          <li style={li}><strong>Google</strong> for optional Sign in with Google. We receive your verified email and name; we never receive your Google password.</li>
          <li style={li}><strong>Brevo</strong> to deliver invoice and reminder emails on our behalf.</li>
          <li style={li}><strong>Telegram</strong> to deliver invoices and reminders when you choose that channel.</li>
          <li style={li}><strong>The Celo blockchain</strong> to settle payments. Transactions on Celo are public and permanent, and are not controlled by CeloDesk.</li>
        </ul>

        <h2 style={h2}>Blockchain payments</h2>
        <p style={p}>
          Payments happen directly on the public Celo network. Wallet addresses, amounts, and transaction
          times recorded on chain are public by design and cannot be changed or deleted by CeloDesk.
        </p>

        <h2 style={h2}>Data retention and your choices</h2>
        <p style={p}>
          We keep your account and invoice data for as long as your account is active so the service can
          function. You can ask us to delete your account data at any time by contacting us, except for
          information already recorded on the public blockchain, which we cannot remove.
        </p>

        <h2 style={h2}>Data security</h2>
        <p style={p}>
          We use industry standard measures to protect your information, including encrypted connections.
          No method of transmission or storage is completely secure, so we cannot guarantee absolute security.
        </p>

        <h2 style={h2}>Children</h2>
        <p style={p}>CeloDesk is not intended for anyone under the age of 18, and we do not knowingly collect information from children.</p>

        <h2 style={h2}>Changes to this policy</h2>
        <p style={p}>We may update this policy from time to time. When we do, we will revise the date at the top of this page.</p>

        <h2 style={h2}>Contact</h2>
        <p style={p}>
          If you have questions about this policy or want to request deletion of your data, contact us at{' '}
          <a href="mailto:quadribello3@gmail.com" style={{ color: '#0C6A45', fontWeight: 600 }}>quadribello3@gmail.com</a>.
        </p>

        <p style={{ ...soft, marginTop: 40 }}>
          <Link href="/" style={{ color: '#0C6A45', fontWeight: 600 }}>Back to CeloDesk</Link>
        </p>
      </main>
    </div>
  );
}
