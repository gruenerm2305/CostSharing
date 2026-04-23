import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  app.enableCors({
  origin: process.env.FRONTEND_URL || 'http://localhost:4200',
  credentials: true,
});

app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
);

if (process.env.NODE_ENV !== 'production') {
  const config = new DocumentBuilder()
    .setTitle('Cost-Tracking API')
    .setDescription('AI-powered Receipt Processing and Cost Management API')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth', 
    )
    .addTag('auth', 'Authentication endpoints')
    .addTag('receipts', 'Receipt management')
    .addTag('categories', 'Category management')
    .addTag('splitting', 'Cost splitting')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });
}

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`Application: http://localhost:${port}/api`);
  if (process.env.NODE_ENV !== 'production') {
    console.log(`API Documentation: http://localhost:${port}/api/docs`);
  }
}
bootstrap();
