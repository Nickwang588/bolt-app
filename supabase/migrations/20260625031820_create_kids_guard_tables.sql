-- 儿童游戏时长管控APP数据表
-- 受控应用列表
CREATE TABLE IF NOT EXISTS controlled_apps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_name text NOT NULL,
  app_icon text,
  daily_limit_minutes integer NOT NULL DEFAULT 30,
  is_controlled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 每日使用时长记录
CREATE TABLE IF NOT EXISTS usage_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id uuid REFERENCES controlled_apps(id) ON DELETE CASCADE,
  app_name text NOT NULL,
  usage_date date NOT NULL DEFAULT CURRENT_DATE,
  used_minutes integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (app_id, usage_date)
);

-- 全局管控开关状态
CREATE TABLE IF NOT EXISTS guard_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_guard_enabled boolean NOT NULL DEFAULT true,
  reminder_before_minutes integer NOT NULL DEFAULT 5,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 初始化默认设置
INSERT INTO guard_settings (is_guard_enabled, reminder_before_minutes)
VALUES (true, 5)
ON CONFLICT DO NOTHING;

-- 启用RLS
ALTER TABLE controlled_apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE guard_settings ENABLE ROW LEVEL SECURITY;

-- controlled_apps 策略 (公开访问,因为是单设备家长工具)
CREATE POLICY "select_controlled_apps" ON controlled_apps FOR SELECT TO anon USING (true);
CREATE POLICY "insert_controlled_apps" ON controlled_apps FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "update_controlled_apps" ON controlled_apps FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "delete_controlled_apps" ON controlled_apps FOR DELETE TO anon USING (true);

-- usage_records 策略
CREATE POLICY "select_usage_records" ON usage_records FOR SELECT TO anon USING (true);
CREATE POLICY "insert_usage_records" ON usage_records FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "update_usage_records" ON usage_records FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "delete_usage_records" ON usage_records FOR DELETE TO anon USING (true);

-- guard_settings 策略
CREATE POLICY "select_guard_settings" ON guard_settings FOR SELECT TO anon USING (true);
CREATE POLICY "insert_guard_settings" ON guard_settings FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "update_guard_settings" ON guard_settings FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "delete_guard_settings" ON guard_settings FOR DELETE TO anon USING (true);

-- 索引
CREATE INDEX IF NOT EXISTS idx_usage_records_date ON usage_records(usage_date);
CREATE INDEX IF NOT EXISTS idx_usage_records_app ON usage_records(app_id);
