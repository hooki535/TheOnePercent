-- TheOnePercent initial PostgreSQL schema.
-- Run with psql against an owner-controlled database after provisioning.
-- Do not expose these tables directly to unauthenticated API clients.
BEGIN;

CREATE TABLE IF NOT EXISTS market_candles (
    provider TEXT NOT NULL,
    provider_symbol TEXT NOT NULL,
    interval TEXT NOT NULL,
    open_time TIMESTAMPTZ NOT NULL,
    open NUMERIC(24, 10) NOT NULL CHECK (open > 0),
    high NUMERIC(24, 10) NOT NULL,
    low NUMERIC(24, 10) NOT NULL CHECK (low > 0),
    close NUMERIC(24, 10) NOT NULL CHECK (close > 0),
    volume NUMERIC(30, 10) NOT NULL DEFAULT 0 CHECK (volume >= 0),
    ingested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT market_candles_valid_ohlc CHECK (
        low <= LEAST(open, close) AND
        high >= GREATEST(open, close) AND
        high >= low
    ),
    PRIMARY KEY (provider, provider_symbol, interval, open_time)
);

CREATE INDEX IF NOT EXISTS market_candles_history_idx
    ON market_candles (provider_symbol, interval, open_time DESC);

CREATE TABLE IF NOT EXISTS app_users (
    id UUID PRIMARY KEY,
    auth_subject TEXT NOT NULL UNIQUE,
    display_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS saved_chart_workspaces (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 150),
    workspace JSONB NOT NULL,
    revision INTEGER NOT NULL DEFAULT 1 CHECK (revision >= 1),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS saved_chart_workspaces_user_idx
    ON saved_chart_workspaces (user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS academy_progress (
    user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    lesson_id TEXT NOT NULL,
    completed_at TIMESTAMPTZ,
    progress JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, lesson_id)
);

COMMIT;
