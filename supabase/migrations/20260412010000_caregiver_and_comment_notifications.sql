-- =============================================================================
-- Additional notification triggers for caregivers and channel comments
-- =============================================================================

-- 1. Notify parent when a caregiver logs activity for their child
CREATE OR REPLACE FUNCTION notify_caregiver_log() RETURNS trigger AS $$
DECLARE
  v_parent_id uuid;
  v_child_name text;
  v_caregiver_name text;
  v_log_type text;
BEGIN
  -- Only fire when logged_by is different from parent
  SELECT parent_id, name INTO v_parent_id, v_child_name
    FROM children WHERE id = NEW.child_id;

  IF v_parent_id IS NULL OR v_parent_id = NEW.logged_by THEN
    RETURN NEW;
  END IF;

  -- Skip if no logged_by (legacy logs)
  IF NEW.logged_by IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(name, 'A caregiver') INTO v_caregiver_name
    FROM profiles WHERE id = NEW.logged_by;

  v_log_type := INITCAP(NEW.type);

  INSERT INTO notifications (user_id, type, title, body, data)
  VALUES (
    v_parent_id,
    'care_circle_accepted',
    v_caregiver_name || ' logged ' || v_log_type || ' for ' || v_child_name,
    'Check the calendar to review the activity.',
    jsonb_build_object('childId', NEW.child_id, 'logId', NEW.id, 'caregiverId', NEW.logged_by)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_caregiver_log ON child_logs;
CREATE TRIGGER trg_notify_caregiver_log
  AFTER INSERT ON child_logs
  FOR EACH ROW
  WHEN (NEW.logged_by IS NOT NULL)
  EXECUTE FUNCTION notify_caregiver_log();

-- 2. Notify post author when someone comments on their channel post
CREATE OR REPLACE FUNCTION notify_post_comment() RETURNS trigger AS $$
DECLARE
  v_post_author_id uuid;
  v_commenter_name text;
  v_post_preview text;
BEGIN
  SELECT author_id INTO v_post_author_id
    FROM channel_posts WHERE id = NEW.post_id;

  -- Don't notify yourself
  IF v_post_author_id IS NULL OR v_post_author_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(name, 'Someone') INTO v_commenter_name
    FROM profiles WHERE id = NEW.user_id;

  v_post_preview := LEFT(COALESCE(NEW.content, ''), 80);

  INSERT INTO notifications (user_id, type, title, body, data)
  VALUES (
    v_post_author_id,
    'reply',
    v_commenter_name || ' commented on your post',
    v_post_preview,
    jsonb_build_object('postId', NEW.post_id, 'commentId', NEW.id)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_post_comment ON post_comments;
CREATE TRIGGER trg_notify_post_comment
  AFTER INSERT ON post_comments
  FOR EACH ROW
  EXECUTE FUNCTION notify_post_comment();

-- 3. Notify channel owner when someone saves their channel
CREATE OR REPLACE FUNCTION notify_channel_save() RETURNS trigger AS $$
DECLARE
  v_owner_id uuid;
  v_channel_name text;
  v_saver_name text;
BEGIN
  SELECT owner_id, name INTO v_owner_id, v_channel_name
    FROM channels WHERE id = NEW.channel_id;

  IF v_owner_id IS NULL OR v_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(name, 'Someone') INTO v_saver_name
    FROM profiles WHERE id = NEW.user_id;

  INSERT INTO notifications (user_id, type, title, body, data)
  VALUES (
    v_owner_id,
    'channel',
    v_saver_name || ' saved #' || v_channel_name,
    'Your channel is getting noticed!',
    jsonb_build_object('channelId', NEW.channel_id)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_channel_save ON channel_saves;
CREATE TRIGGER trg_notify_channel_save
  AFTER INSERT ON channel_saves
  FOR EACH ROW
  EXECUTE FUNCTION notify_channel_save();

-- 4. Notify garage post owner when someone saves their post
CREATE OR REPLACE FUNCTION notify_garage_save() RETURNS trigger AS $$
DECLARE
  v_post_author_id uuid;
  v_saver_name text;
BEGIN
  SELECT author_id INTO v_post_author_id
    FROM garage_posts WHERE id = NEW.post_id;

  IF v_post_author_id IS NULL OR v_post_author_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(name, 'Someone') INTO v_saver_name
    FROM profiles WHERE id = NEW.user_id;

  INSERT INTO notifications (user_id, type, title, body, data)
  VALUES (
    v_post_author_id,
    'like',
    v_saver_name || ' saved your garage post',
    'Your post is popular!',
    jsonb_build_object('postId', NEW.post_id)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_garage_save ON garage_post_saves;
CREATE TRIGGER trg_notify_garage_save
  AFTER INSERT ON garage_post_saves
  FOR EACH ROW
  EXECUTE FUNCTION notify_garage_save();

NOTIFY pgrst, 'reload schema';
