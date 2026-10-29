/**
 * Buyer-side x402 demo: pay a CeloDesk USA₮ invoice over x402.
 *
 *   npm run x402-pay -- <invoiceId> [backendBaseUrl]
 *
 * Acts as an INDEPENDENT payer: signs an EIP-3009 transferWithAuthorization
 * for USA₮ and submits the x402 payload to CeloDesk, which verifies + settles
 * through the Celo facilitator (facilitator pays gas). Requires:
 *   - X402_PAYER_KEY  in the root .env: the payer's private key (holds USA₮).
 *   - The backend running with X402_API_KEY set (for /settle).
 *
 * The payer must be a different wallet from the merchant receiving wallet.
 */
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

import { ethers } from 'ethers';

const CELO_CHAIN_ID = 42220;

async function main() {
  const invoiceId = process.argv[2];
  const base = process.argv[3] || process.env.BACKEND_API_URL || 'http://localhost:3001';
  if (!invoiceId) {
    console.error('Usage: npm run x402-pay -- <invoiceId> [backendBaseUrl]');
    process.exit(1);
  }
  const key = process.env.X402_PAYER_KEY;
  if (!key) {
    console.error('Set X402_PAYER_KEY in .env (the independent payer wallet holding USA₮).');
    process.exit(1);
  }
  const wallet = new ethers.Wallet(key);

  // 1. Ask CeloDesk what to pay.
  const reqRes = await fetch(`${base}/api/x402/invoices/${invoiceId}/requirements`);
  const reqBody: any = await reqRes.json();
  if (!reqRes.ok) throw new Error(reqBody?.error || `requirements failed (${reqRes.status})`);
  const r = reqBody.accepts[0];
  console.log('Paying', r.maxAmountRequired, 'atomic USA₮ to', r.payTo);

  // 2. Build + sign the EIP-3009 authorization.
  const now = Math.floor(Date.now() / 1000);
  const authorization = {
    from: wallet.address,
    to: r.payTo,
    value: r.maxAmountRequired,
    validAfter: '0',
    validBefore: String(now + (r.maxTimeoutSeconds ?? 120)),
    nonce: ethers.hexlify(ethers.randomBytes(32)),
  };
  const domain = { name: r.extra.name, version: r.extra.version, chainId: CELO_CHAIN_ID, verifyingContract: r.asset };
  const types = {
    TransferWithAuthorization: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'validAfter', type: 'uint256' },
      { name: 'validBefore', type: 'uint256' },
      { name: 'nonce', type: 'bytes32' },
    ],
  };
  const signature = await wallet.signTypedData(domain, types, authorization);

  const paymentPayload = {
    x402Version: reqBody.x402Version,
    scheme: 'exact',
    network: r.network,
    payload: { signature, authorization },
  };

  // 3. Submit to CeloDesk for verify + settle.
  const payRes = await fetch(`${base}/api/x402/invoices/${invoiceId}/pay`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paymentPayload }),
  });
  const payBody: any = await payRes.json();
  console.log('Result:', JSON.stringify(payBody, null, 2));
  process.exit(payRes.ok && payBody.settled ? 0 : 1);
}

main().catch((e) => {
  console.error('x402-pay failed:', e);
  process.exit(1);
});
