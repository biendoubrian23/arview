const fs = require("fs");
fs.mkdirSync("public/icons", { recursive: true });
function makePNG(size, outPath) {
  const w = size, h = size;
  const sig = Buffer.from([137,80,78,71,13,10,26,10]);
  function u32(n){ const b=Buffer.alloc(4); b.writeUInt32BE(n); return b; }
  function crc32(buf){ let c=0xFFFFFFFF; for(const byte of buf){ c^=byte; for(let i=0;i<8;i++) c=(c&1)?0xEDB88320^(c>>>1):(c>>>1); } return (c^0xFFFFFFFF)>>>0; }
  function chunk(type, data){ const t=Buffer.from(type); const d=Buffer.isBuffer(data)?data:Buffer.from(data); const len=u32(d.length); const td=Buffer.concat([t,d]); return Buffer.concat([len,td,u32(crc32(td))]); }
  const ihdr=chunk("IHDR",Buffer.concat([u32(w),u32(h),Buffer.from([8,2,0,0,0])]));
  const rows=[];
  for(let y=0;y<h;y++){
    const row=Buffer.alloc(1+w*3);
    row[0]=0;
    for(let x=0;x<w;x++){
      const fx=x/w, fy=y/h;
      let r=10,g=10,b=20;
      const p0x=0.5,p0y=0.08,p1x=0.92,p1y=0.82,p2x=0.08,p2y=0.82;
      const d1=(fx-p1x)*(p0y-p1y)-(p0x-p1x)*(fy-p1y);
      const d2=(fx-p2x)*(p1y-p2y)-(p1x-p2x)*(fy-p2y);
      const d3=(fx-p0x)*(p2y-p0y)-(p2x-p0x)*(fy-p0y);
      const neg=(d1<0)||(d2<0)||(d3<0);
      const pos=(d1>0)||(d2>0)||(d3>0);
      if(!(neg&&pos)){
        const t=Math.sqrt(fx*fx+fy*fy)/Math.sqrt(2);
        r=Math.round(108+(0-108)*t);
        g=Math.round(99+(212-99)*t);
        b=255;
      }
      row[1+x*3]=r; row[2+x*3]=g; row[3+x*3]=b;
    }
    rows.push(row);
  }
  const zlib=require("zlib");
  const raw=Buffer.concat(rows);
  const deflated=zlib.deflateSync(raw,{level:6});
  const idat=chunk("IDAT",deflated);
  const iend=chunk("IEND",Buffer.alloc(0));
  fs.writeFileSync(outPath,Buffer.concat([sig,ihdr,idat,iend]));
  console.log("Created "+outPath);
}
makePNG(192,"public/icons/icon-192.png");
makePNG(512,"public/icons/icon-512.png");
