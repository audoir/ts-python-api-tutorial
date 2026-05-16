"use client";

import { useState } from "react";

const NESTJS_API = "http://localhost:3002";
const API_KEY = "secret-key-123";

type DemoSection = "public" | "guard" | "di";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="bg-zinc-900 text-green-300 rounded-lg p-4 text-xs overflow-x-auto whitespace-pre-wrap">
      {code}
    </pre>
  );
}

function SectionHeader({
  title,
  badge,
  description,
}: {
  title: string;
  badge: string;
  description: string;
}) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-1">
        <h3 className="text-base font-semibold text-gray-800 dark:text-zinc-100">
          {title}
        </h3>
        <span className="text-xs bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full font-medium">
          {badge}
        </span>
      </div>
      <p className="text-sm text-gray-500 dark:text-zinc-400">{description}</p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function NestjsAdvanced() {
  const [activeSection, setActiveSection] = useState<DemoSection>("public");

  // ── Public endpoint state ──
  const [publicResult, setPublicResult] = useState<string | null>(null);
  const [publicLoading, setPublicLoading] = useState(false);

  // ── Guard demo state ──
  const [guardApiKey, setGuardApiKey] = useState(API_KEY);
  const [guardResult, setGuardResult] = useState<string | null>(null);
  const [guardLoading, setGuardLoading] = useState(false);

  // ── DI demo state ──
  const [diResult, setDiResult] = useState<string | null>(null);
  const [diLoading, setDiLoading] = useState(false);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  async function fetchPublic() {
    setPublicLoading(true);
    setPublicResult(null);
    try {
      const res = await fetch(`${NESTJS_API}/api/advanced/public`);
      const data = await res.json();
      setPublicResult(JSON.stringify(data, null, 2));
    } catch {
      setPublicResult("Error: could not reach NestJS server");
    } finally {
      setPublicLoading(false);
    }
  }

  async function fetchGuarded() {
    setGuardLoading(true);
    setGuardResult(null);
    try {
      const res = await fetch(`${NESTJS_API}/api/advanced/guarded`, {
        headers: { "x-api-key": guardApiKey },
      });
      const data = await res.json();
      setGuardResult(JSON.stringify(data, null, 2));
    } catch {
      setGuardResult("Error: could not reach NestJS server");
    } finally {
      setGuardLoading(false);
    }
  }

  async function fetchDi() {
    setDiLoading(true);
    setDiResult(null);
    try {
      const res = await fetch(`${NESTJS_API}/api/advanced/di`);
      const data = await res.json();
      setDiResult(JSON.stringify(data, null, 2));
    } catch {
      setDiResult("Error: could not reach NestJS server");
    } finally {
      setDiLoading(false);
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  const sectionTabs: { id: DemoSection; label: string }[] = [
    { id: "public", label: "🌐 Public Endpoint" },
    { id: "guard", label: "🔑 API Key Guard" },
    { id: "di", label: "🧩 Dependency Injection" },
  ];

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <h2 className="text-xl font-semibold text-gray-700 dark:text-zinc-200 mb-2">
        Advanced NestJS
      </h2>
      <p className="text-sm text-gray-500 dark:text-zinc-400 mb-6">
        Explore advanced NestJS patterns: custom guards, response interceptors,
        and metadata decorators — all in one demo.
      </p>

      {/* Sub-tab navigation */}
      <div className="flex flex-wrap gap-2 mb-8">
        {sectionTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeSection === tab.id
                ? "bg-purple-600 text-white"
                : "bg-gray-100 dark:bg-zinc-700 text-gray-600 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-zinc-600"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Public Endpoint ── */}
      {activeSection === "public" && (
        <div className="bg-white dark:bg-zinc-800 rounded-xl shadow p-6 flex flex-col gap-4">
          <SectionHeader
            title="Public Endpoint"
            badge="@Public() decorator"
            description="This endpoint bypasses the ApiKeyGuard using a custom @Public() decorator built with @SetMetadata. The guard reads this metadata via the Reflector service."
          />
          <CodeBlock
            code={`// Custom decorator
export const Public = () => SetMetadata('isPublic', true);

// Guard checks for the metadata
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  canActivate(ctx: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride('isPublic', [
      ctx.getHandler(), ctx.getClass(),
    ]);
    if (isPublic) return true;
    // ... check x-api-key header
  }
}

// Usage on a route
@Get('public')
@Public()
publicEndpoint() { ... }`}
          />
          <button
            onClick={fetchPublic}
            disabled={publicLoading}
            className="self-start bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-medium rounded-lg px-5 py-2 transition-colors"
          >
            {publicLoading ? "Loading…" : "GET /api/advanced/public"}
          </button>
          {publicResult && <CodeBlock code={publicResult} />}
        </div>
      )}

      {/* ── Guard Demo ── */}
      {activeSection === "guard" && (
        <div className="bg-white dark:bg-zinc-800 rounded-xl shadow p-6 flex flex-col gap-4">
          <SectionHeader
            title="API Key Guard + Response Interceptor"
            badge="@UseGuards + @UseInterceptors"
            description="The AdvancedController is protected by a custom ApiKeyGuard. Try sending the correct key vs. a wrong one to see the guard in action. Every response is also wrapped by a WrapResponseInterceptor."
          />
          <CodeBlock
            code={`@Controller('api/advanced')
@UseGuards(ApiKeyGuard)                   // protects all routes
@UseInterceptors(WrapResponseInterceptor) // wraps every response
export class AdvancedController { ... }

// Interceptor wraps every response:
// { success: true, data: <original>, timestamp: "..." }`}
          />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-600 dark:text-zinc-400">
              x-api-key header value
            </label>
            <input
              type="text"
              value={guardApiKey}
              onChange={(e) => setGuardApiKey(e.target.value)}
              className="border border-gray-300 dark:border-zinc-600 rounded-lg px-3 py-2 text-gray-800 dark:text-zinc-100 bg-white dark:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-purple-400 font-mono text-sm"
            />
            <p className="text-xs text-gray-400 dark:text-zinc-500">
              Correct key: <code className="font-mono">secret-key-123</code>
            </p>
          </div>
          <button
            onClick={fetchGuarded}
            disabled={guardLoading}
            className="self-start bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-medium rounded-lg px-5 py-2 transition-colors"
          >
            {guardLoading ? "Loading…" : "GET /api/advanced/guarded"}
          </button>
          {guardResult && <CodeBlock code={guardResult} />}
        </div>
      )}

      {/* ── Dependency Injection Demo ── */}
      {activeSection === "di" && (
        <div className="bg-white dark:bg-zinc-800 rounded-xl shadow p-6 flex flex-col gap-4">
          <SectionHeader
            title="Dependency Injection — Swappable Implementations"
            badge="@Injectable() + useClass"
            description="Program to an abstract class (the contract), then bind a concrete implementation in the module. Swap the implementation by changing one line in AppModule — the controller never changes."
          />

          {/* Step 1 — abstract contract */}
          <p className="text-xs font-semibold uppercase tracking-wide text-purple-500 dark:text-purple-400">
            Step 1 — Define the contract (abstract class)
          </p>
          <CodeBlock
            code={`// abstract class acts as both the type and the DI token
export abstract class GreetingService {
  abstract getRandomGreeting(): string;
  abstract getStats(): { implementation: string; greetings: string[] };
}`}
          />

          {/* Step 2 — two implementations */}
          <p className="text-xs font-semibold uppercase tracking-wide text-purple-500 dark:text-purple-400">
            Step 2 — Two concrete implementations
          </p>
          <CodeBlock
            code={`@Injectable()
export class HumanGreetingService extends GreetingService {
  private readonly greetings = ['Hello', 'Hola', 'Bonjour', 'Ciao', 'こんにちは'];
  getRandomGreeting() { return this.greetings[Math.floor(Math.random() * this.greetings.length)]; }
  getStats() { return { implementation: 'HumanGreetingService', greetings: this.greetings }; }
}

@Injectable()
export class FictionalGreetingService extends GreetingService {
  private readonly greetings = ["Qapla'", 'Shaka, when the walls fell', 'Hodor', 'Bazinga'];
  getRandomGreeting() { return this.greetings[Math.floor(Math.random() * this.greetings.length)]; }
  getStats() { return { implementation: 'FictionalGreetingService', greetings: this.greetings }; }
}`}
          />

          {/* Step 3 — module wiring */}
          <p className="text-xs font-semibold uppercase tracking-wide text-purple-500 dark:text-purple-400">
            Step 3 — Bind the implementation in AppModule
          </p>
          <CodeBlock
            code={`@Module({
  providers: [
    {
      provide: GreetingService,          // ← the abstract token
      useClass: HumanGreetingService,    // ← swap to FictionalGreetingService here
    },
  ],
})
export class AppModule {}`}
          />

          {/* Step 4 — controller unchanged */}
          <p className="text-xs font-semibold uppercase tracking-wide text-purple-500 dark:text-purple-400">
            Step 4 — Controller stays identical regardless of which implementation is active
          </p>
          <CodeBlock
            code={`@Controller('api/advanced')
export class AdvancedController {
  constructor(private greetingService: GreetingService) {} // ← abstract type only

  @Get('di')
  @Public()
  dependencyInjectionDemo() {
    return {
      greeting: this.greetingService.getRandomGreeting(), // works with either impl
      ...this.greetingService.getStats(),
    };
  }
}`}
          />

          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg px-4 py-3 text-xs text-amber-800 dark:text-amber-300">
            💡 The server is currently wired to <strong>HumanGreetingService</strong>. To see the swap in action, change <code>useClass</code> in <code>nestjs/src/app.module.ts</code> to <code>FictionalGreetingService</code> and restart the NestJS server.
          </div>

          <button
            onClick={fetchDi}
            disabled={diLoading}
            className="self-start bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-medium rounded-lg px-5 py-2 transition-colors"
          >
            {diLoading ? "Loading…" : "GET /api/advanced/di"}
          </button>
          {diResult && <CodeBlock code={diResult} />}
        </div>
      )}
    </div>
  );
}
