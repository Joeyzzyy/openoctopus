import {
  researchDate,
  tierMeta,
  comparisonRows,
  competitorProfiles,
  sources,
  type Tier,
  type ComparisonRow,
  type CompetitorProfile,
} from "./data";

/* ------------------------------------------------------------------ */
/*  Shared UI primitives                                               */
/* ------------------------------------------------------------------ */

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="max-w-3xl">
      <p className="text-[11px] uppercase tracking-[1.2px] text-black/42">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-black md:text-4xl">
        {title}
      </h2>
      {description ? (
        <p className="mt-4 text-sm leading-7 text-black/60 md:text-[15px]">{description}</p>
      ) : null}
    </div>
  );
}

function SourceLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-medium text-black/70 transition-colors hover:border-black/20 hover:bg-black/[0.03] hover:text-black"
    >
      {children}
    </a>
  );
}

function InlineRefs({
  refs,
  links,
}: {
  refs?: readonly string[];
  links: readonly { label: string; href: string }[];
}) {
  if (!refs?.length) return null;

  const resolved = refs
    .map((ref) => links.find((link) => link.label === ref))
    .filter((link): link is { label: string; href: string } => Boolean(link));

  if (!resolved.length) return null;

  return (
    <span className="ml-1 inline-flex flex-wrap gap-1 align-middle">
      {resolved.map((link) => (
        <a
          key={`${link.label}-${link.href}`}
          href={link.href}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-black/65 underline underline-offset-2"
        >
          [{link.label}]
        </a>
      ))}
    </span>
  );
}

function EvidenceLink({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="mt-2 inline-flex text-xs font-medium text-black underline underline-offset-2"
    >
      {label}
    </a>
  );
}

function ProductLogo({
  logoUrl,
  name,
}: {
  logoUrl: string;
  name: string;
}) {
  const fallback = name.replace(/[^A-Z]/g, "").slice(0, 2) || name.slice(0, 2).toUpperCase();
  return (
    <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-black/10 bg-white text-[10px] font-semibold text-black/55">
      <span
        aria-label={`${name} logo`}
        role="img"
        className="absolute inset-0 z-10 rounded-full bg-[length:65%] bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(${logoUrl})`,
        }}
      />
      <span className="z-0">{fallback}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Inline detail panel (inside <details>)                             */
/* ------------------------------------------------------------------ */

function InlineProfileDetail({ profile }: { profile: CompetitorProfile }) {
  return (
    <div className="rounded-[22px] border border-black/8 bg-[#FBFAF7] p-5 md:p-6">
      <div className="flex flex-col gap-5 border-b border-black/8 pb-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-sm leading-8 text-black/62 md:text-[15px]">
            {profile.summary}
            <InlineRefs refs={profile.links.map((link) => link.label)} links={profile.links} />
          </p>
          <p className="mt-3 text-sm leading-7 text-black/58">
            <span className="font-medium text-black/72">求证重点：</span>
            {profile.verification}
            <InlineRefs refs={profile.links.map((link) => link.label)} links={profile.links} />
          </p>
        </div>
        <div className="flex flex-wrap gap-2 lg:max-w-[280px] lg:justify-end">
          {profile.links.map((link) => (
            <SourceLink
              key={`${profile.name}-${link.label}-${link.href}`}
              href={link.href}
            >
              {link.label}
            </SourceLink>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="rounded-[16px] border border-black/6 bg-white p-4">
          <p className="text-[11px] uppercase tracking-[1.1px] text-black/40">
            已求证信息
          </p>
          <ul className="mt-3 space-y-2.5">
            {profile.strengths.map((item) => (
              <li key={item.text} className="text-sm leading-7 text-black/64">
                {item.text}
                <InlineRefs refs={item.refs} links={profile.links} />
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-[16px] border border-black/6 bg-white p-4">
          <p className="text-[11px] uppercase tracking-[1.1px] text-black/40">
            劣势
          </p>
          <ul className="mt-3 space-y-2.5">
            {profile.weaknesses.map((item) => (
              <li key={item.text} className="text-sm leading-7 text-black/64">
                {item.text}
                <InlineRefs refs={item.refs} links={profile.links} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tier table with inline expandable details                          */
/* ------------------------------------------------------------------ */

const tierColors: Record<Tier, { badge: string; badgeText: string }> = {
  focus: { badge: "bg-[#E0F2FE]", badgeText: "text-[#075985]" },
  competitor: { badge: "bg-slate-100", badgeText: "text-slate-600" },
  other: { badge: "bg-stone-100", badgeText: "text-stone-500" },
};

const profileMap = new Map(competitorProfiles.map((p) => [p.name, p]));

function ComparisonTable({ rows }: { rows: ComparisonRow[] }) {
  return (
    <div className="mt-8 overflow-x-auto">
      <table className="min-w-full border-separate border-spacing-0">
        <thead>
          <tr>
            <th className="border-b border-black/10 px-4 py-4 text-left text-[11px] uppercase tracking-[1.1px] text-black/42">
              产品
            </th>
            <th className="border-b border-black/10 px-4 py-4 text-left text-[11px] uppercase tracking-[1.1px] text-black/42">
              平台类型
            </th>
            <th className="border-b border-black/10 px-4 py-4 text-left text-[11px] uppercase tracking-[1.1px] text-black/42">
              能力覆盖
            </th>
            <th className="border-b border-black/10 px-4 py-4 text-left text-[11px] uppercase tracking-[1.1px] text-black/42">
              价格表达
            </th>
            <th className="border-b border-black/10 px-4 py-4 text-left text-[11px] uppercase tracking-[1.1px] text-black/42">
              规则透明度
            </th>
            <th className="border-b border-black/10 px-4 py-4 text-left text-[11px] uppercase tracking-[1.1px] text-black/42">
              API 转售相似度
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const colors = tierColors[row.tier];
            const profile = profileMap.get(row.name);
            const borderClass = profile ? "" : "border-b border-black/8";
            return (
              <>
                <tr key={row.name} className="align-top">
                  <td className={`${borderClass} px-4 py-5`}>
                    <div className="flex min-w-[180px] items-center gap-3">
                      <ProductLogo logoUrl={row.logoUrl} name={row.name} />
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-black">
                            {row.name}
                          </p>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.8px] ${colors.badge} ${colors.badgeText}`}
                          >
                            {row.score.toFixed(1)}
                          </span>
                        </div>
                        <p className="text-xs text-black/45">{row.domain}</p>
                      </div>
                    </div>
                  </td>
                  <td className={`${borderClass} px-4 py-5 text-sm leading-7 text-black/62`}>
                    {row.type}
                  </td>
                  <td className={`${borderClass} px-4 py-5 text-sm leading-7 text-black/62`}>
                    {row.capability}
                  </td>
                  <td className={`${borderClass} px-4 py-5 text-sm leading-7 text-black/62`}>
                    <p>{row.pricing}</p>
                    <EvidenceLink href={row.pricingLink.href} label={row.pricingLink.label} />
                  </td>
                  <td className={`${borderClass} px-4 py-5 text-sm leading-7 text-black/62`}>
                    <p>{row.transparency}</p>
                    <EvidenceLink
                      href={row.transparencyLink.href}
                      label={row.transparencyLink.label}
                    />
                  </td>
                  <td className={`${borderClass} px-4 py-5 text-sm leading-7 text-black/62`}>
                    <p className="mb-2 font-semibold text-black">{row.relationScore}</p>
                    <p>
                      <span className="font-bold text-emerald-700">像：</span>
                      {row.relationLike}
                    </p>
                    <p className="mt-2">
                      <span className="font-bold text-sky-700">不像：</span>
                      {row.relationUnlike}
                    </p>
                  </td>
                </tr>
                {profile ? (
                  <tr key={`${row.name}-detail`}>
                    <td colSpan={6} className="border-b border-black/8 px-4 pb-5">
                      <details className="group">
                        <summary className="flex cursor-pointer select-none items-center gap-2 rounded-xl border border-black/8 bg-[#FBFAF7] px-4 py-2.5 transition-all hover:border-black/16 hover:bg-[#E0F2FE] group-open:rounded-b-none group-open:border-b-0 group-open:bg-[#E0F2FE]">
                          <svg
                            className="h-4 w-4 shrink-0 text-black/40 transition-transform duration-200 group-open:rotate-90"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                          <span className="text-xs font-semibold tracking-wide text-black/60 group-open:text-black/80">
                            详细剖析
                          </span>
                          <span className="rounded-full bg-black/6 px-2 py-0.5 text-[10px] font-medium text-black/45 group-open:hidden">
                            点击展开
                          </span>
                        </summary>
                        <div className="rounded-b-xl border border-t-0 border-black/8 bg-[#FBFAF7] p-1">
                          <InlineProfileDetail profile={profile} />
                        </div>
                      </details>
                    </td>
                  </tr>
                ) : null}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

const tiers: Tier[] = ["focus", "competitor", "other"];

const allCompetitorNames = comparisonRows.map((r) => r.name);

export const metadata = {
  title: "Competitor Analysis — OpenOctopus",
  description:
    "Objective competitor analysis for AI API resale and media generation platforms.",
};

export default function BestOfPage() {
  return (
    <div className="bg-[#F7F4EE] px-6 pb-12 pt-24 md:px-10 md:pb-16 md:pt-32 lg:px-16 xl:px-20">
      <div className="mx-auto max-w-7xl space-y-16">
        {/* Hero */}
        <section className="rounded-[32px] border border-black/10 bg-[#11100E] px-8 py-10 text-white shadow-[0_24px_80px_rgba(17,16,14,0.16)] md:px-10 md:py-12">
          <p className="text-[11px] uppercase tracking-[1.3px] text-white/42">
            Competitor Analysis / {researchDate}
          </p>
          <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-[-0.05em] md:text-6xl">
            AI API 中转售卖平台
            <br />
            竞品分析
          </h1>
          <p className="mt-6 max-w-3xl text-sm leading-8 text-white/68 md:text-[15px]">
            基于公开官方资料，对 {allCompetitorNames.length} 家竞品进行结构化对比，聚焦平台定位、能力覆盖、价格表达与规则透明度。覆盖国际直接竞品、邻近推理平台与中国市场 API 中转平台。
          </p>
        </section>

        {/* Tier sections */}
        {tiers.map((tier) => {
          const meta = tierMeta[tier];
          const rows = comparisonRows.filter((r) => r.tier === tier);
          if (!rows.length) return null;
          return (
            <section
              key={tier}
              className="rounded-[30px] border border-black/10 bg-white p-6 md:p-8"
            >
              <SectionHeader
                eyebrow={meta.eyebrow}
                title={meta.label}
                description={meta.description}
              />
              <ComparisonTable rows={rows} />
            </section>
          );
        })}

        {/* Sources */}
        <section className="rounded-[30px] border border-black/10 bg-white p-6 md:p-8">
          <SectionHeader
            eyebrow="Sources"
            title="官方来源"
          />

          <ol className="mt-8 space-y-4">
            {sources.map((source, index) => (
              <li key={source.href} className="border-b border-black/8 pb-4 last:border-b-0 last:pb-0">
                <p className="text-sm leading-7 text-black/70">
                  [{index + 1}] {source.name}.{" "}
                  <a
                    href={source.href}
                    target="_blank"
                    rel="noreferrer"
                    className="break-all text-black underline underline-offset-2"
                  >
                    {source.href}
                  </a>
                  . {source.note}
                </p>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
