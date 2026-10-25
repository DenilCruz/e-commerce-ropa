import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PushSubscriptionEntity } from './entities/push-subscription.entity';
import { PUSH_SENDER } from './push-sender';
import { PushController } from './push.controller';
import { PushService } from './push.service';
import { WebPushSender } from './web-push.sender';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([PushSubscriptionEntity])],
  controllers: [PushController],
  providers: [PushService, { provide: PUSH_SENDER, useClass: WebPushSender }],
  exports: [PushService],
})
export class NotificacionesModule {}
