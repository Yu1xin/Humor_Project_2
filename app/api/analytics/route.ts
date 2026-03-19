// app/api/analytics/route.ts
import { createClient } from '@supabase/supabase-js';
async function fetchAllRows<T>(
  supabase: any,
  table: string,
  columns: string,
  pageSize = 1000
): Promise<T[]> {
  let allRows: T[] = [];
  let from = 0;

  while (true) {
    const to = from + pageSize - 1;

    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .range(from, to);

    if (error) throw error;
    if (!data || data.length === 0) break;

    allRows = allRows.concat(data as T[]);

    if (data.length < pageSize) break;
    from += pageSize;
  }

  return allRows;
}

type RegressionResult = {
  slope: number;
  intercept: number;
  r2: number;
  n: number;
};

type FactorCard = {
  factor: string;
  impact: number;
  desc: string;
};

type LeaderboardCard = {
  name: string;
  totalLikes: number;
  avgLikes: number;
  captionCount: number;
};

type CaptionRow = {
  id: string;
  like_count: number | null;
  content: string | null;
  image_id: string | null;
  humor_flavor_id: number | null;
  profile_id: string | null;
  created_datetime_utc: string | null;
};

type FlavorRow = {
  id: number;
  description: string | null;
};

type ProfileRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
};

type EnrichedCaptionRow = {
  id: string;
  like_count: number;
  caption_char_len: number;
  caption_word_count: number;
  image_id: string | null;
  humor_flavor_name: string;
  profile_name: string;
  created_bucket: string;
};

function safeMean(arr: number[]) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function computeSimpleLinearRegression(points: { x: number; y: number }[]): RegressionResult {
  const n = points.length;
  if (n < 2) return { slope: 0, intercept: 0, r2: 0, n };

  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  const meanX = safeMean(xs);
  const meanY = safeMean(ys);

  let numerator = 0;
  let denominator = 0;

  for (const p of points) {
    numerator += (p.x - meanX) * (p.y - meanY);
    denominator += (p.x - meanX) ** 2;
  }

  const slope = denominator === 0 ? 0 : numerator / denominator;
  const intercept = meanY - slope * meanX;

  let ssTot = 0;
  let ssRes = 0;

  for (const p of points) {
    const yHat = intercept + slope * p.x;
    ssTot += (p.y - meanY) ** 2;
    ssRes += (p.y - yHat) ** 2;
  }

  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;

  return { slope, intercept, r2, n };
}

function getTimeBucket(createdAt: string | null) {
  if (!createdAt) return 'Unknown';

  const hour = new Date(createdAt).getUTCHours();

  if (hour >= 3 && hour <= 10) return 'Morning (3–10)';
  if (hour >= 11 && hour <= 17) return 'Midday (11–17)';
  return 'Evening (18–2)';
}

function groupAverageImpact(
  rows: EnrichedCaptionRow[],
  key: 'image_id' | 'humor_flavor_name' | 'profile_name' | 'created_bucket',
  minGroupSize = 2
): FactorCard[] {
  const overallMean = safeMean(rows.map(r => r.like_count));
  const groups = new Map<string, number[]>();

  for (const row of rows) {
    const groupName = row[key] ?? 'Unknown';
    if (!groups.has(groupName)) groups.set(groupName, []);
    groups.get(groupName)!.push(row.like_count);
  }

  const results: FactorCard[] = [];

  for (const [groupName, likes] of groups.entries()) {
    if (likes.length < minGroupSize) continue;

    const avg = safeMean(likes);
    const uplift = avg - overallMean;

    results.push({
      factor: groupName,
      impact: uplift,
      desc: `Avg likes ${avg.toFixed(6)} vs overall ${overallMean.toFixed(6)} (n=${likes.length})`,
    });
  }

  return results.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
}

function buildLeaderboard(
  rows: EnrichedCaptionRow[],
  key: 'image_id' | 'humor_flavor_name' | 'profile_name',
  minGroupSize = 1
): LeaderboardCard[] {
  const groups = new Map<string, number[]>();

  for (const row of rows) {
    const groupName = row[key] ?? 'Unknown';
    if (!groups.has(groupName)) groups.set(groupName, []);
    groups.get(groupName)!.push(row.like_count);
  }

  const results: LeaderboardCard[] = [];

  for (const [name, likes] of groups.entries()) {
    if (likes.length < minGroupSize) continue;

    results.push({
      name,
      totalLikes: likes.reduce((a, b) => a + b, 0),
      avgLikes: safeMean(likes),
      captionCount: likes.length,
    });
  }

  return results.sort((a, b) => b.totalLikes - a.totalLikes);
}

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [captions, flavors, profiles] = await Promise.all([
    fetchAllRows<CaptionRow>(
      supabase,
      'captions',
      'id, like_count, content, image_id, humor_flavor_id, profile_id, created_datetime_utc'
    ),
    fetchAllRows<FlavorRow>(
      supabase,
      'humor_flavors',
      'id, description'
    ),
    fetchAllRows<ProfileRow>(
      supabase,
      'profiles',
      'id, first_name, last_name'
    ),
  ]);


  const flavorNameById = new Map<number, string>();
  for (const f of flavors) {
    flavorNameById.set(f.id, f.description ?? `Flavor ${f.id}`);
  }

  const profileNameById = new Map<string, string>();

  for (const p of profiles) {
    const name = [p.first_name, p.last_name].filter(Boolean).join(' ').trim();
    profileNameById.set(
      p.id,
      name || `User ${p.id.slice(0, 8)}`
    );
  }

  const rows: EnrichedCaptionRow[] = captions.map((c) => ({
    id: c.id,
    like_count: Number(c.like_count ?? 0),
    caption_char_len: (c.content ?? '').length,
    caption_word_count: (c.content ?? '').trim().split(/\s+/).filter(Boolean).length,
    image_id: c.image_id,
    humor_flavor_name:
      c.humor_flavor_id != null
        ? flavorNameById.get(c.humor_flavor_id) ?? `Flavor ${c.humor_flavor_id}`
        : 'Unknown',
    profile_name:
      c.profile_id != null
        ? profileNameById.get(c.profile_id) ?? `User ${c.profile_id.slice(0, 8)}`
        : 'Unknown User',
    created_bucket: getTimeBucket(c.created_datetime_utc),
  }))
  .filter(r => Number.isFinite(r.like_count));

  const charLenRegression = computeSimpleLinearRegression(
    rows.map(r => ({ x: r.caption_char_len, y: r.like_count }))
  );

  const wordCountRegression = computeSimpleLinearRegression(
    rows.map(r => ({ x: r.caption_word_count, y: r.like_count }))
  );

  const imageFactors = groupAverageImpact(rows, 'image_id', 2).slice(0, 8);
  const timeBucketFactors = groupAverageImpact(rows, 'created_bucket', 2);
  const flavorFactors = groupAverageImpact(rows, 'humor_flavor_name', 2).slice(0, 8);
  const profileFactors = groupAverageImpact(rows, 'profile_name', 2).slice(0, 8);

  const topProfilesByLikes = buildLeaderboard(rows, 'profile_name', 1).slice(0, 8);
  const topImagesByLikes = buildLeaderboard(rows, 'image_id', 1).slice(0, 8);
  const topFlavorsByLikes = buildLeaderboard(rows, 'humor_flavor_name', 1).slice(0, 8);

  return Response.json({
    sampleSize: rows.length,
    charLenRegression,
    wordCountRegression,
    imageFactors,
    timeBucketFactors,
    flavorFactors,
    profileFactors,
    topProfilesByLikes,
    topImagesByLikes,
    topFlavorsByLikes,
  });
}