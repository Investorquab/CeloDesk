# CeloDesk Demo Video

A temporary, code-driven product demo for the CeloDesk hackathon submission.

## What it shows

- Invoice creation
- Direct ERC-681 payment-request QR
- Customer wallet to Celo to merchant payment flow
- On-chain payment verification
- VIEWED to PAID state transition
- Web, Telegram and Claude/MCP surfaces
- ERC-8004 Agent ID #9799

The video uses illustrated UI instead of depending on screenshots. This keeps the demo portable and makes the product workflow easy to understand.

## Run

Requirements: Node.js 18+ and npm.

    cd demo-video
    npm install
    npm run start

Render:

    npm run render

Output:

    demo-video/out/celodesk-demo.mp4

Higher-quality H.264 render:

    npm run render:pro

## Voice-over

See VOICEOVER.md. Generate the narration with the TTS tool already available on the creator PC, then combine it with the rendered video.

Do not commit API keys, generated audio or the final MP4.

## Important

The QR shown in this animation is an illustration only. It is not a real payment QR.

The real CeloDesk product uses a direct ERC-681 payment request for compatible wallet scanners.

## Temporary branch

This project lives on the demo/celodesk-video branch.

After the final video is rendered and approved locally, delete the entire demo-video directory from the repository before final hackathon submission.
