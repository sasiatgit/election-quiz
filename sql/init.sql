CREATE TABLE IF NOT EXISTS quiz_leads (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  place TEXT NOT NULL,
  phone VARCHAR(10) NOT NULL,
  like_dislike TEXT,
  comments TEXT,
  overall_correct_answers INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
