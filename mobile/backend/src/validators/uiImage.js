const { createHash } = require('node:crypto');
const ApiError = require('../utils/ApiError');
const limits = require('./uiVisual.json');
const invalid = () => { throw new ApiError(422, 'Choose a PNG or JPEG image up to 2 MB and 2048 pixels per side. Crop or resize the image and try again.', 'UI_IMAGE_INVALID'); };
function validateImage({ mimeType, dataBase64 }) {
  if (!['image/png', 'image/jpeg'].includes(mimeType) || typeof dataBase64 !== 'string'
    || dataBase64.length > Math.ceil(limits.imageMaxBytes / 3) * 4 || dataBase64.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(dataBase64)) invalid();
  const data = Buffer.from(dataBase64, 'base64');
  if (data.length < 24 || data.length > limits.imageMaxBytes || data.toString('base64') !== dataBase64) invalid();
  let width = 0, height = 0;
  if (mimeType === 'image/png') {
    if (data.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a' || data.toString('ascii', 12, 16) !== 'IHDR'
      || data.subarray(-8).toString('hex') !== '49454e44ae426082') invalid();
    width = data.readUInt32BE(16); height = data.readUInt32BE(20);
  } else {
    if (data[0] !== 0xff || data[1] !== 0xd8 || data.at(-2) !== 0xff || data.at(-1) !== 0xd9) invalid();
    let offset = 2;
    while (offset + 4 < data.length) {
      if (data[offset++] !== 0xff) invalid();
      while (data[offset] === 0xff) offset++;
      const marker = data[offset++];
      if (marker === 0xda || marker === 0xd9) break;
      const length = data.readUInt16BE(offset);
      if (length < 2 || offset + length > data.length) invalid();
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
        if (length < 8) invalid();
        height = data.readUInt16BE(offset + 3); width = data.readUInt16BE(offset + 5); break;
      }
      offset += length;
    }
  }
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > limits.imageMaxDimension || height > limits.imageMaxDimension) invalid();
  return { kind: 'image', mimeType, data, size: data.length, width, height, fps: 0, duration: 0, sha256: createHash('sha256').update(data).digest('hex') };
}
module.exports = { validateImage };
