// app/api/analytics/multi-regression/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { MergedRow, FactorCard } from '@/types/analytics'; // 假设你有这些类型
import { safeMean, computeSimpleLinearRegression } from '../analytics/route'; // 如果有的话，从 GET 文件导入工具函数；否则复制过来

// 如果 computeMultipleRegression 还没实现，先用简单版或占位
// 这里先实现基本结构，多元部分用占位（后面完善）

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { variables } = body;

    if (!Array.isArray(variables) || variables.length === 0) {
      return NextResponse.json({ error: '缺少或无效的 variables 参数' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // 完整查询（和 GET 一样）
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
      return NextResponse.json(
        { error: captionsRes.error?.message || 'Database query failed' },
        { status: 500 }
      );
    }

    const captions = captionsRes.data ?? [];
    const responses = responsesRes.data ?? [];
    const models = modelsRes.data ?? [];
    const flavors = flavorsRes.data ?? [];

    // 构建 Maps（复制自 GET）
    const responseByCaptionRequestId = new Map<string, any>();
    for (const r of responses) {
      if (r.caption_request_id) responseByCaptionRequestId.set(r.caption_request_id, r);
    }

    const modelNameById = new Map<number, string>();
    for (const m of models) {
      if (m.id && m.name) modelNameById.set(m.id, m.name);
    }

    const flavorNameById = new Map<number, string>();
    for (const f of flavors) {
      if (f.id && f.description) flavorNameById.set(f.id, f.description);
    }

    // 合并数据
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

    // 过滤有效行（根据选择的变量）
    const validRows = mergedRows.filter(r => {
      if (variables.includes('proc_time') && (r.processing_time_seconds == null || !Number.isFinite(r.processing_time_seconds))) {
        return false;
      }
      return true;
    });

    const y = validRows.map(r => r.like_count);

    const xMatrix = validRows.map(r => {
      const row: number[] = [];
      if (variables.includes('char_len')) row.push(r.caption_char_len);
      if (variables.includes('word_count')) row.push(r.caption_word_count);
      if (variables.includes('proc_time')) row.push(r.processing_time_seconds!);
      return row;
    });

    // 目前多元回归函数是占位版（返回 0 系数）
    // 你可以在这里调用 computeMultipleRegression(y, xMatrix)
    // 但由于当前实现不完整，先返回简单结果
    const result = {
      coefficients: [safeMean(y), ...new Array(variables.length).fill(0)],
      r2: 0,
      n: validRows.length
    };

    return NextResponse.json({
      coefficients: result.coefficients,
      r2: result.r2,
      n: result.n,
      selected: variables
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}