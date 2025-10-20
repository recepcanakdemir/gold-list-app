[
  {
    "create_policy_sql": "CREATE POLICY Users can insert their own notebook archives ON notebook_archives FOR INSERT WITH CHECK ((auth.uid() = user_id));"
  },
  {
    "create_policy_sql": "CREATE POLICY Users can view their own notebook archives ON notebook_archives FOR SELECT USING ((auth.uid() = user_id));"
  },
  {
    "create_policy_sql": "CREATE POLICY Users can insert own profile ON profiles FOR INSERT WITH CHECK ((auth.uid() = id));"
  },
  {
    "create_policy_sql": "CREATE POLICY Users can update own profile ON profiles FOR UPDATE USING ((auth.uid() = id));"
  },
  {
    "create_policy_sql": "CREATE POLICY Users can view own profile ON profiles FOR SELECT USING ((auth.uid() = id));"
  },
  {
    "create_policy_sql": "CREATE POLICY Users can delete words in own notebooks ON words FOR DELETE USING ((EXISTS ( SELECT 1\n   FROM notebooks\n  WHERE ((notebooks.id = words.notebook_id) AND (notebooks.user_id = auth.uid())))));"
  },
  {
    "create_policy_sql": "CREATE POLICY Users can insert words in own notebooks ON words FOR INSERT WITH CHECK ((EXISTS ( SELECT 1\n   FROM notebooks\n  WHERE ((notebooks.id = words.notebook_id) AND (notebooks.user_id = auth.uid())))));"
  },
  {
    "create_policy_sql": "CREATE POLICY Users can update words in own notebooks ON words FOR UPDATE USING ((EXISTS ( SELECT 1\n   FROM notebooks\n  WHERE ((notebooks.id = words.notebook_id) AND (notebooks.user_id = auth.uid())))));"
  },
  {
    "create_policy_sql": "CREATE POLICY Users can view words in own notebooks ON words FOR SELECT USING ((EXISTS ( SELECT 1\n   FROM notebooks\n  WHERE ((notebooks.id = words.notebook_id) AND (notebooks.user_id = auth.uid())))));"
  },
  {
    "create_policy_sql": "CREATE POLICY Users can create own notebooks ON notebooks FOR INSERT WITH CHECK ((auth.uid() = user_id));"
  },
  {
    "create_policy_sql": "CREATE POLICY Users can delete own notebooks ON notebooks FOR DELETE USING ((auth.uid() = user_id));"
  },
  {
    "create_policy_sql": "CREATE POLICY Users can update own notebooks ON notebooks FOR UPDATE USING ((auth.uid() = user_id));"
  },
  {
    "create_policy_sql": "CREATE POLICY Users can view own notebooks ON notebooks FOR SELECT USING ((auth.uid() = user_id));"
  },
  {
    "create_policy_sql": "CREATE POLICY Users can manage their own pages ON pages FOR ALL USING ((EXISTS ( SELECT 1\n   FROM notebooks\n  WHERE ((notebooks.id = pages.notebook_id) AND (notebooks.user_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1\n   FROM notebooks\n  WHERE ((notebooks.id = pages.notebook_id) AND (notebooks.user_id = auth.uid())))));"
  },
  {
    "create_policy_sql": "CREATE POLICY Service role can manage subscription logs ON subscription_logs FOR ALL USING ((auth.role() = 'service_role'::text));"
  },
  {
    "create_policy_sql": "CREATE POLICY Users can view own subscription logs ON subscription_logs FOR SELECT USING ((auth.uid() = user_id));"
  },
  {
    "create_policy_sql": "CREATE POLICY Users can insert reviews for own words ON reviews FOR INSERT WITH CHECK ((word_id IN ( SELECT w.id\n   FROM (words w\n     JOIN notebooks n ON ((w.notebook_id = n.id)))\n  WHERE (n.user_id = auth.uid()))));"
  },
  {
    "create_policy_sql": "CREATE POLICY Users can view reviews for own words ON reviews FOR SELECT USING ((word_id IN ( SELECT w.id\n   FROM (words w\n     JOIN notebooks n ON ((w.notebook_id = n.id)))\n  WHERE (n.user_id = auth.uid()))));"
  },
  {
    "create_policy_sql": "CREATE POLICY Users can delete own notification settings ON user_notification_settings FOR DELETE USING ((auth.uid() = user_id));"
  },
  {
    "create_policy_sql": "CREATE POLICY Users can insert own notification settings ON user_notification_settings FOR INSERT WITH CHECK ((auth.uid() = user_id));"
  },
  {
    "create_policy_sql": "CREATE POLICY Users can update own notification settings ON user_notification_settings FOR UPDATE USING ((auth.uid() = user_id));"
  },
  {
    "create_policy_sql": "CREATE POLICY Users can view own notification settings ON user_notification_settings FOR SELECT USING ((auth.uid() = user_id));"
  },
  {
    "create_policy_sql": "CREATE POLICY Users can insert own notification history ON notification_history FOR INSERT WITH CHECK ((auth.uid() = user_id));"
  },
  {
    "create_policy_sql": "CREATE POLICY Users can update own notification history ON notification_history FOR UPDATE USING ((auth.uid() = user_id));"
  },
  {
    "create_policy_sql": "CREATE POLICY Users can view own notification history ON notification_history FOR SELECT USING ((auth.uid() = user_id));"
  }
]