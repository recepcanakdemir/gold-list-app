-- Add RevenueCat integration fields to profiles table
-- This migration adds fields needed for RevenueCat subscription management

-- Add RevenueCat-specific fields to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS revenuecat_customer_id TEXT,
ADD COLUMN IF NOT EXISTS original_purchase_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS latest_purchase_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_in_trial_revenuecat BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS trial_started_at_revenuecat TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS trial_ends_at_revenuecat TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_revenuecat_sync TIMESTAMPTZ DEFAULT NOW();

-- Add comments for documentation
COMMENT ON COLUMN profiles.revenuecat_customer_id IS 'RevenueCat customer identifier for this user';
COMMENT ON COLUMN profiles.original_purchase_date IS 'Date of first purchase from RevenueCat (null if never purchased)';
COMMENT ON COLUMN profiles.latest_purchase_date IS 'Date of most recent purchase from RevenueCat';
COMMENT ON COLUMN profiles.is_in_trial_revenuecat IS 'Whether user is currently in Apple-managed trial period';
COMMENT ON COLUMN profiles.trial_started_at_revenuecat IS 'When Apple-managed trial started (RevenueCat data)';
COMMENT ON COLUMN profiles.trial_ends_at_revenuecat IS 'When Apple-managed trial ends (RevenueCat data)';
COMMENT ON COLUMN profiles.last_revenuecat_sync IS 'Last time RevenueCat data was synced for this user';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_revenuecat_customer_id ON profiles(revenuecat_customer_id);
CREATE INDEX IF NOT EXISTS idx_profiles_original_purchase_date ON profiles(original_purchase_date);
CREATE INDEX IF NOT EXISTS idx_profiles_is_in_trial_revenuecat ON profiles(is_in_trial_revenuecat);

-- Create function to sync RevenueCat data to profiles
CREATE OR REPLACE FUNCTION sync_revenuecat_data(
  p_user_id UUID,
  p_revenuecat_customer_id TEXT,
  p_subscription_status TEXT DEFAULT NULL,
  p_subscription_expires_at TIMESTAMPTZ DEFAULT NULL,
  p_subscription_activated_at TIMESTAMPTZ DEFAULT NULL,
  p_original_purchase_date TIMESTAMPTZ DEFAULT NULL,
  p_latest_purchase_date TIMESTAMPTZ DEFAULT NULL,
  p_is_in_trial BOOLEAN DEFAULT FALSE,
  p_trial_started_at TIMESTAMPTZ DEFAULT NULL,
  p_trial_ends_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  update_count INTEGER;
BEGIN
  -- Update profile with RevenueCat data
  UPDATE profiles 
  SET 
    revenuecat_customer_id = p_revenuecat_customer_id,
    subscription_status = COALESCE(p_subscription_status, subscription_status),
    subscription_expires_at = COALESCE(p_subscription_expires_at, subscription_expires_at),
    subscription_activated_at = COALESCE(p_subscription_activated_at, subscription_activated_at),
    original_purchase_date = COALESCE(p_original_purchase_date, original_purchase_date),
    latest_purchase_date = COALESCE(p_latest_purchase_date, latest_purchase_date),
    is_in_trial_revenuecat = p_is_in_trial,
    trial_started_at_revenuecat = p_trial_started_at,
    trial_ends_at_revenuecat = p_trial_ends_at,
    last_revenuecat_sync = NOW(),
    updated_at = NOW()
  WHERE id = p_user_id;
  
  GET DIAGNOSTICS update_count = ROW_COUNT;
  
  IF update_count = 0 THEN
    RAISE WARNING 'No profile found for user ID: %', p_user_id;
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$;

-- Create function to get user state based on RevenueCat data
CREATE OR REPLACE FUNCTION get_user_state_revenuecat(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  profile_record RECORD;
  user_state TEXT;
BEGIN
  -- Get user profile data
  SELECT 
    subscription_status,
    original_purchase_date,
    is_in_trial_revenuecat,
    subscription_expires_at
  INTO profile_record
  FROM profiles 
  WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN 'pre-trial';
  END IF;
  
  -- Determine user state based on RevenueCat data
  IF profile_record.subscription_status IN ('weekly', 'monthly', 'yearly') THEN
    -- Check if subscription is still active
    IF profile_record.subscription_expires_at IS NULL OR profile_record.subscription_expires_at > NOW() THEN
      -- Active subscription - check if in trial
      IF profile_record.is_in_trial_revenuecat THEN
        RETURN 'trial';
      ELSE
        RETURN 'premium';
      END IF;
    ELSE
      -- Expired subscription
      RETURN 'post-trial';
    END IF;
  ELSE
    -- No active subscription
    IF profile_record.original_purchase_date IS NOT NULL THEN
      -- Had subscription before
      RETURN 'post-trial';
    ELSE
      -- Never had subscription
      RETURN 'pre-trial';
    END IF;
  END IF;
END;
$$;

-- Create function to check if user can start trial (RevenueCat version)
CREATE OR REPLACE FUNCTION can_start_trial_revenuecat(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_state TEXT;
BEGIN
  user_state := get_user_state_revenuecat(p_user_id);
  
  -- Only pre-trial users can start trial
  RETURN user_state = 'pre-trial';
END;
$$;

-- Add RLS policies for new fields (they inherit from existing profiles policies)
-- No additional RLS needed as these are just additional columns on existing table

-- Create purchase history table for RevenueCat transaction tracking
CREATE TABLE IF NOT EXISTS revenuecat_purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  revenuecat_customer_id TEXT NOT NULL,
  product_identifier TEXT NOT NULL,
  transaction_id TEXT UNIQUE NOT NULL,
  original_transaction_id TEXT,
  purchase_date TIMESTAMPTZ NOT NULL,
  expiration_date TIMESTAMPTZ,
  is_trial_period BOOLEAN DEFAULT FALSE,
  is_intro_period BOOLEAN DEFAULT FALSE,
  price_usd DECIMAL(10,2),
  currency_code TEXT DEFAULT 'USD',
  subscription_period TEXT, -- e.g., 'weekly', 'monthly', 'yearly'
  environment TEXT DEFAULT 'production', -- 'sandbox' or 'production'
  store TEXT DEFAULT 'app_store', -- 'app_store' or 'play_store'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for purchase history
CREATE INDEX IF NOT EXISTS idx_revenuecat_purchases_user_id ON revenuecat_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_revenuecat_purchases_customer_id ON revenuecat_purchases(revenuecat_customer_id);
CREATE INDEX IF NOT EXISTS idx_revenuecat_purchases_transaction_id ON revenuecat_purchases(transaction_id);
CREATE INDEX IF NOT EXISTS idx_revenuecat_purchases_purchase_date ON revenuecat_purchases(purchase_date);

-- Add RLS for purchase history
ALTER TABLE revenuecat_purchases ENABLE ROW LEVEL SECURITY;

-- Users can only see their own purchase history
CREATE POLICY "Users can view own purchase history" ON revenuecat_purchases
  FOR SELECT USING (auth.uid() = user_id);

-- Service role can manage all purchase records (for webhook updates)
CREATE POLICY "Service role can manage purchase history" ON revenuecat_purchases
  FOR ALL USING (auth.role() = 'service_role');

-- Add comments
COMMENT ON TABLE revenuecat_purchases IS 'RevenueCat purchase transaction history';
COMMENT ON COLUMN revenuecat_purchases.revenuecat_customer_id IS 'RevenueCat customer identifier';
COMMENT ON COLUMN revenuecat_purchases.product_identifier IS 'Product ID from App Store Connect';
COMMENT ON COLUMN revenuecat_purchases.transaction_id IS 'Unique transaction identifier from Apple/Google';
COMMENT ON COLUMN revenuecat_purchases.original_transaction_id IS 'Original transaction ID for subscription renewals';
COMMENT ON COLUMN revenuecat_purchases.is_trial_period IS 'Whether this purchase was during trial period';
COMMENT ON COLUMN revenuecat_purchases.is_intro_period IS 'Whether this purchase was during introductory period';
COMMENT ON COLUMN revenuecat_purchases.environment IS 'Sandbox or production environment';

-- Function to log purchase from RevenueCat webhook
CREATE OR REPLACE FUNCTION log_revenuecat_purchase(
  p_user_id UUID,
  p_revenuecat_customer_id TEXT,
  p_product_identifier TEXT,
  p_transaction_id TEXT,
  p_original_transaction_id TEXT DEFAULT NULL,
  p_purchase_date TIMESTAMPTZ DEFAULT NOW(),
  p_expiration_date TIMESTAMPTZ DEFAULT NULL,
  p_is_trial_period BOOLEAN DEFAULT FALSE,
  p_is_intro_period BOOLEAN DEFAULT FALSE,
  p_price_usd DECIMAL DEFAULT NULL,
  p_currency_code TEXT DEFAULT 'USD',
  p_subscription_period TEXT DEFAULT NULL,
  p_environment TEXT DEFAULT 'production',
  p_store TEXT DEFAULT 'app_store'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  purchase_id UUID;
BEGIN
  -- Insert or update purchase record
  INSERT INTO revenuecat_purchases (
    user_id,
    revenuecat_customer_id,
    product_identifier,
    transaction_id,
    original_transaction_id,
    purchase_date,
    expiration_date,
    is_trial_period,
    is_intro_period,
    price_usd,
    currency_code,
    subscription_period,
    environment,
    store
  ) VALUES (
    p_user_id,
    p_revenuecat_customer_id,
    p_product_identifier,
    p_transaction_id,
    p_original_transaction_id,
    p_purchase_date,
    p_expiration_date,
    p_is_trial_period,
    p_is_intro_period,
    p_price_usd,
    p_currency_code,
    p_subscription_period,
    p_environment,
    p_store
  )
  ON CONFLICT (transaction_id) 
  DO UPDATE SET
    expiration_date = EXCLUDED.expiration_date,
    updated_at = NOW()
  RETURNING id INTO purchase_id;
  
  RETURN purchase_id;
END;
$$;

-- Migration completed successfully
SELECT 'RevenueCat fields migration completed successfully' as migration_status;