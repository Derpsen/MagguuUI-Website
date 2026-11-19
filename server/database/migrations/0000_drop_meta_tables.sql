-- Drop Mythic+ Meta snapshot/sync tables. Applied on boot via server/database/bootstrap.ts
-- as well (this project historically uses drizzle-kit push, not drizzle-kit migrate).
DROP TABLE IF EXISTS `meta_sync_spec_staging`;
--> statement-breakpoint
DROP TABLE IF EXISTS `meta_sync_run_staging`;
--> statement-breakpoint
DROP TABLE IF EXISTS `meta_sync_lock`;
--> statement-breakpoint
DROP TABLE IF EXISTS `meta_runs`;
--> statement-breakpoint
DROP TABLE IF EXISTS `meta_snapshot_active`;
--> statement-breakpoint
DROP TABLE IF EXISTS `meta_snapshots`;
