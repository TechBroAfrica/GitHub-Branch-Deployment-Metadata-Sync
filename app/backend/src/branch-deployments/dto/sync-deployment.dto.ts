import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsInt, IsUrl } from 'class-validator';

export class SyncDeploymentDto {
  @ApiProperty({
    description: 'The name of the branch',
    example: 'feat/be-branch-metadata-sync',
  })
  @IsString()
  @IsNotEmpty()
  branchName!: string;

  @ApiProperty({
    description: 'The GitHub Pull Request number (optional)',
    example: 60,
    required: false,
  })
  @IsInt()
  @IsOptional()
  prNumber?: number;

  @ApiProperty({
    description: 'The commit SHA deployed',
    example: '6dcb09b5b57875f334f61aebed69c5e6f6f96611',
  })
  @IsString()
  @IsNotEmpty()
  commitSha!: string;

  @ApiProperty({
    description: 'The URL of the preview environment',
    example: 'https://preview-qx-pr60.vercel.app',
  })
  @IsUrl()
  @IsNotEmpty()
  previewUrl!: string;

  @ApiProperty({
    description: 'The status of the deployment (e.g. pending, success, failed)',
    example: 'success',
  })
  @IsString()
  @IsNotEmpty()
  status!: string;

  @ApiProperty({
    description: 'The timestamp of when the build/deployment event occurred (optional)',
    example: '2026-06-26T12:00:00.000Z',
    required: false,
  })
  @IsString()
  @IsOptional()
  timestamp?: string;
}

export class BranchDeploymentResponseDto {
  @ApiProperty({ example: 'f3918a28-98db-410a-8bfb-ff334f61aeb1' })
  id!: string;

  @ApiProperty({ example: 'feat/be-branch-metadata-sync' })
  branchName!: string;

  @ApiProperty({ example: 60, required: false })
  prNumber?: number;

  @ApiProperty({ example: '6dcb09b5b57875f334f61aebed69c5e6f6f96611' })
  commitSha!: string;

  @ApiProperty({ example: 'https://preview-qx-pr60.vercel.app' })
  previewUrl!: string;

  @ApiProperty({ example: 'success' })
  status!: string;

  @ApiProperty({ example: '2026-06-26T12:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-06-26T12:00:00.000Z' })
  updatedAt!: string;
}
