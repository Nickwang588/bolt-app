export type ControlledApp = {
  id: string;
  app_name: string;
  app_icon: string;
  daily_limit_minutes: number;
  is_controlled: boolean;
  package_name?: string | null;
  created_at: string;
  updated_at: string;
};

export type UsageRecord = {
  id: string;
  app_id: string;
  app_name: string;
  usage_date: string;
  used_minutes: number;
  package_name?: string | null;
  created_at: string;
  updated_at: string;
};

export type GuardSettings = {
  id: string;
  is_guard_enabled: boolean;
  reminder_before_minutes: number;
  updated_at: string;
};

export type DailyUsageSummary = {
  date: string;
  total_minutes: number;
  app_breakdown: { app_name: string; minutes: number }[];
};
