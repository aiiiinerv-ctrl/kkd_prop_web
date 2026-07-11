This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Stack

- **Next.js** (App Router) + **TypeScript** + **Tailwind CSS**
- **[Zustand](https://github.com/pmndrs/zustand)** — client/UI state
- **[TanStack Query](https://tanstack.com/query)** — server state (fetching, caching, loading/error states)
- **[shadcn/ui](https://ui.shadcn.com)** — UI components, copied into `src/components/ui` and owned by the project rather than an installed package

See `src/app/page.tsx` for a working example of all three together, `src/store/use-counter-store.ts` for the Zustand store, and `src/hooks/use-example-query.ts` + `src/app/api/example/route.ts` for the TanStack Query + API route pair.

## Coming from Flutter?

Rough equivalents to help map concepts over:

| Flutter | This project |
| --- | --- |
| `Provider` / `ChangeNotifier` | Zustand store (`create()`, subscribe via a selector hook) |
| `Riverpod` (atomic providers) | Consider [Jotai](https://jotai.org) instead of Zustand if you want smaller, composable atoms |
| A repository class + manual in-memory cache | TanStack Query's `useQuery` — caching, refetch, stale time, loading/error states are handled for you |
| A custom `Widget` / design system package | shadcn/ui components under `src/components/ui` — you own and can freely edit the code, it isn't a versioned dependency |
| `pubspec.yaml` | `package.json` |
| Hot reload | Next.js Fast Refresh (`npm run dev`) |

Adding more shadcn/ui components later: `npx shadcn@latest add <component>` (e.g. `dialog`, `input`, `form`).

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
