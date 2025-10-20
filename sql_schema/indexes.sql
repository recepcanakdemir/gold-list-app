[
  {
    "indexname": "notebook_archives_pkey",
    "indexdef": "CREATE UNIQUE INDEX notebook_archives_pkey ON public.notebook_archives USING btree (id)"
  },
  {
    "indexname": "profiles_pkey",
    "indexdef": "CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id)"
  },
  {
    "indexname": "idx_profiles_trial_started",
    "indexdef": "CREATE INDEX idx_profiles_trial_started ON public.profiles USING btree (trial_started_at)"
  },
  {
    "indexname": "words_pkey",
    "indexdef": "CREATE UNIQUE INDEX words_pkey ON public.words USING btree (id)"
  },
  {
    "indexname": "idx_words_notebook_id",
    "indexdef": "CREATE INDEX idx_words_notebook_id ON public.words USING btree (notebook_id)"
  },
  {
    "indexname": "idx_words_review_date",
    "indexdef": "CREATE INDEX idx_words_review_date ON public.words USING btree (review_date)"
  },
  {
    "indexname": "idx_words_notebook_mastered",
    "indexdef": "CREATE INDEX idx_words_notebook_mastered ON public.words USING btree (notebook_id, is_mastered)"
  },
  {
    "indexname": "idx_words_page_id",
    "indexdef": "CREATE INDEX idx_words_page_id ON public.words USING btree (page_id)"
  },
  {
    "indexname": "idx_words_status",
    "indexdef": "CREATE INDEX idx_words_status ON public.words USING btree (status)"
  },
  {
    "indexname": "idx_words_source_notebook",
    "indexdef": "CREATE INDEX idx_words_source_notebook ON public.words USING btree (source_notebook_id)"
  },
  {
    "indexname": "idx_words_original_page",
    "indexdef": "CREATE INDEX idx_words_original_page ON public.words USING btree (original_page_id)"
  },
  {
    "indexname": "idx_words_archived",
    "indexdef": "CREATE INDEX idx_words_archived ON public.words USING btree (is_archived, archived_notebook_id)"
  },
  {
    "indexname": "idx_words_active",
    "indexdef": "CREATE INDEX idx_words_active ON public.words USING btree (is_archived, notebook_id) WHERE (is_archived = false)"
  },
  {
    "indexname": "idx_words_difficulty_tag",
    "indexdef": "CREATE INDEX idx_words_difficulty_tag ON public.words USING btree (difficulty_tag)"
  },
  {
    "indexname": "idx_words_cycle_count",
    "indexdef": "CREATE INDEX idx_words_cycle_count ON public.words USING btree (cycle_count)"
  },
  {
    "indexname": "idx_words_word_type",
    "indexdef": "CREATE INDEX idx_words_word_type ON public.words USING btree (word_type)"
  },
  {
    "indexname": "notebooks_pkey",
    "indexdef": "CREATE UNIQUE INDEX notebooks_pkey ON public.notebooks USING btree (id)"
  },
  {
    "indexname": "idx_notebooks_user_id",
    "indexdef": "CREATE INDEX idx_notebooks_user_id ON public.notebooks USING btree (user_id)"
  },
  {
    "indexname": "idx_notebooks_user_active",
    "indexdef": "CREATE INDEX idx_notebooks_user_active ON public.notebooks USING btree (user_id, is_active)"
  },
  {
    "indexname": "idx_notebooks_level",
    "indexdef": "CREATE INDEX idx_notebooks_level ON public.notebooks USING btree (notebook_level)"
  },
  {
    "indexname": "idx_notebooks_last_used_at",
    "indexdef": "CREATE INDEX idx_notebooks_last_used_at ON public.notebooks USING btree (last_used_at DESC)"
  },
  {
    "indexname": "pages_pkey",
    "indexdef": "CREATE UNIQUE INDEX pages_pkey ON public.pages USING btree (id)"
  },
  {
    "indexname": "pages_notebook_id_page_number_key",
    "indexdef": "CREATE UNIQUE INDEX pages_notebook_id_page_number_key ON public.pages USING btree (notebook_id, page_number)"
  },
  {
    "indexname": "idx_pages_notebook_id",
    "indexdef": "CREATE INDEX idx_pages_notebook_id ON public.pages USING btree (notebook_id)"
  },
  {
    "indexname": "idx_pages_review_date",
    "indexdef": "CREATE INDEX idx_pages_review_date ON public.pages USING btree (next_review_date)"
  },
  {
    "indexname": "idx_pages_status",
    "indexdef": "CREATE INDEX idx_pages_status ON public.pages USING btree (page_status)"
  },
  {
    "indexname": "idx_pages_context_title",
    "indexdef": "CREATE INDEX idx_pages_context_title ON public.pages USING btree (context_title)"
  },
  {
    "indexname": "idx_pages_context_theme",
    "indexdef": "CREATE INDEX idx_pages_context_theme ON public.pages USING btree (context_theme)"
  },
  {
    "indexname": "subscription_logs_pkey",
    "indexdef": "CREATE UNIQUE INDEX subscription_logs_pkey ON public.subscription_logs USING btree (id)"
  },
  {
    "indexname": "idx_subscription_logs_user_id",
    "indexdef": "CREATE INDEX idx_subscription_logs_user_id ON public.subscription_logs USING btree (user_id)"
  },
  {
    "indexname": "reviews_pkey",
    "indexdef": "CREATE UNIQUE INDEX reviews_pkey ON public.reviews USING btree (id)"
  },
  {
    "indexname": "idx_reviews_word_id",
    "indexdef": "CREATE INDEX idx_reviews_word_id ON public.reviews USING btree (word_id)"
  },
  {
    "indexname": "user_notification_settings_pkey",
    "indexdef": "CREATE UNIQUE INDEX user_notification_settings_pkey ON public.user_notification_settings USING btree (id)"
  },
  {
    "indexname": "user_notification_settings_user_id_key",
    "indexdef": "CREATE UNIQUE INDEX user_notification_settings_user_id_key ON public.user_notification_settings USING btree (user_id)"
  },
  {
    "indexname": "notification_history_pkey",
    "indexdef": "CREATE UNIQUE INDEX notification_history_pkey ON public.notification_history USING btree (id)"
  },
  {
    "indexname": "idx_notification_history_user_id",
    "indexdef": "CREATE INDEX idx_notification_history_user_id ON public.notification_history USING btree (user_id)"
  },
  {
    "indexname": "idx_notification_history_type",
    "indexdef": "CREATE INDEX idx_notification_history_type ON public.notification_history USING btree (type)"
  },
  {
    "indexname": "idx_notification_history_sent_at",
    "indexdef": "CREATE INDEX idx_notification_history_sent_at ON public.notification_history USING btree (sent_at)"
  },
  {
    "indexname": "idx_notification_history_read_at",
    "indexdef": "CREATE INDEX idx_notification_history_read_at ON public.notification_history USING btree (read_at)"
  }
]