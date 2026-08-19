import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notification, NotificationDocument } from './schemas/notification.schema';
@Injectable()
export class NotificationsService {
  constructor(@InjectModel(Notification.name) private readonly model: Model<NotificationDocument>) {}
  async list(userId: string) {
    const rows = await this.model.find({ userId }).sort({ createdAt: -1 }).limit(100).lean();
    return rows.map((r: any) => ({
      id: String(r._id),
      title: r.title,
      message: r.message,
      read: r.read,
      createdAt: r.createdAt,
    }));
  }
  markRead(userId: string, id: string) { return this.model.updateOne({ _id: id, userId }, { read: true }); }
  create(userId: string, title: string, message: string) { return this.model.create({ userId, title, message }); }
}