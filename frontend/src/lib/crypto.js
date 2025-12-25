import CryptoJS from 'crypto-js';

// Generate a random encryption key (256 bits)
export const generateEncryptionKey = () => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

// Generate a random IV (128 bits for AES)
export const generateIV = () => {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

// Encrypt text with AES-256
export const encryptText = (plaintext, key) => {
  const iv = generateIV();
  const keyWordArray = CryptoJS.enc.Hex.parse(key);
  const ivWordArray = CryptoJS.enc.Hex.parse(iv);
  
  const encrypted = CryptoJS.AES.encrypt(plaintext, keyWordArray, {
    iv: ivWordArray,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  });
  
  return {
    ciphertext: encrypted.ciphertext.toString(CryptoJS.enc.Base64),
    iv: iv
  };
};

// Decrypt text with AES-256
export const decryptText = (ciphertext, key, iv) => {
  try {
    const keyWordArray = CryptoJS.enc.Hex.parse(key);
    const ivWordArray = CryptoJS.enc.Hex.parse(iv);
    
    const cipherParams = CryptoJS.lib.CipherParams.create({
      ciphertext: CryptoJS.enc.Base64.parse(ciphertext)
    });
    
    const decrypted = CryptoJS.AES.decrypt(cipherParams, keyWordArray, {
      iv: ivWordArray,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });
    
    return decrypted.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('Decryption error:', error);
    return null;
  }
};

// Hash PIN for secure comparison
export const hashPin = (pin) => {
  return CryptoJS.SHA256(pin).toString();
};

// Read file as ArrayBuffer
export const readFileAsArrayBuffer = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};

// Convert ArrayBuffer to Base64
export const arrayBufferToBase64 = (buffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

// Convert Base64 to ArrayBuffer
export const base64ToArrayBuffer = (base64) => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
};

// Encrypt file with AES-256
export const encryptFile = async (file, key) => {
  const arrayBuffer = await readFileAsArrayBuffer(file);
  const base64Data = arrayBufferToBase64(arrayBuffer);
  
  const iv = generateIV();
  const keyWordArray = CryptoJS.enc.Hex.parse(key);
  const ivWordArray = CryptoJS.enc.Hex.parse(iv);
  
  const encrypted = CryptoJS.AES.encrypt(base64Data, keyWordArray, {
    iv: ivWordArray,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  });
  
  return {
    encryptedData: encrypted.ciphertext.toString(CryptoJS.enc.Base64),
    iv: iv,
    filename: file.name,
    fileType: file.type || 'application/octet-stream',
    fileSize: file.size
  };
};

// Decrypt file with AES-256
export const decryptFile = (encryptedData, key, iv) => {
  try {
    const keyWordArray = CryptoJS.enc.Hex.parse(key);
    const ivWordArray = CryptoJS.enc.Hex.parse(iv);
    
    const cipherParams = CryptoJS.lib.CipherParams.create({
      ciphertext: CryptoJS.enc.Base64.parse(encryptedData)
    });
    
    const decrypted = CryptoJS.AES.decrypt(cipherParams, keyWordArray, {
      iv: ivWordArray,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });
    
    const base64Data = decrypted.toString(CryptoJS.enc.Utf8);
    return base64ToArrayBuffer(base64Data);
  } catch (error) {
    console.error('File decryption error:', error);
    return null;
  }
};

// Download decrypted file
export const downloadFile = (arrayBuffer, filename, mimeType) => {
  const blob = new Blob([arrayBuffer], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
