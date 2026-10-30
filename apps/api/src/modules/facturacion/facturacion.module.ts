import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PaymentsModule } from '../pagos/payments.module';
import { StoresModule } from '../tiendas/stores.module';
import { BillingService } from './billing.service';
import { StripeWebhooksService } from './stripe-webhooks.service';
import { PlanesController } from './planes.controller';
import { WebhooksController } from './webhooks.controller';

@Module({
  imports: [ConfigModule, StoresModule, PaymentsModule],
  controllers: [PlanesController, WebhooksController],
  providers: [BillingService, StripeWebhooksService],
  exports: [BillingService],
})
export class FacturacionModule {}
