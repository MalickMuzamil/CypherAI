import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type WebAuthnChallengeDocument = HydratedDocument<WebAuthnChallenge>;

@Schema({ timestamps: true, collection: 'webauthn_challenges' })
export class WebAuthnChallenge {
  @Prop({ index: true })
  userId?: string;

  @Prop({ required: true })
  challenge!: string;

  @Prop({ required: true })
  expiresAt!: Date;
}

export const WebAuthnChallengeSchema = SchemaFactory.createForClass(WebAuthnChallenge);
WebAuthnChallengeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
