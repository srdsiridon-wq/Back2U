ALTER TABLE public.items ALTER COLUMN moderation_state SET DEFAULT 'approved'::moderation_state;

UPDATE public.items SET moderation_state = 'approved' WHERE moderation_state = 'pending';

UPDATE public.item_images SET is_approved = true
WHERE item_id IN (SELECT id FROM public.items WHERE moderation_state = 'approved');