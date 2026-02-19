# Billing Feature — Testing Procedure Guide

This guide covers manual testing for the five billing features added in the 85 → 100% milestone.

---

## Prerequisites

| Item | Detail |
|---|---|
| Stripe account | Test mode enabled; CLI installed for webhook forwarding |
| Stripe CLI | `stripe listen --forward-to localhost:3000/api/webhooks/stripe` |
| Test card (success) | `4242 4242 4242 4242` — any future date / any CVC |
| Test card (decline) | `4000 0000 0000 0002` — will be declined |
| App URL | `http://localhost:3000` |
| Admin account | Must have `owner` or `admin` role |

Run the Stripe CLI listener before starting any payment tests:
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

---

## 1. Payment Failure Recovery Banner

### What it does
When Stripe fires `invoice.payment_failed`, a red banner appears at the top of the billing page with an "Update Payment Method" button that opens the Stripe portal.

### Test Steps

**Trigger a failure via webhook:**
1. Navigate to `/dashboard/settings/billing` — confirm no red banner is visible.
2. In a second terminal, simulate the webhook event:
   ```bash
   stripe trigger invoice.payment_failed
   ```
3. Reload the billing page.
4. **Expected:** Red "Payment Failed" banner appears at the top with "Update Payment Method" button.
5. Click "Update Payment Method" → **Expected:** Stripe billing portal opens in the same tab.

**Clear the failure:**
1. Simulate a successful payment:
   ```bash
   stripe trigger invoice.payment_succeeded
   ```
2. Reload the billing page.
3. **Expected:** Red banner is gone.

**Database verification:**
```sql
SELECT id, "paymentFailedAt" FROM "Organization" WHERE "stripeCustomerId" IS NOT NULL;
-- After failure: paymentFailedAt has a timestamp
-- After success: paymentFailedAt is NULL
```

---

## 2. Usage Alert Threshold

### What it does
Admins set an alert percentage (50–99%). When minutes usage crosses that threshold, a yellow banner appears on the billing page and usage bars turn yellow at that percentage instead of the default 80%.

### Test Steps

**Change the threshold:**
1. Navigate to `/dashboard/settings/billing`.
2. Find the **Usage Alert Threshold** card.
3. Change the dropdown from `80%` to `70%`.
4. **Expected:** Toast "Alert threshold saved" appears. The dropdown reflects `70%`.

**Verify bar colour changes:**
1. Set the threshold to a value lower than your current minutes usage percentage.
   - Example: if you have used 50 minutes out of 500 (10%), set threshold to `10%`.
2. Reload the page.
3. **Expected:** The "Minutes Used" bar turns yellow, and a warning message appears below it.

**Verify the usage alert banner:**
1. With threshold set below your current usage %, reload the page.
2. **Expected:** Yellow "Usage Alert" banner appears near the top of the page.
3. Clicking "View Plans" in the banner smoothly scrolls to the plan selection section.

**Persistence check:**
1. Hard-reload the page (`Ctrl+Shift+R`).
2. **Expected:** The threshold remains at the value you saved.

---

## 3. Burn Rate Projection

### What it does
Below the "Minutes Used" bar, the app shows the average daily consumption and a projected number of days until the plan limit is reached.

### Test Steps

**With no usage:**
1. Open billing for an org with zero call minutes this month.
2. **Expected:** Burn rate text reads "No usage recorded yet this period."

**With active usage:**
1. Ensure there are calls recorded this billing period (create a call or use existing data).
2. Navigate to `/dashboard/settings/billing`.
3. Scroll to the **Current Usage** card.
4. **Expected:** Below the "Minutes Used" bar, a line such as:
   `~12 min/day · limit in 34 days`
   - The number of minutes/day reflects `total_minutes / day_of_month`.
   - Days until limit = `remaining_minutes / avg_minutes_per_day`.

**Already over limit:**
1. Use an org whose minutes usage exceeds the plan limit.
2. **Expected:** Text reads "Limit already reached this period" and the bar is red.

**Sanity calculation:**
```
If today is the 10th of the month and 120 minutes have been used:
  avgPerDay = 120 / 10 = 12 min/day
  remaining = planLimit - 120
  daysUntilLimit = Math.ceil(remaining / 12)
```

---

## 4. Annual Billing Toggle

### What it does
A Monthly / Annual toggle above the plan cards switches displayed prices to annual-equivalent monthly rates (~17% discount). When checking out in annual mode, Stripe uses the annual price ID (if configured); otherwise it falls back to monthly billing with a toast notification.

### Test Steps

**Toggle between modes:**
1. Navigate to `/dashboard/settings/billing`.
2. Above the plan cards, click **Annual**.
3. **Expected:**
   - Toggle highlights "Annual" with a "Save 17%" badge.
   - Plan cards show the discounted monthly equivalent prices (e.g., Starter: $41/mo).
   - A sub-line under each price reads "$490/yr · billed annually".
4. Click **Monthly** again.
5. **Expected:** Prices revert to standard monthly rates.

**Checkout with annual billing (annual price IDs configured):**
1. Set `STRIPE_STARTER_ANNUAL_PRICE_ID` (etc.) in `.env` to valid Stripe annual price IDs.
2. Select "Annual", click a plan card, click "Continue to Checkout".
3. **Expected:** Stripe Checkout shows an annual subscription product.

**Checkout fallback (annual price IDs NOT configured):**
1. Leave `STRIPE_STARTER_ANNUAL_PRICE_ID` unset in `.env`.
2. Select "Annual", click a plan card, click "Continue to Checkout".
3. **Expected:**
   - Toast appears: "Annual billing coming soon — proceeding with monthly billing."
   - Stripe Checkout opens with the monthly plan.

**Plan comparison dialog reflects billing period:**
1. With "Annual" selected, click a plan card.
2. In the comparison matrix, prices in the header should show the annual-equivalent monthly rates.

---

## 5. Plan Comparison Modal

### What it does
Clicking any non-current plan card opens a full-width dialog showing a feature matrix comparing all plans side by side. The current plan and selected plan are highlighted. "Continue to Checkout" proceeds with the selected plan.

### Test Steps

**Open the comparison dialog:**
1. Navigate to `/dashboard/settings/billing`.
2. Click any plan card that is not the current plan.
3. **Expected:** A wide dialog opens ("Compare Plans" title).

**Verify the feature matrix:**
- Columns: Free Trial, Starter, Professional, Business
- Rows include: Voice Agents, Minutes/Month, Phone Numbers, Campaigns, Advanced Analytics, CRM Integrations, Priority Support, Conversation Intelligence, Dedicated Success Manager, White-Label / SSO
- Numeric limits display as values (e.g., "3", "2,000", "Unlimited")
- Feature availability shown as green checkmarks or grey X marks
- Current plan column has grey "Current" badge
- Selected plan column has blue "Selected" badge and highlighted background

**Annual pricing in the dialog:**
1. Select "Annual" toggle on the billing page before clicking a plan.
2. In the comparison dialog, prices in column headers should reflect annual-equivalent rates.

**Cancel the dialog:**
1. Click "Cancel" or press `Esc`.
2. **Expected:** Dialog closes. No checkout is initiated.

**Confirm upgrade:**
1. Click "Continue to Checkout" in the dialog.
2. **Expected:** Browser redirects to Stripe Checkout for the selected plan.
3. After completing Stripe Checkout with test card `4242 4242 4242 4242`:
4. **Expected:** Redirect back to `/dashboard/settings/billing?success=true` with a success toast.

---

## End-to-End Happy Path

1. Open `/dashboard/settings/billing` (free-trial org).
2. Set usage alert threshold to 70%.
3. Toggle billing period to Annual.
4. Click "Professional" plan card.
5. Review comparison matrix — confirm features and annual pricing.
6. Click "Continue to Checkout".
7. Complete Stripe Checkout (test card).
8. Confirm redirect back with success toast.
9. Confirm plan card now shows "Professional" as current plan.
10. Run `stripe trigger invoice.payment_failed` → confirm red banner appears.
11. Run `stripe trigger invoice.payment_succeeded` → confirm banner clears.

---

## Common Issues

| Symptom | Likely Cause |
|---|---|
| Payment failure banner never appears | Stripe webhook not running / `paymentFailedAt` field not migrated |
| Alert threshold reverts to 80% | `settings` JSON not being updated correctly — check DB |
| Burn rate shows "No usage" despite calls | Calls have null `durationSeconds` — check call completion handler |
| Annual prices not showing discounts | `annualPrice` fields in `plans.ts` are null — check env vars |
| Comparison dialog shows blank columns | `getPlans` query failed — check Stripe API key |

---

## Running DB Migration

After pulling these changes, apply the schema update:

```bash
# Development
npx prisma db push

# Production (generates a migration file)
npx prisma migrate dev --name add_payment_failed_at
npx prisma migrate deploy
```
