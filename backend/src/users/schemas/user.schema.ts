import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;
export enum Role { USER='USER', ADMIN='ADMIN', SUPER_ADMIN='SUPER_ADMIN' }

@Schema({ timestamps: true, collection: 'users' })
export class User {
  @Prop({ required: true, trim: true, maxlength: 120 }) name!: string;
  @Prop({ required: true, unique: true, lowercase: true, index: true }) email!: string;
  @Prop({ required: true }) passwordHash!: string;
  @Prop({ enum: Role, default: Role.USER, index: true }) role!: Role;
  @Prop({ default: false }) mfaEnabled!: boolean;
  @Prop() mfaSecretEncrypted?: string;
  @Prop({ default: false }) disabled!: boolean;
  @Prop() lastLoginAt?: Date;
  @Prop() lastActivityAt?: Date;
}
export const UserSchema = SchemaFactory.createForClass(User);