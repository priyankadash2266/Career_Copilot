import { z } from "zod";
import type { Ats } from "./companies";
import { htmlToText } from "./normalize";

/**
 * One parser per ATS. Third-party JSON is untrusted: Zod checks the fields we
 * rely on and ignores everything else (`.loose()`), so a vendor adding fields
 * never breaks us, and a vendor removing one fails loudly for that company only.
 */

/** The common shape every feed is converted into. */
export interface RawPosting {
  externalId: string;
  title: string;
  locations: string[];
  countryCode?: string;
  workplaceHint?: string | null;
  department?: string;
  description: string;
  url: string;
  postedAt: string; // ISO
}

const LeverSchema = z.array(
  z
    .object({
      id: z.string(),
      text: z.string(),
      hostedUrl: z.string(),
      createdAt: z.number().optional(),
      country: z.string().nullish(),
      workplaceType: z.string().nullish(),
      categories: z
        .object({
          location: z.string().nullish(),
          allLocations: z.array(z.string()).nullish(),
          team: z.string().nullish(),
          department: z.string().nullish(),
        })
        .loose()
        .optional(),
      descriptionPlain: z.string().nullish(),
      openingPlain: z.string().nullish(),
      descriptionBodyPlain: z.string().nullish(),
      lists: z.array(z.object({ text: z.string().nullish(), content: z.string().nullish() }).loose()).nullish(),
      additionalPlain: z.string().nullish(),
    })
    .loose(),
);

const GreenhouseSchema = z
  .object({
    jobs: z.array(
      z
        .object({
          id: z.number(),
          title: z.string(),
          absolute_url: z.string(),
          location: z.object({ name: z.string().nullish() }).loose().nullish(),
          offices: z.array(z.object({ name: z.string().nullish(), location: z.string().nullish() }).loose()).nullish(),
          departments: z.array(z.object({ name: z.string() }).loose()).nullish(),
          first_published: z.string().nullish(),
          updated_at: z.string().nullish(),
          content: z.string().nullish(),
        })
        .loose(),
    ),
  })
  .loose();

const AshbySchema = z
  .object({
    jobs: z.array(
      z
        .object({
          id: z.string(),
          title: z.string(),
          jobUrl: z.string(),
          location: z.string().nullish(),
          secondaryLocations: z.array(z.object({ location: z.string().nullish() }).loose()).nullish(),
          department: z.string().nullish(),
          team: z.string().nullish(),
          isRemote: z.boolean().nullish(),
          isListed: z.boolean().nullish(),
          workplaceType: z.string().nullish(),
          publishedAt: z.string().nullish(),
          descriptionPlain: z.string().nullish(),
          descriptionHtml: z.string().nullish(),
        })
        .loose(),
    ),
  })
  .loose();

const nonEmpty = (xs: (string | null | undefined)[]) => [...new Set(xs.filter((x): x is string => Boolean(x && x.trim())))];
const iso = (value: string | number | null | undefined, fallback: Date) => {
  const d = value === null || value === undefined ? fallback : new Date(value);
  return Number.isNaN(d.getTime()) ? fallback.toISOString() : d.toISOString();
};

export function parseFeed(ats: Ats, json: unknown, now: Date): RawPosting[] {
  switch (ats) {
    case "lever":
      return LeverSchema.parse(json).map((p) => ({
        externalId: p.id,
        title: p.text,
        locations: nonEmpty([p.categories?.location, ...(p.categories?.allLocations ?? [])]),
        countryCode: p.country ?? undefined,
        workplaceHint: p.workplaceType,
        department: p.categories?.team ?? p.categories?.department ?? undefined,
        description:
          p.descriptionPlain?.trim() ||
          [p.openingPlain, p.descriptionBodyPlain, ...(p.lists ?? []).map((l) => `${l.text ?? ""}\n${htmlToText(l.content ?? "")}`), p.additionalPlain]
            .filter(Boolean)
            .join("\n\n")
            .trim(),
        url: p.hostedUrl,
        postedAt: iso(p.createdAt, now),
      }));
    case "greenhouse":
      return GreenhouseSchema.parse(json).jobs.map((j) => ({
        externalId: String(j.id),
        title: j.title,
        locations: nonEmpty([j.location?.name, ...(j.offices ?? []).flatMap((o) => [o.location, o.name])]),
        department: j.departments?.[0]?.name,
        description: htmlToText(j.content ?? ""),
        url: j.absolute_url,
        postedAt: iso(j.first_published ?? j.updated_at, now),
      }));
    case "ashby":
      return AshbySchema.parse(json)
        .jobs.filter((j) => j.isListed !== false)
        .map((j) => ({
          externalId: j.id,
          title: j.title,
          locations: nonEmpty([j.location, ...(j.secondaryLocations ?? []).map((l) => l.location)]),
          workplaceHint: j.workplaceType ?? (j.isRemote ? "remote" : null),
          department: j.department ?? j.team ?? undefined,
          description: j.descriptionPlain?.trim() || htmlToText(j.descriptionHtml ?? ""),
          url: j.jobUrl,
          postedAt: iso(j.publishedAt, now),
        }));
  }
}
