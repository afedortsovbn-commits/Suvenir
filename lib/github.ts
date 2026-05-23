export type GitHubConfig = {
  owner: string;
  repo: string;
  branch: string;
  token: string;
};

type GitHubFile = {
  path: string;
  content: string;
  message: string;
};

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

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`GitHub не принял изменения: ${details}`);
  }
}

export async function commitJson(config: GitHubConfig, path: string, data: unknown, message: string) {
  await commitGitHubFile(config, {
    path,
    message,
    content: `${JSON.stringify(data, null, 2)}\n`
  });
}
