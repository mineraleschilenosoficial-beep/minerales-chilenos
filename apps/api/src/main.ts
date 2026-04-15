import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = Number(process.env.PORT ?? 4000);

  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? "http://localhost:3000"
  });

  await app.listen(port);
}

void bootstrap();
