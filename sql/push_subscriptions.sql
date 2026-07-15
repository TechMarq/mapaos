-- Table to store user PWA push notification subscriptions
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    endpoint TEXT UNIQUE NOT NULL, -- Endpoint URL is unique and indexable
    subscription_json JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS (Row Level Security)
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Drop existing policy to prevent duplicates
DROP POLICY IF EXISTS "Users can manage their own push subscriptions" ON push_subscriptions;

-- Policy to allow users to manage their own subscriptions
CREATE POLICY "Users can manage their own push subscriptions" 
ON push_subscriptions 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
