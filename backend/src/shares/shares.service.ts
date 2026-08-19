import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  CredentialShare,
  CredentialShareDocument,
} from './schemas/credential-share.schema';
import {
  Credential,
  CredentialDocument,
} from '../credentials/schemas/credential.schema';
import { UsersService } from '../users/users.service';
import { CryptoService } from '../crypto/crypto.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateShareDto } from './dto/create-share.dto';

@Injectable()
export class SharesService {
  constructor(
    @InjectModel(CredentialShare.name)
    private readonly shareModel: Model<CredentialShareDocument>,
    @InjectModel(Credential.name)
    private readonly credentialModel: Model<CredentialDocument>,
    private readonly usersService: UsersService,
    private readonly crypto: CryptoService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(ownerId: string, ownerEmail: string, ownerName: string, dto: CreateShareDto, meta: any) {
    if (dto.recipientEmail.toLowerCase() === ownerEmail.toLowerCase()) {
      throw new BadRequestException('You cannot share a credential with yourself');
    }

    const credential = await this.credentialModel.findOne({
      _id: dto.credentialId,
      ownerId,
    });
    if (!credential) {
      throw new NotFoundException('Credential not found in your vault');
    }

    // Check if recipient exists in system
    const recipientUser = await this.usersService.findByEmail(dto.recipientEmail);

    // Check if existing pending or accepted share already exists
    const existing = await this.shareModel.findOne({
      credentialId: dto.credentialId,
      ownerId,
      recipientEmail: dto.recipientEmail.toLowerCase(),
      status: { $in: ['PENDING', 'ACCEPTED'] },
    });

    if (existing) {
      throw new BadRequestException('A share already exists for this recipient and credential');
    }

    const share = await this.shareModel.create({
      credentialId: dto.credentialId,
      ownerId,
      ownerEmail,
      ownerName,
      recipientEmail: dto.recipientEmail.toLowerCase(),
      recipientId: recipientUser ? String(recipientUser._id) : undefined,
      permission: dto.permission || 'READ',
      status: 'PENDING',
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
    });

    if (recipientUser) {
      await this.notifications.create(
        String(recipientUser._id),
        'New Credential Shared with You',
        `${ownerName} shared "${credential.name}" with you on Vaultly.`,
      );
    }

    await this.audit.log({
      action: 'CREDENTIAL_SHARED',
      resourceType: 'SHARE',
      resourceId: String(share._id),
      actorId: ownerId,
      actorName: ownerName,
      metadata: { recipientEmail: dto.recipientEmail, credentialId: dto.credentialId },
      ...meta,
    });

    return share;
  }

  async list(userId: string, userEmail: string) {
    const sharedByMe = await this.shareModel
      .find({ ownerId: userId, status: { $ne: 'REVOKED' } })
      .sort({ createdAt: -1 })
      .lean();

    const sharedWithMe = await this.shareModel
      .find({
        $or: [{ recipientId: userId }, { recipientEmail: userEmail.toLowerCase() }],
        status: { $ne: 'REVOKED' },
      })
      .sort({ createdAt: -1 })
      .lean();

    // Populate credential details for both lists
    const credIds = Array.from(
      new Set([
        ...sharedByMe.map((s) => s.credentialId),
        ...sharedWithMe.map((s) => s.credentialId),
      ]),
    );

    const credDocs = await this.credentialModel
      .find({ _id: { $in: credIds } })
      .lean();

    const credMap = new Map(credDocs.map((c) => [String(c._id), c]));

    const formatShare = (s: any) => {
      const cred = credMap.get(s.credentialId);
      return {
        id: String(s._id),
        credentialId: s.credentialId,
        ownerId: s.ownerId,
        ownerEmail: s.ownerEmail,
        ownerName: s.ownerName,
        recipientEmail: s.recipientEmail,
        recipientId: s.recipientId,
        permission: s.permission,
        status: s.status,
        expiresAt: s.expiresAt,
        createdAt: s.createdAt,
        acceptedAt: s.acceptedAt,
        credential: cred
          ? {
              id: String(cred._id),
              name: cred.name,
              username: cred.username,
              category: cred.category,
              url: cred.url,
            }
          : undefined,
      };
    };

    return {
      sharedByMe: sharedByMe.map(formatShare),
      sharedWithMe: sharedWithMe.map(formatShare),
    };
  }

  async accept(userId: string, userEmail: string, shareId: string, meta: any) {
    const share = await this.shareModel.findOne({
      _id: shareId,
      $or: [{ recipientId: userId }, { recipientEmail: userEmail.toLowerCase() }],
    });

    if (!share) throw new NotFoundException('Share invitation not found');
    if (share.status === 'REVOKED') throw new BadRequestException('Share has been revoked');
    if (share.expiresAt && share.expiresAt < new Date()) {
      throw new BadRequestException('Share invitation has expired');
    }

    share.status = 'ACCEPTED';
    share.recipientId = userId;
    share.acceptedAt = new Date();
    await share.save();

    await this.audit.log({
      action: 'CREDENTIAL_SHARE_ACCEPTED',
      resourceType: 'SHARE',
      resourceId: shareId,
      actorId: userId,
      ...meta,
    });

    return { ok: true, status: 'ACCEPTED' };
  }

  async decline(userId: string, userEmail: string, shareId: string, meta: any) {
    const share = await this.shareModel.findOne({
      _id: shareId,
      $or: [{ recipientId: userId }, { recipientEmail: userEmail.toLowerCase() }],
    });

    if (!share) throw new NotFoundException('Share invitation not found');

    share.status = 'DECLINED';
    await share.save();

    await this.audit.log({
      action: 'CREDENTIAL_SHARE_DECLINED',
      resourceType: 'SHARE',
      resourceId: shareId,
      actorId: userId,
      ...meta,
    });

    return { ok: true, status: 'DECLINED' };
  }

  async revoke(ownerId: string, shareId: string, meta: any) {
    const share = await this.shareModel.findOne({ _id: shareId, ownerId });
    if (!share) throw new NotFoundException('Share not found or not owned by you');

    share.status = 'REVOKED';
    share.revokedAt = new Date();
    await share.save();

    await this.audit.log({
      action: 'CREDENTIAL_SHARE_REVOKED',
      resourceType: 'SHARE',
      resourceId: shareId,
      actorId: ownerId,
      ...meta,
    });

    return { ok: true, status: 'REVOKED' };
  }

  async revealSharedPassword(userId: string, userEmail: string, shareId: string, meta: any) {
    const share = await this.shareModel.findOne({
      _id: shareId,
      $or: [{ recipientId: userId }, { recipientEmail: userEmail.toLowerCase() }],
      status: 'ACCEPTED',
    });

    if (!share) {
      throw new ForbiddenException('Access denied. No active accepted share found.');
    }

    if (share.expiresAt && share.expiresAt < new Date()) {
      throw new ForbiddenException('This shared access has expired.');
    }

    const credential = await this.credentialModel.findById(share.credentialId);
    if (!credential) {
      throw new NotFoundException('The original credential was removed by its owner.');
    }

    await this.audit.log({
      action: 'SHARED_CREDENTIAL_REVEALED',
      resourceType: 'SHARE',
      resourceId: shareId,
      actorId: userId,
      metadata: { credentialId: share.credentialId, ownerId: share.ownerId },
      ...meta,
    });

    return { password: this.crypto.decrypt(credential.passwordEncrypted) };
  }
}
