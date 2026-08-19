import { randomBytes, randomInt } from 'crypto';

export function randomToken(bytes = 48) {
  return randomBytes(bytes).toString('base64url');
}

export function generateStrongPassword(length = 24) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*_-+=';
  return Array.from({ length }, () => alphabet[randomInt(alphabet.length)]).join('');
}