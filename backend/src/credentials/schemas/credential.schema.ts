import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
export type CredentialDocument = HydratedDocument<Credential>;
export enum CredentialCategory { EMAIL='EMAIL', SOCIAL='SOCIAL', BANK='BANK', CLOUD='CLOUD', DATABASE='DATABASE', SERVER='SERVER', VPN='VPN', API='API', OTHER='OTHER' }

@Schema({ timestamps: true, collection: 'credentials' })
export class Credential {
  @Prop({ required: true, index: true }) ownerId!: string;
  @Prop({ required: true, trim: true, maxlength: 200 }) name!: string;
  @Prop({ required: true, maxlength: 300 }) username!: string;
  @Prop({ enum: CredentialCategory, default: CredentialCategory.OTHER, index: true }) category!: CredentialCategory;
  @Prop() url?: string;
  @Prop() notesEncrypted?: string;
  @Prop({ required: true }) passwordEncrypted!: string;
  @Prop() lastUsedAt?: Date;
  createdAt!: Date;
  updatedAt!: Date;
}
export const CredentialSchema = SchemaFactory.createForClass(Credential);
CredentialSchema.index({ ownerId: 1, name: 1 });