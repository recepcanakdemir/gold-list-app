# Database Migrations

This directory contains SQL migration scripts for the Gold List Method app.

## Extremely Hard Words System Migration

### Files:
- `migrations/add_extremely_hard_words_system.sql` - Adds the new columns and constraints
- `migrations/rollback_extremely_hard_words_system.sql` - Removes the changes (⚠️ destructive)

### How to Apply Migration:

#### Option 1: Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `add_extremely_hard_words_system.sql`
4. Click **Run** to execute the migration
5. Verify the changes worked using the verification queries at the bottom

#### Option 2: Command Line (if using Supabase CLI)
```bash
supabase db reset --db-url "your-database-url"
# Then apply your schema including the new migration
```

### What This Migration Does:
1. **Adds two new columns to `words` table:**
   - `difficulty_tag`: enum for tracking word difficulty level
   - `cycle_count`: integer for tracking how many cycles a word has been through

2. **Sets up constraints:**
   - Check constraint to ensure valid difficulty tag values
   - NOT NULL constraints after setting defaults

3. **Creates indexes:**
   - Performance optimization for queries by difficulty tag
   - Index for cycle count statistics

4. **Sets default values:**
   - All existing words get `difficulty_tag = 'NORMAL'` and `cycle_count = 0`

### Verification:
After running the migration, you should see:
- New columns in the `words` table
- All existing words have default values
- Indexes created successfully
- App can now track extremely hard words!

### Rollback (⚠️ Data Loss Warning):
If you need to undo the migration:
1. Run `rollback_extremely_hard_words_system.sql` in SQL Editor
2. This will **permanently delete** all difficulty tag and cycle count data
3. Only use if absolutely necessary

### Next Steps:
After applying the migration, the app will automatically:
- Tag words as "EXTREMELY_HARD" when they fail Gold Round 4
- Show red backgrounds and difficulty labels during review
- Display expandable statistics for extremely hard words
- Cycle failed Gold Round 4 words back to Round 1 with increased difficulty