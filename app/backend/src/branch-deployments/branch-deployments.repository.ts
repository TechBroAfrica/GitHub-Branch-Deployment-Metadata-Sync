import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

export interface BranchDeploymentRecord {
  id: string;
  branch_name: string;
  pr_number: number | null;
  commit_sha: string;
  preview_url: string;
  status: string;
  created_at: string;
  updated_at: string;
}

@Injectable()
export class BranchDeploymentsRepository {
  constructor(private readonly supabase: SupabaseService) {}

  private get client() {
    return this.supabase.getClient();
  }

  async upsert(data: {
    branch_name: string;
    pr_number: number | null;
    commit_sha: string;
    preview_url: string;
    status: string;
    updated_at: string;
  }): Promise<BranchDeploymentRecord> {
    const { data: row, error } = await this.client
      .from('branch_deployments')
      .upsert(data, { onConflict: 'branch_name' })
      .select()
      .single();

    if (error) throw error;
    return row as BranchDeploymentRecord;
  }

  async findByBranchName(branchName: string): Promise<BranchDeploymentRecord | null> {
    const { data, error } = await this.client
      .from('branch_deployments')
      .select('*')
      .eq('branch_name', branchName)
      .maybeSingle();

    if (error) throw error;
    return data as BranchDeploymentRecord | null;
  }

  async findByPrNumber(prNumber: number): Promise<BranchDeploymentRecord | null> {
    const { data, error } = await this.client
      .from('branch_deployments')
      .select('*')
      .eq('pr_number', prNumber)
      .maybeSingle();

    if (error) throw error;
    return data as BranchDeploymentRecord | null;
  }

  async findAll(): Promise<BranchDeploymentRecord[]> {
    const { data, error } = await this.client
      .from('branch_deployments')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return (data as BranchDeploymentRecord[]) ?? [];
  }
}
