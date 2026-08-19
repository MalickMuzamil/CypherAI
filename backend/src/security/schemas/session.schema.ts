import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
export type SessionDocument = HydratedDocument<Session>;
@Schema({ timestamps: true, collection: 'sessions' })
export class Session {
  @Prop({ required: true, index: true }) userId!: string;
  @Prop({ required: true, unique: true }) tokenHash!: string;
  @Prop({ required: true }) deviceName!: string;
  @Prop() browser?: string;
  @Prop() os?: string;
  @Prop({ default: 'desktop' }) deviceType?: string;
  @Prop() ipAddress?: string;
  @Prop() previousTokenHash?: string;
  @Prop({ required: true }) expiresAt!: Date;
  @Prop({ default: false }) revoked!: boolean;
  @Prop() lastActiveAt?: Date;
}
export const SessionSchema = SchemaFactory.createForClass(Session);
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });