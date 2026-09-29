import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { DOCUMENTS_QUEUE, DocumentsListener, DocumentsProcessor } from './documents.processor';
import { DocumentsService } from './documents.service';

@Module({
  imports: [BullModule.registerQueue({ name: DOCUMENTS_QUEUE })],
  providers: [DocumentsService, DocumentsProcessor, DocumentsListener],
  controllers: [DocumentsController],
  exports: [DocumentsService],
})
export class DocumentsModule {}
