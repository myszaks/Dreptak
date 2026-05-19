export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          avatar_url: string | null
          total_steps: number
          streak: number
          last_active_date: string | null
          bio: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username: string
          avatar_url?: string | null
          total_steps?: number
          streak?: number
          last_active_date?: string | null
          bio?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string
          avatar_url?: string | null
          total_steps?: number
          streak?: number
          last_active_date?: string | null
          bio?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      achievements: {
        Row: {
          id: string
          code: string
          title: string
          description: string
          icon: string
          created_at: string
        }
        Insert: {
          id?: string
          code: string
          title: string
          description: string
          icon: string
          created_at?: string
        }
        Update: {
          id?: string
          code?: string
          title?: string
          description?: string
          icon?: string
          created_at?: string
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          id: string
          user_id: string
          achievement_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          achievement_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          achievement_id?: string
          created_at?: string
        }
        Relationships: []
      }
      challenges: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          invite_code: string
          icon: string
          start_date: string
          end_date: string
          is_public: boolean
          janusz_mode: boolean
          janusz_penalty_text: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug?: string
          description?: string | null
          invite_code?: string
          icon?: string
          start_date: string
          end_date: string
          is_public?: boolean
          janusz_mode?: boolean
          janusz_penalty_text?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          invite_code?: string
          icon?: string
          start_date?: string
          end_date?: string
          is_public?: boolean
          janusz_mode?: boolean
          janusz_penalty_text?: string | null
          created_by?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      challenge_members: {
        Row: {
          id: string
          challenge_id: string
          user_id: string
          role: string
          joined_at: string
        }
        Insert: {
          id?: string
          challenge_id: string
          user_id: string
          role?: string
          joined_at?: string
        }
        Update: {
          id?: string
          challenge_id?: string
          user_id?: string
          role?: string
          joined_at?: string
        }
        Relationships: []
      }
      step_entries: {
        Row: {
          id: string
          challenge_id: string
          user_id: string
          entry_date: string
          step_count: number
          screenshot_url: string | null
          ocr_confidence: number | null
          ocr_raw_text: string | null
          is_edited: boolean
          edit_expires_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          challenge_id: string
          user_id: string
          entry_date: string
          step_count: number
          screenshot_url?: string | null
          ocr_confidence?: number | null
          ocr_raw_text?: string | null
          is_edited?: boolean
          edit_expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          challenge_id?: string
          user_id?: string
          entry_date?: string
          step_count?: number
          screenshot_url?: string | null
          ocr_confidence?: number | null
          ocr_raw_text?: string | null
          is_edited?: boolean
          edit_expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      reactions: {
        Row: {
          id: string
          entry_id: string
          user_id: string
          emoji: string
          created_at: string
        }
        Insert: {
          id?: string
          entry_id: string
          user_id: string
          emoji: string
          created_at?: string
        }
        Update: {
          id?: string
          entry_id?: string
          user_id?: string
          emoji?: string
          created_at?: string
        }
        Relationships: []
      }
      activity_feed: {
        Row: {
          id: string
          challenge_id: string
          type: string
          actor_id: string | null
          target_user_id: string | null
          entry_id: string | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          challenge_id: string
          type: string
          actor_id?: string | null
          target_user_id?: string | null
          entry_id?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          challenge_id?: string
          type?: string
          actor_id?: string | null
          target_user_id?: string | null
          entry_id?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          title: string
          body: string
          read: boolean
          challenge_id: string | null
          entry_id: string | null
          deep_link: string | null
          metadata_json: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          title: string
          body: string
          read?: boolean
          challenge_id?: string | null
          entry_id?: string | null
          deep_link?: string | null
          metadata_json?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          title?: string
          body?: string
          read?: boolean
          challenge_id?: string | null
          entry_id?: string | null
          deep_link?: string | null
          metadata_json?: Json | null
          created_at?: string
        }
        Relationships: []
      }
      push_tokens: {
        Row: {
          id: string
          user_id: string
          token: string
          platform: 'web' | 'ios' | 'android'
          device_name: string | null
          last_used_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          token: string
          platform: 'web' | 'ios' | 'android'
          device_name?: string | null
          last_used_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          token?: string
          platform?: 'web' | 'ios' | 'android'
          device_name?: string | null
          last_used_at?: string
          created_at?: string
        }
        Relationships: []
      }
      janusz_punishments: {
        Row: {
          id: string
          text: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          text: string
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          text?: string
          is_active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      challenge_punishment_votes: {
        Row: {
          id: string
          challenge_id: string
          punishment_id: string
          voter_id: string
          created_at: string
        }
        Insert: {
          id?: string
          challenge_id: string
          punishment_id: string
          voter_id: string
          created_at?: string
        }
        Update: {
          id?: string
          challenge_id?: string
          punishment_id?: string
          voter_id?: string
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      daily_leaderboard: {
        Row: {
          challenge_id: string | null
          entry_date: string | null
          user_id: string | null
          username: string | null
          avatar_url: string | null
          step_count: number | null
          rank: number | null
          entry_id: string | null
        }
        Insert: {
          challenge_id?: string | null
        }
        Update: {
          challenge_id?: string | null
        }
        Relationships: []
      }
      challenge_leaderboard: {
        Row: {
          challenge_id: string | null
          user_id: string | null
          username: string | null
          avatar_url: string | null
          total_steps: number | null
          days_submitted: number | null
          best_day: number | null
          avg_steps: number | null
          rank: number | null
        }
        Insert: {
          challenge_id?: string | null
        }
        Update: {
          challenge_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_challenge_stats: {
        Args: { p_challenge_id: string }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']
export type Views<T extends keyof Database['public']['Views']> =
  Database['public']['Views'][T]['Row']

// Convenient aliases
export type Profile = Tables<'profiles'>
export type Achievement = Tables<'achievements'>
export type UserAchievement = Tables<'user_achievements'>
export type Challenge = Tables<'challenges'>
export type ChallengeMember = Tables<'challenge_members'>
export type StepEntry = Tables<'step_entries'>
export type Reaction = Tables<'reactions'>
export type ActivityFeedItem = Tables<'activity_feed'>
export type Notification = Tables<'notifications'>
export type PushToken = Tables<'push_tokens'>
export type JanuszPunishment = Tables<'janusz_punishments'>
export type PunishmentVote = Tables<'challenge_punishment_votes'>

// Enriched types
export type ChallengeWithMembers = Challenge & {
  challenge_members: Array<
    ChallengeMember & {
      profiles: Pick<Profile, 'id' | 'username' | 'avatar_url' | 'total_steps'>
    }
  >
}

export type StepEntryWithReactions = StepEntry & {
  profiles: Pick<Profile, 'id' | 'username' | 'avatar_url'>
  reactions: Reaction[]
}

export type LeaderboardEntry = {
  user_id: string
  username: string
  avatar_url: string | null
  total_steps: number
  rank: number
  days_submitted: number
  best_day: number
  avg_steps: number
}

export type DailyLeaderboardEntry = {
  challenge_id: string
  entry_date: string
  user_id: string
  username: string
  avatar_url: string | null
  step_count: number
  rank: number
  entry_id: string
}

export const REACTION_EMOJIS = ['🔥', '💀', '🐌', '🤡', '👑'] as const
export type ReactionEmoji = (typeof REACTION_EMOJIS)[number]
