// app/api/analytics/route.ts
import { createClient } from '@supabase/supabase-js';
import { RegressionResult, FactorCard, MergedRow } from '@/types/analytics';

function safeMean(arr: number[]) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

// ... 前面的查询、Map 构建、mergedRows 保持原样 ...

// 新增：支持多个变量的多元回归函数（X 可以是 1~3 列）
function computeMultipleRegression(
  y: number[],
  xMatrix: number[][]  // 每行是一个样本，每列是一个变量
): {
  coefficients: number[];  // [intercept, beta1, beta2, ...]
  r2: number;
  n: number;
} {
  const n = y.length;
  if (n < 2 || xMatrix.length !== n || xMatrix[0].length === 0) {
    return { coefficients: [safeMean(y)], r2: 0, n };
  }

  const k = xMatrix[0].length;  // 自变量个数

  // 构建带截距的 X 矩阵 (n x (k+1))
  const X = xMatrix.map(row => [1, ...row]);  // 第一列全为1 (intercept)

  // 简单 OLS: beta = (X'X)^-1 * X'y   （用数值方法近似求解）
  // 这里用高斯消元或简单矩阵运算实现（生产可用库，但这里纯手写简化版）

  // 先计算 X'X 和 X'y
  const xtx: number[][] = Array(k+1).fill(0).map(() => Array(k+1).fill(0));
  const xty: number[] = Array(k+1).fill(0);

  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= k; j++) {
      for (let m = 0; m <= k; m++) {
        xtx[j][m] += X[i][j] * X[i][m];
      }
      xty[j] += X[i][j] * y[i];
    }
  }

  // 高斯消元求解 xtx * beta = xty
  // （这里简化实现，实际可封装成函数）
  const beta = new Array(k+1).fill(0);

  // 非常粗糙的实现（仅供演示，数值稳定性差，建议实际用库）
  // 为避免复杂，这里先用单变量逻辑兜底，多变量时返回占位
  if (k === 1) {
    // 单变量退化到简单线性回归
    const points = xMatrix.map((row, idx) => ({x: row[0], y: y[idx]}));
    const reg = computeSimpleLinearRegression(points);
    return { coefficients: [reg.intercept, reg.slope], r2: reg.r2, n };
  }

  // 多变量暂返回平均值（占位，你可以稍后完善或引入数值库）
  // 实际项目建议用 'ml-regression-multivariate-linear' 或自己实现矩阵求逆
  return { coefficients: [safeMean(y), ...new Array(k).fill(0)], r2: 0, n };

  // TODO: 完善高斯消元或 QR 分解求解 beta
}

// 准备所有可能的数据（过滤掉任何有 null 的行太严格，这里允许部分缺失时用 0 填充或跳过）
const fullData = mergedRows.filter(r =>
  Number.isFinite(r.like_count) &&
  Number.isFinite(r.caption_char_len) &&
  Number.isFinite(r.caption_word_count)
);

// 注意：processing_time_seconds 很多 null，所以单独处理
const dataWithProc = mergedRows.filter(r =>
  Number.isFinite(r.like_count) &&
  r.processing_time_seconds != null &&
  Number.isFinite(r.processing_time_seconds)
);

// 返回所有基础统计（sampleSize 等保持原样）
return Response.json({
  sampleSize: mergedRows.length,
  charLenRegression: computeSimpleLinearRegression(
    fullData.map(r => ({x: r.caption_char_len, y: r.like_count}))
  ),
  wordCountRegression: computeSimpleLinearRegression(
    fullData.map(r => ({x: r.caption_word_count, y: r.like_count}))
  ),
  procTimeRegression: computeSimpleLinearRegression(
    dataWithProc.map(r => ({x: r.processing_time_seconds!, y: r.like_count}))
  ),
  modelFactors: groupAverageImpact(mergedRows, 'llm_model_name').slice(0,8),
  flavorFactors: groupAverageImpact(mergedRows, 'humor_flavor_name').slice(0,8),

  // 新增：供前端动态请求用（暂时不在这里计算多元，改成前端发 POST 请求时计算）
  availableVariables: ['char_len', 'word_count', 'proc_time'],
  multiRegressionExample: null  // 占位
});

function groupAverageImpact(rows: MergedRow[], key: 'llm_model_name' | 'humor_flavor_name'): FactorCard[] {
  const overallMean = safeMean(rows.map(r => r.like_count));
  const groups = new Map<string, number[]>();
  for (const row of rows) {
    const groupName = row[key] ?? 'Unknown';
    if (!groups.has(groupName)) groups.set(groupName, []);
    groups.get(groupName)!.push(row.like_count);
  }
  const results: FactorCard[] = [];
  for (const [groupName, likes] of groups.entries()) {
    if (likes.length < 2) continue;
    const avg = safeMean(likes);
    const uplift = avg - overallMean;
    results.push({
      factor: groupName,
      impact: uplift,
      desc: `Avg likes ${avg.toFixed(2)} vs overall ${overallMean.toFixed(2)} (n=${likes.length})`,
    });
  }
  return results.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
}

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [
    captionsRes,
    responsesRes,
    modelsRes,
    flavorsRes
  ] = await Promise.all([
    supabase.from('captions').select('caption_request_id, like_count, content'),
    supabase.from('llm_model_responses').select('caption_request_id, processing_time_seconds, llm_model_id, humor_flavor_id'),
    supabase.from('llm_models').select('id, name'),
    supabase.from('humor_flavors').select('id, description')
  ]);

  if (captionsRes.error || responsesRes.error || modelsRes.error || flavorsRes.error) {
    return Response.json(
      { error: captionsRes.error?.message || 'Database query failed' },
      { status: 500 }
    );
  }

  const captions = captionsRes.data ?? [];
  const responses = responsesRes.data ?? [];
  const models = modelsRes.data ?? [];
  const flavors = flavorsRes.data ?? [];

  // 构建 Map 用于快速查找
  const responseByCaptionRequestId = new Map<string, any>();
  for (const r of responses) {
    if (r.caption_request_id) {
      responseByCaptionRequestId.set(r.caption_request_id, r);
    }
  }

  const modelNameById = new Map<number, string>();
  for (const m of models) {
    if (m.id && m.name) modelNameById.set(m.id, m.name);
  }

  const flavorNameById = new Map<number, string>();
  for (const f of flavors) {
    if (f.id && f.description) flavorNameById.set(f.id, f.description);
  }

  // 合并数据 → 现在 captions 变量已定义
  const mergedRows: MergedRow[] = captions
    .map((c: any) => {
      const reqId = c.caption_request_id;
      const response = reqId ? responseByCaptionRequestId.get(reqId) : undefined;

      return {
        like_count: Number(c.like_count ?? 0),
        caption_char_len: (c.content ?? '').length,
        caption_word_count: (c.content ?? '').trim().split(/\s+/).filter(Boolean).length,
        processing_time_seconds:
          response?.processing_time_seconds != null
            ? Number(response.processing_time_seconds)
            : null,
        llm_model_name:
          response?.llm_model_id != null
            ? modelNameById.get(response.llm_model_id) ?? 'Unknown'
            : null,
        humor_flavor_name:
          response?.humor_flavor_id != null
            ? flavorNameById.get(response.humor_flavor_id) ?? 'Unknown'
            : null,
      };
    })
    .filter((row) => Number.isFinite(row.like_count) && Number.isFinite(row.caption_char_len));

  // 计算回归
  const charPoints = mergedRows.map(r => ({ x: r.caption_char_len, y: r.like_count }));
  const wordPoints = mergedRows.map(r => ({ x: r.caption_word_count, y: r.like_count }));

  const numericSubset = mergedRows.filter(
    r => r.processing_time_seconds != null && Number.isFinite(r.processing_time_seconds)
  );
  const procPoints = numericSubset.map(r => ({ x: r.processing_time_seconds!, y: r.like_count }));

  const charLenRegression = computeSimpleLinearRegression(charPoints);
  const wordCountRegression = computeSimpleLinearRegression(wordPoints);
  const procTimeRegression = computeSimpleLinearRegression(procPoints);

  const modelFactors = groupAverageImpact(mergedRows, 'llm_model_name').slice(0, 8);
  const flavorFactors = groupAverageImpact(mergedRows, 'humor_flavor_name').slice(0, 8);

  return Response.json({
    sampleSize: mergedRows.length,
    charLenRegression,
    wordCountRegression,
    procTimeRegression,
    modelFactors,
    flavorFactors,
  });
}