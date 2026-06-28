-- 为 controlled_apps 表添加 package_name 字段
ALTER TABLE controlled_apps ADD COLUMN IF NOT EXISTS package_name text;

-- 为 usage_records 表添加 package_name 字段
ALTER TABLE usage_records ADD COLUMN IF NOT EXISTS package_name text;

-- 为 package_name 创建索引
CREATE INDEX IF NOT EXISTS idx_controlled_apps_package ON controlled_apps(package_name);
CREATE INDEX IF NOT EXISTS idx_usage_records_package ON usage_records(package_name);
