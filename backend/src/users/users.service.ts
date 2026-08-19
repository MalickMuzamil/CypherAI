import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as argon2 from 'argon2';
import { User, UserDocument, Role } from './schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private readonly model: Model<UserDocument>) {}

  normalizeEmail(email: string) { return email.trim().toLowerCase(); }

  async create(name: string, email: string, password: string, role = Role.USER) {
    const normalized = this.normalizeEmail(email);
    const exists = await this.model.exists({ email: normalized });
    if (exists) throw new ConflictException('Email is already registered');
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    return this.model.create({ name: name.trim(), email: normalized, passwordHash, role });
  }

  async findByEmail(email: string) { return this.model.findOne({ email: this.normalizeEmail(email) }); }
  async findById(id: string) { return this.model.findById(id); }
  async list() {
    const items = await this.model.find().select('-passwordHash -mfaSecretEncrypted').sort({ createdAt: -1 }).lean();
    return items.map((u: any) => ({
      id: String(u._id),
      name: u.name,
      email: u.email,
      role: u.role,
      disabled: Boolean(u.disabled),
      mfaEnabled: Boolean(u.mfaEnabled),
      createdAt: u.createdAt,
      lastLoginAt: u.lastLoginAt,
      lastActivityAt: u.lastActivityAt,
    }));
  }

  async verifyPassword(user: UserDocument, password: string) {
    return argon2.verify(user.passwordHash, password);
  }

  async verifyPasswordById(id: string, password: string) {
    const user = await this.model.findById(id).select('+passwordHash');
    if (!user) throw new NotFoundException('User not found');
    return argon2.verify(user.passwordHash, password);
  }

  async changePassword(id: string, currentPassword: string, newPassword: string) {
    const user = await this.model.findById(id).select('+passwordHash');
    if (!user) throw new NotFoundException('User not found');
    const valid = await argon2.verify(user.passwordHash, currentPassword);
    if (!valid) throw new ConflictException('Current password is incorrect');
    if (currentPassword === newPassword) throw new ConflictException('New password must be different');
    const passwordHash = await argon2.hash(newPassword, { type: argon2.argon2id });
    await this.model.findByIdAndUpdate(id, { passwordHash });
    return true;
  }

  async touchLogin(id: string) {
    return this.model.findByIdAndUpdate(id, { lastLoginAt: new Date(), lastActivityAt: new Date() }, { new: true });
  }

  async touchActivity(id: string) {
    await this.model.findByIdAndUpdate(id, { lastActivityAt: new Date() });
  }

  async updateRole(id: string, role: Role) {
    const user = await this.model.findByIdAndUpdate(id, { role }, { new: true }).select('-passwordHash -mfaSecretEncrypted');
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async disable(id: string) {
    const user = await this.model.findByIdAndUpdate(id, { disabled: true }, { new: true }).select('-passwordHash -mfaSecretEncrypted');
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async enable(id: string) {
    return this.model.findByIdAndUpdate(id, { disabled: false }, { new: true }).select('-passwordHash -mfaSecretEncrypted');
  }

  async setMfa(id: string, secretEncrypted: string) {
    return this.model.findByIdAndUpdate(id, { mfaEnabled: true, mfaSecretEncrypted: secretEncrypted }, { new: true });
  }

  async getMfaSecret(id: string) {
    return this.model.findById(id).select('+mfaSecretEncrypted');
  }
}