import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Session, SessionDocument } from './schemas/session.schema';
import { CryptoService } from '../crypto/crypto.service';
import { randomToken } from '../common/utils/random';

@Injectable()
export class SecurityService {
  constructor(
    @InjectModel(Session.name) private readonly model: Model<SessionDocument>,
    private readonly crypto: CryptoService,
  ) {}

  async createSession(
    userId: string,
    meta: { deviceName: string; browser?: string; os?: string; deviceType?: string; ipAddress?: string },
    days: number,
  ) {
    const token = randomToken();
    const tokenHash = this.crypto.hashToken(token);
    const expiresAt = new Date(Date.now() + days * 86400000);
    const lastActiveAt = new Date();

    // Deduplicate: Revoke any existing active session from the same browser/device
    if (meta.browser || meta.deviceName) {
      const criteria: any = { userId, revoked: false };
      if (meta.browser) criteria.browser = meta.browser;
      if (meta.os) criteria.os = meta.os;
      await this.model.updateMany(criteria, { revoked: true });
    }

    const session = await this.model.create({
      userId,
      tokenHash,
      deviceName: meta.deviceName || 'Unknown device',
      browser: meta.browser,
      os: meta.os,
      deviceType: meta.deviceType || 'desktop',
      ipAddress: meta.ipAddress,
      expiresAt,
      lastActiveAt,
      revoked: false,
    });

    return { session, refreshToken: token };
  }

  async list(userId: string, currentSessionId?: string) {
    const rows = await this.model.find({ userId, revoked: false }).sort({ lastActiveAt: -1 }).lean();

    return rows.map((row) => ({
      id: String(row._id),
      deviceName: row.deviceName,
      browser: row.browser,
      os: row.os,
      deviceType: row.deviceType || 'desktop',
      ipAddress: row.ipAddress,
      lastActiveAt: row.lastActiveAt,
      expiresAt: row.expiresAt,
      current: currentSessionId ? String(row._id) === currentSessionId : false,
    }));
  }

  async revoke(userId: string, id: string) {
    return this.model.updateOne({ _id: id, userId }, { revoked: true });
  }

  async revokeOthers(userId: string, currentSessionId: string) {
    return this.model.updateMany(
      { userId, _id: { $ne: currentSessionId }, revoked: false },
      { revoked: true },
    );
  }

  async revokeAll(userId: string) {
    return this.model.updateMany({ userId }, { revoked: true });
  }

  async validateSession(sessionId: string, userId: string): Promise<boolean> {
    const session = await this.model.findOne({
      _id: sessionId,
      userId,
      revoked: false,
      expiresAt: { $gt: new Date() },
    });
    return Boolean(session);
  }

  async rotateRefreshToken(sessionId: string, presentedToken: string, days: number) {
    const presentedHash = this.crypto.hashToken(presentedToken);
    const session = await this.model.findById(sessionId);

    if (!session) {
      throw new UnauthorizedException('Session not found');
    }

    // Reuse detection: If client presents previousTokenHash, token was likely intercepted or compromised
    if (session.previousTokenHash && session.previousTokenHash === presentedHash) {
      session.revoked = true;
      await session.save();
      throw new UnauthorizedException('Refresh token reuse detected. Session revoked.');
    }

    if (session.tokenHash !== presentedHash) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (session.revoked || session.expiresAt <= new Date()) {
      throw new UnauthorizedException('Session is expired or revoked');
    }

    // Rotate token
    const newToken = randomToken();
    const newTokenHash = this.crypto.hashToken(newToken);
    const newExpiresAt = new Date(Date.now() + days * 86400000);

    session.previousTokenHash = session.tokenHash;
    session.tokenHash = newTokenHash;
    session.expiresAt = newExpiresAt;
    session.lastActiveAt = new Date();
    await session.save();

    return { session, refreshToken: newToken };
  }

  async findByRefreshToken(token: string) {
    return this.model.findOne({
      tokenHash: this.crypto.hashToken(token),
      revoked: false,
      expiresAt: { $gt: new Date() },
    });
  }

  async touch(id: string) {
    await this.model.findByIdAndUpdate(id, { lastActiveAt: new Date() });
  }
}