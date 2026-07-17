-- Command-center push campaigns. Center-owned tables (RLS on, no policies →
-- service-role only). An admin composes a campaign, targets an audience, and
-- sends now (scheduling is a later add). Every recipient is logged.

CREATE TABLE IF NOT EXISTS push_campaigns (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title                 text NOT NULL,
  body                  text NOT NULL,
  category              text NOT NULL DEFAULT 'broadcast',
  deep_link             text,
  data                  jsonb,
  target_type           text NOT NULL DEFAULT 'all' CHECK (target_type IN ('all','users')),
  target_user_ids       uuid[] NOT NULL DEFAULT '{}',
  status                text NOT NULL DEFAULT 'draft'
                          CHECK (status IN ('draft','sending','sent','failed')),
  sent_count            int NOT NULL DEFAULT 0,
  failed_count          int NOT NULL DEFAULT 0,
  skipped_optout_count  int NOT NULL DEFAULT 0,
  created_by            text,
  error_message         text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  sent_at               timestamptz
);

CREATE TABLE IF NOT EXISTS push_recipients (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id  uuid NOT NULL REFERENCES push_campaigns(id) ON DELETE CASCADE,
  user_id      uuid,
  token        text,
  status       text NOT NULL DEFAULT 'ok' CHECK (status IN ('ok','error')),
  ticket_id    text,
  error        text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE push_campaigns  ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_recipients ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_push_campaigns_created ON push_campaigns (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_push_recipients_campaign ON push_recipients (campaign_id);

NOTIFY pgrst, 'reload schema';
