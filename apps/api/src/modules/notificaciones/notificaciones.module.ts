import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PushSubscriptionEntity } from './entities/push-subscription.entity';
import { ExpoPushSender } from './expo-push.sender';
import { EXPO_PUSH_SENDER, PUSH_SENDER } from './push-sender';
import { PushController } from './push.controller';
import { PushService } from './push.service';
import { WebPushSender } from './web-push.sender';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([PushSubscriptionEntity])],
  controllers: [PushController],
  providers: [
    PushService,
    { provide: PUSH_SENDER, useClass: WebPushSender },
    { provide: EXPO_PUSH_SENDER, useClass: ExpoPushSender },
  ],
  exports: [PushService],
})
export class NotificacionesModule {}
