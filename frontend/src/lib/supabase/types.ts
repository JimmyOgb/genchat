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
      conversations: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          mode: "fast" | "research" | "verified";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title?: string;
          mode?: "fast" | "research" | "verified";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          mode?: "fast" | "research" | "verified";
          created_at?: string;
          updated_at?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          role: "user" | "assistant" | "system";
          content: string;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          role: "user" | "assistant" | "system";
          content: string;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          role?: "user" | "assistant" | "system";
          content?: string;
          metadata?: Json;
          created_at?: string;
        };
      };
      verifications: {
        Row: {
          id: string;
          conversation_id: string | null;
          message_id: string | null;
          user_id: string;
          transaction_hash: string | null;
          question_title: string;
          question_hash: string;
          evidence_hash: string;
          status: string;
          decision: string;
          confidence: number | null;
          rationale: string | null;
          explorer_url: string | null;
          created_at: string;
          finalized_at: string | null;
        };
        Insert: {
          id: string;
          conversation_id?: string | null;
          message_id?: string | null;
          user_id: string;
          transaction_hash?: string | null;
          question_title: string;
          question_hash: string;
          evidence_hash: string;
          status?: string;
          decision?: string;
          confidence?: number | null;
          rationale?: string | null;
          explorer_url?: string | null;
          created_at?: string;
          finalized_at?: string | null;
        };
        Update: {
          id?: string;
          conversation_id?: string | null;
          message_id?: string | null;
          user_id?: string;
          transaction_hash?: string | null;
          question_title?: string;
          question_hash?: string;
          evidence_hash?: string;
          status?: string;
          decision?: string;
          confidence?: number | null;
          rationale?: string | null;
          explorer_url?: string | null;
          created_at?: string;
          finalized_at?: string | null;
        };
      };
    };
  };
}
