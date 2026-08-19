import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
export type NotificationDocument = HydratedDocument<Notification>;
@Schema({ timestamps: true, collection: 'notifications' })
export class Notification {
  @Prop({ required: true, index: true }) userId!: string;
  @Prop({ required: true }) title!: string;
  @Prop({ required: true }) message!: string;
  @Prop({ default: false }) read!: boolean;
}
export const NotificationSchema = SchemaFactory.createForClass(Notification);