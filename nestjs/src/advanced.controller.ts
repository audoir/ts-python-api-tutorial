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
  constructor(private reflector: Reflector) {}

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

}
