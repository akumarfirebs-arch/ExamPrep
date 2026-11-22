-- ExamPrep Supabase Database Schema
-- Run this in your Supabase Project -> SQL Editor

-- 1. Profiles table (Stores user role, name, custom avatar)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  avatar_url TEXT DEFAULT 'avatar-1',
  selected_exam_id TEXT DEFAULT 'rrb',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Public profiles are viewable by everyone" 
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" 
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 2. Tests table (Stores custom and system tests)
CREATE TABLE IF NOT EXISTS public.tests (
  id TEXT PRIMARY KEY,
  exam_id TEXT NOT NULL,
  sub_exam_id TEXT,
  test_type TEXT NOT NULL,
  title TEXT NOT NULL,
  title_hi TEXT,
  description TEXT,
  description_hi TEXT,
  subject TEXT,
  subject_hi TEXT,
  duration_minutes INTEGER,
  timed BOOLEAN DEFAULT true,
  positive_marks NUMERIC(4, 2) DEFAULT 1.0,
  negative_marks NUMERIC(4, 2) DEFAULT 0.33,
  pass_percentage NUMERIC(4, 2) DEFAULT 40.0,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tests are viewable by all authenticated users"
  ON public.tests FOR SELECT USING (true);

CREATE POLICY "Only admins can insert tests"
  ON public.tests FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- 3. Test Results table (Scorecards)
CREATE TABLE IF NOT EXISTS public.test_results (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  test_id TEXT NOT NULL,
  score NUMERIC(6, 2) NOT NULL,
  max_marks NUMERIC(6, 2) NOT NULL,
  percentage NUMERIC(5, 2) NOT NULL,
  accuracy NUMERIC(5, 2) NOT NULL,
  correct_count INTEGER NOT NULL,
  incorrect_count INTEGER NOT NULL,
  unattempted_count INTEGER NOT NULL,
  time_taken_seconds INTEGER NOT NULL,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  subject_results JSONB NOT NULL DEFAULT '[]'::jsonb,
  completed_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.test_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own scorecards"
  ON public.test_results FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own test results"
  ON public.test_results FOR INSERT WITH CHECK (auth.uid() = user_id);
