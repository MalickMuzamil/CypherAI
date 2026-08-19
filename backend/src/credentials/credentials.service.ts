import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { Credential, CredentialDocument } from './schemas/credential.schema';
import {
  CredentialHistory,
  CredentialHistoryDocument,
} from './schemas/credential-history.schema';
import { CryptoService } from '../crypto/crypto.service';
import { AuditService } from '../audit/audit.service';
import { generateStrongPassword } from '../common/utils/random';

const COMMON_WEAK_PASSWORDS = new Set([
  '123456', 'password', '12345678', 'qwerty', '123456789', '12345', '1234',
  '111111', '1234567', 'dragon', 'welcome', 'admin', 'letmein', 'master',
  'monkey', 'football', 'baseball', 'iloveyou', 'pass123', 'access', 'default',
  'secret', 'login', 'shadow', 'superman', 'sunshine', 'princess', 'solo',
]);

@Injectable()
export class CredentialsService {
  constructor(
    @InjectModel(Credential.name) private readonly model: Model<CredentialDocument>,
    @InjectModel(CredentialHistory.name) private readonly historyModel: Model<CredentialHistoryDocument>,
    private readonly crypto: CryptoService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
  ) {}

  private async findOwned(id: string, ownerId: string) {
    const item = await this.model.findOne({ _id: id, ownerId });
    if (!item) throw new NotFoundException('Credential not found');
    return item;
  }

  private safe(item: any) {
    return {
      id: String(item._id),
      name: item.name,
      username: item.username,
      category: item.category,
      url: item.url,
      notes: item.notesEncrypted ? this.crypto.decrypt(item.notesEncrypted) : undefined,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      lastUsedAt: item.lastUsedAt,
    };
  }

  async list(ownerId: string, search?: string) {
    const filter: any = { ownerId };
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
        { url: { $regex: search, $options: 'i' } },
      ];
    }
    const items = await this.model.find(filter).sort({ updatedAt: -1 }).lean();
    return items.map((x) => this.safe(x));
  }

  async get(ownerId: string, id: string) {
    return this.safe(await this.findOwned(id, ownerId));
  }

  async create(ownerId: string, dto: any, meta: any) {
    const passwordEncrypted = this.crypto.encrypt(dto.password);
    const notesEncrypted = dto.notes ? this.crypto.encrypt(dto.notes) : undefined;

    const item = await this.model.create({
      ownerId,
      name: dto.name,
      username: dto.username,
      category: dto.category,
      url: dto.url,
      passwordEncrypted,
      notesEncrypted,
    });

    // Create Initial Version 1 in History
    await this.historyModel.create({
      credentialId: String(item._id),
      ownerId,
      version: 1,
      name: item.name,
      username: item.username,
      category: item.category,
      url: item.url,
      passwordEncrypted,
      notesEncrypted,
      changedBy: ownerId,
      changedAt: new Date(),
      changeType: 'CREATE',
    });

    await this.audit.log({
      action: 'CREDENTIAL_CREATED',
      resourceType: 'CREDENTIAL',
      resourceId: String(item._id),
      actorId: ownerId,
      ...meta,
    });

    return this.safe(item);
  }

  async update(ownerId: string, id: string, dto: any, meta: any) {
    const item = await this.findOwned(id, ownerId);

    // Find highest existing version
    const lastHistory = await this.historyModel
      .findOne({ credentialId: id, ownerId })
      .sort({ version: -1 })
      .lean();
    const nextVersion = (lastHistory?.version || 0) + 1;

    if (dto.name !== undefined) item.name = dto.name;
    if (dto.username !== undefined) item.username = dto.username;
    if (dto.category !== undefined) item.category = dto.category;
    if (dto.url !== undefined) item.url = dto.url;
    if (dto.password !== undefined && dto.password !== '') {
      item.passwordEncrypted = this.crypto.encrypt(dto.password);
    }
    if (dto.notes !== undefined) {
      item.notesEncrypted = dto.notes ? this.crypto.encrypt(dto.notes) : undefined;
    }

    await item.save();

    // Record snapshot in history
    await this.historyModel.create({
      credentialId: id,
      ownerId,
      version: nextVersion,
      name: item.name,
      username: item.username,
      category: item.category,
      url: item.url,
      passwordEncrypted: item.passwordEncrypted,
      notesEncrypted: item.notesEncrypted,
      changedBy: ownerId,
      changedAt: new Date(),
      changeType: 'UPDATE',
    });

    await this.audit.log({
      action: 'CREDENTIAL_UPDATED',
      resourceType: 'CREDENTIAL',
      resourceId: id,
      actorId: ownerId,
      ...meta,
    });

    return this.safe(item);
  }

  async remove(ownerId: string, id: string, meta: any) {
    await this.findOwned(id, ownerId);
    await this.model.deleteOne({ _id: id, ownerId });
    await this.historyModel.deleteMany({ credentialId: id, ownerId });

    await this.audit.log({
      action: 'CREDENTIAL_DELETED',
      resourceType: 'CREDENTIAL',
      resourceId: id,
      actorId: ownerId,
      ...meta,
    });

    return { ok: true };
  }

  async reveal(ownerId: string, id: string, meta: any) {
    const item = await this.findOwned(id, ownerId);
    item.lastUsedAt = new Date();
    await item.save();

    await this.audit.log({
      action: 'CREDENTIAL_REVEALED',
      resourceType: 'CREDENTIAL',
      resourceId: id,
      actorId: ownerId,
      ...meta,
    });

    return { password: this.crypto.decrypt(item.passwordEncrypted) };
  }

  generate(options: { length?: number } = {}) {
    const length = Math.min(Math.max(options.length || 24, 16), 128);
    return { password: generateStrongPassword(length) };
  }

  // ==========================================
  // PHASE 2: PASSWORD HEALTH ANALYSIS
  // ==========================================

  private computePasswordStrength(pwd: string): { score: number; isWeak: boolean } {
    if (!pwd) return { score: 0, isWeak: true };

    let score = 0;
    const len = pwd.length;

    if (len >= 16) score += 35;
    else if (len >= 12) score += 25;
    else if (len >= 8) score += 10;
    else score += 5;

    if (/[a-z]/.test(pwd)) score += 15;
    if (/[A-Z]/.test(pwd)) score += 15;
    if (/[0-9]/.test(pwd)) score += 15;
    if (/[^a-zA-Z0-9]/.test(pwd)) score += 20;

    // Repetition or simple pattern penalty
    if (/(.)\1{2,}/.test(pwd)) score -= 15;
    if (COMMON_WEAK_PASSWORDS.has(pwd.toLowerCase())) {
      score = 10;
    }

    score = Math.max(5, Math.min(100, score));
    const isWeak = score < 60 || len < 10 || COMMON_WEAK_PASSWORDS.has(pwd.toLowerCase());

    return { score, isWeak };
  }

  async getHealth(ownerId: string) {
    const items = await this.model.find({ ownerId }).lean();
    const hmacSecret = this.config.get<string>('PASSWORD_HMAC_KEY');

    const total = items.length;
    if (total === 0) {
      return {
        aggregate: {
          score: 100,
          total: 0,
          weakCount: 0,
          reuseCount: 0,
          oldCount: 0,
          strongCount: 0,
        },
        credentials: [],
        recommendations: ['Your vault is currently empty. Add credentials to monitor health.'],
      };
    }

    // Hash map for reuse detection
    const hashMap = new Map<string, string[]>(); // hash -> [credentialId]
    const analyzedItems: Array<{
      id: string;
      name: string;
      username: string;
      category: string;
      url?: string;
      updatedAt: Date;
      score: number;
      isWeak: boolean;
      isReused: boolean;
      isOld: boolean;
    }> = [];

    const now = Date.now();
    const ninetyDaysMs = 90 * 86400000;

    for (const item of items) {
      let plaintext = '';
      try {
        plaintext = this.crypto.decrypt(item.passwordEncrypted);
      } catch {
        plaintext = '';
      }

      const { score, isWeak } = this.computePasswordStrength(plaintext);
      const isOld = now - new Date(item.updatedAt).getTime() > ninetyDaysMs;

      // Compute deterministic hash for reuse check
      const hash = this.crypto.hmacHash(plaintext, hmacSecret);
      const existing = hashMap.get(hash) || [];
      existing.push(String(item._id));
      hashMap.set(hash, existing);

      analyzedItems.push({
        id: String(item._id),
        name: item.name,
        username: item.username,
        category: item.category,
        url: item.url,
        updatedAt: item.updatedAt,
        score,
        isWeak,
        isReused: false, // Calculated in next step
        isOld,
      });
    }

    // Set reuse flag
    let reuseCount = 0;
    let weakCount = 0;
    let oldCount = 0;
    let strongCount = 0;
    let totalScore = 0;

    for (const item of analyzedItems) {
      let plaintextHash = '';
      const doc = items.find((x) => String(x._id) === item.id);
      if (doc) {
        try {
          const pt = this.crypto.decrypt(doc.passwordEncrypted);
          plaintextHash = this.crypto.hmacHash(pt, hmacSecret);
        } catch {
          plaintextHash = '';
        }
      }

      const idsWithSameHash = hashMap.get(plaintextHash) || [];
      if (idsWithSameHash.length > 1) {
        item.isReused = true;
        reuseCount++;
      }

      if (item.isWeak) weakCount++;
      if (item.isOld) oldCount++;
      if (item.score >= 80 && !item.isWeak && !item.isReused) strongCount++;

      totalScore += item.score;
    }

    let avgScore = Math.round(totalScore / total);
    // Apply penalty for weak or reused passwords
    if (weakCount > 0) avgScore = Math.max(10, avgScore - weakCount * 8);
    if (reuseCount > 0) avgScore = Math.max(10, avgScore - reuseCount * 10);

    const recommendations: string[] = [];
    if (weakCount > 0) {
      recommendations.push(`Strengthen ${weakCount} weak password${weakCount > 1 ? 's' : ''} with 16+ characters, numbers, and symbols.`);
    }
    if (reuseCount > 0) {
      recommendations.push(`Update ${reuseCount} reused password${reuseCount > 1 ? 's' : ''} to have a unique password for each account.`);
    }
    if (oldCount > 0) {
      recommendations.push(`${oldCount} password${oldCount > 1 ? 's have' : ' has'} not been changed in over 90 days.`);
    }
    if (recommendations.length === 0) {
      recommendations.push('Excellent vault health! All your credentials are strong and unique.');
    }

    return {
      aggregate: {
        score: avgScore,
        total,
        weakCount,
        reuseCount,
        oldCount,
        strongCount,
      },
      credentials: analyzedItems,
      recommendations,
    };
  }

  // ==========================================
  // PHASE 6: CREDENTIAL HISTORY
  // ==========================================

  async listHistory(ownerId: string, credentialId: string) {
    await this.findOwned(credentialId, ownerId);
    const history = await this.historyModel
      .find({ credentialId, ownerId })
      .sort({ version: -1 })
      .lean();

    return history.map((h) => ({
      id: String(h._id),
      credentialId: h.credentialId,
      version: h.version,
      name: h.name,
      username: h.username,
      category: h.category,
      url: h.url,
      hasNotes: Boolean(h.notesEncrypted),
      changedAt: h.changedAt,
      changeType: h.changeType,
    }));
  }

  async getHistoryVersion(ownerId: string, credentialId: string, version: number) {
    await this.findOwned(credentialId, ownerId);
    const h = await this.historyModel.findOne({ credentialId, ownerId, version }).lean();
    if (!h) throw new NotFoundException('History version not found');

    return {
      id: String(h._id),
      credentialId: h.credentialId,
      version: h.version,
      name: h.name,
      username: h.username,
      category: h.category,
      url: h.url,
      notes: h.notesEncrypted ? this.crypto.decrypt(h.notesEncrypted) : undefined,
      changedAt: h.changedAt,
      changeType: h.changeType,
    };
  }

  async restoreHistoryVersion(
    ownerId: string,
    credentialId: string,
    version: number,
    meta: any,
  ) {
    const item = await this.findOwned(credentialId, ownerId);
    const targetHistory = await this.historyModel.findOne({
      credentialId,
      ownerId,
      version,
    });
    if (!targetHistory) {
      throw new NotFoundException(`History version ${version} not found`);
    }

    // Find current highest version
    const lastHistory = await this.historyModel
      .findOne({ credentialId, ownerId })
      .sort({ version: -1 })
      .lean();
    const nextVersion = (lastHistory?.version || 0) + 1;

    // Apply restored values to active credential
    item.name = targetHistory.name;
    item.username = targetHistory.username;
    item.category = targetHistory.category;
    item.url = targetHistory.url;
    item.passwordEncrypted = targetHistory.passwordEncrypted;
    item.notesEncrypted = targetHistory.notesEncrypted;
    await item.save();

    // Create a new history snapshot for this restore event
    await this.historyModel.create({
      credentialId,
      ownerId,
      version: nextVersion,
      name: item.name,
      username: item.username,
      category: item.category,
      url: item.url,
      passwordEncrypted: item.passwordEncrypted,
      notesEncrypted: item.notesEncrypted,
      changedBy: ownerId,
      changedAt: new Date(),
      changeType: 'RESTORE',
    });

    await this.audit.log({
      action: 'CREDENTIAL_RESTORED',
      resourceType: 'CREDENTIAL',
      resourceId: credentialId,
      actorId: ownerId,
      metadata: { restoredVersion: version, newVersion: nextVersion },
      ...meta,
    });

    return this.safe(item);
  }

  async revealHistoryPassword(
    ownerId: string,
    credentialId: string,
    version: number,
    meta: any,
  ) {
    await this.findOwned(credentialId, ownerId);
    const targetHistory = await this.historyModel.findOne({
      credentialId,
      ownerId,
      version,
    });
    if (!targetHistory) {
      throw new NotFoundException(`History version ${version} not found`);
    }

    await this.audit.log({
      action: 'CREDENTIAL_HISTORY_REVEALED',
      resourceType: 'CREDENTIAL',
      resourceId: credentialId,
      actorId: ownerId,
      metadata: { version },
      ...meta,
    });

    return { password: this.crypto.decrypt(targetHistory.passwordEncrypted) };
  }
}