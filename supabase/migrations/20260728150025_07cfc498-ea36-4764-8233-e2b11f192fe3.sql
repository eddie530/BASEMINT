CREATE TABLE public.resident_launches (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  ticker TEXT NOT NULL,
  collection TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  image TEXT NOT NULL DEFAULT '',
  tags TEXT[] NOT NULL DEFAULT '{}',
  launch_date DATE NOT NULL DEFAULT current_date,
  address TEXT,
  tx_hash TEXT,
  chain_id INTEGER NOT NULL DEFAULT 8453,
  creator_address TEXT,
  featured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX resident_launches_address_key ON public.resident_launches (lower(address)) WHERE address IS NOT NULL;

GRANT SELECT ON public.resident_launches TO anon, authenticated;
GRANT ALL ON public.resident_launches TO service_role;

ALTER TABLE public.resident_launches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Launches are publicly viewable"
  ON public.resident_launches FOR SELECT
  TO anon, authenticated
  USING (true);