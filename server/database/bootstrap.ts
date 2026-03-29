export const DATABASE_BOOTSTRAP_SQL = `
  CREATE TABLE IF NOT EXISTS profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    addon TEXT NOT NULL,
    profile TEXT NOT NULL,
    string TEXT NOT NULL,
    description TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_visible INTEGER NOT NULL DEFAULT 1,
    custom_fields TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
  );
  CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_addon_profile ON profiles(addon, profile);

  CREATE TABLE IF NOT EXISTS wowup_strings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    string TEXT NOT NULL,
    description TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_visible INTEGER NOT NULL DEFAULT 1,
    custom_fields TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS character_layouts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    class_name TEXT,
    spec TEXT,
    description TEXT,
    screenshot TEXT,
    import_string TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_visible INTEGER NOT NULL DEFAULT 1,
    custom_fields TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS field_definitions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type TEXT NOT NULL,
    field_name TEXT NOT NULL,
    field_label TEXT NOT NULL,
    field_type TEXT NOT NULL DEFAULT 'text',
    field_options TEXT,
    is_required INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
  );
  CREATE UNIQUE INDEX IF NOT EXISTS idx_field_defs_entity_field ON field_definitions(entity_type, field_name);

  CREATE TABLE IF NOT EXISTS changelogs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    version TEXT NOT NULL,
    content TEXT NOT NULL,
    content_en TEXT,
    is_published INTEGER NOT NULL DEFAULT 0,
    published_at INTEGER,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS site_content (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    page TEXT NOT NULL,
    section TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    locale TEXT NOT NULL DEFAULT 'en',
    type TEXT NOT NULL DEFAULT 'text',
    sort_order INTEGER NOT NULL DEFAULT 0,
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
  );
  CREATE UNIQUE INDEX IF NOT EXISTS idx_content_page_section_key_locale ON site_content(page, section, key, locale);

  CREATE TABLE IF NOT EXISTS faqs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_visible INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id INTEGER,
    entity_name TEXT NOT NULL,
    details TEXT,
    user_id INTEGER,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin',
    is_locked INTEGER NOT NULL DEFAULT 0,
    locked_until INTEGER,
    last_login INTEGER,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS api_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    key_hash TEXT NOT NULL,
    key_preview TEXT NOT NULL,
    permissions TEXT NOT NULL DEFAULT 'read',
    last_used INTEGER,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT NOT NULL UNIQUE,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS api_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL,
    ip TEXT,
    api_key_id INTEGER,
    status_code INTEGER,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS sync_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trigger_source TEXT NOT NULL,
    status TEXT NOT NULL,
    details TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS copy_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    string_type TEXT NOT NULL,
    string_id INTEGER NOT NULL,
    ip TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS page_views (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    path TEXT NOT NULL,
    referrer TEXT,
    user_agent TEXT,
    device_type TEXT,
    browser TEXT,
    os TEXT,
    country TEXT,
    ip TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token_hash TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    browser TEXT,
    os TEXT,
    device_type TEXT,
    last_active INTEGER NOT NULL DEFAULT (unixepoch()),
    expires_at INTEGER NOT NULL,
    is_revoked INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );
  CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);
  CREATE INDEX IF NOT EXISTS idx_sessions_user_revoked ON sessions(user_id, is_revoked);

  CREATE TABLE IF NOT EXISTS login_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    browser TEXT,
    os TEXT,
    success INTEGER NOT NULL,
    fail_reason TEXT,
    is_flagged INTEGER NOT NULL DEFAULT 0,
    flag_reason TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );
  CREATE INDEX IF NOT EXISTS idx_login_attempts_username_created_at ON login_attempts(username, created_at);
  CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_created_at ON login_attempts(ip_address, created_at);

  CREATE TABLE IF NOT EXISTS passkeys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    credential_id TEXT NOT NULL UNIQUE,
    public_key TEXT NOT NULL,
    counter INTEGER NOT NULL DEFAULT 0,
    device_name TEXT NOT NULL DEFAULT 'Passkey',
    transports TEXT,
    aaguid TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    last_used INTEGER
  );

  CREATE TABLE IF NOT EXISTS webauthn_challenges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    challenge TEXT NOT NULL,
    user_id INTEGER,
    type TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS rate_limits (
    key TEXT PRIMARY KEY,
    count INTEGER NOT NULL DEFAULT 0,
    first_attempt INTEGER NOT NULL,
    blocked_until INTEGER NOT NULL DEFAULT 0,
    updated_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_rate_limits_updated_at ON rate_limits(updated_at);
`

export const SAFE_COLUMN_MIGRATIONS = [
  'ALTER TABLE profiles ADD COLUMN custom_fields TEXT',
  'ALTER TABLE wowup_strings ADD COLUMN custom_fields TEXT',
  'ALTER TABLE wowup_strings ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0',
  'ALTER TABLE character_layouts ADD COLUMN custom_fields TEXT',
  'ALTER TABLE site_content ADD COLUMN locale TEXT NOT NULL DEFAULT \'en\'',
  'DROP INDEX IF EXISTS idx_content_page_section_key',
  'CREATE UNIQUE INDEX IF NOT EXISTS idx_content_page_section_key_locale ON site_content(page, section, key, locale)',
  'ALTER TABLE changelogs ADD COLUMN content_en TEXT',
  'ALTER TABLE users ADD COLUMN is_locked INTEGER NOT NULL DEFAULT 0',
  'ALTER TABLE users ADD COLUMN locked_until INTEGER',
] as const

type SqliteBootstrapConnection = {
  exec: (statement: string) => unknown
}

export function initializeDatabase(sqlite: SqliteBootstrapConnection) {
  sqlite.exec(DATABASE_BOOTSTRAP_SQL)
  console.log('[DB] ✓ Database ready - all tables verified')

  for (const migration of SAFE_COLUMN_MIGRATIONS) {
    try {
      sqlite.exec(migration)
    } catch {
      /* column already exists */
    }
  }

  console.log('[DB] ✓ Column migrations checked')
}
