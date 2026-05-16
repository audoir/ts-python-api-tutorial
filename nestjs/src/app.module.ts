import { Module } from "@nestjs/common";
import { ItemsController } from "./items.controller";
import {
  AdvancedController,
  ApiKeyGuard,
  GreetingService,
  HumanGreetingService,
  FictionalGreetingService,
} from "./advanced.controller";

@Module({
  controllers: [ItemsController, AdvancedController],
  providers: [
    ApiKeyGuard,
    // Custom provider: bind the abstract GreetingService token to a concrete class.
    // Swap `useClass` to FictionalGreetingService to change the implementation
    // without touching the controller at all.
    {
      provide: GreetingService,
      useClass: HumanGreetingService,
      // useClass: FictionalGreetingService,
    },
  ],
})
export class AppModule {}
