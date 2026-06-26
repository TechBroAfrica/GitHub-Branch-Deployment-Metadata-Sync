import { Injectable, NotFoundException } from '@nestjs/common';
import { BranchDeploymentsRepository, BranchDeploymentRecord } from './branch-deployments.repository';
import { SyncDeploymentDto } from './dto/sync-deployment.dto';

@Injectable()
export class BranchDeploymentsService {
  constructor(private readonly repository: BranchDeploymentsRepository) {}

  async sync(dto: SyncDeploymentDto): Promise<BranchDeploymentRecord> {
    const existing = await this.repository.findByBranchName(dto.branchName);
    const incomingTime = dto.timestamp ? new Date(dto.timestamp).getTime() : Date.now();

    if (existing) {
      // Stale update check:
      // If the incoming commit SHA is different from the stored one,
      // check if the incoming update timestamp is older than or equal to the existing record's update time.
      if (dto.commitSha !== existing.commit_sha) {
        const existingTime = new Date(existing.updated_at).getTime();
        if (incomingTime <= existingTime) {
          // Ignore stale update and return the existing record
          return existing;
        }
      }
      // If the commit SHA is the same, it is a duplicate delivery or a status update.
      // We process it to make updates idempotent and support status changes.
    }

    return this.repository.upsert({
      branch_name: dto.branchName,
      pr_number: dto.prNumber ?? null,
      commit_sha: dto.commitSha,
      preview_url: dto.previewUrl,
      status: dto.status,
      updated_at: new Date(incomingTime).toISOString(),
    });
  }

  async getByBranchName(branchName: string): Promise<BranchDeploymentRecord> {
    const record = await this.repository.findByBranchName(branchName);
    if (!record) {
      throw new NotFoundException(`No deployment metadata found for branch: ${branchName}`);
    }
    return record;
  }

  async getByPrNumber(prNumber: number): Promise<BranchDeploymentRecord> {
    const record = await this.repository.findByPrNumber(prNumber);
    if (!record) {
      throw new NotFoundException(`No deployment metadata found for Pull Request #${prNumber}`);
    }
    return record;
  }

  async getAll(): Promise<BranchDeploymentRecord[]> {
    return this.repository.findAll();
  }
}
