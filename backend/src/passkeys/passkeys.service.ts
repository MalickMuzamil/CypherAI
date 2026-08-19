import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import { Passkey, PasskeyDocument } from './schemas/passkey.schema';
import {
  WebAuthnChallenge,
  WebAuthnChallengeDocument,
} from './schemas/webauthn-challenge.schema';
import { UsersService } from '../users/users.service';
import { AuthService } from '../auth/auth.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class PasskeysService {
  constructor(
    @InjectModel(Passkey.name)
    private readonly passkeyModel: Model<PasskeyDocument>,
    @InjectModel(WebAuthnChallenge.name)
    private readonly challengeModel: Model<WebAuthnChallengeDocument>,
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
  ) {}

  private getRpConfig() {
    return {
      rpName: this.config.get<string>('WEBAUTHN_RP_NAME', 'Vaultly'),
      rpID: this.config.get<string>('WEBAUTHN_RP_ID', 'localhost'),
      origin: this.config.get<string>('WEBAUTHN_ORIGIN', 'http://localhost:3000'),
    };
  }

  // 1. Begin Registration (Auth required)
  async beginRegistration(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const { rpName, rpID } = this.getRpConfig();

    const existingPasskeys = await this.passkeyModel.find({
      userId,
      revokedAt: { $exists: false },
    }).lean();

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: new Uint8Array(Buffer.from(String(user._id))),
      userName: user.email,
      userDisplayName: user.name,
      attestationType: 'none',
      excludeCredentials: existingPasskeys.map((p) => ({
        id: p.credentialId,
        transports: (p.transports as any) || ['internal', 'hybrid'],
      })),
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
    });

    // Save challenge with 5m TTL
    await this.challengeModel.create({
      userId,
      challenge: options.challenge,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    return options;
  }

  // 2. Finish Registration (Auth required)
  async finishRegistration(userId: string, body: any, name?: string) {
    const challengeDoc = await this.challengeModel
      .findOne({ userId })
      .sort({ createdAt: -1 });

    if (!challengeDoc) {
      throw new BadRequestException('Registration challenge expired or not found');
    }

    const { rpID, origin } = this.getRpConfig();

    let verification;
    try {
      verification = await verifyRegistrationResponse({
        response: body,
        expectedChallenge: challengeDoc.challenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
      });
    } catch (error) {
      throw new BadRequestException(`Verification failed: ${(error as Error).message}`);
    }

    if (!verification.verified || !verification.registrationInfo) {
      throw new BadRequestException('Passkey registration could not be verified');
    }

    const { credential, credentialDeviceType } = verification.registrationInfo;

    // Delete challenge
    await this.challengeModel.deleteMany({ userId });

    const credentialPublicKeyBase64 = Buffer.from(credential.publicKey).toString('base64url');

    const passkey = await this.passkeyModel.create({
      userId,
      credentialId: credential.id,
      credentialPublicKey: credentialPublicKeyBase64,
      counter: credential.counter,
      transports: body.response?.transports || ['internal'],
      name: name || `Passkey (${credentialDeviceType || 'Device'})`,
      deviceType: credentialDeviceType,
    });

    await this.audit.log({
      action: 'PASSKEY_REGISTERED',
      resourceType: 'PASSKEY',
      resourceId: String(passkey._id),
      actorId: userId,
    });

    return {
      verified: true,
      passkey: {
        id: String(passkey._id),
        name: passkey.name,
        createdAt: passkey.createdAt,
      },
    };
  }

  // 3. Begin Authentication (Public)
  async beginAuthentication(email?: string) {
    const { rpID } = this.getRpConfig();

    let allowCredentials: any[] | undefined = undefined;

    if (email) {
      const user = await this.usersService.findByEmail(email);
      if (user) {
        const passkeys = await this.passkeyModel.find({
          userId: String(user._id),
          revokedAt: { $exists: false },
        }).lean();

        allowCredentials = passkeys.map((p) => ({
          id: p.credentialId,
          transports: (p.transports as any) || ['internal', 'hybrid'],
        }));
      }
    }

    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials,
      userVerification: 'preferred',
    });

    // Save challenge with 5m TTL
    await this.challengeModel.create({
      challenge: options.challenge,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    return options;
  }

  // 4. Finish Authentication (Public)
  async finishAuthentication(body: any, meta: any) {
    const credentialId = body.id;
    if (!credentialId) {
      throw new BadRequestException('Missing credential ID in authentication response');
    }

    const passkey = await this.passkeyModel.findOne({
      credentialId,
      revokedAt: { $exists: false },
    });

    if (!passkey) {
      throw new UnauthorizedException('Passkey not registered or has been revoked');
    }

    const user = await this.usersService.findById(passkey.userId);
    if (!user || user.disabled) {
      throw new UnauthorizedException('Account unavailable or disabled');
    }

    const challengeDoc = await this.challengeModel
      .findOne({ challenge: { $exists: true } })
      .sort({ createdAt: -1 });

    if (!challengeDoc) {
      throw new BadRequestException('Authentication challenge expired or not found');
    }

    const { rpID, origin } = this.getRpConfig();

    let verification;
    try {
      verification = await verifyAuthenticationResponse({
        response: body,
        expectedChallenge: challengeDoc.challenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        credential: {
          id: passkey.credentialId,
          publicKey: new Uint8Array(Buffer.from(passkey.credentialPublicKey, 'base64url')),
          counter: passkey.counter,
          transports: (passkey.transports as any) || ['internal'],
        },
      });
    } catch (err) {
      throw new UnauthorizedException(`Passkey authentication failed: ${(err as Error).message}`);
    }

    if (!verification.verified) {
      throw new UnauthorizedException('Passkey authentication verification failed');
    }

    // Update counter and lastUsedAt
    passkey.counter = verification.authenticationInfo.newCounter;
    passkey.lastUsedAt = new Date();
    await passkey.save();

    // Clean challenges
    await this.challengeModel.deleteMany({
      expiresAt: { $lt: new Date() },
    });

    // Issue standard session cookies
    return this.authService.issueSession(user, meta);
  }

  // 5. List Passkeys (Auth required)
  async listPasskeys(userId: string) {
    const passkeys = await this.passkeyModel
      .find({ userId, revokedAt: { $exists: false } })
      .sort({ createdAt: -1 })
      .lean();

    return passkeys.map((p) => ({
      id: String(p._id),
      name: p.name,
      deviceType: p.deviceType,
      createdAt: p.createdAt,
      lastUsedAt: p.lastUsedAt,
    }));
  }

  // 6. Revoke Passkey (Auth required)
  async revokePasskey(userId: string, id: string) {
    const passkey = await this.passkeyModel.findOne({ _id: id, userId });
    if (!passkey) throw new NotFoundException('Passkey not found');

    passkey.revokedAt = new Date();
    await passkey.save();

    await this.audit.log({
      action: 'PASSKEY_REVOKED',
      resourceType: 'PASSKEY',
      resourceId: id,
      actorId: userId,
    });

    return { ok: true };
  }

  // 7. Check if user has registered passkeys (Public)
  async checkPasskeyAvailability(email?: string) {
    if (!email) return { hasPasskey: false };
    const user = await this.usersService.findByEmail(email.toLowerCase().trim());
    if (!user) return { hasPasskey: false };
    const count = await this.passkeyModel.countDocuments({
      userId: String(user._id),
      revokedAt: { $exists: false },
    });
    return { hasPasskey: count > 0 };
  }
}


