import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type BreachResultDocument = HydratedDocument<BreachResult>;

@Schema({ timestamps: true, collection: 'breach_results' })
export class BreachResult {
  @Prop({ required: true, index: true })
  userId!: string;

  @Prop({ required: true, index: true })
  email!: string;

  @Prop({ type: Array, default: [] })
  breaches!: Array<{
    name: string;
    title: string;
    domain: string;
    breachDate: string;
    pwnCount: number;
    description: string;
    dataClasses: string[];
    isVerified?: boolean;
    isFabricated?: boolean;
    isSensitive?: boolean;
    isRetired?: boolean;
    isSpamList?: boolean;
  }>;

  @Prop({ default: 0 })
  pwnedPasswordCount!: number;

  @Prop({ required: true, default: Date.now })
  checkedAt!: Date;

  createdAt!: Date;
  updatedAt!: Date;
}

export const BreachResultSchema = SchemaFactory.createForClass(BreachResult);
