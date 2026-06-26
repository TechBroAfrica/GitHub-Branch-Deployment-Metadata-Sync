import { Controller, Post, Get, Body, Param, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ApiKeyGuard } from '../auth/guards/api-key.guard';
import { RequireScopes } from '../auth/decorators/require-scopes.decorator';
import { BranchDeploymentsService } from './branch-deployments.service';
import { SyncDeploymentDto, BranchDeploymentResponseDto } from './dto/sync-deployment.dto';
import { BranchDeploymentRecord } from './branch-deployments.repository';

@ApiTags('Admin - Deployments')
@Controller('admin/deployments')
@UseGuards(ApiKeyGuard)
@ApiBearerAuth()
export class BranchDeploymentsController {
  constructor(private readonly service: BranchDeploymentsService) {}

  @Post('sync')
  @RequireScopes('admin')
  @ApiOperation({ summary: 'Sync branch deployment metadata' })
  @ApiResponse({ status: 200, description: 'Metadata synced successfully', type: BranchDeploymentResponseDto })
  async sync(@Body() dto: SyncDeploymentDto): Promise<BranchDeploymentResponseDto> {
    const record = await this.service.sync(dto);
    return this.mapToResponse(record);
  }

  @Get('branch/:branchName')
  @RequireScopes('admin')
  @ApiOperation({ summary: 'Get deployment metadata by branch name' })
  @ApiResponse({ status: 200, description: 'Metadata retrieved successfully', type: BranchDeploymentResponseDto })
  async getByBranch(@Param('branchName') branchName: string): Promise<BranchDeploymentResponseDto> {
    const record = await this.service.getByBranchName(branchName);
    return this.mapToResponse(record);
  }

  @Get('pr/:prNumber')
  @RequireScopes('admin')
  @ApiOperation({ summary: 'Get deployment metadata by Pull Request number' })
  @ApiResponse({ status: 200, description: 'Metadata retrieved successfully', type: BranchDeploymentResponseDto })
  async getByPr(@Param('prNumber', ParseIntPipe) prNumber: number): Promise<BranchDeploymentResponseDto> {
    const record = await this.service.getByPrNumber(prNumber);
    return this.mapToResponse(record);
  }

  @Get()
  @RequireScopes('admin')
  @ApiOperation({ summary: 'List all tracked deployment metadata' })
  @ApiResponse({ status: 200, description: 'Metadata list retrieved successfully', type: [BranchDeploymentResponseDto] })
  async getAll(): Promise<BranchDeploymentResponseDto[]> {
    const records = await this.service.getAll();
    return records.map(r => this.mapToResponse(r));
  }

  private mapToResponse(record: BranchDeploymentRecord): BranchDeploymentResponseDto {
    return {
      id: record.id,
      branchName: record.branch_name,
      prNumber: record.pr_number ?? undefined,
      commitSha: record.commit_sha,
      previewUrl: record.preview_url,
      status: record.status,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    };
  }
}
