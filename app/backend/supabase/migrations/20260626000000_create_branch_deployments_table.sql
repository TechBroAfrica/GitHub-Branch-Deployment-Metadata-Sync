-- BE-60: GitHub Branch Deployment Metadata Sync

CREATE TABLE IF NOT EXISTS branch_deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_name TEXT NOT NULL UNIQUE,
  pr_number INTEGER,
  commit_sha TEXT NOT NULL,
  preview_url TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_branch_deployments_pr_number ON branch_deployments (pr_number) WHERE pr_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_branch_deployments_updated_at ON branch_deployments (updated_at DESC);

COMMENT ON TABLE branch_deployments IS 'Stores metadata for branch preview deployments mapped to PRs and branches.';
COMMENT ON COLUMN branch_deployments.branch_name IS 'The branch name (unique identifier for preview environments).';
COMMENT ON COLUMN branch_deployments.pr_number IS 'Associated GitHub Pull Request number (optional).';
COMMENT ON COLUMN branch_deployments.commit_sha IS 'The latest commit SHA deployed.';
COMMENT ON COLUMN branch_deployments.preview_url IS 'The URL of the preview deployment.';
COMMENT ON COLUMN branch_deployments.status IS 'Current status of the deployment (e.g. pending, success, failed).';
