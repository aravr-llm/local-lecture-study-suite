import { syncToPrivateRepository } from '../backend/services/gitSyncService';

async function main() {
  console.log('===========================================================');
  console.log('LocalLecture: Safe Source-Code Private Repository Sync');
  console.log('===========================================================');

  try {
    const repoName = process.argv[2] || 'local-lecture-study-suite';
    const result = await syncToPrivateRepository(repoName);
    console.log('\n[SUCCESS] ' + result.message);
    console.log('Repository URL: ' + result.repositoryUrl);
    process.exit(0);
  } catch (err: any) {
    console.error('\n[ERROR] Sync failed: ' + err.message);
    process.exit(1);
  }
}

main();
