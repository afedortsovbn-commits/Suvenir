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

type GitHubErrorPayload = {
  message?: string;
};

export function createGitHubConfig(token: string): GitHubConfig {
  return { ...repositoryConfig, token };
}

function encodeBase64(value: string) {
  return btoa(unescape(encodeURIComponent(value)));
}

async function readGitHubError(response: Response) {
  try {
    const payload = (await response.json()) as GitHubErrorPayload;
    return payload.message ?? response.statusText;
  } catch {
    return response.statusText;
  }
}

async function gitHubRequest<T>(config: GitHubConfig, path: string, init: RequestInit = {}) {
  const response = await fetch(`https://api.github.com/repos/${config.owner}/${config.repo}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${config.token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      ...(init.headers ?? {})
    }
  });

  if (!response.ok) {
    throw new Error(await readGitHubError(response));
  }

  return (await response.json()) as T;
}

export async function fetchRepositoryJson<T>(path: string, fallback: T): Promise<T> {
  const response = await fetch(
    `https://raw.githubusercontent.com/${repositoryConfig.owner}/${repositoryConfig.repo}/${repositoryConfig.branch}/${path}?v=${Date.now()}`,
    { cache: "no-store" }
  );

  if (!response.ok) return fallback;
  return (await response.json()) as T;
}

export async function commitGitHubFile(config: GitHubConfig, file: GitHubFile) {
  let details = "";

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const ref = await gitHubRequest<{ object: { sha: string } }>(config, `/git/ref/heads/${config.branch}`);
      const head = await gitHubRequest<{ tree: { sha: string } }>(config, `/git/commits/${ref.object.sha}`);
      const blob = await gitHubRequest<{ sha: string }>(config, "/git/blobs", {
        method: "POST",
        body: JSON.stringify({
          content: encodeBase64(file.content),
          encoding: "base64"
        })
      });
      const tree = await gitHubRequest<{ sha: string }>(config, "/git/trees", {
        method: "POST",
        body: JSON.stringify({
          base_tree: head.tree.sha,
          tree: [
            {
              path: file.path,
              mode: "100644",
              type: "blob",
              sha: blob.sha
            }
          ]
        })
      });
      const commit = await gitHubRequest<{ sha: string }>(config, "/git/commits", {
        method: "POST",
        body: JSON.stringify({
          message: file.message,
          tree: tree.sha,
          parents: [ref.object.sha]
        })
      });

      await gitHubRequest(config, `/git/refs/heads/${config.branch}`, {
        method: "PATCH",
        body: JSON.stringify({
          sha: commit.sha,
          force: false
        })
      });
      return;
    } catch (error) {
      details = error instanceof Error ? error.message : "неизвестная ошибка GitHub";
      await new Promise((resolve) => setTimeout(resolve, 500 + attempt * 500));
    }
  }

  throw new Error(`GitHub не принял изменения после повторных попыток: ${details}`);
}

export async function commitJson(config: GitHubConfig, path: string, data: unknown, message: string) {
  await commitGitHubFile(config, {
    path,
    message,
    content: `${JSON.stringify(data, null, 2)}\n`
  });
}
