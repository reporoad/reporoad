import { CATEGORY_SEED } from './category-seed';
import { BUILDING_STYLES, type Repository } from './repositories';
/** Development fixtures, never a claim that these owners have joined RepoRoad. */
export const SAMPLE_ROAD: Repository[] = CATEGORY_SEED.top.repositories.slice(0, 20).map((repo, i) => ({
  ...repo,
  building: { ...repo.building, style: BUILDING_STYLES[i % BUILDING_STYLES.length], garden: true },
  configStatus: 'default',
}));
