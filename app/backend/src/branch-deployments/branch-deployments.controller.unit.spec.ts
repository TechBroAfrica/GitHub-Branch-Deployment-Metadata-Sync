import { Test, TestingModule } from '@nestjs/testing';
import { BranchDeploymentsController } from './branch-deployments.controller';
import { BranchDeploymentsService } from './branch-deployments.service';
import { BranchDeploymentRecord } from './branch-deployments.repository';
import { SyncDeploymentDto } from './dto/sync-deployment.dto';
import { ApiKeysService } from '../api-keys/api-keys.service';

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

describe('BranchDeploymentsController', () => {
  let controller: BranchDeploymentsController;
  let service: jest.Mocked<BranchDeploymentsService>;

  beforeEach(async () => {
    const mockService: jest.Mocked<Partial<BranchDeploymentsService>> = {
      sync: jest.fn(),
      getByBranchName: jest.fn(),
      getByPrNumber: jest.fn(),
      getAll: jest.fn(),
    };

    const mockApiKeysService = {
      validateKey: jest.fn(),
      isOverQuota: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BranchDeploymentsController],
      providers: [
        { provide: BranchDeploymentsService, useValue: mockService },
        { provide: ApiKeysService, useValue: mockApiKeysService },
      ],
    }).compile();

    controller = module.get<BranchDeploymentsController>(BranchDeploymentsController);
    service = module.get(BranchDeploymentsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('sync', () => {
    it('syncs deployment metadata and maps the database record to response camelCase DTO', async () => {
      const dto: SyncDeploymentDto = {
        branchName: 'feat/test-branch',
        prNumber: 42,
        commitSha: 'commit-sha-1111',
        previewUrl: 'https://preview.to/test-branch',
        status: 'success',
      };

      const record = makeRecord();
      service.sync.mockResolvedValue(record);

      const result = await controller.sync(dto);

      expect(service.sync).toHaveBeenCalledWith(dto);
      expect(result).toEqual({
        id: record.id,
        branchName: record.branch_name,
        prNumber: record.pr_number,
        commitSha: record.commit_sha,
        previewUrl: record.preview_url,
        status: record.status,
        createdAt: record.created_at,
        updatedAt: record.updated_at,
      });
    });
  });

  describe('getByBranch', () => {
    it('retrieves deployment metadata by branch and maps response DTO', async () => {
      const record = makeRecord({ branch_name: 'feat/my-branch' });
      service.getByBranchName.mockResolvedValue(record);

      const result = await controller.getByBranch('feat/my-branch');

      expect(service.getByBranchName).toHaveBeenCalledWith('feat/my-branch');
      expect(result.branchName).toBe('feat/my-branch');
    });
  });

  describe('getByPr', () => {
    it('retrieves deployment metadata by PR and maps response DTO', async () => {
      const record = makeRecord({ pr_number: 101 });
      service.getByPrNumber.mockResolvedValue(record);

      const result = await controller.getByPr(101);

      expect(service.getByPrNumber).toHaveBeenCalledWith(101);
      expect(result.prNumber).toBe(101);
    });
  });

  describe('getAll', () => {
    it('lists all deployments and maps to response DTO array', async () => {
      const records = [makeRecord({ branch_name: 'a' }), makeRecord({ branch_name: 'b' })];
      service.getAll.mockResolvedValue(records);

      const result = await controller.getAll();

      expect(service.getAll).toHaveBeenCalled();
      expect(result).toHaveLength(2);
      expect(result[0].branchName).toBe('a');
      expect(result[1].branchName).toBe('b');
    });
  });
});
