import { Link } from "@/i18n/navigation";
import type { SitemapGroup } from "@/lib/sitemap/types";

type Props = {
  groups: SitemapGroup[];
  intro?: string;
};

export function PageSitemap({ groups, intro }: Props) {
  if (groups.length === 0) {
    return (
      <p className="text-center text-sm text-muted-foreground">
        {intro ?? ""}
      </p>
    );
  }

  return (
    <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
      {groups.map((group) => (
        <div key={group.id} className="min-w-0">
          <h3 className="mb-3 text-base font-bold text-primary">
            {group.children.length === 0 ? (
              <Link href={group.href} className="transition-colors hover:text-brand-orange">
                {group.label}
              </Link>
            ) : (
              <Link href={group.href} className="transition-colors hover:text-brand-orange">
                {group.label}
              </Link>
            )}
          </h3>
          {group.children.length > 0 && (
            <ul className="space-y-2 border-l-2 border-brand-orange/30 pl-4 text-sm text-muted-foreground">
              {group.children.map((child, index) => (
                <li key={`${group.id}-${index}`}>
                  <Link
                    href={child.href}
                    className="transition-colors hover:text-brand-orange"
                  >
                    {child.label}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}
