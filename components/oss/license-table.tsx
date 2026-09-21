import type { OssPackage } from "@/lib/oss/packages"

export function OssLicenseTable({
  title,
  packages,
  labels,
}: {
  title: string
  packages: OssPackage[]
  labels: { package: string; version: string; license: string }
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-xl border bg-card">
      <h2 className="flex items-center gap-2 px-5 py-4 text-sm font-semibold">
        <span className="h-4 w-0.5 shrink-0 rounded-full bg-[hsl(var(--lux-cognac))]" aria-hidden />
        {title}
      </h2>
      <div
        className="overflow-x-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        tabIndex={0}
        role="region"
        aria-label={title}
      >
        <table className="w-full min-w-[22rem] text-left text-sm">
          <thead>
            <tr className="border-y bg-muted/70 text-xs font-semibold text-muted-foreground">
              <th className="px-5 py-2.5 font-semibold">{labels.package}</th>
              <th className="px-5 py-2.5 font-semibold">{labels.version}</th>
              <th className="px-5 py-2.5 font-semibold">{labels.license}</th>
            </tr>
          </thead>
          <tbody>
            {packages.map((pkg) => (
              <tr key={`${title}-${pkg.name}`} className="border-b last:border-b-0">
                <td className="px-5 py-2.5 font-mono text-[13px]">{pkg.name}</td>
                <td className="whitespace-nowrap px-5 py-2.5 tabular-nums text-muted-foreground">{pkg.version}</td>
                <td className="whitespace-nowrap px-5 py-2.5 text-muted-foreground">{pkg.license}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
