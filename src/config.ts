import { Glob } from "bun";

const EXCLUDED_PATTERNS = [
  "node_modules/**",
  ".git/**",
  "bun.lock",
  ".env*",
  "*.pem",
  "*.key",
];

const excludeGlobs = EXCLUDED_PATTERNS.map((p) => new Glob(p));

export function isExcluded(filePath: string): boolean {
  return excludeGlobs.some((g) => g.match(filePath));
}

export async function getFileTree(cwd: string): Promise<string> {
  const glob = new Glob("**/*");
  const files: string[] = [];
  for await (const file of glob.scan({ cwd })) {
    if (!isExcluded(file)) files.push(file);
  }
  return files.sort().join("\n");
}
