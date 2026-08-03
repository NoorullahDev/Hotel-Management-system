const crypto = require('crypto');

const SECRET_KEY = 'HMS-SECRET-LICENSE-KEY-2026-XQZ';
const normalizedSecret = crypto.createHash('sha256').update(SECRET_KEY).digest();

function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', normalizedSecret, iv);
  let encrypted = cipher.update(text, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  // Format: iv:encryptedData
  return iv.toString('base64') + ':' + encrypted;
}

function decrypt(text) {
  try {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift(), 'base64');
    const encryptedText = Buffer.from(textParts.join(':'), 'base64');
    const decipher = crypto.createDecipheriv('aes-256-cbc', normalizedSecret, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (err) {
    return null;
  }
}

const payload = JSON.stringify({ hwid: 'DF05-961F-3BAC-CF13', expiryDate: new Date().toISOString() });
const enc = encrypt(payload);
console.log('Encrypted:', enc);
console.log('Decrypted:', decrypt(enc));
