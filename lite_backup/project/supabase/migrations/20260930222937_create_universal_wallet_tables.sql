/*
# Universal Wallet - Session and Payment Tables

1. New Tables
- `transfer_sessions`: Stores transfer/claim request sessions with state machine
  - id (text, primary key) - unique session ID
  - source (text, nullable) - source wallet address
  - payment_destination (text, not null) - handshake payment destination
  - amount_usd_cents (integer, not null) - required payment amount in cents
  - payment_asset (text, not null) - asset used for payment
  - payment_network (text, not null) - network for payment
  - payment_tx_hash (text, nullable) - verified payment transaction hash
  - payment_verified (boolean, default false)
  - payment_verified_at (timestamptz, nullable)
  - state (text, not null) - session state machine state
  - created_at (timestamptz, default now)
  - expires_at (timestamptz, not null) - request expiry (1 hour)
  - claim_expires_at (timestamptz, nullable) - claim window expiry (6 hours after payment)
  - authorization_signer (text, nullable)
  - authorization_signature (text, nullable)
  - authorization_manifest_hash (text, nullable)
  - authorization_deadline (timestamptz, nullable)
  - authorization_verified (boolean, default false)
  - manifest (jsonb, nullable) - claim manifest
  - used (boolean, default false) - session one-time use flag
  - claimed_at (timestamptz, nullable)
  - qr_payload (jsonb, nullable) - QR payload data
  - nonce (text, nullable) - cryptographic nonce

- `consumed_payments`: Idempotency table for consumed payment transactions
  - id (uuid, primary key)
  - tx_hash (text, not null) - blockchain transaction hash
  - network (text, not null) - payment network
  - session_id (text, not null) - session that consumed this payment
  - consumed_at (timestamptz, default now)

2. Security
- Enable RLS on both tables.
- Allow anon + authenticated CRUD (no-auth app, public session management).
- Consumed payments are insert-only for anon (idempotency records).
*/

CREATE TABLE IF NOT EXISTS transfer_sessions (
  id text PRIMARY KEY,
  source text,
  payment_destination text NOT NULL,
  amount_usd_cents integer NOT NULL,
  payment_asset text NOT NULL,
  payment_network text NOT NULL,
  payment_tx_hash text,
  payment_verified boolean NOT NULL DEFAULT false,
  payment_verified_at timestamptz,
  state text NOT NULL DEFAULT 'CREATED',
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  claim_expires_at timestamptz,
  authorization_signer text,
  authorization_signature text,
  authorization_manifest_hash text,
  authorization_deadline timestamptz,
  authorization_verified boolean NOT NULL DEFAULT false,
  manifest jsonb,
  used boolean NOT NULL DEFAULT false,
  claimed_at timestamptz,
  qr_payload jsonb,
  nonce text
);

ALTER TABLE transfer_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_sessions" ON transfer_sessions;
CREATE POLICY "anon_select_sessions" ON transfer_sessions FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_sessions" ON transfer_sessions;
CREATE POLICY "anon_insert_sessions" ON transfer_sessions FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_sessions" ON transfer_sessions;
CREATE POLICY "anon_update_sessions" ON transfer_sessions FOR UPDATE
TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_sessions" ON transfer_sessions;
CREATE POLICY "anon_delete_sessions" ON transfer_sessions FOR DELETE
TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS consumed_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tx_hash text NOT NULL,
  network text NOT NULL,
  session_id text NOT NULL,
  consumed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tx_hash, network)
);

ALTER TABLE consumed_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_consumed_payments" ON consumed_payments;
CREATE POLICY "anon_select_consumed_payments" ON consumed_payments FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_consumed_payments" ON consumed_payments;
CREATE POLICY "anon_insert_consumed_payments" ON consumed_payments FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_consumed_payments" ON consumed_payments;
CREATE POLICY "anon_delete_consumed_payments" ON consumed_payments FOR DELETE
TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_sessions_state ON transfer_sessions(state);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON transfer_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_consumed_payments_tx_hash ON consumed_payments(tx_hash);
