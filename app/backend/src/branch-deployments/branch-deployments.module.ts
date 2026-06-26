import { Module } from '@nestjs/common';
import { BranchDeploymentsController } from './branch-deployments.controller';
import { BranchDeploymentsService } from './branch-deployments.service';
import { BranchDeploymentsRepository } from './branch-deployments.repository';
import { SupabaseModule } from '../supabase/supabase.module';
import { ApiKeysModule } from '../api-keys/api-keys.module';

@Module({
  imports: [SupabaseModule, ApiKeysModule],
  controllers: [BranchDeploymentsController],
  providers: [BranchDeploymentsService, BranchDeploymentsRepository],
  exports: [BranchDeploymentsService],
})
export class BranchDeploymentsModule {}
