
CREATE POLICY "bmc-media public read" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'bmc-media');
CREATE POLICY "bmc-media admin insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'bmc-media' AND public.is_admin(auth.uid()));
CREATE POLICY "bmc-media admin update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'bmc-media' AND public.is_admin(auth.uid())) WITH CHECK (bucket_id = 'bmc-media' AND public.is_admin(auth.uid()));
CREATE POLICY "bmc-media admin delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'bmc-media' AND public.is_admin(auth.uid()));
