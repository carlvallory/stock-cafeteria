CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  unit VARCHAR(50),
  current_stock INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS movements (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(id),
  date VARCHAR(50),
  time VARCHAR(50),
  type VARCHAR(50),
  quantity INTEGER,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workdays (
  id SERIAL PRIMARY KEY,
  date VARCHAR(50),
  status VARCHAR(50) CHECK (status IN ('open', 'closed')),
  opened_at TIMESTAMP,
  closed_at TIMESTAMP,
  responsible_person VARCHAR(255),
  opening_stock JSONB,
  closing_stock JSONB
);

CREATE TABLE IF NOT EXISTS settings (
  key VARCHAR(255) PRIMARY KEY,
  value JSONB,
  updated_at TIMESTAMP DEFAULT NOW()
);
