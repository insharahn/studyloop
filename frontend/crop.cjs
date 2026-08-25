const fs = require('fs');
const zlib = require('zlib');

function cropPNG(inputPath, outputPath) {
  const buf = fs.readFileSync(inputPath);
  if (buf[0] !== 0x89 || buf[1] !== 0x50 || buf[2] !== 0x4E || buf[3] !== 0x47) {
    console.error('Not a valid PNG file');
    return;
  }

  let offset = 8;
  let width = 0, height = 0, bitDepth = 0, colorType = 0;
  let idatChunks = [];

  while (offset < buf.length) {
    const length = buf.readUInt32BE(offset);
    const type = buf.toString('ascii', offset + 4, offset + 8);
    if (type === 'IHDR') {
      width = buf.readUInt32BE(offset + 8);
      height = buf.readUInt32BE(offset + 12);
      bitDepth = buf[offset + 16];
      colorType = buf[offset + 17];
    } else if (type === 'IDAT') {
      idatChunks.push(buf.subarray(offset + 8, offset + 8 + length));
    }
    offset += 12 + length;
  }

  if (colorType !== 6 || bitDepth !== 8) {
    console.log('Only 8-bit RGBA PNG supported');
    return;
  }

  const decompressed = zlib.inflateSync(Buffer.concat(idatChunks));
  const bpp = 4;
  const stride = 1 + width * bpp;

  // Unfilter scanlines to get true raw RGBA pixels
  const rawPixels = Buffer.alloc(width * height * bpp);
  for (let y = 0; y < height; y++) {
    const filterType = decompressed[y * stride];
    const srcRow = y * stride + 1;
    const dstRow = y * width * bpp;
    const prevRow = (y - 1) * width * bpp;

    for (let x = 0; x < width * bpp; x++) {
      const sub = decompressed[srcRow + x];
      const a = x >= bpp ? rawPixels[dstRow + x - bpp] : 0;
      const b = y > 0 ? rawPixels[prevRow + x] : 0;
      const c = (y > 0 && x >= bpp) ? rawPixels[prevRow + x - bpp] : 0;

      let pr = 0;
      if (filterType === 0) pr = 0;
      else if (filterType === 1) pr = a;
      else if (filterType === 2) pr = b;
      else if (filterType === 3) pr = Math.floor((a + b) / 2);
      else if (filterType === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        if (pa <= pb && pa <= pc) pr = a;
        else if (pb <= pc) pr = b;
        else pr = c;
      }
      rawPixels[dstRow + x] = (sub + pr) & 0xff;
    }
  }

  // Find non-transparent pixel bounding box
  let minX = width, minY = height, maxX = 0, maxY = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = rawPixels[(y * width + x) * bpp + 3];
      if (alpha > 5) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  console.log(`Original: ${width}x${height}, BBox: minX=${minX}, minY=${minY}, maxX=${maxX}, maxY=${maxY}`);

  const cropW = maxX - minX + 1;
  const cropH = maxY - minY + 1;
  console.log(`Cropped Size: ${cropW}x${cropH}`);

  // Create unfiltered scanlines for cropped image (filterType 0 = None)
  const croppedScanlines = Buffer.alloc(cropH * (1 + cropW * bpp));
  for (let y = 0; y < cropH; y++) {
    const srcY = minY + y;
    const srcOffset = (srcY * width + minX) * bpp;
    const dstOffset = y * (1 + cropW * bpp);
    croppedScanlines[dstOffset] = 0; // Filter type None
    rawPixels.copy(croppedScanlines, dstOffset + 1, srcOffset, srcOffset + cropW * bpp);
  }

  const compressedIDAT = zlib.deflateSync(croppedScanlines);

  // Write new PNG header & chunks
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(cropW, 0);
  ihdr.writeUInt32BE(cropH, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  function createChunk(typeStr, dataBuf) {
    const typeBuf = Buffer.from(typeStr, 'ascii');
    const lenBuf = Buffer.alloc(4);
    lenBuf.writeUInt32BE(dataBuf.length, 0);
    const crcBuf = Buffer.alloc(4);
    const crc = calcCRC(Buffer.concat([typeBuf, dataBuf]));
    crcBuf.writeUInt32BE(crc, 0);
    return Buffer.concat([lenBuf, typeBuf, dataBuf, crcBuf]);
  }

  const pngHeader = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const ihdrChunk = createChunk('IHDR', ihdr);
  const idatChunk = createChunk('IDAT', compressedIDAT);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  const outBuf = Buffer.concat([pngHeader, ihdrChunk, idatChunk, iendChunk]);
  fs.writeFileSync(outputPath, outBuf);
  console.log(`Successfully saved cropped PNG to ${outputPath}`);
}

const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) c = 0xedb88320 ^ (c >>> 1);
    else c = c >>> 1;
  }
  crcTable[n] = c;
}

function calcCRC(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

cropPNG('C:/Users/hp/.gemini/antigravity/brain/7b27c7f7-9a8c-4913-8d34-1f331fe7e145/.user_uploaded/media_1787429219701.png', 'c:/Users/hp/Desktop/studyloop/frontend/public/hero-assets/logo.png');
cropPNG('C:/Users/hp/.gemini/antigravity/brain/7b27c7f7-9a8c-4913-8d34-1f331fe7e145/.user_uploaded/media_1787429219701.png', 'c:/Users/hp/Desktop/studyloop/frontend/dist/hero-assets/logo.png');
