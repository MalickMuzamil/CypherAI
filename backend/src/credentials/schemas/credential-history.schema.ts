import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { CredentialCategory } from './credential.schema';

export type CredentialHistoryDocument = HydratedDocument<CredentialHistory>;

export type HistoryChangeType = 'CREATE' | 'UPDATE' | 'RESTORE';

@Schema({ timestamps: true, collection: 'credential_history' })
export class CredentialHistory {
  @Prop({ required: true, index: true })
  credentialId!: string;

  @Prop({ required: true, index: true })
  ownerId!: string;

  @Prop({ required: true })
  version!: number;

  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  username!: string;

  @Prop({ enum: CredentialCategory, default: CredentialCategory.OTHER })
  category!: CredentialCategory;

  @Prop()
  url?: string;

  @Prop()
  notesEncrypted?: string;

  @Prop({ required: true })
  passwordEncrypted!: string;

  @Prop({ required: true })
  changedBy!: string;

  @Prop({ required: true, default: Date.now })
  changedAt!: Date;

  @Prop({ required: true, default: 'UPDATE' })
  changeType!: HistoryChangeType;
}

export const CredentialHistorySchema = SchemaFactory.createForClass(CredentialHistory);
CredentialHistorySchema.index({ credentialId: 1, version: -1 });
