import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

const BASE_URL = 'https://mcp.185-7-81-139.sslip.io';
const RESOURCE_URL = `${BASE_URL}/mcp`;

const BACKEND_API_URL =
  process.env.BACKEND_API_URL || 'http://127.0.0.1:3001';

const CLAUDE_WEB_CLIENT_ID =
  'https://claude.ai/oauth/mcp-oauth-client-metadata';

const CLAUDE_CODE_CLIENT_ID =
  'https://claude.ai/oauth/claude-code-client-metadata';

const CLAUDE_WEB_REDIRECT =
  'https://claude.ai/api/mcp/auth_callback';

type PendingAuthorization = {
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  scope: string;
  resource: string;
  merchantId: string;
  walletAddress: string;
  expiresAt: number;
};

const authorizationCodes = new Map<string, PendingAuthorization>();

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

function getSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('Missing JWT_SECRET in environment');
  }

  return secret;
}

function getLegacyToken(): string {
  const token = process.env.CELODESK_MCP_TOKEN;

  if (!token) {
    throw new Error('Missing CELODESK_MCP_TOKEN in environment');
  }

  return token;
}

function htmlEscape(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function value(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function clientAndRedirectAllowed(
  clientId: string,
  redirectUri: string,
): boolean {
  if (clientId === CLAUDE_WEB_CLIENT_ID) {
    return redirectUri === CLAUDE_WEB_REDIRECT;
  }

  if (clientId === CLAUDE_CODE_CLIENT_ID) {
    try {
      const url = new URL(redirectUri);

      return (
        (url.hostname === 'localhost' ||
          url.hostname === '127.0.0.1') &&
        url.pathname === '/callback' &&
        (url.protocol === 'http:' || url.protocol === 'https:')
      );
    } catch {
      return false;
    }
  }

  return false;
}

function renderConsentPage(params: {
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
  scope: string;
  resource: string;
}): string {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Connect CeloDesk</title>
  <style>
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      background: #071c14;
      color: #f5fff9;
      font-family: Inter, system-ui, sans-serif;
    }
    .card {
      width: min(430px, calc(100% - 40px));
      box-sizing: border-box;
      padding: 32px;
      border-radius: 22px;
      background: #0d2a20;
      border: 1px solid rgba(255,255,255,.1);
      box-shadow: 0 24px 80px rgba(0,0,0,.35);
    }
    .logo {
      width: 52px;
      height: 52px;
      border-radius: 14px;
      background: #14b866;
      display: grid;
      place-items: center;
      font-weight: 900;
      font-size: 25px;
      margin-bottom: 22px;
    }
    h1 { margin: 0 0 10px; font-size: 25px; }
    p { color: #b7cfc5; line-height: 1.55; }
    .scope {
      margin: 22px 0;
      padding: 14px;
      border-radius: 12px;
      background: rgba(255,255,255,.05);
    }
    button {
      width: 100%;
      border: 0;
      border-radius: 12px;
      padding: 14px;
      background: #20c878;
      color: #062015;
      font-weight: 800;
      cursor: pointer;
      font-size: 15px;
    }
    .small {
      font-size: 12px;
      color: #829e92;
      word-break: break-word;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">C</div>
    <h1>Connect CeloDesk</h1>
    <p>
      Claude is requesting permission to use CeloDesk
      to create and manage your business payment invoices.
    </p>

    <form id="consentForm" method="POST" action="/authorize">
      <input type="hidden" name="client_id" value="${htmlEscape(params.clientId)}">
      <input type="hidden" name="redirect_uri" value="${htmlEscape(params.redirectUri)}">
      <input type="hidden" name="state" value="${htmlEscape(params.state)}">
      <input type="hidden" name="code_challenge" value="${htmlEscape(params.codeChallenge)}">
      <input type="hidden" name="scope" value="${htmlEscape(params.scope)}">
      <input type="hidden" name="resource" value="${htmlEscape(params.resource)}">
      <input type="hidden" name="message" id="walletMessage">
      <input type="hidden" name="typedData" id="walletTypedData">
      <input type="hidden" name="signature" id="walletSignature">

      <div style="margin:22px 0">
        <label
          for="walletAddress"
          style="display:block;font-weight:700;margin-bottom:8px"
        >
          Payment wallet
        </label>

        <input
          id="walletAddress"
          name="walletAddress"
          type="text"
          inputmode="text"
          autocomplete="off"
          placeholder="0x..."
          required
          style="width:100%;box-sizing:border-box;padding:13px 14px;border-radius:12px;border:1px solid rgba(255,255,255,.14);background:#071c14;color:#f5fff9;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13px"
        >

        <p class="small" style="margin:8px 0 0">
          Payments for invoices created through CeloDesk will be received by
          this wallet. CeloDesk never asks for your private key.
        </p>
      </div>

      <div class="scope">
        <strong>Permission requested</strong>
        <p class="small">
          Create invoices, check invoice status, list invoices,
          view payment summaries, and view your merchant profile.
        </p>
      </div>

      <button type="submit">Allow CeloDesk</button>
    </form>

    <p class="small" style="margin-top:18px">
      Connected service: ${htmlEscape(BASE_URL)}
    </p>
  </div>
<script>
  const form = document.getElementById('consentForm');
  let signingInProgress = false;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (signingInProgress) return;
    signingInProgress = true;

    const submitButton = form.querySelector('button[type="submit"]');
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Waiting for wallet...';
      submitButton.style.opacity = '0.7';
      submitButton.style.cursor = 'wait';
    }

    async function getWalletProvider() {
      const candidates = [];
      const seen = new Set();

      const addProvider = (provider, info) => {
        if (!provider || typeof provider.request !== 'function' || seen.has(provider)) return;
        seen.add(provider);
        candidates.push({ provider, info: info || null });
      };

      if (Array.isArray(window.ethereum && window.ethereum.providers)) {
        window.ethereum.providers.forEach((provider) => addProvider(provider));
      }
      addProvider(window.ethereum);

      // Discover injected wallets with EIP-6963. Prefer MetaMask by its
      // standardized rdns identifier so another wallet cannot impersonate
      // the legacy isMetaMask flag.
      if (window.addEventListener && window.dispatchEvent) {
        await new Promise((resolve) => {
          let settled = false;
          const finish = () => {
            if (settled) return;
            settled = true;
            window.removeEventListener('eip6963:announceProvider', onAnnounce);
            resolve();
          };
          const onAnnounce = (event) => {
            const detail = event && event.detail;
            if (detail && detail.provider) {
              addProvider(detail.provider, detail.info);
            }
          };
          window.addEventListener('eip6963:announceProvider', onAnnounce);
          window.dispatchEvent(new Event('eip6963:requestProvider'));
          setTimeout(finish, 500);
        });
      }

      const metamask = candidates.find(({ provider, info }) =>
        info && info.rdns === 'io.metamask'
      );
      if (metamask) return metamask.provider;

      const legacyMetaMask = candidates.find(
        ({ provider }) => provider.isMetaMask === true,
      );
      if (legacyMetaMask) return legacyMetaMask.provider;

      return candidates[0] ? candidates[0].provider : null;
    }

    function resetSubmitButton() {
      signingInProgress = false;
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = 'Allow CeloDesk';
        submitButton.style.opacity = '1';
        submitButton.style.cursor = 'pointer';
      }
    }

    const ethereum = await getWalletProvider();
    if (!ethereum || typeof ethereum.request !== 'function') {
      resetSubmitButton();
      alert('Please open this authorization page in MetaMask or MiniPay so CeloDesk can verify wallet ownership.');
      return;
    }

    try {
      const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
      const wallet = accounts && accounts[0];
      if (!wallet) throw new Error('No wallet account selected.');

      const activeAccounts = await ethereum.request({ method: 'eth_accounts' });
      const activeWallet = activeAccounts && activeAccounts[0];
      if (!activeWallet) throw new Error('No active wallet account found.');
      if (activeWallet.toLowerCase() !== wallet.toLowerCase()) {
        throw new Error('The selected wallet changed. Please try again.');
      }

      const input = document.getElementById('walletAddress');
      input.value = wallet;
      const timestamp = new Date().toISOString();
      const chainId = await ethereum.request({ method: 'eth_chainId' });
      const typedData = {
        types: {
          Authorization: [
            { name: 'wallet', type: 'address' },
            { name: 'clientId', type: 'string' },
            { name: 'redirectUri', type: 'string' },
            { name: 'state', type: 'string' },
            { name: 'timestamp', type: 'string' },
          ],
        },
        primaryType: 'Authorization',
        domain: {
          name: 'CeloDesk MCP',
          version: '1',
          chainId,
        },
        message: {
          wallet,
          clientId: ${JSON.stringify(params.clientId)},
          redirectUri: ${JSON.stringify(params.redirectUri)},
          state: ${JSON.stringify(params.state)},
          timestamp,
        },
      };

      const message = 'CeloDesk MCP authorization\\nWallet: ' + wallet + '\\nClient: ' + ${JSON.stringify(params.clientId)} + '\\nRedirect: ' + ${JSON.stringify(params.redirectUri)} + '\\nState: ' + ${JSON.stringify(params.state)} + '\\nTimestamp: ' + timestamp;
      const typedDataJson = JSON.stringify(typedData);

      const signature = await ethereum.request({
        method: 'eth_signTypedData_v4',
        params: [wallet, typedDataJson],
      });

      document.getElementById('walletMessage').value = message;
      document.getElementById('walletTypedData').value = typedDataJson;
      document.getElementById('walletSignature').value = signature;

      const finalAccounts = await ethereum.request({ method: 'eth_accounts' });
      const finalWallet = finalAccounts && finalAccounts[0];
      if (!finalWallet || finalWallet.toLowerCase() !== wallet.toLowerCase()) {
        throw new Error('The wallet changed while signing. Please try again.');
      }

      form.submit();

    } catch (error) {
      resetSubmitButton();
      alert(error && error.message ? error.message : 'Wallet authorization was cancelled.');
    }
  });
</script>
</body>
</html>`;
}

function issueAccessToken(
  clientId: string,
  scope: string,
  merchantId: string,
): string {
  return jwt.sign(
    {
      typ: 'at+jwt',
      client_id: clientId,
      scope,
    },
    getSecret(),
    {
      algorithm: 'HS256',
      issuer: BASE_URL,
      audience: RESOURCE_URL,
      subject: merchantId,
      expiresIn: '1h',
    },
  );
}

export function authenticateOAuthBearer(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const authorization = req.headers.authorization || '';

  if (!authorization.startsWith('Bearer ')) {
    res
      .status(401)
      .set(
        'WWW-Authenticate',
        `Bearer error="invalid_token", resource_metadata="${BASE_URL}/.well-known/oauth-protected-resource/mcp", scope="mcp"`,
      )
      .json({
        error: 'invalid_token',
        error_description: 'Authentication required',
      });

    return;
  }

  const token = authorization.slice('Bearer '.length).trim();

  // Keep the existing server-to-server MCP token working.
  const legacy = getLegacyToken();

  if (
    token.length === legacy.length &&
    crypto.timingSafeEqual(
      Buffer.from(token),
      Buffer.from(legacy),
    )
  ) {
    next();
    return;
  }

  try {
    const decoded = jwt.verify(token, getSecret(), {
      algorithms: ['HS256'],
      issuer: BASE_URL,
      audience: RESOURCE_URL,
    });

    if (typeof decoded === 'string') {
      throw new Error('Invalid access token');
    }

    if (typeof decoded.sub !== 'string' || !decoded.sub) {
      throw new Error('Invalid merchant');
    }

    res.locals.merchantId = decoded.sub;

    const scopes =
      typeof decoded.scope === 'string'
        ? decoded.scope.split(' ').filter(Boolean)
        : [];

    if (!scopes.includes('mcp')) {
      res
        .status(403)
        .set(
          'WWW-Authenticate',
          `Bearer error="insufficient_scope", scope="mcp", resource_metadata="${BASE_URL}/.well-known/oauth-protected-resource/mcp"`,
        )
        .json({
          error: 'insufficient_scope',
          error_description: 'The mcp scope is required',
        });

      return;
    }

    next();
  } catch {
    res
      .status(401)
      .set(
        'WWW-Authenticate',
        `Bearer error="invalid_token", resource_metadata="${BASE_URL}/.well-known/oauth-protected-resource/mcp", scope="mcp"`,
      )
      .json({
        error: 'invalid_token',
        error_description: 'Invalid or expired access token',
      });
  }
}

export function mountOAuthRoutes(app: any): void {
  const protectedResourceMetadata = {
    resource: RESOURCE_URL,
    authorization_servers: [BASE_URL],
    bearer_methods_supported: ['header'],
    scopes_supported: ['mcp'],
  };

  const authorizationServerMetadata = {
    issuer: BASE_URL,
    authorization_endpoint: `${BASE_URL}/authorize`,
    token_endpoint: `${BASE_URL}/token`,
    scopes_supported: ['mcp'],
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code'],
    token_endpoint_auth_methods_supported: ['none'],
    code_challenge_methods_supported: ['S256'],
    client_id_metadata_document_supported: true,
  };

  app.get(
    '/.well-known/oauth-protected-resource',
    (_req: Request, res: Response) => {
      res.json(protectedResourceMetadata);
    },
  );

  app.get(
    '/.well-known/oauth-protected-resource/mcp',
    (_req: Request, res: Response) => {
      res.json(protectedResourceMetadata);
    },
  );

  app.get(
    '/.well-known/oauth-authorization-server',
    (_req: Request, res: Response) => {
      res.json(authorizationServerMetadata);
    },
  );

  app.get('/authorize', (req: Request, res: Response) => {
    const clientId = value(req.query.client_id);
    const redirectUri = value(req.query.redirect_uri);
    const responseType = value(req.query.response_type);
    const state = value(req.query.state) || '';
    const codeChallenge = value(req.query.code_challenge);
    const codeChallengeMethod = value(req.query.code_challenge_method);
    const resource = value(req.query.resource) || RESOURCE_URL;
    const requestedScope = value(req.query.scope) || 'mcp';

    if (!clientId || !redirectUri) {
      res.status(400).send('Missing client_id or redirect_uri');
      return;
    }

    if (!clientAndRedirectAllowed(clientId, redirectUri)) {
      res.status(400).send('Invalid client or redirect URI');
      return;
    }

    if (responseType !== 'code') {
      res.status(400).send('Unsupported response_type');
      return;
    }

    if (!codeChallenge || codeChallengeMethod !== 'S256') {
      res.status(400).send('PKCE S256 is required');
      return;
    }

    if (resource !== RESOURCE_URL) {
      res.status(400).send('Invalid resource');
      return;
    }

    const scopes = requestedScope.split(' ').filter(Boolean);

    if (scopes.some((scope) => scope !== 'mcp')) {
      res.status(400).send('Invalid scope');
      return;
    }

    res
      .set('Cache-Control', 'no-store, no-cache, must-revalidate')
      .set('Pragma', 'no-cache')
      .set('Expires', '0')
      .type('html')
      .send(
        renderConsentPage({
          clientId,
          redirectUri,
          state,
          codeChallenge,
          scope: 'mcp',
          resource,
        }),
      );
  });

  app.post('/authorize', async (req: Request, res: Response) => {
    const clientId = value(req.body.client_id);
    const redirectUri = value(req.body.redirect_uri);
    const state = value(req.body.state) || '';
    const codeChallenge = value(req.body.code_challenge);
    const scope = value(req.body.scope) || 'mcp';
    const resource = value(req.body.resource) || RESOURCE_URL;
    const walletAddress = value(req.body.walletAddress);

    if (!clientId || !redirectUri || !codeChallenge || !walletAddress) {
      res.status(400).send('Wallet address is required.');
      return;
    }

    if (!clientAndRedirectAllowed(clientId, redirectUri)) {
      res.status(400).send('Invalid client or redirect URI');
      return;
    }

    if (resource !== RESOURCE_URL || scope !== 'mcp') {
      res.status(400).send('Invalid authorization request');
      return;
    }

    let identity: {
      merchantId: string;
      walletAddress: string;
      created: boolean;
    };

    try {
      const authMessage = value(req.body.message) || '';
      const authSignature = value(req.body.signature) || '';

      console.log('[MCP AUTH DEBUG] outbound', {
        walletAddress,
        messageLength: authMessage.length,
        signatureLength: authSignature.length,
        messageHash: sha256(authMessage),
        signatureHash: sha256(authSignature),
      });

      const response = await fetch(
        `${BACKEND_API_URL}/api/auth/mcp-wallet`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-celodesk-mcp-token': getLegacyToken(),
          },
          body: JSON.stringify({
            walletAddress,
            message: authMessage,
            typedData: value(req.body.typedData) || '',
            signature: authSignature,
            clientId,
            redirectUri,
            state,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        res.status(400).send(
          typeof data?.error === 'string'
            ? data.error
            : 'Unable to connect this wallet to CeloDesk.',
        );
        return;
      }

      identity = data;
    } catch (error) {
      console.error(
        '[OAUTH] wallet identity resolution failed',
        error,
      );

      res
        .status(503)
        .send(
          'CeloDesk is temporarily unavailable. Please try again.',
        );

      return;
    }

    const code = crypto.randomBytes(32).toString('base64url');

    authorizationCodes.set(code, {
      clientId,
      redirectUri,
      codeChallenge,
      scope,
      resource,
      merchantId: identity.merchantId,
      walletAddress: identity.walletAddress,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    const cleanupTimer = setTimeout(() => {
      authorizationCodes.delete(code);
    }, 5 * 60 * 1000);

    cleanupTimer.unref();

    const callback = new URL(redirectUri);
    callback.searchParams.set('code', code);

    if (state) {
      callback.searchParams.set('state', state);
    }

    res.redirect(callback.toString());
  });

  app.post('/token', (req: Request, res: Response) => {
    const grantType = value(req.body.grant_type);
    const code = value(req.body.code);
    const redirectUri = value(req.body.redirect_uri);
    const clientId = value(req.body.client_id);
    const codeVerifier = value(req.body.code_verifier);
    const resource = value(req.body.resource);

    res.set('Cache-Control', 'no-store');

    if (grantType !== 'authorization_code') {
      res.status(400).json({
        error: 'unsupported_grant_type',
      });
      return;
    }

    if (
      !code ||
      !redirectUri ||
      !clientId ||
      !codeVerifier ||
      !resource
    ) {
      res.status(400).json({
        error: 'invalid_request',
        error_description: 'Missing required token parameters',
      });
      return;
    }

    const pending = authorizationCodes.get(code);

    if (!pending) {
      res.status(400).json({
        error: 'invalid_grant',
        error_description: 'Invalid or expired authorization code',
      });
      return;
    }

    authorizationCodes.delete(code);

    if (pending.expiresAt < Date.now()) {
      res.status(400).json({
        error: 'invalid_grant',
        error_description: 'Authorization code expired',
      });
      return;
    }

    if (
      pending.clientId !== clientId ||
      pending.redirectUri !== redirectUri ||
      pending.resource !== resource
    ) {
      res.status(400).json({
        error: 'invalid_grant',
        error_description: 'Authorization binding mismatch',
      });
      return;
    }

    const challenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');

    if (challenge !== pending.codeChallenge) {
      res.status(400).json({
        error: 'invalid_grant',
        error_description: 'PKCE verification failed',
      });
      return;
    }

    const accessToken = issueAccessToken(
      pending.clientId,
      pending.scope,
      pending.merchantId,
    );

    res.json({
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 3600,
      scope: pending.scope,
    });
  });
}
