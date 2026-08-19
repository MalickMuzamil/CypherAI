import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PasskeyDocument = HydratedDocument<Passkey>;

@Schema({ timestamps: true, collection: 'passkeys' })
export class Passkey {
  @Prop({ required: true, index: true })
  userId!: string;

  @Prop({ required: true, unique: true })
  credentialId!: string;

  @Prop({ required: true })
  credentialPublicKey!: string;

  @Prop({ required: true, default: 0 })
  counter!: number;

  @Prop({ type: [String], default: [] })
  transports!: string[];

  @Prop({ required: true, default: 'Passkey' })
  name!: string;

  @Prop()
  deviceType?: string;

  @Prop()
  lastUsedAt?: Date;

  @Prop()
  revokedAt?: Date;

  createdAt!: Date;
  updatedAt!: Date;
}

export const PasskeySchema = SchemaFactory.createForClass(Passkey);
PasskeySchema.index({ userId: 1, credentialId: 1 });
