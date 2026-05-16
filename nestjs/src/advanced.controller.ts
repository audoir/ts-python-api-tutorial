import {
  Controller,
  Get,
  BadRequestException,
  UseGuards,
  CanActivate,
  ExecutionContext,
  Injectable,
  SetMetadata,
  UseInterceptors,
  NestInterceptor,
  CallHandler,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Observable, map } from "rxjs";

// ─── 0. Dependency Injection Example ─────────────────────────────────────────
//
// Pattern: program to an interface, swap the implementation in the module.
// The controller never changes — only the provider registration in AppModule does.

// Abstract interface (the "contract")
export abstract class GreetingService {
  abstract getRandomGreeting(): string;
  abstract getStats(): { implementation: string; totalGreetings: number; greetings: string[] };
}

// Implementation A — human languages
@Injectable()
export class HumanGreetingService extends GreetingService {
  private readonly greetings = ["Hello", "Hola", "Bonjour", "Ciao", "こんにちは"];

  getRandomGreeting(): string {
    return this.greetings[Math.floor(Math.random() * this.greetings.length)];
  }

  getStats() {
    return {
      implementation: "HumanGreetingService",
      totalGreetings: this.greetings.length,
      greetings: this.greetings,
    };
  }
}

// Implementation B — fictional / sci-fi languages
@Injectable()
export class FictionalGreetingService extends GreetingService {
  private readonly greetings = ["Qapla'", "Shaka, when the walls fell", "Hodor", "Bazinga", "Expecto Patronum"];

  getRandomGreeting(): string {
    return this.greetings[Math.floor(Math.random() * this.greetings.length)];
  }

  getStats() {
    return {
      implementation: "FictionalGreetingService",
      totalGreetings: this.greetings.length,
      greetings: this.greetings,
    };
  }
}

// The token used to register the active implementation in AppModule.
// Swap `HumanGreetingService` ↔ `FictionalGreetingService` there — nothing
// else in the codebase needs to change.
export const GREETING_SERVICE_TOKEN = GreetingService;

// ─── 1. Custom Guard ─────────────────────────────────────────────────────────

const IS_PUBLIC_KEY = "isPublic";
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
    }>();
    const apiKey = request.headers["x-api-key"];
    if (apiKey !== "secret-key-123") {
      throw new BadRequestException(
        "Invalid or missing API key (use x-api-key: secret-key-123)"
      );
    }
    return true;
  }
}

// ─── 2. Response Transform Interceptor ───────────────────────────────────────

interface WrappedResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

@Injectable()
export class WrapResponseInterceptor<T>
  implements NestInterceptor<T, WrappedResponse<T>>
{
  intercept(
    _context: ExecutionContext,
    next: CallHandler<T>
  ): Observable<WrappedResponse<T>> {
    return next.handle().pipe(
      map((data) => ({
        success: true,
        data,
        timestamp: new Date().toISOString(),
      }))
    );
  }
}


// ─── 3. Controller ────────────────────────────────────────────────────────────

@Controller("api/advanced")
@UseGuards(ApiKeyGuard)
@UseInterceptors(WrapResponseInterceptor)
export class AdvancedController {
  // NestJS injects both Reflector and GreetingService via the constructor.
  // No manual instantiation needed — the IoC container handles it.
  constructor(
    private reflector: Reflector,
    private greetingService: GreetingService
  ) {}

  // GET /api/advanced/public — no API key required (Public decorator)
  @Get("public")
  @Public()
  publicEndpoint() {
    return {
      message: "This endpoint is public — no API key needed!",
      features: [
        "Custom Guards with @UseGuards",
        "Metadata with @SetMetadata / custom decorators",
        "Response interceptors with @UseInterceptors",
      ],
    };
  }

  // GET /api/advanced/guarded — requires API key
  @Get("guarded")
  guardedEndpoint() {
    return {
      message: "You passed the API key check!",
      note: "This response is also wrapped by WrapResponseInterceptor.",
    };
  }

  // GET /api/advanced/di — demonstrates dependency injection with swappable implementations
  @Get("di")
  @Public()
  dependencyInjectionDemo() {
    return {
      message: "Dependency Injection in action!",
      greeting: this.greetingService.getRandomGreeting(),
      ...this.greetingService.getStats(),
      tip: "Change `useClass` in AppModule from HumanGreetingService to FictionalGreetingService — the controller code stays identical.",
    };
  }
}
