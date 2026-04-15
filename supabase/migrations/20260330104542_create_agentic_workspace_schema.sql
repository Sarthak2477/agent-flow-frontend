/*
  # Agentic Workspace Platform Schema

  ## Overview
  Creates the core database schema for the Agentic Cloud platform, supporting
  agent management, GitHub integration, OKE deployments, and observability.

  ## New Tables

  ### `agents`
  Stores agent configurations and metadata
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key to auth.users)
  - `name` (text) - Agent display name
  - `config` (jsonb) - Agent configuration including API keys, models, etc.
  - `githubRepo` (text, nullable) - Connected GitHub repository
  - `image_url` (text, nullable) - Docker image URL after build
  - `status` (text) - Agent lifecycle status: 'draft', 'ready', 'deployed', 'archived'
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `deployments`
  Tracks OKE Kubernetes deployment status
  - `id` (uuid, primary key)
  - `agent_id` (uuid, foreign key to agents)
  - `status` (text) - Deployment status: 'pending', 'running', 'failed', 'stopped'
  - `k8s_namespace` (text)
  - `k8s_deployment_name` (text)
  - `k8s_service_name` (text, nullable)
  - `env_vars` (jsonb) - Environment variables for the deployment
  - `started_at` (timestamptz)
  - `stopped_at` (timestamptz, nullable)
  - `error_message` (text, nullable)
  - `created_at` (timestamptz)

  ### `github_connections`
  Stores GitHub OAuth tokens and repository access
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key to auth.users)
  - `github_token` (text) - Encrypted GitHub access token
  - `github_username` (text)
  - `connected_at` (timestamptz)

  ## Security
  - Enable RLS on all tables
  - Users can only access their own agents, deployments, and GitHub connections
*/

-- Create agents table
CREATE TABLE IF NOT EXISTS agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  config jsonb DEFAULT '{}'::jsonb,
  githubRepo text,
  image_url text,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'deployed', 'archived')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create deployments table
CREATE TABLE IF NOT EXISTS deployments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'failed', 'stopped')),
  k8s_namespace text NOT NULL,
  k8s_deployment_name text NOT NULL,
  k8s_service_name text,
  env_vars jsonb DEFAULT '{}'::jsonb,
  started_at timestamptz DEFAULT now(),
  stopped_at timestamptz,
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- Create github_connections table
CREATE TABLE IF NOT EXISTS github_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  github_token text NOT NULL,
  github_username text NOT NULL,
  connected_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE github_connections ENABLE ROW LEVEL SECURITY;

-- RLS Policies for agents table
CREATE POLICY "Users can view own agents"
  ON agents FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own agents"
  ON agents FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own agents"
  ON agents FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own agents"
  ON agents FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for deployments table
CREATE POLICY "Users can view own deployments"
  ON deployments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM agents
      WHERE agents.id = deployments.agent_id
      AND agents.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create deployments for own agents"
  ON deployments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM agents
      WHERE agents.id = agent_id
      AND agents.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own deployments"
  ON deployments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM agents
      WHERE agents.id = deployments.agent_id
      AND agents.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM agents
      WHERE agents.id = agent_id
      AND agents.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own deployments"
  ON deployments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM agents
      WHERE agents.id = deployments.agent_id
      AND agents.user_id = auth.uid()
    )
  );

-- RLS Policies for github_connections table
CREATE POLICY "Users can view own GitHub connection"
  ON github_connections FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own GitHub connection"
  ON github_connections FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own GitHub connection"
  ON github_connections FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own GitHub connection"
  ON github_connections FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_agents_user_id ON agents(user_id);
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_deployments_agent_id ON deployments(agent_id);
CREATE INDEX IF NOT EXISTS idx_deployments_status ON deployments(status);
CREATE INDEX IF NOT EXISTS idx_github_connections_user_id ON github_connections(user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for agents table
DROP TRIGGER IF EXISTS update_agents_updated_at ON agents;
CREATE TRIGGER update_agents_updated_at
  BEFORE UPDATE ON agents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();