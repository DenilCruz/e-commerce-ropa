import { ValidationPipe as NestValidationPipe } from '@nestjs/common';

export const CustomValidationPipe = new NestValidationPipe({
  whitelist: true,
  transform: true,
  forbidNonWhitelisted: true,
});
