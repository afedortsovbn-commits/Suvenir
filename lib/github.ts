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

class GitHubRequestError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

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
    throw new GitHubRequestError(response.status, await readGitHubError(response));
  }

  return (await response.json()) as T;
}

export async function fetchRepositoryJson<T>(path: string, fallback: T): Promise<T> {
  return (await fetchRepositoryJsonResult(path, fallback)).data;
}

export async function fetchRepositoryJsonResult<T>(path: string, fallback: T): Promise<{ data: T; ok: boolean }> {
  try {
    const response = await fetch(
      `https://raw.githubusercontent.com/${repositoryConfig.owner}/${repositoryConfig.repo}/${repositoryConfig.branch}/${path}?v=${Date.now()}`,
      { cache: "no-store" }
    );

    if (!response.ok) return { data: fallback, ok: false };
    return { data: (await response.json()) as T, ok: true };
  } catch {
    return { data: fallback, ok: false };
  }
}

export async function commitGitHubFile(config: GitHubConfig, file: GitHubFile) {
  await commitGitHubFiles(config, [file], file.message);
}

export async function commitGitHubFiles(config: GitHubConfig, files: GitHubFile[], message: string) {
  let details = "";

  for (let attempt = 0; attempt < 10; attempt += 1) {
    try {
      const ref = await gitHubRequest<{ object: { sha: string } }>(config, `/git/ref/heads/${config.branch}`);
      const head = await gitHubRequest<{ tree: { sha: string } }>(config, `/git/commits/${ref.object.sha}`);
      const treeItems = await Promise.all(
        files.map(async (file) => {
          const blob = await gitHubRequest<{ sha: string }>(config, "/git/blobs", {
            method: "POST",
            body: JSON.stringify({
              content: encodeBase64(file.content),
              encoding: "base64"
            })
          });
          return {
            path: file.path,
            mode: "100644",
            type: "blob",
            sha: blob.sha
          };
        })
      );
      const tree = await gitHubRequest<{ sha: string }>(config, "/git/trees", {
        method: "POST",
        body: JSON.stringify({
          base_tree: head.tree.sha,
          tree: treeItems
        })
      });
      const commit = await gitHubRequest<{ sha: string }>(config, "/git/commits", {
        method: "POST",
        body: JSON.stringify({
          message,
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
      const canRetry = error instanceof GitHubRequestError ? [409, 422].includes(error.status) : true;
      if (!canRetry) break;
      await new Promise((resolve) => setTimeout(resolve, 1000 + attempt * 1000));
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

export async function commitJsonFiles(config: GitHubConfig, files: Array<{ path: string; data: unknown }>, message: string) {
  await commitGitHubFiles(
    config,
    files.map((file) => ({
      path: file.path,
      message,
      content: `${JSON.stringify(file.data, null, 2)}\n`
    })),
    message
  );
}
