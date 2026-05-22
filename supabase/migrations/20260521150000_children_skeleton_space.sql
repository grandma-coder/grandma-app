-- Skeleton appspace integration (Unit 1.12).
-- Each child maps to a Skeleton "space" (provisioned via the developer API,
-- owned by the parent's Skeleton shadow principal). Store the mapping so we
-- don't re-provision and so caregiver invites can target the right space.
alter table public.children
    add column if not exists skeleton_space_id text,
    add column if not exists skeleton_owner_principal_id uuid;

comment on column public.children.skeleton_space_id is
    'The Skeleton space provisioned for this child (null until provisioned). '
    'Set by the skeleton-provision-child edge function.';
comment on column public.children.skeleton_owner_principal_id is
    'The Skeleton owner principal (parent shadow) of the child space — needed '
    'to target care-circle invites at the Skeleton developer API.';

notify pgrst, 'reload schema';
