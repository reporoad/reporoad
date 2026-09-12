import { parseBuildingConfig, type Repository } from './repositories.ts';
export async function applyWebsiteSettings(db:D1Database,repos:Repository[]):Promise<Repository[]> {
  if(!repos.length)return repos;
  const rows=await db.prepare('SELECT repository_id,owner_id,settings,updated_at FROM building_settings LIMIT 1000').all<{repository_id:number;owner_id:number;settings:string;updated_at:number}>();
  const byId=new Map(rows.results.map(row=>[row.repository_id,row]));
  return repos.map(repo=>{
    const row=repo.githubId ? byId.get(repo.githubId) : undefined;
    const building=row && row.owner_id===repo.ownerId ? parseBuildingConfig(row.settings) : null;
    return building ? {...repo,building,configSource:'website',configStatus:'custom',configCheckedAt:row!.updated_at} : repo;
  });
}
