import { Module } from "@nestjs/common";
import { ItemsController } from "./items.controller";
import { AdvancedController, ApiKeyGuard } from "./advanced.controller";

@Module({
  controllers: [ItemsController, AdvancedController],
  providers: [ApiKeyGuard],
})
export class AppModule {}
