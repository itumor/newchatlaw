CREATE USER librechat_ro WITH PASSWORD 'librechat_ro_password';

GRANT CONNECT ON DATABASE app TO librechat_ro;
GRANT USAGE ON SCHEMA public TO librechat_ro;

CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  total NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO customers (name, city) VALUES
  ('Alice Johnson', 'Riga'),
  ('Bob Smith', 'Berlin'),
  ('Carla Diaz', 'Lisbon')
ON CONFLICT DO NOTHING;

INSERT INTO orders (customer_id, total, created_at) VALUES
  (1, 120.50, NOW() - INTERVAL '2 days'),
  (1, 89.00, NOW() - INTERVAL '1 day'),
  (2, 240.00, NOW() - INTERVAL '3 days'),
  (3, 40.25, NOW() - INTERVAL '5 hours')
ON CONFLICT DO NOTHING;

GRANT SELECT ON ALL TABLES IN SCHEMA public TO librechat_ro;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO librechat_ro;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT SELECT ON TABLES TO librechat_ro;
