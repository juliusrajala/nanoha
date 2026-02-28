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

export async function getDirectoryContext(): Promise<string> {
  const cwd = process.cwd();
  const glob = new Glob("**/*");
  const files: string[] = [];
  for await (const file of glob.scan({ cwd })) {
    if (!isExcluded(file)) files.push(file);
  }
  return `Active directory: ${cwd}\n Files:\n`.concat(files.sort().join("\n"));
}
