"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useExampleQuery } from "@/hooks/use-example-query";
import { useCounterStore } from "@/store/use-counter-store";

export default function Home() {
  const count = useCounterStore((state) => state.count);
  const increment = useCounterStore((state) => state.increment);
  const reset = useCounterStore((state) => state.reset);

  const { data, isPending, isError } = useExampleQuery();

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-8 p-8">
      <div>
        <h1 className="text-2xl font-semibold">Next.js Fullstack Scaffold</h1>
        <p className="text-sm text-muted-foreground">
          TypeScript + Tailwind CSS + Zustand + TanStack Query + shadcn/ui
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Zustand (client state)</CardTitle>
          <CardDescription>
            Local UI state, similar to a Flutter Provider/ChangeNotifier.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-3">
          <span className="text-2xl font-mono">{count}</span>
          <Button onClick={increment}>Increment</Button>
          <Button variant="outline" onClick={reset}>
            Reset
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>TanStack Query (server state)</CardTitle>
          <CardDescription>
            Fetched from /api/example with caching handled automatically.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isPending && <p className="text-sm">Loading…</p>}
          {isError && (
            <p className="text-sm text-destructive">Failed to load data.</p>
          )}
          {data && (
            <ul className="list-inside list-disc text-sm">
              {data.items.map((item) => (
                <li key={item.id}>{item.name}</li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
