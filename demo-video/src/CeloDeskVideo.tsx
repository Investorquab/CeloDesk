import React from "react";
import {
  AbsoluteFill,
  Audio,
  Easing,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
} from "remotion";

const BG = "#FFFFFF";
const PANEL = "#F5F8F6";
const PANEL_2 = "#EDF3F0";
const TEXT = "#10211D";
const MUTED = "#60736B";
const CELO = "#fbf76a";
const GREEN = "#149B63";
const RED = "#C55353";
const BLUE = "#3977B8";

const mono = "'SFMono-Regular', 'Roboto Mono', 'Cascadia Code', monospace";
const useVoiceover = process.env.CELODESK_VOICEOVER === "1";

const sans = "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

function FadeIn({ children, delay = 0, y = 18 }: { children: React.ReactNode; delay?: number; y?: number }) {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame - delay, [0, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const translate = interpolate(frame - delay, [0, 18], [y, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  return <div style={{ opacity, transform: "translateY(" + translate + "px)" }}>{children}</div>;
}

function Pill({ children, active = false }: { children: React.ReactNode; active?: boolean }) {
  return (
    <div style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      padding: "8px 13px",
      borderRadius: 999,
      background: active ? "rgba(251,247,106,.28)" : "#F3F6F4",
      border: "1px solid " + (active ? "rgba(176,168,40,.45)" : "#DCE5E0"),
      color: active ? CELO : MUTED,
      fontSize: 16,
      fontWeight: 650,
    }}>
      {children}
    </div>
  );
}

function Logo({ small = false }: { small?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: small ? 10 : 14 }}>
      <div style={{
        width: small ? 34 : 46,
        height: small ? 34 : 46,
        borderRadius: 12,
        display: "grid",
        placeItems: "center",
        background: CELO,
        color: "#182018",
        fontWeight: 950,
        fontSize: small ? 18 : 25,
      }}>C</div>
      <div style={{ fontSize: small ? 21 : 29, fontWeight: 850, letterSpacing: -1 }}>CeloDesk</div>
    </div>
  );
}

function Background() {
  const frame = useCurrentFrame();
  const drift = interpolate(frame, [0, 1890], [0, -80]);
  return (
    <AbsoluteFill style={{ background: BG, color: TEXT, fontFamily: sans, overflow: "hidden" }}>
      <div style={{
        position: "absolute", inset: -120,
        background: "radial-gradient(circle at 18% 18%, rgba(251,247,106,.20), transparent 24%), radial-gradient(circle at 86% 70%, rgba(20,155,99,.08), transparent 28%)",
        transform: "translateY(" + drift + "px)",
      }} />
      <div style={{
        position: "absolute", inset: 0, opacity: .55,
        backgroundImage: "linear-gradient(rgba(16,33,29,.055) 1px, transparent 1px), linear-gradient(90deg, rgba(16,33,29,.055) 1px, transparent 1px)",
        backgroundSize: "48px 48px",
      }} />
    </AbsoluteFill>
  );
}

function Header() {
  return (
    <div style={{ position: "absolute", top: 54, left: 72, right: 72, display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 5 }}>
      <Logo small />
      <div style={{ display: "flex", gap: 10 }}>
        <Pill active>Celo Mainnet</Pill>
        <Pill>AI payment desk</Pill>
      </div>
    </div>
  );
}

function SceneMark({label}:{label:string}) {
  return (
    <div style={{position:"absolute", left:74, right:74, bottom:34, display:"flex", justifyContent:"space-between", alignItems:"center", fontFamily:mono, fontSize:11, letterSpacing:1.2, color:MUTED}}>
      <span>CELODESK / PRODUCT FILM</span><span>{label}</span>
    </div>
  );
}

function TitleScene() {
  const frame = useCurrentFrame();
  const scale = spring({ frame, fps: 30, config: { damping: 16, stiffness: 90 } });
  return (
    <AbsoluteFill style={{ background: BG, color: TEXT, fontFamily: sans, overflow: "hidden" }}>
      <Header />
      <div style={{ position: "absolute", left: 100, top: 245, width: 1100 }}>
        <FadeIn><div style={{ color: CELO, fontFamily: mono, fontSize: 18, letterSpacing: 3, fontWeight: 700 }}>PAYMENTS, BUT CONNECTED</div></FadeIn>
        <div style={{ transform: "scale(" + (0.94 + scale * 0.06) + ")", transformOrigin: "left center" }}>
          <FadeIn delay={10} y={30}>
            <div style={{ marginTop: 18, fontSize: 88, lineHeight: 1.02, letterSpacing: -4, fontWeight: 900 }}>
              Turn a payment<br />
              request into a<br />
              <span style={{ color: CELO }}>verified payment.</span>
            </div>
          </FadeIn>
        </div>
        <FadeIn delay={35}>
          <div style={{ marginTop: 34, maxWidth: 820, color: MUTED, fontSize: 25, lineHeight: 1.45 }}>
            CeloDesk gives businesses one payment workflow across the web, Telegram and Claude — backed by live on-chain state.
          </div>
        </FadeIn>
      </div>
      <div style={{ position: "absolute", right: 120, bottom: 105 }}>
        <FadeIn delay={55}><div style={{ fontFamily: mono, fontSize: 18, color: MUTED }}>celo / 42220 / stablecoins</div></FadeIn>
      </div>
    </AbsoluteFill>
  );
}

function ProblemScene() {
  const cards = [
    ["01", "Invoice", "Created somewhere"],
    ["02", "Payment", "Sent from a wallet"],
    ["03", "Status", "Someone checks manually"],
  ];
  return (
    <AbsoluteFill style={{ background: BG, color: TEXT, fontFamily: sans, overflow: "hidden" }}>
      <Header />
      <div style={{ position: "absolute", top: 170, left: 90, right: 90 }}>
        <FadeIn><div style={{ fontFamily: mono, color: RED, fontSize: 17, letterSpacing: 2 }}>THE OLD WORKFLOW</div></FadeIn>
        <FadeIn delay={8}><div style={{ fontSize: 54, fontWeight: 850, marginTop: 14, letterSpacing: -2 }}>A payment can happen before your tools know it happened.</div></FadeIn>
        <div style={{ display: "flex", gap: 22, marginTop: 52 }}>
          {cards.map(([n, title, sub], i) => (
            <FadeIn key={n} delay={25 + i * 12}>
              <div style={{ width: 340, height: 190, borderRadius: 20, padding: 26, background: PANEL, border: "1px solid #DCE5E0" }}>
                <div style={{ color: MUTED, fontFamily: mono }}>{n}</div>
                <div style={{ fontSize: 29, fontWeight: 800, marginTop: 20 }}>{title}</div>
                <div style={{ color: MUTED, marginTop: 10, fontSize: 18 }}>{sub}</div>
              </div>
            </FadeIn>
          ))}
        </div>
        <FadeIn delay={70}><div style={{ marginTop: 40, fontFamily: mono, color: CELO, fontSize: 20 }}>CeloDesk closes that loop.</div></FadeIn>
      </div>
    </AbsoluteFill>
  );
}

function InvoiceCard() {
  return (
    <div style={{
      width: 520, borderRadius: 24, padding: 28,
      background: "#FFFFFF",
      border: "1px solid #DCE5E0",
      boxShadow: "0 30px 80px rgba(16,33,29,.12)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ color: MUTED, fontFamily: mono, fontSize: 14 }}>INVOICE #CD-1042</span>
        <Pill active>SENT</Pill>
      </div>
      <div style={{ fontSize: 48, fontWeight: 900, marginTop: 28 }}>$25.00 <span style={{ color: CELO, fontSize: 24 }}>USDC</span></div>
      <div style={{ color: MUTED, fontSize: 18, marginTop: 8 }}>To David • Software service</div>
      <div style={{ marginTop: 28, display: "flex", gap: 12 }}>
        <div style={{ flex: 1, padding: 14, borderRadius: 14, background: "#F3F6F4" }}>
          <div style={{ color: MUTED, fontSize: 12 }}>NETWORK</div><div style={{ fontFamily: mono, marginTop: 6 }}>Celo • 42220</div>
        </div>
        <div style={{ flex: 1, padding: 14, borderRadius: 14, background: "#F3F6F4" }}>
          <div style={{ color: MUTED, fontSize: 12 }}>REQUEST</div><div style={{ fontFamily: mono, marginTop: 6 }}>ERC-681</div>
        </div>
      </div>
    </div>
  );
}

function FakeQR() {
  const cells = Array.from({ length: 13 * 13 }, (_, i) => {
    const x = i % 13, y = Math.floor(i / 13);
    const finder = (ox: number, oy: number) => x >= ox && x < ox + 5 && y >= oy && y < oy + 5;
    if (finder(0, 0) || finder(8, 0) || finder(0, 8)) {
      const ox = x < 5 ? 0 : x >= 8 ? 8 : 0;
      const oy = y < 5 ? 0 : 8;
      const dx = x - ox, dy = y - oy;
      return dx === 0 || dx === 4 || dy === 0 || dy === 4 || (dx === 2 && dy === 2);
    }
    return ((x * 17 + y * 31 + x * y) % 7) < 3;
  });
  return (
    <div style={{ width: 250, height: 250, padding: 14, borderRadius: 18, background: "#fff", display: "grid", gridTemplateColumns: "repeat(13,1fr)", gap: 2 }}>
      {cells.map((on, i) => <div key={i} style={{ background: on ? "#0a1714" : "#fff" }} />)}
    </div>
  );
}

function CreateScene() {
  return (
    <AbsoluteFill style={{ background: BG, color: TEXT, fontFamily: sans, overflow: "hidden" }}>
      <Header />
      <div style={{ position: "absolute", top: 165, left: 90, right: 90, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ width: 700 }}>
          <FadeIn><div style={{ color: "#8A841D", fontFamily: mono, fontSize: 16, letterSpacing: 2 }}>STEP 01 / CREATE</div></FadeIn>
          <FadeIn delay={10}><div style={{ fontSize: 58, fontWeight: 900, marginTop: 15, letterSpacing: -2 }}>Create an invoice.</div></FadeIn>
          <FadeIn delay={25}><div style={{ color: MUTED, fontSize: 23, lineHeight: 1.5, marginTop: 22 }}>CeloDesk creates the invoice, recipient details and a direct payment request.</div></FadeIn>
          <FadeIn delay={42}><div style={{ marginTop: 34, display: "flex", gap: 10 }}><Pill active>USDC</Pill><Pill>USDm</Pill><Pill>USDT</Pill></div></FadeIn>
        </div>
        <FadeIn delay={30}><InvoiceCard /></FadeIn>
      </div>
    </AbsoluteFill>
  );
}

function QRScene() {
  const frame = useCurrentFrame();
  const glow = interpolate(Math.sin(frame / 9), [-1, 1], [.96, 1.02]);
  return (
    <AbsoluteFill style={{ background: BG, color: TEXT, fontFamily: sans, overflow: "hidden" }}>
      <Header />
      <div style={{ position: "absolute", top: 170, left: 90, right: 90, display: "flex", justifyContent: "center", gap: 100, alignItems: "center" }}>
        <FadeIn>
          <div>
            <div style={{ color: "#8A841D", fontFamily: mono, fontSize: 16, letterSpacing: 2 }}>STEP 02 / REQUEST</div>
            <div style={{ fontSize: 56, fontWeight: 900, marginTop: 15, letterSpacing: -2 }}>Scan. Confirm. Pay.</div>
            <div style={{ width: 560, color: MUTED, fontSize: 22, lineHeight: 1.5, marginTop: 22 }}>The QR is a direct ERC-681 payment request — not an invoice website link.</div>
            <div style={{ marginTop: 30, fontFamily: mono, fontSize: 16, color: GREEN }}>wallet → token transfer → merchant wallet</div>
          </div>
        </FadeIn>
        <FadeIn delay={18}>
          <div style={{ transform: "scale(" + glow + ")", filter: "drop-shadow(0 0 35px rgba(251,247,106,.18))" }}>
            <FakeQR />
            <div style={{ textAlign: "center", marginTop: 16, color: MUTED, fontFamily: mono }}>ILLUSTRATED PAYMENT REQUEST</div>
          </div>
        </FadeIn>
      </div>
    </AbsoluteFill>
  );
}

function TransactionScene() {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [10, 100], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
  const x = interpolate(p, [0, 1], [120, 1640]);
  return (
    <AbsoluteFill style={{ background: BG, color: TEXT, fontFamily: sans, overflow: "hidden" }}>
      <Header />
      <div style={{ position: "absolute", top: 160, left: 90, right: 90 }}>
        <FadeIn><div style={{ color: "#8A841D", fontFamily: mono, fontSize: 16, letterSpacing: 2 }}>STEP 03 / ON-CHAIN</div></FadeIn>
        <FadeIn delay={8}><div style={{ fontSize: 55, fontWeight: 900, marginTop: 14 }}>The wallet sends the payment.</div></FadeIn>
        <div style={{ position: "relative", height: 330, marginTop: 55 }}>
          <div style={{ position: "absolute", left: 50, right: 50, top: 160, height: 2, background: "#DCE5E0" }} />
          <div style={{ position: "absolute", left: 30, top: 120, width: 80, height: 80, borderRadius: 22, background: PANEL_2, border: "1px solid #DCE5E0", display: "grid", placeItems: "center", fontSize: 34 }}>👛</div>
          <div style={{ position: "absolute", right: 30, top: 120, width: 80, height: 80, borderRadius: 22, background: "#E9F7F0", border: "1px solid rgba(98,230,167,.3)", display: "grid", placeItems: "center", fontSize: 34 }}>🏪</div>
          <div style={{ position: "absolute", left: x, top: 148, width: 28, height: 28, borderRadius: "50%", background: CELO, boxShadow: "0 0 35px rgba(251,247,106,.5)" }} />
          <div style={{ position: "absolute", left: 50, top: 205, fontFamily: mono, color: MUTED }}>customer wallet</div>
          <div style={{ position: "absolute", right: 35, top: 205, fontFamily: mono, color: MUTED }}>merchant wallet</div>
        </div>
        <FadeIn delay={110}><div style={{ display: "flex", gap: 12, justifyContent: "center" }}><Pill>ERC-20 Transfer</Pill><Pill active>Celo 42220</Pill><Pill>USDC</Pill></div></FadeIn>
      </div>
    </AbsoluteFill>
  );
}

function VerifyScene() {
  const frame = useCurrentFrame();
  const check = interpolate(frame, [35, 65], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const rows = [
    ["CHAIN", "42220", "Celo Mainnet"],
    ["TOKEN", "USDC", "Registry address"],
    ["TRANSFER", "$25.00", "Merchant received"],
    ["CONFIRM", "12+", "Confirmations"],
  ];
  return (
    <AbsoluteFill style={{ background: BG, color: TEXT, fontFamily: sans, overflow: "hidden" }}>
      <Header />
      <div style={{ position: "absolute", top: 165, left: 90, right: 90 }}>
        <FadeIn><div style={{ color: "#8A841D", fontFamily: mono, fontSize: 16, letterSpacing: 2 }}>STEP 04 / VERIFY</div></FadeIn>
        <FadeIn delay={8}><div style={{ fontSize: 55, fontWeight: 900, marginTop: 14 }}>CeloDesk verifies what happened.</div></FadeIn>
        <div style={{ marginTop: 48, display: "flex", gap: 25 }}>
          {rows.map(([a, b, c], i) => (
            <FadeIn key={a} delay={22 + i * 10}>
              <div style={{ width: 300, height: 175, borderRadius: 20, background: PANEL, border: "1px solid #DCE5E0", padding: 23, boxSizing: "border-box" }}>
                <div style={{ fontFamily: mono, color: MUTED, fontSize: 13 }}>{a}</div>
                <div style={{ fontSize: 34, fontWeight: 850, marginTop: 19 }}>{b}</div>
                <div style={{ color: MUTED, marginTop: 7 }}>{c}</div>
              </div>
            </FadeIn>
          ))}
        </div>
        <FadeIn delay={72}>
          <div style={{ margin: "48px auto 0", width: 500, padding: 20, borderRadius: 18, background: "#E9F7F0", border: "1px solid #BDE5CF", display: "flex", alignItems: "center", justifyContent: "center", gap: 14, opacity: check }}>
            <span style={{ fontSize: 30 }}>✓</span><span style={{ fontSize: 27, fontWeight: 850 }}>Payment verified on-chain</span>
          </div>
        </FadeIn>
      </div>
    </AbsoluteFill>
  );
}

function StatusScene() {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [0, 65], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const color = progress < .55 ? MUTED : GREEN;
  return (
    <AbsoluteFill style={{ background: BG, color: TEXT, fontFamily: sans, overflow: "hidden" }}>
      <Header />
      <div style={{ position: "absolute", top: 175, left: 90, right: 90, textAlign: "center" }}>
        <FadeIn><div style={{ color: "#8A841D", fontFamily: mono, fontSize: 16, letterSpacing: 2 }}>THE STATE CHANGES</div></FadeIn>
        <FadeIn delay={10}><div style={{ fontSize: 56, fontWeight: 900, marginTop: 15 }}>No manual reconciliation.</div></FadeIn>
        <div style={{ marginTop: 55, display: "flex", alignItems: "center", justifyContent: "center", gap: 24 }}>
          <div style={{ fontFamily: mono, fontSize: 42, color: progress > .55 ? "#667873" : TEXT, textDecoration: progress > .55 ? "line-through" : "none" }}>VIEWED</div>
          <div style={{ fontSize: 40, color: CELO }}>→</div>
          <div style={{ fontFamily: mono, fontSize: 58, color, fontWeight: 900 }}>PAID ✓</div>
        </div>
        <FadeIn delay={35}>
          <div style={{ margin: "45px auto 0", width: 720, padding: 24, borderRadius: 20, background: PANEL, border: "1px solid #DCE5E0", textAlign: "left", fontFamily: mono, color: MUTED }}>
            <div><span style={{ color: GREEN }}>✓</span> Transfer matched to merchant</div>
            <div style={{ marginTop: 12 }}><span style={{ color: GREEN }}>✓</span> Amount satisfied</div>
            <div style={{ marginTop: 12 }}><span style={{ color: GREEN }}>✓</span> Transaction recorded</div>
          </div>
        </FadeIn>
      </div>
    </AbsoluteFill>
  );
}

function InterfaceCard({ icon, title, sub, children, delay }: { icon: string; title: string; sub: string; children: React.ReactNode; delay: number }) {
  return (
    <FadeIn delay={delay} y={24}>
      <div style={{ width: 465, height: 300, borderRadius: 22, background: PANEL, border: "1px solid rgba(255,255,255,.10)", padding: 24, boxSizing: "border-box" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 13, background: "rgba(255,255,255,.06)", display: "grid", placeItems: "center", fontSize: 23 }}>{icon}</div>
          <div><div style={{ fontSize: 21, fontWeight: 800 }}>{title}</div><div style={{ color: MUTED, fontSize: 13, marginTop: 3 }}>{sub}</div></div>
        </div>
        <div style={{ marginTop: 24 }}>{children}</div>
      </div>
    </FadeIn>
  );
}

function InterfacesScene() {
  return (
    <AbsoluteFill style={{ background: BG, color: TEXT, fontFamily: sans, overflow: "hidden" }}>
      <Header />
      <div style={{ position: "absolute", top: 145, left: 70, right: 70 }}>
        <FadeIn><div style={{ color: "#8A841D", fontFamily: mono, fontSize: 16, letterSpacing: 2 }}>ONE PAYMENT STATE / THREE SURFACES</div></FadeIn>
        <FadeIn delay={8}><div style={{ fontSize: 50, fontWeight: 900, marginTop: 13 }}>The same invoice follows you.</div></FadeIn>
        <div style={{ display: "flex", gap: 20, marginTop: 42 }}>
          <InterfaceCard icon="⌁" title="Web App" sub="Merchant dashboard" delay={20}>
            <div style={{ fontFamily: mono, fontSize: 15, color: MUTED }}>INVOICE #CD-1042</div>
            <div style={{ fontSize: 33, fontWeight: 850, marginTop: 12 }}>$25.00 USDC</div>
            <div style={{ marginTop: 17, color: GREEN, fontFamily: mono }}>● PAID</div>
          </InterfaceCard>
          <InterfaceCard icon="✈" title="Telegram Agent" sub="@celoagentbot" delay={34}>
            <div style={{ borderRadius: 14, background: "rgba(255,255,255,.045)", padding: 15, fontFamily: mono, fontSize: 14 }}>
              <div style={{ color: MUTED }}>CeloDesk</div>
              <div style={{ marginTop: 8 }}>Invoice CD-1042</div>
              <div style={{ marginTop: 8, color: GREEN }}>✓ PAID • $25.00 USDC</div>
            </div>
          </InterfaceCard>
          <InterfaceCard icon="◈" title="Claude + MCP" sub="Live tool access" delay={48}>
            <div style={{ fontFamily: mono, fontSize: 13, color: BLUE }}>get_invoice_status("CD-1042")</div>
            <div style={{ marginTop: 15, padding: 14, borderRadius: 14, background: "#EEF6FC", color: TEXT }}>
              <span style={{ color: GREEN }}>✓ PAID</span><br /><span style={{ color: MUTED }}>Verified payment state</span>
            </div>
          </InterfaceCard>
        </div>
        <FadeIn delay={82}><div style={{ textAlign: "center", marginTop: 28, color: MUTED, fontFamily: mono, fontSize: 15 }}>Web ↔ API ↔ payment state ↔ Telegram / MCP</div></FadeIn>
      </div>
    </AbsoluteFill>
  );
}

function AgentScene() {
  const frame = useCurrentFrame();
  const pulse = 1 + Math.sin(frame / 7) * .025;
  return (
    <AbsoluteFill style={{ background: BG, color: TEXT, fontFamily: sans, overflow: "hidden" }}>
      <Header />
      <div style={{ position: "absolute", top: 170, left: 90, right: 90, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ width: 760 }}>
          <FadeIn><div style={{ color: "#8A841D", fontFamily: mono, fontSize: 16, letterSpacing: 2 }}>AGENT IDENTITY</div></FadeIn>
          <FadeIn delay={10}><div style={{ fontSize: 57, fontWeight: 900, marginTop: 15 }}>CeloDesk is registered on-chain.</div></FadeIn>
          <FadeIn delay={24}><div style={{ color: MUTED, fontSize: 22, lineHeight: 1.5, marginTop: 22 }}>The agent identity connects the product to an ERC-8004 registration on Celo.</div></FadeIn>
          <FadeIn delay={40}><div style={{ marginTop: 30, fontFamily: mono, color: MUTED, fontSize: 18 }}>AGENT ID <span style={{ color: CELO }}>#9799</span></div></FadeIn>
          <FadeIn delay={52}><div style={{ marginTop: 14, fontFamily: mono, color: MUTED, fontSize: 15 }}>chain: celo • registry: 8004 Identity Registry</div></FadeIn>
        </div>
        <FadeIn delay={28}>
          <div style={{ width: 350, height: 350, borderRadius: 40, background: "linear-gradient(145deg, #FFFDE3, #EFF9F4)", border: "1px solid #E1DA70", display: "grid", placeItems: "center", transform: "scale(" + pulse + ")" }}>
            <div style={{ textAlign: "center" }}><div style={{ fontSize: 82, fontWeight: 950, color: CELO }}>#9799</div><div style={{ color: MUTED, marginTop: 12, fontFamily: mono }}>ERC-8004 AGENT</div></div>
          </div>
        </FadeIn>
      </div>
    </AbsoluteFill>
  );
}

function FinalScene() {
  const frame = useCurrentFrame();
  const scale = spring({ frame, fps: 30, config: { damping: 15, stiffness: 80 } });
  return (
    <AbsoluteFill style={{ background: BG, color: TEXT, fontFamily: sans, overflow: "hidden" }}>
      <Header />
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", textAlign: "center" }}>
        <div style={{ transform: "scale(" + (0.94 + scale * .06) + ")" }}>
          <FadeIn><Logo /></FadeIn>
          <FadeIn delay={18}><div style={{ fontSize: 55, fontWeight: 900, marginTop: 28, letterSpacing: -2 }}>Create. Pay. Verify. <span style={{ color: CELO }}>Done.</span></div></FadeIn>
          <FadeIn delay={34}><div style={{ color: MUTED, fontSize: 21, marginTop: 18 }}>AI-powered stablecoin payments for businesses on Celo.</div></FadeIn>
          <FadeIn delay={50}>
            <div style={{ marginTop: 36, display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap", maxWidth: 900 }}>
              <Pill active>Web</Pill><Pill>Telegram</Pill><Pill>Claude / MCP</Pill><Pill>ERC-8004 #9799</Pill><Pill>Celo Mainnet</Pill>
            </div>
          </FadeIn>
        </div>
      </div>
      <div style={{ position: "absolute", bottom: 48, left: 0, right: 0, textAlign: "center", color: MUTED, fontFamily: mono, fontSize: 14 }}>celo-desk.vercel.app • github.com/Investorquab/CeloDesk</div>
    </AbsoluteFill>
  );
}

export const CeloDeskVideo: React.FC = () => (
  <AbsoluteFill>
    {useVoiceover && <Audio src={staticFile("voiceover.mp3")} volume={1} />}
    <Background />
    <Sequence from={0} durationInFrames={150}><TitleScene /></Sequence>
    <Sequence from={150} durationInFrames={180}><ProblemScene /></Sequence>
    <Sequence from={330} durationInFrames={210}><CreateScene /></Sequence>
    <Sequence from={540} durationInFrames={210}><QRScene /></Sequence>
    <Sequence from={750} durationInFrames={210}><TransactionScene /></Sequence>
    <Sequence from={960} durationInFrames={210}><VerifyScene /></Sequence>
    <Sequence from={1170} durationInFrames={150}><StatusScene /></Sequence>
    <Sequence from={1320} durationInFrames={210}><InterfacesScene /></Sequence>
    <Sequence from={1530} durationInFrames={150}><AgentScene /></Sequence>
    <Sequence from={1680} durationInFrames={120}><FinalScene /></Sequence>
  </AbsoluteFill>
);
