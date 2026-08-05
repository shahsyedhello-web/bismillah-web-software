CREATE OR REPLACE FUNCTION public.tg_bootstrap_first_admin()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles) THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'super_admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created_bmc ON auth.users;
CREATE TRIGGER on_auth_user_created_bmc
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.tg_bootstrap_first_admin();

DROP TRIGGER IF EXISTS tg_quotations_notify ON public.quotations;
CREATE TRIGGER tg_quotations_notify AFTER INSERT ON public.quotations
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_new_quotation();

DROP TRIGGER IF EXISTS tg_messages_notify ON public.contact_messages;
CREATE TRIGGER tg_messages_notify AFTER INSERT ON public.contact_messages
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_new_message();

UPDATE public.site_settings
SET business_hours = '{"days":"Monday – Sunday","open":"05:00","close":"02:00","label":"Monday – Sunday · 5:00 AM – 2:00 AM"}'::jsonb
WHERE id = 'global';