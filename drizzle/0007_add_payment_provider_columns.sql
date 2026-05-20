ALTER TABLE "payment" ADD COLUMN IF NOT EXISTS "provider" text DEFAULT 'stripe' NOT NULL;
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "payment_provider" text;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'payment_event'
      AND column_name = 'stripe_event_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'payment_event'
      AND column_name = 'provider_event_id'
  ) THEN
    ALTER TABLE "payment_event" RENAME COLUMN "stripe_event_id" TO "provider_event_id";
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "payment_event" ADD COLUMN IF NOT EXISTS "provider_event_id" text;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'payment_event'
      AND constraint_name = 'payment_event_stripe_event_id_unique'
  ) THEN
    ALTER TABLE "payment_event" DROP CONSTRAINT "payment_event_stripe_event_id_unique";
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'payment_event'
      AND constraint_name = 'payment_event_provider_event_id_unique'
  ) THEN
    ALTER TABLE "payment_event"
      ADD CONSTRAINT "payment_event_provider_event_id_unique" UNIQUE("provider_event_id");
  END IF;
END $$;
