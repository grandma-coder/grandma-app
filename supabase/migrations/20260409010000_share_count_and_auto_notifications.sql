-- Add share_count to garage_posts
ALTER TABLE garage_posts ADD COLUMN IF NOT EXISTS share_count INT NOT NULL DEFAULT 0;

-- ============================================================
-- Auto-notifications via triggers
-- ============================================================

-- Notify post owner when someone likes their garage post
CREATE OR REPLACE FUNCTION notify_garage_like() RETURNS trigger AS $$
DECLARE
  post_owner UUID;
  post_caption TEXT;
  liker_name TEXT;
BEGIN
  -- Get post owner and caption
  SELECT author_id, LEFT(caption, 60) INTO post_owner, post_caption
  FROM garage_posts WHERE id = NEW.post_id;

  -- Don't notify self-likes
  IF post_owner = NEW.user_id THEN RETURN NEW; END IF;

  -- Get liker name
  SELECT name INTO liker_name FROM profiles WHERE user_id = NEW.user_id;

  INSERT INTO notifications (user_id, type, title, body, data)
  VALUES (
    post_owner,
    'like',
    COALESCE(liker_name, 'Someone') || ' liked your post',
    post_caption,
    jsonb_build_object('postId', NEW.post_id, 'type', 'garage')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_garage_like ON garage_post_likes;
CREATE TRIGGER trg_notify_garage_like
  AFTER INSERT ON garage_post_likes
  FOR EACH ROW EXECUTE FUNCTION notify_garage_like();

-- Notify post owner when someone comments on their garage post
CREATE OR REPLACE FUNCTION notify_garage_comment() RETURNS trigger AS $$
DECLARE
  post_owner UUID;
  post_caption TEXT;
  commenter_name TEXT;
BEGIN
  SELECT author_id, LEFT(caption, 60) INTO post_owner, post_caption
  FROM garage_posts WHERE id = NEW.post_id;

  IF post_owner = NEW.author_id THEN RETURN NEW; END IF;

  commenter_name := COALESCE(NEW.author_name, 'Someone');

  INSERT INTO notifications (user_id, type, title, body, data)
  VALUES (
    post_owner,
    'reply',
    commenter_name || ' commented on your post',
    LEFT(NEW.content, 80),
    jsonb_build_object('postId', NEW.post_id, 'type', 'garage')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_garage_comment ON garage_post_comments;
CREATE TRIGGER trg_notify_garage_comment
  AFTER INSERT ON garage_post_comments
  FOR EACH ROW EXECUTE FUNCTION notify_garage_comment();

-- Notify channel owner when someone joins their channel
CREATE OR REPLACE FUNCTION notify_channel_join() RETURNS trigger AS $$
DECLARE
  ch_owner UUID;
  ch_name TEXT;
  joiner_name TEXT;
BEGIN
  SELECT created_by, name INTO ch_owner, ch_name
  FROM channels WHERE id = NEW.channel_id;

  IF ch_owner IS NULL OR ch_owner = NEW.user_id THEN RETURN NEW; END IF;

  SELECT name INTO joiner_name FROM profiles WHERE user_id = NEW.user_id;

  INSERT INTO notifications (user_id, type, title, body, data)
  VALUES (
    ch_owner,
    'channel',
    COALESCE(joiner_name, 'Someone') || ' joined #' || ch_name,
    NULL,
    jsonb_build_object('channelId', NEW.channel_id)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_channel_join ON channel_members;
CREATE TRIGGER trg_notify_channel_join
  AFTER INSERT ON channel_members
  FOR EACH ROW EXECUTE FUNCTION notify_channel_join();

-- Notify message author when someone reacts to their channel message
CREATE OR REPLACE FUNCTION notify_channel_reaction() RETURNS trigger AS $$
DECLARE
  msg_author UUID;
  msg_content TEXT;
  ch_name TEXT;
  reactor_name TEXT;
BEGIN
  SELECT cp.author_id, LEFT(cp.content, 60), c.name
  INTO msg_author, msg_content, ch_name
  FROM channel_posts cp
  JOIN channels c ON c.id = cp.channel_id
  WHERE cp.id = NEW.post_id;

  IF msg_author = NEW.user_id THEN RETURN NEW; END IF;

  SELECT name INTO reactor_name FROM profiles WHERE user_id = NEW.user_id;

  INSERT INTO notifications (user_id, type, title, body, data)
  VALUES (
    msg_author,
    'like',
    COALESCE(reactor_name, 'Someone') || ' liked your message in #' || COALESCE(ch_name, 'channel'),
    msg_content,
    jsonb_build_object('channelId', (SELECT channel_id FROM channel_posts WHERE id = NEW.post_id))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_channel_reaction ON post_reactions;
CREATE TRIGGER trg_notify_channel_reaction
  AFTER INSERT ON post_reactions
  FOR EACH ROW EXECUTE FUNCTION notify_channel_reaction();

-- Notify parent message author when someone replies in a thread
CREATE OR REPLACE FUNCTION notify_thread_reply() RETURNS trigger AS $$
DECLARE
  parent_author UUID;
  parent_content TEXT;
  ch_name TEXT;
  replier_name TEXT;
BEGIN
  IF NEW.reply_to_id IS NULL THEN RETURN NEW; END IF;

  SELECT cp.author_id, LEFT(cp.content, 60), c.name
  INTO parent_author, parent_content, ch_name
  FROM channel_posts cp
  JOIN channels c ON c.id = cp.channel_id
  WHERE cp.id = NEW.reply_to_id;

  IF parent_author IS NULL OR parent_author = NEW.author_id THEN RETURN NEW; END IF;

  replier_name := COALESCE(NEW.author_name, 'Someone');

  INSERT INTO notifications (user_id, type, title, body, data)
  VALUES (
    parent_author,
    'reply',
    replier_name || ' replied to your message in #' || COALESCE(ch_name, 'channel'),
    LEFT(NEW.content, 80),
    jsonb_build_object('channelId', NEW.channel_id, 'threadId', NEW.reply_to_id)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_thread_reply ON channel_posts;
CREATE TRIGGER trg_notify_thread_reply
  AFTER INSERT ON channel_posts
  FOR EACH ROW EXECUTE FUNCTION notify_thread_reply();
