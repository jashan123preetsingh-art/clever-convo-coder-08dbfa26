
-- ======================================================
-- FIX 1: discount_codes - restrict SELECT to code lookup only, not full enumeration
-- ======================================================
DROP POLICY IF EXISTS "Users can view active discounts" ON public.discount_codes;
-- Users should not be able to enumerate all discount codes.
-- Instead, no public SELECT policy. Codes are validated server-side or via RPC.

-- ======================================================
-- FIX 2: profiles - restrict UPDATE to safe columns only (not plan)
-- ======================================================
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    -- Ensure plan field cannot be changed by the user
    -- We compare the new plan value to the existing one
  );

-- Use a trigger to prevent plan field tampering
CREATE OR REPLACE FUNCTION public.prevent_plan_self_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow plan changes from service_role (admin/server-side)
  IF OLD.plan IS DISTINCT FROM NEW.plan THEN
    IF NOT public.has_role(auth.uid(), 'admin') THEN
      NEW.plan := OLD.plan; -- silently revert plan change
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_plan_self_update_trigger ON public.profiles;
CREATE TRIGGER prevent_plan_self_update_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_plan_self_update();

-- ======================================================
-- FIX 3: user_roles - explicitly deny non-admin INSERT/UPDATE/DELETE
-- ======================================================
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

CREATE POLICY "Admins can insert roles"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update roles"
  ON public.user_roles FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
  ON public.user_roles FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ======================================================
-- FIX 4: pricing_plans - only show active plans to non-admin users
-- ======================================================
DROP POLICY IF EXISTS "Anyone can view active plans" ON public.pricing_plans;
CREATE POLICY "Anyone can view active plans"
  ON public.pricing_plans FOR SELECT
  TO authenticated
  USING (is_active = true);

-- ======================================================
-- FIX 5: discount_codes - fix anonymous access by restricting to authenticated only
-- (Already handled by removing the public SELECT policy above)
-- Also update admin policy to be explicit per-operation
-- ======================================================
DROP POLICY IF EXISTS "Admins can manage discounts" ON public.discount_codes;

CREATE POLICY "Admins can select discounts"
  ON public.discount_codes FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert discounts"
  ON public.discount_codes FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update discounts"
  ON public.discount_codes FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete discounts"
  ON public.discount_codes FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
