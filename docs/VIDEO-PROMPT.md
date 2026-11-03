# CeloDesk — Master Hackathon Video Production Prompt
## Premium ~2:50 product film for *Agents on Open Rails* (Celo)

You are acting as a world-class product filmmaker, creative director, documentary-style commercial director, senior motion designer, sound designer, male voiceover director, and a technically rigorous Web3 product storyteller.

Your task is to create a polished, cinematic, **technically accurate** demonstration video for **CeloDesk**, an AI-native stablecoin payment desk built and deployed on **Celo mainnet**.

This is not a request for a storyboard alone. You must inspect the repository, understand the actual product, design the narrative, produce the assets, generate the voiceover, edit and render the video, inspect the finished output, and fix issues before declaring it complete.

The final result should feel like a sophisticated product film from a leading fintech-infrastructure startup — **not** a template hackathon video, a generic blockchain advert, an AI slideshow, or a screen recording with narration.

Primary audience: the *Agents on Open Rails* judges (Ripio x Celo Core Co for LatAm; the Open Corridors / USA₮-x402 and Textile FX sponsors). Secondary audience: developers and other agents who might integrate CeloDesk.

The film must communicate three things:
1. The problem is real and immediately understandable.
2. CeloDesk has a distinctive, **working** solution deployed on Celo mainnet — reachable by humans and by other agents.
3. The product is worth supporting, integrating and building on.

Make it memorable through clarity, storytelling, visual precision and demonstrable functionality — never exaggerated claims or visual effects.

---

# PART 1 — NON-NEGOTIABLE REQUIREMENTS

## Deliverable
- Landscape video, ~**2 min 50 s** (acceptable 2:40–3:05 unless the narrative truly needs otherwise).
- 1920×1080, 16:9, 30 fps, MP4 (H.264 video, AAC audio).
- Clear natural male narration, mixed music, restrained sound design.
- Presentation-ready for a competitive hackathon.

Primary filename: `CeloDesk_AgentsOnOpenRails_Master.mp4`
Output folder: `video/` — keep source assets, narration, music licenses/attribution, render scripts, storyboard and production notes in subfolders.

Do **not** deliver only a script, storyboard, screenshots, or an un-rendered/un-inspected video.

## Mandatory voice direction
**The narrator must sound like a real adult man speaking naturally — not an automated voice assistant.** This is extremely important.

Voice: adult male; natural, warm, grounded, conversational; medium-to-low register without a forced "deep" voice; clear English with a broadly understandable international accent; relaxed confidence; natural breathing and phrasing; genuine emphasis on key words; real variation in pitch, rhythm and sentence length; moderate pace with intentional pauses. It should sound like a knowledgeable founder explaining a product he believes in.

Avoid: robotic TTS cadence; corporate-announcer polish; artificially deep/trailer voices; excessive drama; uniform pitch; every sentence ending on the same downward inflection; unnatural pauses; over-pronounced technical terms; synthetic enthusiasm; an exaggerated American ad accent; call-center AI voices.

### Voice workflow
1. Write the final spoken-English script first.
2. Choose the best natural male voice available in the environment.
3. Test a short passage; inspect/listen if the tools allow.
4. Reject anything robotic, theatrical or synthetic.
5. Generate in manageable sections; keep one consistent voice identity and loudness throughout.
6. Assemble with natural pauses; avoid heavy denoise/reverb/pitch-shift.
7. If no natural-quality voice tool exists, **do not** silently ship an obviously robotic voice and claim success — document the limitation and recommend an alternative.

Never claim a voice "sounds natural" just because synthesis finished.

---

# PART 2 — UNDERSTAND THE PRODUCT BEFORE FILMING

**Repository:** https://github.com/Investorquab/CeloDesk
**Live app:** https://celodesk.xyz
**Telegram agent:** https://t.me/celoagentbot  (`@celoagentbot`)
**MCP endpoint:** https://mcp.celodesk.xyz/mcp
**ERC-8004 agent card:** https://celodesk.xyz/.well-known/agent-card.json
**On-chain proof (tx hashes):** `docs/PROOF.md`

**Celo mainnet — chain ID `42220`.** Attribution tag: `celo_3fce81a170fc`.
**Agent wallet:** `0x00d1E86040d88397F4eB187c38dC527F6659e486`
**ERC-8004 identity:** #9799 on registry `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`
**Disperse (Batch Pay) contract:** `0xD152f549545093347A162Dce210e7293f1452150`
**x402 facilitator:** https://api.x402.celo.org

Before filming, inspect the actual repo and running product: `README.md`, `docs/PROOF.md`, `backend/src/celo/tokens.ts`, `backend/src/routes/{invoices,agent,collections,x402}.ts`, `backend/src/x402/facilitator.ts`, `backend/src/services/attribution.ts`, the frontend (`frontend/app/**`, checkout and `dashboard/batch`), and `mcp/src/index.ts`. **Verify claims against the implementation** — do not assume this brief is perfect.

Create and keep:
- `video/FACTS.md` — separate **verified facts** from unverified claims.
- `video/CAPABILITIES.md` — separate: implemented & demonstrated / implemented but not demonstrated / planned / unsupported.
- `video/STORYBOARD.md`, `video/VOICEOVER.md`, `video/SHOT_LIST.md`.

The video must never present planned work (e.g. the **Textile FX** corridor, which is **not yet shipped**) as a working feature, and must keep the **MiniPay QR** honestly labeled as a *compatible-wallet* QR.

---

# PART 3 — THE CORE STORY

## One line
**CeloDesk is the payment desk you talk to — it invoices, gets you paid directly on Celo, and proves it on-chain, from the web, Telegram or an AI assistant.**

Tagline: **"Ask for payment. Get paid. Know it's paid."**

## The central insight
Money and the people who move it already live in many places — wallets, exchanges, Telegram, and increasingly AI assistants and other agents. But invoicing in crypto is still stitched together by hand, and "paid" too often means "someone said they paid." CeloDesk makes **one agent** that any of those surfaces can drive, settles in **the currency that fits the user** (dollars, local wFIAT, or a USA₮ corridor), and treats a payment as paid **only after verifying it on-chain** — then it can even pay **many independent people at once** in a single transaction, and it carries **its own on-chain identity** so other agents can find and pay it.

Do not make the film about blockchain in the abstract. Make it about the experience CeloDesk makes possible.

## Emotional arc
1. **Recognition:** "Getting paid is the part nobody automated."
2. **Friction:** "Addresses, chasing, FX, four different tools."
3. **Discovery:** "What if you just asked an agent?"
4. **Proof:** "It's real — verified on-chain, in local currency, over a corridor, to many people, with its own identity."
5. **Possibility:** "A payment desk humans and agents can both use, on open rails."

---

# PART 4 — VISUAL CREATIVE DIRECTION

## Concept: THE DESK AND ITS DOORS
The central metaphor is a calm **payment desk** with three doors into it — **web, Telegram, AI/MCP** — all opening onto the **same ledger**. A payment travels from a payer, through the surface the user chose, into the one verified record, and lights up as **PAID**. That single movement — many doors, one verified ledger — is the visual signature. For Batch Pay, invert it: many payees flow into one link, and one transaction fans back out to all of them.

## Brand identity (use the real CeloDesk brand)
- **Warm off-white / cream** background: `#F6F8F7` → `#F2F7F4`
- **CeloDesk green** (primary gradient): `#0B9B70` → `#12B882`; mint accent `#21C997`
- **Deep forest / ink** (dark panels, sidebar): `#0C2B22`, `#0B1C17`, ink `#10221C`
- **Muted green-grey** for secondary text.

Typography:
- **Manrope** — headlines and UI display (tight negative tracking, as in the app).
- **DM Sans** — body/narration captions.
- **JetBrains Mono** — wallet addresses, tx hashes, amounts, code.

Use the existing **`celodesk-logo.png`** mark and the lowercase-friendly "CeloDesk" wordmark. Preserve the current identity; do not invent a new one.

## Style
Aim for: premium fintech filmmaking; restrained cinematic lighting; elegant motion graphics; real, well-composed product UI; precise geometric animation; beautiful typography and negative space; calm, confident pacing; authentic technical evidence. Cream should carry the frame; green/mint provide emphasis, not dominate.

Avoid: generic purple/blue blockchain gradients; neon crypto imagery; floating coins; stock "person at laptop" footage; futuristic cityscapes; glows and holograms; glitch/hacking effects; endless scrolling code; PowerPoint-looking slides; unreadable walls of text. Expensive through **restraint**, not excess.

---

# PART 5 — FILM STRUCTURE (~170 s; adjust timings slightly as narration needs)

## SCENE 1 — HOOK · 0:00–0:12
Start immediately — no multi-second logo intro, no "welcome to our project." On cream, a wallet sends a payment toward a plain invoice that just reads "waiting." A beat.
On-screen: **YOU DID THE WORK.** → **GETTING PAID SHOULDN'T BE THE HARD PART.**
VO: curious, conversational — the problem everyone recognizes.

## SCENE 2 — FRICTION · 0:12–0:33
Show the real mess as a clean accumulating sequence: copy a wallet address → build a request → send it → chase "did you pay?" → hunt the transaction → reconcile it → update a spreadsheet. Then overlay a second tax: a `$` amount being mentally converted to `R$`/pesos and back.
On-screen: **SENDING MONEY IS EASY. KNOWING YOU WERE PAID — AND IN YOUR OWN CURRENCY — IS THE HARD PART.**
No fabricated statistics or countdowns. Keep it brisk.

## SCENE 3 — INTRODUCING CeloDesk · 0:33–0:48
Transition to the product. The CeloDesk mark appears; three doors (web / Telegram / AI) open onto one desk.
On-screen: **CeloDesk** · **Ask for payment. Get paid. Know it's paid.**
VO: introduce CeloDesk as one payment agent you can reach from the web, Telegram, or an AI assistant — all over the same verified ledger. It connects what already exists; it does not replace Celo, wallets or exchanges, and it never holds your money.

## SCENE 4 — THE CORE LOOP (REAL UI) · 0:48–1:16
Prove it works with **actual product screens** from the live app/Telegram (clean captures, no dev tools, no personal data). Demonstrate: a merchant types *"invoice David 5 USDT for website design"* → a real invoice is created → the public pay page with its direct-payment QR → payment confirmed in a wallet → CeloDesk **verifies the Celo transaction** → the invoice flips to **PAID** → the same PAID state read back by Claude (MCP) and by Telegram.
On-screen (small, mono): the verified tx hash / explorer link where available.
VO: the key line — CeloDesk marks a payment paid **only after it verifies it on-chain**; the AI can read that status, never fake it. Prefer existing transaction evidence over sending a new mainnet tx for the camera.

## SCENE 5 — LOCAL CURRENCY, TRACK 1 (Ripio wFIAT) · 1:16–1:33
Show an invoice created and displayed in **wBRL / wARS** — `R$ 1.500,00`, `$ 25.000,00` — on the checkout, the Telegram card, and a "who owes me" summary reported **per currency**.
On-screen: **INVOICE IN THEIR OWN CURRENCY.** · wBRL · wARS · wMXN · wCOP · wCLP · wPEN
VO: for a LatAm merchant, the amount the client sees is the amount quoted — no mental FX, no double spread.

## SCENE 6 — OPEN CORRIDORS, TRACK 2 (USA₮ / x402) · 1:33–1:50
Animate the gasless settlement: payer signs an EIP-3009 authorization off-chain → the **x402 facilitator** submits it and pays gas → **USA₮** moves payer→merchant directly.
On-screen: **CROSS-BORDER. GASLESS FOR THE PAYER. SETTLED IN USA₮.**
VO: an independent party — or another agent — can pay a USA₮ invoice over x402 without holding CELO for gas, and nobody custodies the funds. Keep it conceptually accurate; the facilitator pays and is reimbursed from the payment.

## SCENE 7 — BATCH PAY · 1:50–2:08
Invert the metaphor: one shared link collects submissions from **independent payees** (their own wallets) → the organizer approves the real ones (and can reject with a reason that's emailed back) → **one `disperseToken` transaction** pays everyone at once.
On-screen (mono): the real proof tx `0x637834a…` paying 3 independent wallets · Disperse `0xD152f549…`
VO: real settlement between independent parties, in a single on-chain transaction — available from the web, Telegram and MCP.

## SCENE 8 — IDENTITY & TRUST · 2:08–2:32
Quiet, highly legible layout. Three principles, each true of the deployed system:
1. **A real on-chain identity.** CeloDesk's agent holds **ERC-8004 #9799** on Celo's official registry, with a live agent card (web, MCP, A2A, `x402Support: true`) — so other agents can find and pay it.
2. **Verified, not trusted.** A payment is PAID only after on-chain verification; the AI never writes "paid."
3. **Non-custodial & tagged.** CeloDesk never holds funds or keys, and its agent-wallet transactions carry the `celo_3fce81a170fc` attribution tag — verifiable with `verify-tag`.
Show the identity number, the registry/agent-card link, and one tx hash. Include an honest disclosure, legible but not alarmist: **MiniPay-specific QR testing is pending; the Textile FX corridor is planned, not yet live.** Do not use words like "unhackable" or "guaranteed."

## SCENE 9 — CLOSE · 2:32–2:50
Return to the desk-and-doors metaphor: a payment moves through the chosen door into the one verified ledger and resolves cleanly as PAID (no confetti). Logo + wordmark.
Headline: **ASK FOR PAYMENT. GET PAID. KNOW IT'S PAID.**
Secondary: **Live on Celo mainnet. For humans and agents. Open source.**
End card (readable, restrained): `celodesk.xyz` · `t.me/celoagentbot` · `github.com/Investorquab/CeloDesk`
Leave enough time to read the links. No long thank-you screen.

---

# PART 6 — VOICEOVER WRITING RULES
Write spoken English, not documentation. The narrator is a technically informed founder explaining something useful to a colleague. Use contractions; prefer short sentences and varied rhythm.

Ban phrases like: "in today's rapidly evolving digital landscape," "revolutionizing DeFi," "seamless and frictionless," "unlocking unprecedented opportunities," "the future is here," "game-changing paradigm shift."

Do not read the UI word-for-word or narrate every animation. Target ~330–380 spoken words; calculate real timing and leave breathing room for the demo. Select the few details that best explain the mechanism and prove the implementation — don't force the whole brief into the VO.

Before recording, produce a table: scene · exact narration · estimated duration · visual action · on-screen text · pronunciation notes. Check spoken claims match the footage. Test pronunciation of: "CeloDesk," "Celo," "USDC," "USA-T" (say "U-S-A-T", the USA₮ stablecoin), "wBRL / wARS" (say "w-B-R-L"), "x402" ("x-four-oh-two"), "ERC-8004," "MCP," "Disperse." Never let the voice read full contract addresses or tx hashes aloud — show those on-screen.

---

# PART 7 — MUSIC & SOUND DESIGN
Premium fintech feel: minimal electronic pulse, warm ambient textures, restrained percussion, subtle low-end, a gradual controlled build. No epic orchestral trailer music, no dubstep/cyberpunk. Ambient open; a light rhythmic pulse through the mechanism/demo; a confident, non-explosive resolve at the close.
Tactile, restrained SFX for: invoice created, payment sent, on-chain confirmation, PAID, and the batch fan-out. Mix narration clearly above music; meter levels; avoid clipping, harsh sibilance and abrupt loudness jumps. Use only licensed music; record attribution. No copyrighted commercial tracks without permission.

---

# PART 8 — PRODUCT CAPTURE & MOTION GRAPHICS
Use the live app and repo as the source of truth. Capture real screenshots/recordings (web dashboard, checkout + QR, Telegram card, `dashboard/batch` detail, an MCP client reading an invoice). Hide sensitive info; no dev tools, notifications or unrelated tabs. Don't send unnecessary real mainnet transactions for animation; if a real payment is used, use the smallest amount and get explicit approval first — prefer existing evidence from `docs/PROOF.md`.

Build reusable components for: wallet/exchange, a payment, an invoice, the three doors (web/Telegram/MCP), the verified ledger, the PAID state, the x402 authorization→settle flow, the Disperse fan-out, and the ERC-8004 identity card. Motion must communicate causality (e.g. verification happens *before* PAID). Keep brand palette consistent. Technical labels should reward judges who read them without overwhelming the story.

---

# PART 9 — PROOF & FACTUAL ACCURACY
Verify against the current code/docs before stating. You may cite: the live app, Telegram bot, MCP endpoint, agent card, repo, `docs/PROOF.md`, the ERC-8004 identity/registry, the Disperse contract, the x402 facilitator, and Celoscan links.

**Do not fabricate:** customer counts, volume, adoption, partnerships, revenue, testimonials, audit results, performance numbers, or live-status indicators. Never fake a balance, payment status, tx hash or explorer result. The strongest proof is the product actually working, shown with concise on-screen evidence. Be specific and fair about any comparison; claim no universal superiority.

---

# PART 10 — TECHNICAL PRODUCTION WORKFLOW
First inspect the environment for: browser automation/screen capture, audio generation, video editing/compositing, FFmpeg, SVG/vector animation, audio mixing, frame extraction. Prefer existing dependencies; don't install a large stack without justification. If FFmpeg is available, use it for render/audio assembly; keep scripts and assets organized so the video is regeneratable. Never claim to have generated/listened to audio, or rendered/inspected video, if you did not.

**Workflow:** A) Audit → `FACTS.md`, `CAPABILITIES.md`. B) Narrative → `STORYBOARD.md`, `VOICEOVER.md`, `SHOT_LIST.md` (check timing). C) Voice test → sample, evaluate, revise. D) Visual production → motion assets + real captures + transitions + timeline. E) Render → export the MP4. F) Inspect → extract frames (open, each transition, demo, proof, close); check layout, readability, colors, artifacts, sync, clipping, pacing, duration/codec/res/fps/audio. G) Revise → fix, re-render, re-inspect. Don't treat the first successful render as final if defects remain.

---

# PART 11 — FINAL QUALITY CHECKLIST
**Story:** first 10 s create curiosity; problem is clear without blockchain knowledge; the "verify-before-paid" idea lands; the demo proves real implementation; Track 1 / Track 2 / Batch Pay / ERC-8004 each read as genuinely built; ending is memorable and concise.
**Voice:** adult male, natural cadence, no robotic delivery, correct pronunciation, no rushed technical passages, intelligible over music.
**Visuals:** correct CeloDesk brand/colors/type; no fake screens presented as real; no unreadable code/clutter; smooth intentional transitions; correct wallet/identity/links; high-quality final frame.
**Accuracy:** no unsupported guarantees; no invented metrics; honest MiniPay and Textile-FX status; accurate payment/verification/refund wording; clear line between live and planned.
**Technical:** MP4 plays start-to-finish; correct ratio/res; synced audio; no black frames/gaps; no clipped narration; correct duration; assets and scripts retained.

---

# PART 12 — REQUIRED FINAL DELIVERABLES
1. `CeloDesk_AgentsOnOpenRails_Master.mp4`
2. `FACTS.md` · 3. `CAPABILITIES.md` · 4. `STORYBOARD.md` · 5. `VOICEOVER.md` · 6. `SHOT_LIST.md`
7. A short `README.md` in `video/` explaining how to reproduce the video.
8. The voiceover audio file.
9. The editable/regeneratable project and supporting assets, where practical.

At completion, report: exact output path; actual duration; resolution/fps; audio format; voice method; whether narration was actually auditioned; which product flows were shown; which claims were verified; what remains unverified; whether the rendered video was inspected; any remaining limitations. If something couldn't be completed, say so plainly and provide the best available deliverable. Do not claim success for work not actually performed.

---

# FINAL CREATIVE DIRECTION
Make the film feel like a product that should already exist. CeloDesk's story isn't that blockchain is revolutionary — it's that people already get paid in stablecoins, already live across wallets, chats and AI assistants, and already think in their own currency, and CeloDesk makes all of that work as one simple payment desk that proves every payment on-chain. Show the friction. Reveal the one-agent-many-doors idea. Prove it works — in dollars, in local currency, over a corridor, to many people, with a real on-chain identity. End with the sense that this is infrastructure humans and agents can both build on. Throughout, the narrator should sound like a real person who understands the problem — not a machine reading a script.
