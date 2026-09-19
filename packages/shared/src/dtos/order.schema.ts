import { z } from 'zod';

export const CreateOrderSchema = z.object({
  shippingAddress: z.string().min(5),
  items: z.array(
    z.object({
      variantId: z.string().uuid(),
      quantity: z.number().int().positive(),
    })
  ).min(1, 'El pedido debe contener al menos un producto'),
});

export type CreateOrderDto = z.infer<typeof CreateOrderSchema>;
