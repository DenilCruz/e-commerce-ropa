import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import * as express from 'express';
import { join } from 'path';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: true,
    credentials: true,
  });

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Servir imágenes públicamente (Fix multiplataforma para Windows/Linux)
  const isApiDir = process.cwd().includes('apps/api') || process.cwd().includes('apps\\api');
  const uploadsFolder = isApiDir
    ? join(process.cwd(), 'uploads')
    : join(process.cwd(), 'apps', 'api', 'uploads');
  app.use('/uploads', express.static(uploadsFolder));

  // Swagger Configuration
  const config = new DocumentBuilder()
    .setTitle('E-Commerce Ropa API')
    .setDescription('Documentación y endpoints de la API Backend NestJS')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 Servidor API corriendo en: http://localhost:${port}/api/v1`);
  console.log(`📚 Swagger UI disponible en: http://localhost:${port}/docs`);
}
bootstrap();
