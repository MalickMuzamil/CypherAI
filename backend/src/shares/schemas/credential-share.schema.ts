import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CredentialShareDocument = HydratedDocument<CredentialShare>;

export type SharePermission = 'READ' | 'READ_WRITE';
export type ShareStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'REVOKED';

@Schema({ timestamps: true, collection: 'credential_shares' })
export class CredentialShare {
  @Prop({ required: true, index: true })
  credentialId!: string;

  @Prop({ required: true, index: true })
  ownerId!: string;

  @Prop({ required: true })
  ownerEmail!: string;

  @Prop({ required: true })
  ownerName!: string;

  @Prop({ required: true, index: true })
  recipientEmail!: string;

  @Prop({ index: true })
  recipientId?: string;

  @Prop({ default: 'READ' })
  permission!: SharePermission;

  @Prop({ default: 'PENDING', index: true })
  status!: ShareStatus;

  @Prop()
  expiresAt?: Date;

  @Prop()
  acceptedAt?: Date;

  @Prop()
  revokedAt?: Date;
}

export const CredentialShareSchema = SchemaFactory.createForClass(CredentialShare);
CredentialShareSchema.index({ ownerId: 1, recipientEmail: 1 });
