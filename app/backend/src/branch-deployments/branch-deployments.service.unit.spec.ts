import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { BranchDeploymentsService } from './branch-deployments.service';
import { BranchDeploymentsRepository, BranchDeploymentRecord } from './branch-deployments.repository';
import { SyncDeploymentDto } from './dto/sync-deployment.dto';

const makeRecord = (overrides: Partial<BranchDeploymentRecord> = {}): BranchDeploymentRecord => ({
  id: 'test-uuid-1234',
  branch_name: 'feat/test-branch',
  pr_number: 42,
  commit_sha: 'commit-sha-1111',
  preview_url: 'https://preview.to/test-branch',
  status: 'success',
  created_at: '2026-06-26T12:00:00.000Z',
  updated_at: '2026-06-26T12:00:00.000Z',
  ...overrides,
});

describe('BranchDeploymentsService', () => {
  let service: BranchDeploymentsService;
  let repository: jest.Mocked<BranchDeploymentsRepository>;

  beforeEach(async () => {
    const mockRepository: jest.Mocked<Partial<BranchDeploymentsRepository>> = {
      upsert: jest.fn(),
      findByBranchName: jest.fn(),
      findByPrNumber: jest.fn(),
      findAll: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BranchDeploymentsService,
        { provide: BranchDeploymentsRepository, useValue: mockRepository },
      ],
    }).compile();

    service = module.get<BranchDeploymentsService>(BranchDeploymentsService);
    repository = module.get(BranchDeploymentsRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sync', () => {
    it('creates a new deployment metadata record if none exists', async () => {
      const dto: SyncDeploymentDto = {
        branchName: 'feat/new-branch',
        prNumber: 5,
        commitSha: 'sha-new',
        previewUrl: 'https://preview.to/new-branch',
        status: 'pending',
        timestamp: '2026-06-26T12:00:00.000Z',
      };

      const record = makeRecord({
        branch_name: dto.branchName,
        pr_number: dto.prNumber,
        commit_sha: dto.commitSha,
        preview_url: dto.previewUrl,
        status: dto.status,
        updated_at: dto.timestamp,
      });

      repository.findByBranchName.mockResolvedValue(null);
      repository.upsert.mockResolvedValue(record);

      const result = await service.sync(dto);

      expect(repository.findByBranchName).toHaveBeenCalledWith(dto.branchName);
      expect(repository.upsert).toHaveBeenCalledWith({
        branch_name: dto.branchName,
        pr_number: dto.prNumber,
        commit_sha: dto.commitSha,
        preview_url: dto.previewUrl,
        status: dto.status,
        updated_at: dto.timestamp,
      });
      expect(result).toEqual(record);
    });

    it('updates status and is idempotent on duplicate deliveries with the same commit SHA', async () => {
      const existing = makeRecord({
        branch_name: 'feat/same-commit',
        commit_sha: 'sha-same',
        status: 'pending',
        updated_at: '2026-06-26T12:00:00.000Z',
      });

      const dto: SyncDeploymentDto = {
        branchName: 'feat/same-commit',
        prNumber: 42,
        commitSha: 'sha-same',
        previewUrl: 'https://preview.to/same-commit',
        status: 'success',
        timestamp: '2026-06-26T12:05:00.000Z',
      };

      const updated = makeRecord({
        ...existing,
        status: 'success',
        updated_at: dto.timestamp,
      });

      repository.findByBranchName.mockResolvedValue(existing);
      repository.upsert.mockResolvedValue(updated);

      const result = await service.sync(dto);

      expect(repository.upsert).toReturn;
      expect(repository.upsert).toHaveBeenCalledWith({
        branch_name: dto.branchName,
        pr_number: dto.prNumber,
        commit_sha: dto.commitSha,
        preview_url: dto.previewUrl,
        status: dto.status,
        updated_at: dto.timestamp,
      });
      expect(result.status).toBe('success');
    });

    it('ignores stale out-of-order updates for different commit SHAs', async () => {
      const existing = makeRecord({
        branch_name: 'feat/branch-stale',
        commit_sha: 'sha-latest',
        status: 'success',
        updated_at: '2026-06-26T12:00:00.000Z',
      });

      // Payload representing an older commit (timestamp is 1 hour earlier)
      const dto: SyncDeploymentDto = {
        branchName: 'feat/branch-stale',
        prNumber: 42,
        commitSha: 'sha-older',
        previewUrl: 'https://preview.to/stale',
        status: 'success',
        timestamp: '2026-06-26T11:00:00.000Z',
      };

      repository.findByBranchName.mockResolvedValue(existing);

      const result = await service.sync(dto);

      // Should skip upsert
      expect(repository.upsert).not.toHaveBeenCalled();
      // Should return the existing (latest) record
      expect(result).toEqual(existing);
    });

    it('allows updates for a new commit SHA with a newer timestamp', async () => {
      const existing = makeRecord({
        branch_name: 'feat/branch-new-commit',
        commit_sha: 'sha-old',
        status: 'success',
        updated_at: '2026-06-26T12:00:00.000Z',
      });

      const dto: SyncDeploymentDto = {
        branchName: 'feat/branch-new-commit',
        prNumber: 42,
        commitSha: 'sha-newer',
        previewUrl: 'https://preview.to/newer',
        status: 'success',
        timestamp: '2026-06-26T13:00:00.000Z',
      };

      const updated = makeRecord({
        ...existing,
        commit_sha: dto.commitSha,
        updated_at: dto.timestamp,
      });

      repository.findByBranchName.mockResolvedValue(existing);
      repository.upsert.mockResolvedValue(updated);

      const result = await service.sync(dto);

      expect(repository.upsert).toHaveBeenCalledWith({
        branch_name: dto.branchName,
        pr_number: dto.prNumber,
        commit_sha: dto.commitSha,
        preview_url: dto.previewUrl,
        status: dto.status,
        updated_at: dto.timestamp,
      });
      expect(result).toEqual(updated);
    });
  });

  describe('getByBranchName', () => {
    it('returns the record when it exists', async () => {
      const record = makeRecord({ branch_name: 'feat/exist' });
      repository.findByBranchName.mockResolvedValue(record);

      const result = await service.getByBranchName('feat/exist');
      expect(result).toEqual(record);
    });

    it('throws NotFoundException when the record does not exist', async () => {
      repository.findByBranchName.mockResolvedValue(null);

      await expect(service.getByBranchName('feat/nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getByPrNumber', () => {
    it('returns the record when it exists', async () => {
      const record = makeRecord({ pr_number: 100 });
      repository.findByPrNumber.mockResolvedValue(record);

      const result = await service.getByPrNumber(100);
      expect(result).toEqual(record);
    });

    it('throws NotFoundException when the record does not exist', async () => {
      repository.findByPrNumber.mockResolvedValue(null);

      await expect(service.getByPrNumber(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getAll', () => {
    it('returns all deployment records', async () => {
      const records = [makeRecord({ branch_name: 'a' }), makeRecord({ branch_name: 'b' })];
      repository.findAll.mockResolvedValue(records);

      const result = await service.getAll();
      expect(result).toEqual(records);
    });
  });
});
