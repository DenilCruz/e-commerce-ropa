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

  // Stripe signs the exact bytes it sends, so the webhook keeps its raw body next to the parsed one
  app.use(
    express.json({
      limit: '50mb',
      verify: (req: any, _res, buf) => {
        if (req.originalUrl?.split('?')[0].endsWith('/webhooks/stripe')) req.rawBody = buf;
      },
    }),
  );
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

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
  app.use(express.static(uploadsFolder));

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
