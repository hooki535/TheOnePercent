-- Draft, additive PostgreSQL catalog/feed foundation.
-- Review and execute only after an owner provisions a database and approves migration.
-- This file has not been applied to any production database.
BEGIN;

CREATE TABLE IF NOT EXISTS market_schema_migrations (
    version INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS market_providers (
    provider_id UUID PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    documentation_url TEXT,
    enabled BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS market_venues (
    venue_id UUID PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    venue_type TEXT NOT NULL CHECK (venue_type IN ('exchange','broker','otc','index_publisher','other')),
    mic_code TEXT,
    country_code CHAR(2),
    timezone_name TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS market_instruments (
    instrument_id UUID PRIMARY KEY,
    canonical_symbol TEXT NOT NULL,
    display_name TEXT NOT NULL,
    asset_class TEXT NOT NULL CHECK (asset_class IN ('forex','crypto','equity','etf','index','commodity','future','other')),
    instrument_type TEXT NOT NULL,
    base_asset TEXT,
    quote_asset TEXT,
    currency TEXT,
    identity_scope TEXT NOT NULL DEFAULT 'venue_listing',
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (identity_scope, canonical_symbol, instrument_type)
);

CREATE TABLE IF NOT EXISTS market_provider_symbols (
    mapping_id UUID PRIMARY KEY,
    provider_id UUID NOT NULL REFERENCES market_providers(provider_id),
    venue_id UUID NOT NULL REFERENCES market_venues(venue_id),
    instrument_id UUID NOT NULL REFERENCES market_instruments(instrument_id),
    raw_provider_id TEXT NOT NULL,
    provider_symbol TEXT NOT NULL,
    provider_name TEXT,
    valid_from TIMESTAMPTZ NOT NULL DEFAULT now(),
    valid_to TIMESTAMPTZ,
    raw_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (provider_id, venue_id, raw_provider_id),
    CHECK (valid_to IS NULL OR valid_to > valid_from)
);
CREATE INDEX IF NOT EXISTS market_provider_symbols_instrument_idx
    ON market_provider_symbols (instrument_id, provider_id, venue_id);

CREATE TABLE IF NOT EXISTS market_instrument_specs (
    spec_id UUID PRIMARY KEY,
    instrument_id UUID NOT NULL REFERENCES market_instruments(instrument_id),
    venue_id UUID NOT NULL REFERENCES market_venues(venue_id),
    effective_from TIMESTAMPTZ NOT NULL DEFAULT now(),
    effective_to TIMESTAMPTZ,
    price_tick NUMERIC(30, 14),
    quantity_step NUMERIC(30, 14),
    minimum_quantity NUMERIC(30, 14),
    contract_multiplier NUMERIC(30, 14),
    expiry_at TIMESTAMPTZ,
    raw_specification JSONB NOT NULL DEFAULT '{}'::jsonb,
    CHECK (effective_to IS NULL OR effective_to > effective_from),
    CHECK (price_tick IS NULL OR price_tick > 0),
    CHECK (quantity_step IS NULL OR quantity_step > 0),
    CHECK (contract_multiplier IS NULL OR contract_multiplier > 0)
);

CREATE TABLE IF NOT EXISTS market_instrument_sessions (
    session_id UUID PRIMARY KEY,
    instrument_id UUID NOT NULL REFERENCES market_instruments(instrument_id),
    venue_id UUID NOT NULL REFERENCES market_venues(venue_id),
    day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    opens_at TIME NOT NULL,
    closes_at TIME NOT NULL,
    timezone_name TEXT NOT NULL,
    session_name TEXT,
    valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_to DATE,
    raw_schedule JSONB NOT NULL DEFAULT '{}'::jsonb,
    CHECK (valid_to IS NULL OR valid_to >= valid_from)
);

CREATE TABLE IF NOT EXISTS market_data_access (
    access_id UUID PRIMARY KEY,
    provider_id UUID NOT NULL REFERENCES market_providers(provider_id),
    venue_id UUID REFERENCES market_venues(venue_id),
    instrument_id UUID REFERENCES market_instruments(instrument_id),
    access_status TEXT NOT NULL CHECK (access_status IN ('available_now','delayed','historical_only','requires_access','unavailable')),
    delay_seconds INTEGER CHECK (delay_seconds IS NULL OR delay_seconds >= 0),
    entitlement_ref TEXT,
    terms_version TEXT,
    display_allowed BOOLEAN NOT NULL DEFAULT false,
    storage_allowed BOOLEAN NOT NULL DEFAULT false,
    redistribution_allowed BOOLEAN NOT NULL DEFAULT false,
    checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ,
    reason TEXT,
    raw_status JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS market_data_access_lookup_idx
    ON market_data_access (provider_id, venue_id, instrument_id, checked_at DESC);

CREATE TABLE IF NOT EXISTS market_candles_v2 (
    provider_id UUID NOT NULL REFERENCES market_providers(provider_id),
    venue_id UUID NOT NULL REFERENCES market_venues(venue_id),
    instrument_id UUID NOT NULL REFERENCES market_instruments(instrument_id),
    interval_code TEXT NOT NULL,
    open_time TIMESTAMPTZ NOT NULL,
    open NUMERIC(30, 14) NOT NULL CHECK (open > 0),
    high NUMERIC(30, 14) NOT NULL,
    low NUMERIC(30, 14) NOT NULL CHECK (low > 0),
    close NUMERIC(30, 14) NOT NULL CHECK (close > 0),
    volume NUMERIC(38, 14) CHECK (volume IS NULL OR volume >= 0),
    source_event_time TIMESTAMPTZ,
    retrieved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    price_adjustment TEXT NOT NULL DEFAULT 'unadjusted' CHECK (price_adjustment IN ('unadjusted','split_adjusted','total_return_adjusted','provider_defined')),
    provider_revision TEXT,
    raw_provider_id TEXT NOT NULL,
    provenance JSONB NOT NULL DEFAULT '{}'::jsonb,
    PRIMARY KEY (provider_id, venue_id, instrument_id, interval_code, open_time),
    CHECK (low <= LEAST(open, close) AND high >= GREATEST(open, close) AND high >= low)
);
CREATE INDEX IF NOT EXISTS market_candles_v2_history_idx
    ON market_candles_v2 (instrument_id, venue_id, interval_code, open_time DESC);

CREATE TABLE IF NOT EXISTS market_ingestion_runs (
    run_id UUID PRIMARY KEY,
    provider_id UUID NOT NULL REFERENCES market_providers(provider_id),
    dataset TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('running','succeeded','partial','failed','cancelled')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    finished_at TIMESTAMPTZ,
    rows_read BIGINT NOT NULL DEFAULT 0 CHECK (rows_read >= 0),
    rows_written BIGINT NOT NULL DEFAULT 0 CHECK (rows_written >= 0),
    error_code TEXT,
    error_message TEXT,
    details JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS market_ingestion_cursors (
    cursor_id UUID PRIMARY KEY,
    provider_id UUID NOT NULL REFERENCES market_providers(provider_id),
    dataset TEXT NOT NULL,
    cursor_key TEXT NOT NULL,
    venue_id UUID REFERENCES market_venues(venue_id),
    instrument_id UUID REFERENCES market_instruments(instrument_id),
    interval_code TEXT,
    cursor_value JSONB NOT NULL,
    last_success_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (provider_id, dataset, cursor_key)
);

CREATE TABLE IF NOT EXISTS market_ingestion_gaps (
    gap_id UUID PRIMARY KEY,
    provider_id UUID NOT NULL REFERENCES market_providers(provider_id),
    venue_id UUID NOT NULL REFERENCES market_venues(venue_id),
    instrument_id UUID NOT NULL REFERENCES market_instruments(instrument_id),
    interval_code TEXT NOT NULL,
    gap_start TIMESTAMPTZ NOT NULL,
    gap_end TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','recovered','unrecoverable','ignored')),
    detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at TIMESTAMPTZ,
    last_error TEXT,
    CHECK (gap_end > gap_start)
);

INSERT INTO market_schema_migrations (version, name)
VALUES (1, 'market_catalog_and_provenance')
ON CONFLICT (version) DO NOTHING;

-- Policy requirements before ingestion is enabled:
-- * Equities/ETFs must identify the provider's split/dividend adjustment mode.
--   Never combine adjusted and unadjusted bars in one candle series.
-- * Futures history must be keyed by the actual expiring contract. Continuous
--   series require an explicit roll rule and adjustment policy and are a
--   separate series; never label a continuous ticker as an actual contract.
-- * Do not populate candle storage unless provider terms explicitly permit it.
COMMIT;
