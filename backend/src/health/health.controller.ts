import { Controller, Get } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
@Controller('health')
export class HealthController {
  constructor(@InjectConnection() private readonly db: Connection) {}
  @Public()
  @Get()
  status() { return { status: 'ok', database: this.db.readyState === 1 ? 'connected' : 'disconnected', timestamp: new Date().toISOString() }; }
}