-- Stage 2: accounts, invitations, second factors.

CREATE TABLE IF NOT EXISTS "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "email" text NOT NULL CHECK ("email" = lower("email") AND length("email") <= 254),
  "display_name" text NOT NULL CHECK (length("display_name") BETWEEN 1 AND 64),
  "password_hash" text NOT NULL,
  "role" text DEFAULT 'member' NOT NULL CHECK ("role" IN ('admin', 'member')),
  "totp_secret_enc" text,
  "totp_enabled_at" timestamptz,
  "totp_last_step" bigint,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "disabled_at" timestamptz
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_uq" ON "users" ("email");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "invites" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "token_hash" text NOT NULL,
  "email" text NOT NULL CHECK ("email" = lower("email")),
  "role" text DEFAULT 'member' NOT NULL CHECK ("role" IN ('admin', 'member')),
  "created_by" uuid REFERENCES "users" ("id") ON DELETE SET NULL,
  "expires_at" timestamptz NOT NULL,
  "used_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "invites_token_hash_uq" ON "invites" ("token_hash");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "recovery_codes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
  "code_hash" text NOT NULL,
  "used_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "recovery_codes_user_idx" ON "recovery_codes" ("user_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "passkeys" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
  "credential_id" text NOT NULL,
  "public_key" text NOT NULL,
  "counter" bigint DEFAULT 0 NOT NULL,
  "transports" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "name" text NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "last_used_at" timestamptz
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "passkeys_credential_id_uq" ON "passkeys" ("credential_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "passkeys_user_idx" ON "passkeys" ("user_id");
--> statement-breakpoint
-- The app may never delete accounts or invitations outright (disable instead), keeping history intact.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'bastion_app') THEN
    REVOKE DELETE, TRUNCATE ON "users", "invites" FROM bastion_app;
  END IF;
END
$$;
