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
        Relationships: [
          {
            foreignKeyName: "conversations_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
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
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
        ];
      };
      verifications: {
        Row: {
          id: string;
          conversation_id: string | null;
          message_id: string | null;
          user_id: string;
          transaction_hash: string | null;
          requester: string | null;
          question_title: string;
          question_hash: string;
          expected_evidence_hash: string;
          actual_evidence_hash: string | null;
          source_urls: Json;
          evidence_verified: boolean;
          user_context_summary: string | null;
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
          requester?: string | null;
          question_title: string;
          question_hash: string;
          expected_evidence_hash: string;
          actual_evidence_hash?: string | null;
          source_urls?: Json;
          evidence_verified?: boolean;
          user_context_summary?: string | null;
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
          requester?: string | null;
          question_title?: string;
          question_hash?: string;
          expected_evidence_hash?: string;
          actual_evidence_hash?: string | null;
          source_urls?: Json;
          evidence_verified?: boolean;
          user_context_summary?: string | null;
          status?: string;
          decision?: string;
          confidence?: number | null;
          rationale?: string | null;
          explorer_url?: string | null;
          created_at?: string;
          finalized_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "verifications_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "verifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
