CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username varchar NOT NULL UNIQUE,
  password varchar NOT NULL,
  "firstName" varchar,
  "lastName" varchar,
  role varchar NOT NULL DEFAULT 'User',
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

INSERT INTO users (id, username, password, role)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Owner',
  crypt('startowner', gen_salt('bf')),
  'Owner'
)
ON CONFLICT (username)
DO UPDATE SET
  role = 'Owner',
  password = EXCLUDED.password;
