[
  {
    "trigger_name": "update_profiles_updated_at",
    "pg_get_triggerdef": "CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()"
  },
  {
    "trigger_name": "update_notebooks_updated_at",
    "pg_get_triggerdef": "CREATE TRIGGER update_notebooks_updated_at BEFORE UPDATE ON public.notebooks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()"
  },
  {
    "trigger_name": "update_words_updated_at",
    "pg_get_triggerdef": "CREATE TRIGGER update_words_updated_at BEFORE UPDATE ON public.words FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()"
  },
  {
    "trigger_name": "update_notebook_stats_trigger",
    "pg_get_triggerdef": "CREATE TRIGGER update_notebook_stats_trigger AFTER INSERT OR DELETE OR UPDATE ON public.words FOR EACH ROW EXECUTE FUNCTION update_notebook_stats()"
  },
  {
    "trigger_name": "update_pages_updated_at",
    "pg_get_triggerdef": "CREATE TRIGGER update_pages_updated_at BEFORE UPDATE ON public.pages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()"
  },
  {
    "trigger_name": "update_user_notification_settings_updated_at",
    "pg_get_triggerdef": "CREATE TRIGGER update_user_notification_settings_updated_at BEFORE UPDATE ON public.user_notification_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()"
  }
]