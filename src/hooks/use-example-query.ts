import { useQuery } from "@tanstack/react-query";

type ExampleItem = { id: number; name: string };
type ExampleResponse = { items: ExampleItem[]; fetchedAt: string };

async function fetchExample(): Promise<ExampleResponse> {
  const res = await fetch("/api/example");
  if (!res.ok) {
    throw new Error("Failed to fetch example data");
  }
  return res.json();
}

// Plays the role of a repository + cache layer: caching, refetch and
// loading/error state are handled by TanStack Query instead of being
// hand-rolled, the way you might combine a repository class with a
// simple in-memory cache in a Flutter app.
export function useExampleQuery() {
  return useQuery({
    queryKey: ["example"],
    queryFn: fetchExample,
  });
}
