import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from 'crypto';

@Injectable()
export class CryptoService {
  private readonly key: Buffer;
  constructor(config: ConfigService) {
    const raw = config.getOrThrow<string>('VAULT_ENCRYPTION_KEY');
    this.key = Buffer.from(raw, 'base64');
    if (this.key.length !== 32) throw new Error('VAULT_ENCRYPTION_KEY must decode to exactly 32 bytes');
  }

  encrypt(plaintext: string) {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString('base64url')}.${tag.toString('base64url')}.${ciphertext.toString('base64url')}`;
  }

  decrypt(payload: string) {
    try {
      const [ivB64, tagB64, dataB64] = payload.split('.');
      const decipher = createDecipheriv('aes-256-gcm', this.key, Buffer.from(ivB64, 'base64url'));
      decipher.setAuthTag(Buffer.from(tagB64, 'base64url'));
      return Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64url')), decipher.final()]).toString('utf8');
    } catch {
      throw new BadRequestException('Unable to decrypt vault secret');
    }
  }

  hashToken(token: string) { return createHash('sha256').update(token).digest('hex'); }

  hmacHash(data: string, secret?: string) {
    const key = secret || this.key.toString('hex');
    return createHmac('sha256', key).update(data).digest('hex');
  }
}