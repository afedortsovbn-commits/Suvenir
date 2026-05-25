export type GitHubConfig = {
  owner: string;
  repo: string;
  branch: string;
  token: string;
};

export const repositoryConfig: Omit<GitHubConfig, "token"> = {
  owner: "afedortsovbn-commits",
  repo: "Suvenir",
  branch: "main"
};

type GitHubFile = {
  path: string;
  content: string;
  message: string;
};

export function createGitHubConfig(token: string): GitHubConfig {
  return { ...repositoryConfig, token };
}

export async function fetchRepositoryJson<T>(path: string, fallback: T): Promise<T> {
  const response = await fetch(
    `https://raw.githubusercontent.com/${repositoryConfig.owner}/${repositoryConfig.repo}/${repositoryConfig.branch}/${path}?v=${Date.now()}`,
    { cache: "no-store" }
  );

  if (!response.ok) return fallback;
  return (await response.json()) as T;
}

async function getFileSha(config: GitHubConfig, path: string) {
  const response = await fetch(`https://api.github.com/repos/${config.owner}/${config.repo}/contents/${path}?ref=${config.branch}`, {
    headers: {
      Authorization: `Bearer ${config.token}`,
      Accept: "application/vnd.github+json"
    }
  });

  if (response.status === 404) return undefined;
  if (!response.ok) throw new Error("Не удалось получить текущую версию файла из GitHub");
  const payload = (await response.json()) as { sha?: string };
  return payload.sha;
}

export async function commitGitHubFile(config: GitHubConfig, file: GitHubFile) {
  let details = "";

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const sha = await getFileSha(config, file.path);
    const response = await fetch(`https://api.github.com/repos/${config.owner}/${config.repo}/contents/${file.path}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${config.token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: file.message,
        branch: config.branch,
        content: btoa(unescape(encodeURIComponent(file.content))),
        sha
      })
    });

    if (response.ok) return;

    details = await response.text();
    if (response.status !== 409) break;
    await new Promise((resolve) => setTimeout(resolve, 500 + attempt * 500));
  }

  throw new Error(`GitHub не принял изменения: ${details}`);
}

export async function commitJson(config: GitHubConfig, path: string, data: unknown, message: string) {
  await commitGitHubFile(config, {
    path,
    message,
    content: `${JSON.stringify(data, null, 2)}\n`
  });
}
