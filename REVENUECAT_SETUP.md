# RevenueCat + Apple Payments Setup Guide

Complete step-by-step instructions for integrating RevenueCat with Apple In-App Purchases for the Gold List Method app.

## 🎯 Overview

This guide will help you set up:
- Apple In-App Purchase subscriptions with 14-day free trial
- RevenueCat integration for subscription management
- Database migration for RevenueCat data
- Sandbox testing environment

## 📋 Prerequisites

- ✅ Apple Developer Account
- ✅ App Store Connect access
- ✅ RevenueCat account (free tier available)
- ✅ Xcode with your app configured
- ✅ Physical iOS device for testing (simulator won't work for IAP)

---

## Phase 1: App Store Connect Setup

### Step 1: Enable In-App Purchase Capability

1. Go to [Apple Developer Portal](https://developer.apple.com/)
2. Navigate to **"Certificates, IDs & Profiles"**
3. Click **"Identifiers"** in the sidebar
4. Find and select your app bundle ID: `com.recepsienen.goldlist`
5. Scroll down to **"Capabilities"** section
6. Check the box for **"In-App Purchase"**
7. Click **"Save"** at the top right

### Step 2: Create App in App Store Connect

1. Go to [App Store Connect](https://appstoreconnect.apple.com/)
2. Click **"My Apps"**
3. Click the **"+"** button → **"New App"**
4. Fill in the required information:
   - **Platform**: iOS
   - **Name**: Gold List Method (or your preferred name)
   - **Primary Language**: English
   - **Bundle ID**: Select `com.recepsienen.goldlist`
   - **SKU**: `goldlist-ios` (or any unique identifier)
5. Click **"Create"**

### Step 3: Create Subscription Products ✅ COMPLETED

Great job! I can see you've already created the three subscription products:

- ✅ **Gold List Premium Weekly** (`goldlist_weekly_499`) - 1 week
- ✅ **Gold List Premium Monthly** (`goldlist_monthly_999`) - 1 month  
- ✅ **Gold List Premium Yearly** (`goldlist_yearly_4999`) - 1 year

### Step 4: Generate In-App Purchase Key 🔧 NEEDS COMPLETION

This is the step you're currently on. Here's the detailed process:

1. **In App Store Connect**, go to **"Users and Access"** (in the top navigation)
2. Click **"Keys"** in the sidebar (left side menu)
3. Click **"In-App Purchase"** tab at the top
4. Click **"Generate In-App Purchase Key"** button
5. Enter a **Key Name**: `Gold List RevenueCat Key`
6. Click **"Generate"**
7. **IMPORTANT**: Download the key file immediately - you can only download it once!
8. **Save these details** (you'll need them for RevenueCat):
   - **Key ID**: (10-character string, like `ABC123DEF4`)
   - **Issuer ID**: (UUID format, like `12345678-1234-1234-1234-123456789012`)
   - **Key File**: The `.p8` file you downloaded

⚠️ **Critical**: Store the key file safely - Apple only lets you download it once!

### Step 5: Configure 14-Day Free Trial

You need to add the free trial to your weekly subscription:

1. Go back to **"My Apps"** → Your app → **"Features"** → **"In-App Purchases"**
2. Click on **"Gold List Premium Weekly"** (`goldlist_weekly_499`)
3. Scroll down to **"Subscription Prices"**
4. Click **"Add Introductory Price"** or **"Manage"** next to Introductory Prices
5. Select **"Free Trial"**
6. Set duration to **"14 Days"**
7. Select territories (at minimum: United States)
8. Click **"Save"**

---

## Phase 2: RevenueCat Dashboard Setup

### Step 1: Create RevenueCat Project

1. Go to [RevenueCat Dashboard](https://app.revenuecat.com/)
2. Sign up/login to your account
3. Click **"Create New Project"**
4. Enter project name: `Gold List Method`
5. Click **"Create Project"**

### Step 2: Add iOS App

1. In your new project, click **"Add App"**
2. Select **"iOS"**
3. Enter **Bundle ID**: `com.recepsienen.goldlist`
4. Enter **App Name**: `Gold List`
5. Click **"Add App"**

### Step 3: Upload In-App Purchase Key

1. In RevenueCat dashboard, go to **"App Settings"** (gear icon)
2. Click **"Apple App Store"** tab
3. Click **"Add In-App Purchase Key"**
4. Upload the `.p8` file you downloaded from App Store Connect
5. Enter the **Key ID** and **Issuer ID** from Step 4 above
6. Click **"Save"**

### Step 4: Import Products from App Store Connect

1. Go to **"Products"** in the RevenueCat sidebar
2. Click **"Import from App Store Connect"**
3. Select all three products:
   - `goldlist_weekly_499`
   - `goldlist_monthly_999`
   - `goldlist_yearly_4999`
4. Click **"Import Products"**

### Step 5: Create Entitlements

1. Go to **"Entitlements"** in the sidebar
2. Click **"New Entitlement"**
3. Enter **Entitlement ID**: `premium_access`
4. Enter **Display Name**: `Premium Access`
5. Click **"Save"**
6. **Attach Products**: Select all three subscription products
7. Click **"Save"**

### Step 6: Get API Keys

1. Go to **"API Keys"** in the sidebar
2. Under **"Public App-specific API Keys"**, copy the **iOS key**
3. Update your `.env` file:

```bash
# Replace 'your-actual-ios-api-key-here' with the real key
EXPO_PUBLIC_REVENUECAT_API_KEY_IOS=appl_your_actual_key_here
EXPO_PUBLIC_REVENUECAT_DEBUG_LOGS=true
```

---

## Phase 3: Database Migration

### Run Database Migration

1. Open [Supabase Dashboard](https://supabase.com/dashboard)
2. Go to your project → **"SQL Editor"**
3. Copy and paste the content from: `supabase_functions/add_revenuecat_fields.sql`
4. Click **"Run"** to execute the migration
5. Verify the migration completed successfully

---

## Phase 4: Development Testing

### Step 1: Install Dependencies

```bash
cd /path/to/your/gold-list/project
npm install
```

### Step 2: Create Sandbox Test Account

⚠️ **Important**: You MUST use a different email than your regular Apple ID!

1. Go to [App Store Connect](https://appstoreconnect.apple.com/)
2. Navigate to **"Users and Access"** → **"Sandbox Testers"**
3. Click **"+"** to add a new tester
4. Fill in details with a **NEW email address** (not your existing Apple ID)
5. Choose a strong password
6. Select **"United States"** as territory
7. Click **"Save"**

### Step 3: Configure Test Device

1. On your physical iOS device, go to **Settings** → **App Store**
2. **Sign out** of your regular Apple ID
3. **Do NOT sign in** with the sandbox account yet - wait until prompted during purchase

### Step 4: Test the Integration

1. Build and run the app on your physical iOS device:
   ```bash
   npm run ios
   ```

2. **Test Flow 1: Free Trial**
   - Navigate to paywall screen
   - Enable "14-day free trial" toggle
   - Tap "Start 14-Day Free Trial"
   - When prompted, sign in with your sandbox Apple ID
   - Verify the trial starts successfully

3. **Test Flow 2: Direct Purchase**
   - Disable the trial toggle
   - Select a subscription plan (monthly/yearly)
   - Tap purchase button
   - Complete sandbox purchase
   - Verify subscription activates

4. **Test Flow 3: Restore Purchases**
   - Tap "Restore" button
   - Verify existing purchases are restored

---

## Phase 5: Verification & Troubleshooting

### Verify Everything Works

✅ **Check these indicators of success:**

- [ ] App builds and runs without errors
- [ ] RevenueCat initializes successfully (check console logs)
- [ ] Products load from RevenueCat offerings
- [ ] Trial subscription completes successfully
- [ ] Direct purchases work
- [ ] Restore purchases works
- [ ] App correctly shows user state (trial/premium/etc.)

### Common Issues & Solutions

**"No products available"**
- ✅ Verify products are approved in App Store Connect
- ✅ Check RevenueCat product import
- ✅ Ensure App Store Connect and RevenueCat product IDs match exactly

**"Purchase failed"**
- ✅ Confirm you're using a physical device (not simulator)
- ✅ Verify sandbox account is set up correctly
- ✅ Check network connection
- ✅ Ensure In-App Purchase capability is enabled

**"Trial already used"**
- ✅ Expected behavior - each Apple ID can only use trial once
- ✅ Create new sandbox test account for additional testing

**RevenueCat not initializing**
- ✅ Check API key is correct in `.env` file
- ✅ Verify bundle ID matches in RevenueCat dashboard
- ✅ Ensure In-App Purchase key is uploaded correctly

---

## Phase 6: Production Deployment

### Before App Store Submission

1. **Update Environment Variables**
   ```bash
   EXPO_PUBLIC_REVENUECAT_DEBUG_LOGS=false
   ```

2. **Test with Real Apple ID**
   - Use your real Apple ID for final testing
   - Verify everything works in production environment

3. **Submit for Review**
   - Include detailed description of subscription features
   - Test instructions for Apple reviewers
   - Screenshots showing subscription flow

### Post-Launch Monitoring

- Monitor RevenueCat dashboard for subscription metrics
- Set up webhook integration (optional)
- Track conversion rates and user behavior
- Monitor for any subscription issues

---

## 🎉 Success!

Once you've completed all phases, your app will have:

- ✅ Real Apple In-App Purchase subscriptions
- ✅ 14-day free trial that auto-converts
- ✅ RevenueCat subscription management
- ✅ Restore purchases functionality
- ✅ Complete subscription analytics

## Need Help?

- **RevenueCat Documentation**: https://docs.revenuecat.com/
- **Apple In-App Purchase Guide**: https://developer.apple.com/in-app-purchase/
- **App Store Connect Help**: https://help.apple.com/app-store-connect/

---

*Last Updated: October 2024*
*Gold List Method App - RevenueCat Integration*