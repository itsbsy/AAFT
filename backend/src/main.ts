import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

// basic setup for now — CORS, validation pipe, etc. will improve later
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
