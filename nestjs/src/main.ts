import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

const PORT = 3002;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: "http://localhost:3000" });
  await app.listen(PORT);
  console.log(`NestJS server running on http://localhost:${PORT}`);
}

bootstrap();
