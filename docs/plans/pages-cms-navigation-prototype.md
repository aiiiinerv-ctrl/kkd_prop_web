# Pages CMS navigation prototype

Status: owner review required. This is a read-only throwaway prototype, not production implementation.

## Question

Which admin interaction best expresses a `Pages` root with six children, per-page Content and Properties controls, unsaved-change protection, TH/EN preview, responsive navigation, accessibility, and confirmation for high-risk SEO changes?

The three variants live on one authenticated route and are selected with `?variant=`:

- `A — Sidebar tree`: the six pages are always visible below the Pages root. The editor is a focused form with Content/Properties tabs, readiness checks, and a sticky unsaved bar.
- `B — Live studio`: Pages stays compact in the global sidebar. Editing and a persistent responsive preview share the workspace.
- `C — Pages hub`: a six-page status overview comes first. Editing uses task-oriented section navigation and a publish-readiness summary.

All variants are mocked and read-only. They do not call server actions, write the database, upload files, or publish content.

## Shared interaction guardrails

- TH and EN can be reviewed from the same workspace.
- A modified field sets an explicit unsaved state.
- Switching pages with unsaved edits is intercepted and requires the user to return or discard changes.
- Changing `robots` index state requires a warning and explicit confirmation; the copy explains audit logging.
- SEO inputs are typed fields; no raw HTML or scripts are accepted.
- Mobile replaces the hidden desktop sidebar with a page selector.
- Tabs use tab roles, controls have accessible names, and the prototype switcher supports left/right arrow keys unless a text field is focused.

## Recommendation for owner review

Use A as the navigation foundation because it most literally and predictably represents the agreed Pages root and six children. Borrow B's persistent preview as an optional desktop preview mode or drawer rather than making it the only editing layout. Keep C's readiness summary for a later Pages overview if editors need cross-page triage; do not make the hub a prerequisite for every edit.

## Evidence

- [Variant A — sidebar tree](assets/pages-cms-prototype/variant-a-sidebar-tree-desktop.png)
- [Variant B — live studio](assets/pages-cms-prototype/variant-b-live-studio-desktop.png)
- [Variant C — pages hub](assets/pages-cms-prototype/variant-c-pages-hub-desktop.png)
- [Variant A — mobile](assets/pages-cms-prototype/variant-a-mobile.png)
- [High-risk SEO confirmation](assets/pages-cms-prototype/high-risk-seo-confirmation.png)

Verification performed on 2026-08-25:

- ESLint passed for the prototype route and modified admin sidebar.
- Next.js 16 production build compiled successfully, TypeScript finished, and 49 static pages generated. The existing storage NFT tracing warning remained.
- Authenticated production smoke rendered A, B, and C.
- Playwright confirmed the six-child Pages tree, unsaved-navigation guard, noindex confirmation, persistent preview, six-page hub, and mobile page selector.
