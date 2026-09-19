import { z } from 'zod';

export const CreateProductSchema = z.object({
  name: z.string().min(3),
  description: z.string().min(10),
  basePrice: z.number().positive(),
  categoryId: z.string().uuid(),
});

export type CreateProductDto = z.infer<typeof CreateProductSchema>;
