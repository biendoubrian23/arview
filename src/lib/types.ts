export type Plan = "free" | "pro" | "business";
export type Visibility = "public" | "private";
export type ModelStatus = "processing" | "ready" | "archived" | "failed";
export type EventType = "view" | "ar_activated" | "session_end";

export interface Profile {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  brand_name: string | null;
  brand_logo_url: string | null;
  brand_color: string | null;
  plan: Plan;
  created_at: string;
  updated_at: string;
}

export interface ModelRow {
  id: string;
  user_id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string | null;
  visibility: Visibility;
  status: ModelStatus;
  file_path: string;
  file_size: number | null;
  splat_path: string | null;
  thumbnail_path: string | null;
  source_video_path: string | null;
  created_at: string;
  updated_at: string;
}

export interface EventRow {
  id: number;
  model_id: string;
  type: EventType;
  duration_ms: number | null;
  device: string | null;
  country: string | null;
  city: string | null;
  user_agent: string | null;
  referrer: string | null;
  created_at: string;
}
