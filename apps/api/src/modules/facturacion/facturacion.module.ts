import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StoresModule } from '../tiendas/stores.module';
import { BillingService } from './billing.service';
import { PlanesController } from './planes.controller';
import { WebhooksController } from './webhooks.controller';

@Module({
  imports: [ConfigModule, StoresModule],
  controllers: [PlanesController, WebhooksController],
  providers: [BillingService],
  exports: [BillingService],
})
export class FacturacionModule {}
