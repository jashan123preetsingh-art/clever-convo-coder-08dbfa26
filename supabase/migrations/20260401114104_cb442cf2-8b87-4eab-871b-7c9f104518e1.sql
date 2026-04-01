
-- 1. Fix pricing_plans: restrict SELECT to active plans only
DROP POLICY IF EXISTS "Anyone can view active plans" ON pricing_plans;
CREATE POLICY "Anyone can view active plans"
  ON pricing_plans FOR SELECT
  TO authenticated
  USING (is_active = true);

-- 2. Fix discount_codes: remove public SELECT policy, only admins can browse
DROP POLICY IF EXISTS "Users can view active discounts" ON discount_codes;
DROP POLICY IF EXISTS "Admins can select discounts" ON discount_codes;
CREATE POLICY "Admins can select discounts"
  ON discount_codes FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. Fix user_roles: ensure non-admins cannot INSERT/UPDATE/DELETE
-- The existing admin-only policies are permissive. Since RLS is enabled and there are
-- no permissive INSERT/UPDATE/DELETE policies for non-admins, they are already blocked.
-- But let's add explicit restrictive policies for safety (belt and suspenders).
-- Actually with Postgres RLS, if no permissive policy matches, access is denied.
-- The current setup already blocks non-admin writes. No change needed.

-- 4. Fix profiles: restrict UPDATE to only safe columns using a trigger
-- There's already a prevent_plan_self_update trigger function, let's ensure the trigger exists
DROP TRIGGER IF EXISTS prevent_plan_self_update_trigger ON profiles;
CREATE TRIGGER prevent_plan_self_update_trigger
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_plan_self_update();
