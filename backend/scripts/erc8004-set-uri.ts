/**
 * ERC-8004 identity: point the agent's on-chain record at a real CeloDesk
 * registration file, with our attribution tag on the transaction.
 *
 *   npm run erc8004 -- [--send] [--https <url>] [--agent-id <n>]
 *
 * Without --send it is a DRY RUN: it prints exactly what it would submit and
 * sends nothing. With --send it signs and broadcasts ONE Celo mainnet
 * transaction from the agent wallet (gas in CELO).
 *
 * The agent wallet (0x00d1...e486) already owns agentId 9799 on the official
 * Celo Identity Registry, so this updates the URI (setAgentURI). If the wallet
 * somehow holds no identity, it registers instead. Either way the transaction
 * carries tag celo_3fce81a170fc, which also satisfies Loops' "tagged tx from
 * the agent wallet" check.
 *
 * The registration file is read from frontend/public/.well-known/agent-card.json
 * and embedded on-chain as a base64 data URI by default (robust, never 404s);
 * pass --https <url> to point at a hosted copy instead.
 */
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

import { ethers } from 'ethers';
import { appendAttribution, HACKATHON_ATTRIBUTION_TAG } from '../src/services/attribution';

const AGENT_WALLET = '0x00d1E86040d88397F4eB187c38dC527F6659e486';
const REGISTRY = '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432';
const DEFAULT_AGENT_ID = 9799;
const CARD_PATH = path.resolve(process.cwd(), '../frontend/public/.well-known/agent-card.json');

const ABI = [
  'function register(string agentURI) returns (uint256)',
  'function setAgentURI(uint256 agentId, string newURI)',
  'function balanceOf(address) view returns (uint256)',
  'function ownerOf(uint256) view returns (address)',
  'function tokenURI(uint256) view returns (string)',
];

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const send = process.argv.includes('--send');
  const httpsUrl = arg('--https');
  const agentId = Number(arg('--agent-id') ?? DEFAULT_AGENT_ID);

  // Build the on-chain URI from the canonical agent card.
  const cardRaw = fs.readFileSync(CARD_PATH, 'utf8');
  const card = JSON.parse(cardRaw); // validate it parses
  const uri = httpsUrl
    ? httpsUrl
    : `data:application/json;base64,${Buffer.from(JSON.stringify(card)).toString('base64')}`;

  const key = process.env.PRIVATE_KEY;
  if (!key) throw new Error('PRIVATE_KEY (agent wallet) is not set in .env.');
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || 'https://forno.celo.org');
  const wallet = new ethers.Wallet(key, provider);
  if (wallet.address.toLowerCase() !== AGENT_WALLET.toLowerCase()) {
    throw new Error(`PRIVATE_KEY is for ${wallet.address}, not the agent wallet ${AGENT_WALLET}. Refusing.`);
  }

  const reg = new ethers.Contract(REGISTRY, ABI, wallet);
  const iface = new ethers.Interface(ABI);
  const bal: bigint = await reg.balanceOf(AGENT_WALLET);

  let baseData: string;
  let action: string;
  if (bal > 0n) {
    const owner = await reg.ownerOf(agentId);
    if (owner.toLowerCase() !== AGENT_WALLET.toLowerCase()) {
      throw new Error(`agentId ${agentId} is owned by ${owner}, not the agent wallet. Pass the correct --agent-id.`);
    }
    baseData = iface.encodeFunctionData('setAgentURI', [agentId, uri]);
    action = `setAgentURI(${agentId}, <uri>)`;
  } else {
    baseData = iface.encodeFunctionData('register', [uri]);
    action = 'register(<uri>)';
  }
  const data = appendAttribution(baseData as `0x${string}`);

  console.log('Agent wallet :', wallet.address);
  console.log('Registry     :', REGISTRY);
  console.log('Action       :', action);
  console.log('Attribution  :', HACKATHON_ATTRIBUTION_TAG, '(appended to calldata)');
  console.log('URI kind     :', httpsUrl ? `https (${httpsUrl})` : 'data:application/json;base64 (inline)');
  console.log('URI length   :', uri.length, 'chars');

  const celo = await provider.getBalance(AGENT_WALLET);
  console.log('CELO balance :', ethers.formatEther(celo));

  let gas: bigint;
  try {
    gas = await provider.estimateGas({ from: wallet.address, to: REGISTRY, data });
    console.log('Est. gas     :', gas.toString());
  } catch (e: any) {
    console.log('Gas estimate failed:', e?.shortMessage || e?.message);
    gas = 0n;
  }

  if (!send) {
    console.log('\nDRY RUN - nothing sent. Re-run with --send to broadcast this transaction.');
    return;
  }

  console.log('\nBroadcasting...');
  const tx = await wallet.sendTransaction({ to: REGISTRY, data });
  console.log('tx hash      :', tx.hash);
  console.log('explorer     :', `https://celoscan.io/tx/${tx.hash}`);
  const receipt = await tx.wait();
  console.log('status       :', receipt?.status === 1 ? 'SUCCESS' : 'FAILED');
  console.log('block        :', receipt?.blockNumber);
  console.log('\nVerify the tag with: npm run verify-tag --', tx.hash);
}

main().catch((e) => {
  console.error('erc8004 failed:', e);
  process.exit(1);
});
