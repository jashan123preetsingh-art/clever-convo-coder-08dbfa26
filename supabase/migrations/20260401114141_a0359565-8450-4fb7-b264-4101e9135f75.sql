
-- ai_analysis_cache: add policies for the cache table (RLS enabled but no policies)
CREATE POLICY "Anyone can read cache"
  ON ai_analysis_cache FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service can insert cache"
  ON ai_analysis_cache FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Service can update cache"
  ON ai_analysis_cache FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Service can delete cache"
  ON ai_analysis_cache FOR DELETE
  TO authenticated
  USING (true);
