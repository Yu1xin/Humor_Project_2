// types/analytics.ts

export type RegressionResult = {
  slope: number;
  intercept: number;
  r2: number;
  n: number;
};

export type FactorCard = {
  factor: string;
  impact: number;
  desc: string;
};

export type MergedRow = {
  like_count: number;
  caption_char_len: number;
  caption_word_count: number;
  processing_time_seconds: number | null;
  llm_model_name: string | null;
  humor_flavor_name: string | null;
};