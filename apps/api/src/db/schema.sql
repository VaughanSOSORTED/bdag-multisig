-- The API never has custody of anything: it stores proposals and
-- signatures only. Owners can always sign/execute directly onchain.
CREATE TABLE IF NOT EXISTS transactions (
  id            TEXT PRIMARY KEY,          -- uuid
  safe_address  TEXT NOT NULL,
  to_address    TEXT NOT NULL,
  value_wei     TEXT NOT NULL,
  calldata      TEXT NOT NULL,
  safe_tx_hash  TEXT NOT NULL UNIQUE,
  operation     INTEGER NOT NULL DEFAULT 0,
  safe_tx_gas   TEXT NOT NULL DEFAULT '0',
  base_gas      TEXT NOT NULL DEFAULT '0',
  gas_price     TEXT NOT NULL DEFAULT '0',
  gas_token     TEXT NOT NULL DEFAULT '0x0000000000000000000000000000000000000000',
  refund_receiver TEXT NOT NULL DEFAULT '0x0000000000000000000000000000000000000000',
  safe_nonce    BIGINT NOT NULL,
  description   TEXT,
  status        TEXT NOT NULL DEFAULT 'pending', -- pending | executed
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS signatures (
  tx_id       TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  signer      TEXT NOT NULL,
  signature   TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tx_id, signer)
);

CREATE INDEX IF NOT EXISTS idx_tx_safe_status ON transactions (safe_address, status);
