/*
# Add source and verified amount columns to transfer_sessions

1. Modified Tables
- `transfer_sessions`: Add `source` column (text, nullable) for bound wallet address
- `transfer_sessions`: Add `payment_verified_amount` column (integer, nullable) for server-verified payment amount in cents
2. Security
- No policy changes needed - existing RLS policies already cover these columns
*/

ALTER TABLE transfer_sessions ADD COLUMN IF NOT EXISTS source text;
ALTER TABLE transfer_sessions ADD COLUMN IF NOT EXISTS payment_verified_amount integer;
