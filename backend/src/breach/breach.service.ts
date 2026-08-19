import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { createHash } from 'crypto';
import { BreachResult, BreachResultDocument } from './schemas/breach-result.schema';
import { Credential, CredentialDocument } from '../credentials/schemas/credential.schema';
import { CryptoService } from '../crypto/crypto.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class BreachService {
  private readonly logger = new Logger(BreachService.name);

  constructor(
    @InjectModel(BreachResult.name)
    private readonly model: Model<BreachResultDocument>,
    @InjectModel(Credential.name)
    private readonly credentialModel: Model<CredentialDocument>,
    private readonly crypto: CryptoService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  async getStatus(userId: string, email: string) {
    const existing = await this.model.findOne({ userId }).lean();
    if (existing) return existing;

    const created = await this.model.create({
      userId,
      email,
      breaches: [],
      pwnedPasswordCount: 0,
      checkedAt: new Date(0), // Never checked yet
    });
    return created.toObject();
  }

  /**
   * Check password against HaveIBeenPwned k-anonymity Range API
   * Privacy-preserving: only sends first 5 characters of SHA-1 hash
   */
  async checkPwnedPassword(plaintext: string): Promise<boolean> {
    if (!plaintext) return false;
    try {
      const sha1 = createHash('sha1').update(plaintext).digest('hex').toUpperCase();
      const prefix = sha1.substring(0, 5);
      const suffix = sha1.substring(5);

      const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
        headers: { 'User-Agent': 'Vaultly-Security-Scanner' },
        signal: AbortSignal.timeout(5000),
      });

      if (!res.ok) return false;
      const text = await res.text();
      const lines = text.split('\r\n');
      for (const line of lines) {
        const [hashSuffix] = line.split(':');
        if (hashSuffix === suffix) {
          return true;
        }
      }
      return false;
    } catch (e) {
      this.logger.warn(`Pwned password check failed or timed out: ${(e as Error).message}`);
      return false;
    }
  }

  async checkBreaches(userId: string, email: string, meta?: any) {
    const breaches: any[] = [];

    // Only the free Pwned Passwords k-anonymity check remains.
    let pwnedPasswordCount = 0;
    const credentials = await this.credentialModel.find({ ownerId: userId }).lean();
    for (const cred of credentials) {
      try {
        const plaintext = this.crypto.decrypt(cred.passwordEncrypted);
        const isPwned = await this.checkPwnedPassword(plaintext);
        if (isPwned) {
          pwnedPasswordCount++;
        }
      } catch {
        // ignore decrypt errors
      }
    }

    const updated = await this.model.findOneAndUpdate(
      { userId },
      {
        userId,
        email,
        breaches,
        pwnedPasswordCount,
        checkedAt: new Date(),
      },
      { upsert: true, new: true },
    );

    if (pwnedPasswordCount > 0) {
      await this.notifications.create(
        userId,
        'Security Alert: Compromised Passwords Found',
        `Breach monitor found ${pwnedPasswordCount} compromised password${pwnedPasswordCount === 1 ? '' : 's'} in your vault.`,
      );
    }

    await this.audit.log({
      action: 'BREACH_SCAN_COMPLETED',
      resourceType: 'SECURITY',
      actorId: userId,
      metadata: {
        breachesCount: breaches.length,
        pwnedPasswordCount,
      },
      ...meta,
    });

    return updated;
  }
}
