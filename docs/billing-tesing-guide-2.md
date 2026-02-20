 3. Comprehensive Billing    
  Testing Guide

  Prerequisites

  - Run npx prisma db push    
  first (adds overageCapCents 
  column)
  - Have a test org on        
  free-trial plan in DB       
  - Use Stripe test mode keys 
  (swap to pk_test_ /
  sk_test_) for testing       
  payments
  - Install Stripe CLI for    
  webhook forwarding: stripe  
  listen --forward-to localhos
  t:3000/api/webhooks/stripe  

  ---
  A. Plan Display & UI        

  Test: Billing page loads    
  correctly
  1. Go to
  /dashboard/settings/billing 
  2. Verify the top card shows
   your current plan name +   
  features (checkmarks)       
  3. Verify 4 plan cards:     
  Starter / Professional /    
  Business / Enterprise       
  4. Verify free-trial is NOT 
  shown as a selectable plan  
  card
  5. Hover over each card —   
  confirm hover lift + border 
  glow effect
  6. Toggle the Annual/Monthly
   billing switch — prices    
  should change

  Test: Enterprise card       
  - Should show "Contact Us"  
  if
  STRIPE_ENTERPRISE_PRICE_ID  
  is empty
  - Should show a price and   
  upgrade button if the env   
  var is set

  ---
  B. Trial Enforcement        

  Test: 14-day trial expiry   
  1. In your DB (Supabase     
  table editor), find your    
  test org and set
  trialExpiresAt to a past    
  date:
  UPDATE "Organization" SET   
  "trialExpiresAt" = NOW() -  
  INTERVAL '1 day' WHERE id = 
  'your-org-id';
  2. Try to make an outbound  
  call — should be blocked    
  with: "Your 14-day free     
  trial has expired"
  3. Reset it back: UPDATE    
  "Organization" SET
  "trialExpiresAt" = NOW() +  
  INTERVAL '14 days' ...      

  Test: 20 outbound call cap  
  1. Set trialExpiresAt to    
  future (active trial)       
  2. In DB, insert 20 dummy   
  call records with direction 
  = 'outbound' and
  organizationId = your org   
  3. Try to make the 21st call
   — should be blocked with:  
  "You have reached the 20    
  outbound call limit"        
  4. Clean up: DELETE FROM    
  "Call" WHERE organizationId 
  = 'your-org-id' AND
  direction = 'outbound'      

  Test: 100-minute trial cap  
  1. Insert a call record with
   durationSeconds = 6001     
  (100+ minutes)
  2. Try to make a new call — 
  should be blocked with: "You
   have used all 100 trial    
  minutes"

  ---
  C. Trial Email Sequence     

  Test: Trigger cron manually 
  curl -X POST http://localhos
  t:3000/api/cron/trial-emails
   \
    -H "Authorization: Bearer 
  YOUR_CRON_SECRET"

  Test each email day:        
  Set trialExpiresAt to       
  trigger specific day states:
  -- Simulate Day 1 (trial    
  started today)
  UPDATE "Organization" SET   
  "trialExpiresAt" = NOW() +  
  INTERVAL '13 days' WHERE id 
  = 'your-org-id';

  -- Simulate Day 7
  UPDATE "Organization" SET   
  "trialExpiresAt" = NOW() +  
  INTERVAL '7 days' WHERE id =
   'your-org-id';

  -- Simulate Day 11
  UPDATE "Organization" SET   
  "trialExpiresAt" = NOW() +  
  INTERVAL '3 days' WHERE id =
   'your-org-id';

  -- Simulate Day 13
  UPDATE "Organization" SET   
  "trialExpiresAt" = NOW() +  
  INTERVAL '1 day' WHERE id = 
  'your-org-id';

  -- Simulate Day 14 (last    
  day)
  UPDATE "Organization" SET   
  "trialExpiresAt" = NOW() +  
  INTERVAL '1 hour' WHERE id =
   'your-org-id';

  Also clear any already-sent 
  flags before each test run: 
  UPDATE "Organization" SET   
  settings = '{}' WHERE id =  
  'your-org-id';

  Then hit the cron endpoint  
  and check your Resend       
  dashboard for delivered     
  emails.

  ---
  D. Usage Alert Emails (80% /
   100%)

  These fire inside
  recordCallUsage() which is  
  called from the Vapi webhook
   when a call completes. To  
  test without real calls:    

  1. Temporarily lower the    
  plan minute limit by direct 
  DB edit OR create a test org
   on "starter" (150 min      
  limit)
  2. Insert call records      
  totaling ~120 minutes (80%  
  of 150)
  3. Insert one more call to  
  push past 80% → the 80%     
  alert email fires when the  
  next real call completes    
  4. Alternatively, trigger by
   calling recordCallUsage()  
  directly in a test script   

  Easier test: check Resend   
  logs after real calls       
  complete on a
  low-minute-limit plan.      

  ---
  E. Overage Spending Cap     

  Test: Set a cap
  1. Go to
  /dashboard/settings/billing 
  → scroll to "Overage        
  Spending Cap" card
  2. Enter 5 (dollars) → Save 
  3. Verify DB: SELECT        
  "overageCapCents" FROM      
  "Organization" WHERE id =   
  '...' → should be 500       

  Test: Cap enforcement       
  1. Set a cap of $0.01 (1    
  cent) via DB: UPDATE        
  "Organization" SET
  "overageCapCents" = 1 ...   
  2. Set org to a paid plan   
  with used minutes > limit   
  3. Try to make a call →     
  should be blocked with:     
  "Your monthly overage cap of
   $0.01 has been reached"    

  Test: Remove cap
  1. Click "Remove Cap" on    
  billing page
  2. Verify DB:
  overageCapCents is now NULL 

  ---
  F. Stripe Checkout &        
  Subscription Lifecycle      

  Test: Upgrade flow
  1. Use Stripe test keys     
  2. Click upgrade on any plan
   card
  3. Complete checkout with   
  test card 4242 4242 4242    
  4242 (any future date, any  
  CVC)
  4. Should redirect to       
  /dashboard/settings/billing?
  success=true
  5. Verify in DB: org planId 
  updated,
  stripeSubscriptionId set,   
  trialExpiresAt = NULL       

  Test: Billing portal        
  1. After subscribing, click 
  "Manage Billing" button     
  2. Should open Stripe       
  Customer Portal
  3. Cancel subscription →    
  webhook fires → org reverts 
  to free-trial

  Test: Payment failure       
  1. Use test card 4000 0000  
  0000 0341 (always fails)    
  2. Or in Stripe Dashboard,  
  manually mark invoice as    
  uncollectible
  3. Stripe fires
  invoice.payment_failed      
  webhook
  4. Verify: yellow payment   
  failure banner appears on   
  billing page

  Stripe webhook test (local):
  stripe listen --forward-to  
  localhost:3000/api/webhooks/
  stripe
  stripe trigger
  checkout.session.completed  
  stripe trigger customer.subs
  cription.deleted
  stripe trigger
  invoice.payment_failed      

  ---
  G. Disposable Email &       
  Duplicate Domain Blocking   

  These run on org creation   
  via the Clerk webhook. Check
   in DB after signup:        

  SELECT settings FROM        
  "Organization" WHERE id =   
  'your-org-id';

  If flagged, settings will   
  contain:
  {
    "trialAbuseFlag":
  "disposable_email",
    "trialAbuseFlaggedAt":    
  "2026-02-20T..."
  }

  Test with a mailinator.com  
  email address to trigger the
   disposable flag.

  ---
  H. Annual Billing Toggle    

  1. Set the annual price ID  
  env vars in Stripe first    
  (create annual prices in    
  Stripe Dashboard as
  recurring yearly)
  2. Toggle the Annual switch 
  on billing page
  3. Prices update to
  monthly-equivalent (e.g.    
  $41/mo for Starter)
  4. Click upgrade → checkout 
  uses the annual price ID    
  5. Subscription shows yearly
   billing interval in Stripe 

  ---
  Summary of what needs manual
   Stripe setup before testing
   payments:
  - Create annual price IDs in
   Stripe Dashboard if you    
  want annual billing
  - Create a 20% off promotion
   code in Stripe (for Day 13 
  trial email offer)
  - Make sure
  STRIPE_WEBHOOK_SECRET       
  matches your Stripe CLI or  
  Vercel webhook endpoint 