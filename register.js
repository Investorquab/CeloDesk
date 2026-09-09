/**
 * Mints your ERC-8004 Agent ID on Celo mainnet using the real
 * @chaoschain/sdk v0.3.3 API (ChaosChainSDK class + registerIdentity()).
 *
 * SETUP:
 * 1. npm install @chaoschain/sdk ethers dotenv   (you've already done this)
 * 2. .env must contain: PRIVATE_KEY=your_wallet_private_key_here
 *    NEVER commit .env — it's already in .gitignore.
 * 3. Wallet 0x00d1E86040d88397F4eB187c38dC527F6659e486 needs a small
 *    amount of real CELO in it to cover gas.
 *
 * RUN:
 *   npm run register
 *   (or: node register.js)
 */

require('dotenv').config();
const { ChaosChainSDK, NetworkConfig, AgentRole } = require('@chaoschain/sdk');

async function main() {
  if (!process.env.PRIVATE_KEY) {
    throw new Error(
      'Missing PRIVATE_KEY in .env — add it before running this script.'
    );
  }

  const sdk = new ChaosChainSDK({
    agentName: 'CeloDesk',
    // Placeholder domain — swap this for your real bot/site URL once you
    // have one; update later with sdk.updateAgentMetadata(agentId, {...}).
    agentDomain: 'CeloDesk.example.com',
    agentRole: AgentRole.WORKER,
    network: NetworkConfig.CELO_MAINNET,
    privateKey: process.env.PRIVATE_KEY,
    rpcUrl: 'https://forno.celo.org', // Celo mainnet public RPC
  });

  console.log('Registering agent from wallet:', sdk.getAddress());

  const { agentId, txHash } = await sdk.registerIdentity();

  console.log('✅ Agent registered!');
  console.log('Your ERC-8004 Agent ID:', agentId);
  console.log('Transaction hash:', txHash);
  console.log(
    'Verify it at: https://8004scan.io — search your wallet address or "CeloDesk"'
  );

  // Optional: fill in richer metadata now that you're registered.
  await sdk.updateAgentMetadata(agentId, {
    name: 'CeloDesk',
    description:
      'Telegram-based stablecoin payments agent on Celo, built for the Agents at Work Hackathon (Real World Adoption track).',
    capabilities: ['payments', 'telegram'],
    supportedTrust: ['reputation'],
  });
  console.log('✅ Metadata updated.');
}

main().catch((err) => {
  console.error('❌ Registration failed:', err);
  process.exit(1);
});
