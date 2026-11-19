"use strict";
const fs=require("node:fs/promises");
const path=require("node:path");
const sharp=require("sharp");
const root=path.resolve(__dirname,"..");
async function main(){
  const source=await fs.readFile(path.join(root,"assets","case-closed-mark.svg"));
  const sizes=[16,24,32,48,64,128,256];
  const images=await Promise.all(sizes.map(async size=>({
    size,data:await sharp(source,{density:384}).resize(size,size,{fit:"contain"}).png().toBuffer()
  })));
  // ICO accepts PNG payloads; Windows supports embedded PNG at these sizes.
  const count=images.length;
  const header=Buffer.alloc(6+count*16);
  header.writeUInt16LE(0,0);
  header.writeUInt16LE(1,2);
  header.writeUInt16LE(count,4);
  let offset=header.length;
  images.forEach(({size,data},i)=>{
    const at=6+i*16;
    header.writeUInt8(size===256?0:size,at);
    header.writeUInt8(size===256?0:size,at+1);
    header.writeUInt8(0,at+2);
    header.writeUInt8(0,at+3);
    header.writeUInt16LE(1,at+4);
    header.writeUInt16LE(32,at+6);
    header.writeUInt32LE(data.length,at+8);
    header.writeUInt32LE(offset,at+12);
    offset+=data.length;
  });
  await fs.writeFile(path.join(root,"assets","case-closed.ico"),
    Buffer.concat([header,...images.map(x=>x.data)]));
  await fs.writeFile(path.join(root,"assets","case-closed.png"),images[images.length-1].data);
  console.log("Generated official Windows icon and PNG preview.");
}
main().catch(err=>{console.error(err);process.exitCode=1;});
