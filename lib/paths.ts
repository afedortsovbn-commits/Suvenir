export function publicAsset(path: string) {
  if (!path || path.startsWith("data:") || path.startsWith("http://") || path.startsWith("https://")) return path;
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  return `${basePath}${path}`;
}
