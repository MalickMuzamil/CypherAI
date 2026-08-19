import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditEvent, AuditDocument } from './schemas/audit.schema';

@Injectable()
export class AuditService {
  constructor(@InjectModel(AuditEvent.name) private readonly model: Model<AuditDocument>) {}
  async log(input: Partial<AuditEvent>) {
    return this.model.create(input);
  }
  async list(actorId?: string) {
    const items = await this.model.find(actorId ? { actorId } : {}).sort({ createdAt: -1 }).limit(500).lean();
    return items.map((r: any) => ({
      id: String(r._id),
      action: r.action,
      resourceType: r.resourceType,
      resourceId: r.resourceId,
      actorId: r.actorId,
      actorName: r.actorName,
      ipAddress: r.ipAddress,
      userAgent: r.userAgent,
      metadata: r.metadata,
      createdAt: r.createdAt,
    }));
  }
}