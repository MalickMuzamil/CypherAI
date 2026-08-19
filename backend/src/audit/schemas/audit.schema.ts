import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AuditDocument = HydratedDocument<AuditEvent>;

@Schema({ timestamps: true, collection: 'audit_logs' })
export class AuditEvent {
  @Prop({ required: true, index: true })
  action!: string;

  @Prop({ required: true })
  resourceType!: string;

  @Prop()
  resourceId?: string;

  @Prop({ required: true, index: true })
  actorId!: string;

  @Prop()
  actorName?: string;

  @Prop()
  ipAddress?: string;

  @Prop()
  userAgent?: string;

  @Prop({ type: Object })
  metadata?: Record<string, unknown>;
}

export const AuditSchema = SchemaFactory.createForClass(AuditEvent);

AuditSchema.index({ createdAt: -1 });
AuditSchema.index({ actorId: 1, createdAt: -1 });