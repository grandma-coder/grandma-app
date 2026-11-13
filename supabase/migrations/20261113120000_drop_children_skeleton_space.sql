-- Remove the retired Skeleton appspace integration (Unit 1.12).
-- The skeleton-provision-child edge function and the client sync helper are
-- gone; these columns are no longer written or read anywhere.
alter table public.children
    drop column if exists skeleton_space_id,
    drop column if exists skeleton_owner_principal_id;

NOTIFY pgrst, 'reload schema';
