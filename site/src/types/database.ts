// Types générés manuellement depuis le schéma Supabase
// À remplacer par : npx supabase gen types typescript --linked > src/types/database.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id:         string;
          email:      string;
          full_name:  string | null;
          avatar_url: string | null;
          plan:       "free" | "pro" | "business";
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["profiles"]["Row"], "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      models: {
        Row: {
          id:            string;
          user_id:       string;
          name:          string;
          slug:          string;
          description:   string | null;
          category:      string | null;
          status:        "processing" | "active" | "archived";
          file_url:      string;
          file_size:     number | null;
          thumbnail_url: string | null;
          luma_job_id:   string | null;
          created_at:    string;
          updated_at:    string;
        };
        Insert: Omit<Database["public"]["Tables"]["models"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["models"]["Insert"]>;
      };
      events: {
        Row: {
          id:          string;
          model_id:    string;
          event_type:  "view" | "ar_activated" | "share" | "qr_scan";
          country:     string | null;
          city:        string | null;
          user_agent:  string | null;
          duration_ms: number | null;
          created_at:  string;
        };
        Insert: Omit<Database["public"]["Tables"]["events"]["Row"], "id" | "created_at">;
        Update: never;
      };
    };
    Views: {
      model_stats: {
        Row: {
          id:                 string;
          user_id:            string;
          name:               string;
          slug:               string;
          status:             string;
          created_at:         string;
          total_events:       number;
          total_views:        number;
          total_ar:           number;
          total_qr_scans:     number;
          ar_rate_pct:        number | null;
          avg_ar_duration_ms: number | null;
        };
      };
    };
    Functions: Record<string, never>;
  };
}

// Raccourcis pratiques
export type Profile    = Database["public"]["Tables"]["profiles"]["Row"];
export type Model      = Database["public"]["Tables"]["models"]["Row"];
export type Event      = Database["public"]["Tables"]["events"]["Row"];
export type ModelStats = Database["public"]["Views"]["model_stats"]["Row"];
export type Plan       = Profile["plan"];
export type ModelStatus = Model["status"];
export type EventType   = Event["event_type"];
