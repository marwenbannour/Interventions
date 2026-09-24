import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentProfile } from '../agents/entities/agent-profile.entity';
import { LocationPing } from './entities/location-ping.entity';
import { LocationController } from './location.controller';
import { LocationService } from './location.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([LocationPing, AgentProfile])],
  providers: [LocationService],
  controllers: [LocationController],
  exports: [LocationService],
})
export class LocationModule {}
