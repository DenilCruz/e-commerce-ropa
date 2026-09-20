import { Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { MailQueueService } from './mail-queue.service';
import { MailController } from './mail.controller';

@Module({
  controllers: [MailController],
  providers: [MailService, MailQueueService],
  exports: [MailService, MailQueueService],
})
export class MailModule {}
