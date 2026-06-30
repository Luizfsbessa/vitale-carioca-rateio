const PDF_W=595,PDF_H=842,MARGIN=40;
const NAVY='#1a2b4a',GOLD='#F5A623',BLUE_SOFT='#eef4fd',BLUE_BRD='#c7ddf9',TEXT_SOFT='#555';

async function gerarPDFUnidade(cp,unidade,regComp,resident){
  const d=regComp.u[unidade];
  if(!d){alert('Dados não encontrados.');return;}
  const andar=Math.floor(parseInt(unidade)/100);
  const consumoAndar=calcAndar(regComp,andar);
  const consumoPredio=Object.values(regComp.u).reduce((s,x)=>s+x.c,0);
  const pctAndar=consumoAndar>0?d.c/consumoAndar*100:0;
  const pctPredio=consumoPredio>0?d.c/consumoPredio*100:0;
  const S=2;
  const canvas=document.createElement('canvas');
  canvas.width=PDF_W*S; canvas.height=PDF_H*S;
  const ctx=canvas.getContext('2d');
  ctx.scale(S,S);

  ctx.fillStyle='#f8f8f6'; ctx.fillRect(0,0,PDF_W,PDF_H);
  let y=0;

  // Header navy
  ctx.fillStyle=NAVY; ctx.fillRect(0,0,PDF_W,92);
  ctx.fillStyle=GOLD; rr(ctx,MARGIN,18,30,30,5); ctx.fill();
  ctx.fillStyle=NAVY; ctx.font='bold 14px sans-serif'; ctx.textAlign='center';
  ctx.fillText('V',MARGIN+15,38);
  ctx.fillStyle='#fff'; ctx.font='bold 10px sans-serif'; ctx.textAlign='left';
  ctx.fillText('VITALE',MARGIN+37,28);
  ctx.font='bold italic 26px Georgia,serif'; ctx.fillText('Carioca',MARGIN+37,54);
  ctx.font='8px sans-serif'; ctx.fillStyle='#9ab8d8'; ctx.fillText('RESIDENCIAL',MARGIN+37,67);
  ctx.fillStyle='#fff'; ctx.font='bold 14px sans-serif'; ctx.textAlign='right';
  ctx.fillText('EXTRATO DE CONSUMO DE ÁGUA',PDF_W-MARGIN,34);
  ctx.font='10px sans-serif'; ctx.fillStyle='#9ab8d8';
  ctx.fillText(`Competência: ${Fmt.formatarCompetencia(cp)}`,PDF_W-MARGIN,52);
  ctx.fillText(`Emitido em ${new Date().toLocaleDateString('pt-BR')}`,PDF_W-MARGIN,67);
  ctx.textAlign='left'; y=106;

  // Bloco unidade
  ctx.fillStyle=NAVY; rr(ctx,MARGIN,y,PDF_W-MARGIN*2,60,8); ctx.fill();
  ctx.fillStyle=GOLD; ctx.font='bold 30px sans-serif'; ctx.fillText(`Unidade ${unidade}`,MARGIN+16,y+38);
  ctx.fillStyle='#9ab8d8'; ctx.font='11px sans-serif'; ctx.fillText(`${andar}º Andar`,MARGIN+16,y+54);
  if(resident?.nome){
    ctx.fillStyle='#fff'; ctx.font='bold 13px sans-serif'; ctx.textAlign='right';
    ctx.fillText(resident.nome,PDF_W-MARGIN-14,y+30);
    if(resident.email){ctx.font='10px sans-serif';ctx.fillStyle='#9ab8d8';ctx.fillText(resident.email,PDF_W-MARGIN-14,y+47);}
    ctx.textAlign='left';
  }
  y+=74;

  // Leitura hidrômetro
  ctx.fillStyle=BLUE_SOFT; rr(ctx,MARGIN,y,PDF_W-MARGIN*2,56,8); ctx.fill();
  ctx.strokeStyle=BLUE_BRD; ctx.lineWidth=1; rr(ctx,MARGIN,y,PDF_W-MARGIN*2,56,8); ctx.stroke();
  blkTitle(ctx,'LEITURA DO HIDRÔMETRO',MARGIN+12,y+16);
  const cw3=(PDF_W-MARGIN*2-24)/3;
  [['Leitura anterior',d.p>0?`${d.p.toFixed(2)} m³`:'—'],['Leitura atual',d.la>0?`${d.la.toFixed(2)} m³`:'—'],['Consumo do período',`${d.c.toFixed(2)} m³`]].forEach(([l,v],i)=>{
    const x=MARGIN+12+i*(cw3);
    ctx.fillStyle=TEXT_SOFT; ctx.font='9px sans-serif'; ctx.fillText(l,x,y+32);
    ctx.fillStyle=NAVY; ctx.font='bold 13px sans-serif'; ctx.fillText(v,x,y+48);
  });
  y+=70;

  // Composição valor
  secTitle(ctx,'COMPOSIÇÃO DO VALOR',MARGIN,y); y+=22;
  const vInd=regComp.vpm3*d.c, vRat=regComp.vpm3*d.r;
  const rows=[['Consumo individual',`${d.c.toFixed(2)} m³`,`R$ ${Fmt.formatarBRL(vInd)}`],
              ['Rateio da diferença (área comum/perdas)',`${d.r.toFixed(4)} m³`,`R$ ${Fmt.formatarBRL(vRat)}`],
              ['TOTAL A PAGAR','',`R$ ${Fmt.formatarBRL(d.v)}`]];
  const RH=28;
  rows.forEach((row,i)=>{
    const isT=i===rows.length-1;
    if(isT){ctx.fillStyle=NAVY;rr(ctx,MARGIN,y,PDF_W-MARGIN*2,RH,6);ctx.fill();ctx.fillStyle='#fff';}
    else{ctx.fillStyle=i%2===0?'#fff':BLUE_SOFT;ctx.fillRect(MARGIN,y,PDF_W-MARGIN*2,RH);ctx.fillStyle=NAVY;}
    ctx.font=isT?'bold 11px sans-serif':'11px sans-serif';
    ctx.fillText(row[0],MARGIN+8,y+18);
    ctx.textAlign='right'; ctx.fillText(row[1],MARGIN+(PDF_W-MARGIN*2)*0.62,y+18);
    ctx.fillText(row[2],PDF_W-MARGIN-8,y+18); ctx.textAlign='left'; y+=RH;
  });
  y+=16;

  // Participações
  secTitle(ctx,'SUA PARTICIPAÇÃO NO CONSUMO',MARGIN,y); y+=22;
  [{label:'Participação no andar',sub:`${d.c.toFixed(2)} de ${consumoAndar.toFixed(2)} m³`,pct:pctAndar},
   {label:'Participação no prédio',sub:`${d.c.toFixed(2)} de ${consumoPredio.toFixed(2)} m³`,pct:pctPredio}].forEach(p=>{
    ctx.fillStyle=TEXT_SOFT; ctx.font='10px sans-serif'; ctx.fillText(`${p.label}  `,MARGIN,y+12);
    ctx.fillStyle='#aaa'; ctx.font='9px sans-serif'; ctx.fillText(`(${p.sub})`,MARGIN+140,y+12);
    const bw=PDF_W-MARGIN*2;
    ctx.fillStyle='#e5e3da'; rr(ctx,MARGIN,y+16,bw,10,5); ctx.fill();
    ctx.fillStyle=GOLD; rr(ctx,MARGIN,y+16,Math.max(bw*p.pct/100,4),10,5); ctx.fill();
    ctx.fillStyle=NAVY; ctx.font='bold 10px sans-serif'; ctx.textAlign='right';
    ctx.fillText(`${p.pct.toFixed(1)}%`,PDF_W-MARGIN,y+25); ctx.textAlign='left'; y+=36;
  });
  y+=8;

  // Resumo geral
  secTitle(ctx,'RESUMO GERAL DO CONDOMÍNIO',MARGIN,y); y+=22;
  [['Leitura geral (Águas do Rio)',`${regComp.t.toFixed(2)} m³`],
   ['Consumo identificado pelas unidades',`${consumoPredio.toFixed(2)} m³`],
   ['Diferença rateada igualmente',`${Math.max(0,regComp.t-consumoPredio).toFixed(2)} m³`],
   ['Valor total da fatura',`R$ ${Fmt.formatarBRL(regComp.v)}`],
   ['Referência anterior',regComp.compAnterior?Fmt.formatarCompetencia(regComp.compAnterior):'Primeira competência']
  ].forEach((row,i)=>{
    ctx.fillStyle=i%2===0?'#fff':BLUE_SOFT; ctx.fillRect(MARGIN,y,PDF_W-MARGIN*2,24);
    ctx.fillStyle=TEXT_SOFT; ctx.font='10px sans-serif'; ctx.fillText(row[0],MARGIN+8,y+16);
    ctx.fillStyle=NAVY; ctx.font='bold 10px sans-serif'; ctx.textAlign='right';
    ctx.fillText(row[1],PDF_W-MARGIN-8,y+16); ctx.textAlign='left'; y+=24;
  });

  // Rodapé
  ctx.fillStyle=NAVY; ctx.fillRect(0,PDF_H-36,PDF_W,36);
  ctx.fillStyle='#9ab8d8'; ctx.font='9px sans-serif'; ctx.textAlign='center';
  ctx.fillText('Vitale Carioca Residencial  ·  Sistema de Rateio de Água  ·  Powered by Luiz Bessa',PDF_W/2,PDF_H-14);
  ctx.textAlign='left';

  // Converte canvas → PDF nativo
  const jpeg=canvas.toDataURL('image/jpeg',0.92);
  const b64=jpeg.split(',')[1];
  const raw=atob(b64);
  const jLen=raw.length;
  const W=PDF_W.toFixed(2),H=PDF_H.toFixed(2);

  const enc=new TextEncoder();
  const stream=`q ${W} 0 0 ${H} 0 0 cm /Im1 Do Q`;

  const obj1=enc.encode('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n');
  const obj2=enc.encode('2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n');
  const obj3=enc.encode(`3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 ${W} ${H}]/Contents 4 0 R/Resources<</XObject<</Im1 5 0 R>>>>>>endobj\n`);
  const obj4=enc.encode(`4 0 obj<</Length ${stream.length}>>\nstream\n${stream}\nendstream\nendobj\n`);
  const obj5hdr=enc.encode(`5 0 obj<</Type/XObject/Subtype/Image/Width ${canvas.width}/Height ${canvas.height}/ColorSpace/DeviceRGB/BitsPerComponent 8/Filter/DCTDecode/Length ${jLen}>>\nstream\n`);
  const obj5img=new Uint8Array(jLen);
  for(let i=0;i<jLen;i++)obj5img[i]=raw.charCodeAt(i);
  const obj5end=enc.encode('\nendstream\nendobj\n');

  const offs=[];
  let pos=0;
  [obj1,obj2,obj3,obj4,obj5hdr,obj5img,obj5end].forEach((p,i)=>{
    if(i<5)offs.push(pos);
    pos+=p.length;
  });
  const xrefOff=pos;
  const pad=n=>String(n).padStart(10,'0');
  const xref=enc.encode(
    `xref\n0 6\n0000000000 65535 f \n${pad(offs[0])} 00000 n \n${pad(offs[1])} 00000 n \n${pad(offs[2])} 00000 n \n${pad(offs[3])} 00000 n \n${pad(offs[4])} 00000 n \n`+
    `trailer<</Size 6/Root 1 0 R>>\nstartxref\n${xrefOff}\n%%EOF`
  );

  const parts=[obj1,obj2,obj3,obj4,obj5hdr,obj5img,obj5end,xref];
  const total=parts.reduce((s,p)=>s+p.length,0);
  const out=new Uint8Array(total);
  let off=0;
  for(const p of parts){out.set(p,off);off+=p.length;}

  const blob=new Blob([out],{type:'application/pdf'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;
  a.download=`extrato_${unidade}_${cp}.pdf`;
  a.style.display='none';
  document.body.appendChild(a);
  a.click();
  setTimeout(()=>{ document.body.removeChild(a); URL.revokeObjectURL(url); }, 1000);
  return `extrato_${unidade}_${cp}.pdf`;
}

function blkTitle(ctx,t,x,y){ctx.fillStyle=GOLD;ctx.fillRect(x-4,y-10,3,14);ctx.fillStyle=NAVY;ctx.font='bold 10px sans-serif';ctx.fillText(t,x+2,y);}
function secTitle(ctx,t,x,y){ctx.fillStyle=NAVY;ctx.fillRect(x,y-2,3,14);ctx.font='bold 10px sans-serif';ctx.fillText(t,x+8,y+10);const tw=ctx.measureText(t).width;ctx.strokeStyle='#e5e3da';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x+8+tw+8,y+5);ctx.lineTo(PDF_W-MARGIN,y+5);ctx.stroke();}
function rr(ctx,x,y,w,h,r){if(h<=0||w<=0)return;r=Math.min(r,h/2,w/2);ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.arcTo(x+w,y,x+w,y+r,r);ctx.lineTo(x+w,y+h-r);ctx.arcTo(x+w,y+h,x+w-r,y+h,r);ctx.lineTo(x+r,y+h);ctx.arcTo(x,y+h,x,y+h-r,r);ctx.lineTo(x,y+r);ctx.arcTo(x,y,x+r,y,r);ctx.closePath();}
function calcAndar(reg,a){let t=0;for(let u=1;u<=8;u++){const k=String(a*100+u);if(reg.u[k])t+=reg.u[k].c||0;}return t;}

window.PDFGenerator={gerarPDFUnidade};
