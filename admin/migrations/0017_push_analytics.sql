-- Notification analytics — close the loop on push. The send pipeline already
-- records per-recipient ticket_id + status at SEND time; this adds the two
-- missing funnel stages:
--   • delivered — from Expo push RECEIPTS (polled by ticket_id a few min later)
--   • opened    — reported by the app when the user taps the notification
-- Command-center-owned columns on the existing push tables. Idempotent.

ALTER TABLE public.push_recipients
  ADD COLUMN IF NOT EXISTS delivered_at    TIMESTAMPTZ,      -- receipt confirmed delivery
  ADD COLUMN IF NOT EXISTS receipt_status  TEXT,             -- ok | error (from Expo receipt)
  ADD COLUMN IF NOT EXISTS receipt_error   TEXT,             -- DeviceNotRegistered, etc.
  ADD COLUMN IF NOT EXISTS receipt_checked_at TIMESTAMPTZ,   -- when we last polled the receipt
  ADD COLUMN IF NOT EXISTS opened_at       TIMESTAMPTZ;      -- app reported a tap

CREATE INDEX IF NOT EXISTS push_recipients_campaign_idx ON public.push_recipients (campaign_id);
-- Partial index: the receipts poller only cares about sent-but-unchecked tickets.
CREATE INDEX IF NOT EXISTS push_recipients_receipt_pending_idx
  ON public.push_recipients (campaign_id)
  WHERE ticket_id IS NOT NULL AND receipt_checked_at IS NULL;

ALTER TABLE public.push_campaigns
  ADD COLUMN IF NOT EXISTS delivered_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS opened_count    INTEGER NOT NULL DEFAULT 0;

NOTIFY pgrst, 'reload schema';
