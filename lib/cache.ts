import fs from "fs";
import path from "path";
import { RepoGuide } from "./types";

// In-memory cache map
const memoryCache = new Map<string, { guide: RepoGuide; timestamp: number }>();

function getCacheDir(): string {
  const localCache = path.join(process.cwd(), ".cache");
  try {
    if (!fs.existsSync(localCache)) {
      fs.mkdirSync(localCache, { recursive: true });
    }
    return localCache;
  } catch {
    // Fallback to /tmp or os tmpdir if workspace is read-only
    const tmpCache = path.join(process.env.TEMP || "/tmp", "repomap_cache");
    if (!fs.existsSync(tmpCache)) {
      fs.mkdirSync(tmpCache, { recursive: true });
    }
    return tmpCache;
  }
}

export function buildCacheKey(owner: string, repo: string, treeSha: string, subpath?: string): string {
  const base = `${owner.toLowerCase()}_${repo.toLowerCase()}@${treeSha}`;
  return subpath ? `${base}_${subpath.replace(/[^A-Za-z0-9_-]/g, "_")}` : base;
}

export function getCachedGuide(cacheKey: string): RepoGuide | null {
  // 1. Check in-memory
  const mem = memoryCache.get(cacheKey);
  if (mem) {
    return {
      ...mem.guide,
      metadata: { ...mem.guide.metadata, cached: true },
    };
  }

  // 2. Check disk cache
  try {
    const filePath = path.join(getCacheDir(), `${cacheKey}.json`);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf-8");
      const guide: RepoGuide = JSON.parse(content);
      // Store in memory
      memoryCache.set(cacheKey, { guide, timestamp: Date.now() });
      return {
        ...guide,
        metadata: { ...guide.metadata, cached: true },
      };
    }

    // Check alias by owner_repo@latest if exact commit sha is not found
    const ownerRepoMatch = cacheKey.match(/^([^_]+_[^@]+)@/);
    if (ownerRepoMatch) {
      const aliasKey = `${ownerRepoMatch[1]}@latest`;
      const aliasPath = path.join(getCacheDir(), `${aliasKey}.json`);
      if (fs.existsSync(aliasPath)) {
        const content = fs.readFileSync(aliasPath, "utf-8");
        const guide: RepoGuide = JSON.parse(content);
        memoryCache.set(cacheKey, { guide, timestamp: Date.now() });
        return {
          ...guide,
          metadata: { ...guide.metadata, cached: true },
        };
      }
    }
  } catch (err) {
    console.warn("Failed to read disk cache:", err);
  }

  return null;
}

export function setCachedGuide(cacheKey: string, guide: RepoGuide): void {
  // Store in memory
  memoryCache.set(cacheKey, { guide, timestamp: Date.now() });

  // Store on disk
  try {
    const filePath = path.join(getCacheDir(), `${cacheKey}.json`);
    fs.writeFileSync(filePath, JSON.stringify(guide, null, 2), "utf-8");
  } catch (err) {
    console.warn("Failed to write disk cache:", err);
  }
}
