export type InvoiceCardData = {
  businessName: string;
  amount: string;
  token: string;
  description: string;
  client: string;
  due: string;
  url: string;
  qrValue?: string;
};

function roundedRect(ctx: CanvasRenderingContext2D, x:number, y:number, w:number, h:number, r:number){
  ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath();
}
function text(ctx:CanvasRenderingContext2D,value:string,x:number,y:number,font:string,fill:string,align:CanvasTextAlign='left'){
  ctx.font=font;ctx.fillStyle=fill;ctx.textAlign=align;ctx.fillText(value,x,y);
}
async function svgToImage(svg: SVGSVGElement){
  const serialized = new XMLSerializer().serializeToString(svg);
  const blob = new Blob([serialized], {type:'image/svg+xml;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  try { const img = new Image(); img.decoding='async'; img.src=url; await img.decode(); return img; }
  finally { URL.revokeObjectURL(url); }
}
export async function renderInvoiceCard(data: InvoiceCardData): Promise<Blob>{
  const canvas=document.createElement('canvas'); canvas.width=1600; canvas.height=1000;
  const ctx=canvas.getContext('2d'); if(!ctx) throw new Error('Could not create invoice card.');

  ctx.fillStyle='#f1f7f4';ctx.fillRect(0,0,1600,1000);
  roundedRect(ctx,55,55,1490,890,42);ctx.fillStyle='#fff';ctx.fill();ctx.strokeStyle='#d7e6df';ctx.lineWidth=2;ctx.stroke();

  // Elegant green masthead.
  ctx.save();roundedRect(ctx,55,55,1490,205,42);ctx.clip();ctx.fillStyle='#08251c';ctx.fillRect(55,55,1490,205);ctx.fillStyle='#0c8f67';ctx.globalAlpha=.55;ctx.beginPath();ctx.arc(1390,40,230,0,Math.PI*2);ctx.fill();ctx.globalAlpha=.18;ctx.beginPath();ctx.arc(1510,220,150,0,Math.PI*2);ctx.fill();ctx.restore();
  // Use the same canonical CeloDesk logo as the web app and Telegram.
  try {
    const logo = new Image();
    logo.decoding = 'async';
    logo.src = '/celodesk-logo.png';
    await logo.decode();
    ctx.drawImage(logo,105,105,62,62);
  } catch {
    ctx.fillStyle='#0fa477';roundedRect(ctx,105,105,62,62,17);ctx.fill();
  }
  text(ctx,'CeloDesk',185,145,'800 34px Arial','#ffffff');
  text(ctx,'PAYMENT REQUEST',185,176,'700 16px Arial','#9cc7b8');
  text(ctx,'INVOICE',1410,120,'700 15px Arial','#9cc7b8','right');
  text(ctx,`#${Date.now().toString().slice(-8)}`,1410,151,'800 22px Arial','#ffffff','right');
  text(ctx,'Secure settlement on Celo',1410,184,'16px Arial','#b8d5ca','right');

  text(ctx,'BILL TO',105,315,'700 15px Arial','#75847e');
  text(ctx,data.client||'Client',105,353,'800 31px Arial','#10221c');
  text(ctx,data.description||'Payment request',105,386,'18px Arial','#64736d');

  text(ctx,'AMOUNT DUE',105,452,'700 15px Arial','#75847e');
  text(ctx,`${data.amount} ${data.token}`,105,512,'800 66px Arial','#10221c');
  text(ctx,data.due?`Due ${data.due}`:'Pay on receipt',105,548,'18px Arial','#64736d');

  // Payment details row.
  ctx.strokeStyle='#dfeae5';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(105,590);ctx.lineTo(1495,590);ctx.stroke();
  text(ctx,'PAYMENT DETAILS',105,625,'700 13px Arial','#75847e');
  text(ctx,'Network',105,662,'13px Arial','#75847e');text(ctx,'Celo Mainnet',250,662,'700 15px Arial','#10221c');
  text(ctx,'Settlement',105,698,'13px Arial','#75847e');text(ctx,'Non-custodial',250,698,'700 15px Arial','#10221c');
  text(ctx,'Methods',105,734,'13px Arial','#75847e');text(ctx,'MiniPay · Wallet · QR',250,734,'700 15px Arial','#10221c');

  // QR/payment panel.
  roundedRect(ctx,1040,292,400,520,30);ctx.fillStyle='#f5faf8';ctx.fill();ctx.strokeStyle='#d5e6de';ctx.stroke();
  text(ctx,'PAY SECURELY',1240,338,'800 14px Arial','#0b7d5a','center');
  const svg=document.querySelector('#invoice-download-qr svg') as SVGSVGElement|null;
  if(svg){const img=await svgToImage(svg);ctx.fillStyle='#fff';roundedRect(ctx,1115,365,250,250,18);ctx.fill();ctx.drawImage(img,1140,390,200,200);}
  text(ctx,'Scan to pay',1240,665,'800 22px Arial','#10221c','center');
  text(ctx,'or open the secure invoice link',1240,696,'15px Arial','#75847e','center');
  text(ctx,'CeloDesk payment request',1240,755,'700 13px Arial','#0b7d5a','center');

  // Footer.
  ctx.strokeStyle='#dfeae5';ctx.beginPath();ctx.moveTo(105,842);ctx.lineTo(1495,842);ctx.stroke();
  text(ctx,'Thank you for your business.',105,884,'700 17px Arial','#10221c');
  text(ctx,'One secure link · Non-custodial · Celo settlement',1495,884,'15px Arial','#75847e','right');
  return await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Could not render invoice card.')),'image/png',1));
}
export async function downloadInvoiceCard(data:InvoiceCardData){const blob=await renderInvoiceCard(data);const a=document.createElement('a');a.download=`celodesk-invoice-${Date.now()}.png`;a.href=URL.createObjectURL(blob);a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
export async function shareInvoiceFile(data:InvoiceCardData,text:string){const blob=await renderInvoiceCard(data);const file=new File([blob],`celodesk-invoice-${Date.now()}.png`,{type:'image/png'});if(typeof navigator!=='undefined'&&'share' in navigator){const nav=navigator as Navigator&{canShare?:(data?:ShareData)=>boolean};if(!nav.canShare||nav.canShare({files:[file]})){await navigator.share({title:`Invoice — ${data.amount} ${data.token}`,text,files:[file]});return 'shared' as const;}}try{if('clipboard' in navigator&&'ClipboardItem' in window){await navigator.clipboard.write([new ClipboardItem({'image/png':blob})]);}}catch{}return 'copied' as const;}
export async function shareInvoiceToGmail(data:InvoiceCardData,text:string,subject:string,body:string){const blob=await renderInvoiceCard(data);const file=new File([blob],`celodesk-invoice-${Date.now()}.png`,{type:'image/png'});if(typeof navigator!=='undefined'&&'share' in navigator){const nav=navigator as Navigator&{canShare?:(data?:ShareData)=>boolean};if(!nav.canShare||nav.canShare({files:[file]})){await navigator.share({title:subject,text,files:[file]});return 'shared' as const;}}try{if('clipboard' in navigator&&'ClipboardItem' in window){await navigator.clipboard.write([new ClipboardItem({'image/png':blob})]);}}catch{}const gmailUrl=`https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body+'\n\n[Invoice card copied to clipboard — paste it into this email.]')}`;window.open(gmailUrl,'_blank','noopener,noreferrer');return 'gmail-fallback' as const;}
