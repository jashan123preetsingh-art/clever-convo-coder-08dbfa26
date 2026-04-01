
-- FIX: Allow users to read their own role
CREATE POLICY "Users can view own role"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- FIX: Create a secure discount code validation function
CREATE OR REPLACE FUNCTION public.validate_discount_code(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'valid', true,
    'discount_type', discount_type,
    'discount_value', discount_value,
    'applicable_plans', applicable_plans
  ) INTO result
  FROM public.discount_codes
  WHERE code = p_code
    AND is_active = true
    AND (starts_at IS NULL OR starts_at <= now())
    AND (expires_at IS NULL OR expires_at > now())
    AND (max_uses IS NULL OR current_uses < max_uses);

  IF result IS NULL THEN
    RETURN jsonb_build_object('valid', false);
  END IF;

  RETURN result;
END;
$$;
