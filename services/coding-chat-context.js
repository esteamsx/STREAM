const MAX_CONTEXT_MESSAGES = 80;

function messageText(message) {
  return String(message?.content || "").slice(0, 30000).trim();
}

export function isCodingContextResetMessage(value) {
  const text = String(value || "").trim();
  if (!text) return false;
  if (/^(?:hi|hello|hey|hiya|yo|howdy|good\s+(?:morning|afternoon|evening))\b/i.test(text)) return true;
  return /\b(?:new topic|new subject|switch(?:ing)?\s+(?:the\s+)?topics?|change\s+(?:the\s+)?topic|something else|different (?:question|topic)|unrelated (?:question|topic)|forget (?:that|the previous|earlier)|ignore (?:the previous|earlier) (?:request|task)|stop (?:reading|scanning|inspecting) (?:the )?(?:repo|repository|files?)|(?:don't|do not|no longer) (?:read|scan|inspect) (?:the )?(?:repo|repository|files?))\b/i.test(text);
}

export function isRepositoryStatusQuestion(value) {
  const text = String(value || "").trim();
  const asksWhichRepository = /\b(?:which|what)\s+(?:github\s+)?(?:repo|repos|repository|repositories)\b/i.test(text);
  const asksAccess = /\b(?:can|could|would|will|do|did)\s+you\s+(?:read|access|see)\b|\b(?:linked|connected|selected|available)\b/i.test(text);
  return asksWhichRepository && asksAccess;
}

export function isRepositoryFilesRequest(value) {
  const text = String(value || "").trim();
  if (!text) return false;
  if (/\b(?:don't|do not|stop|no longer|without)\b.{0,50}\b(?:read|scan|inspect|review|search)\b.{0,60}\b(?:repo|repository|github|file|source|code)\b/i.test(text)) return false;
  if (/\b(?:attached|uploaded)\b/i.test(text) && !/\b(?:github|repo|repository|codebase)\b/i.test(text)) return false;

  const asksForSpecificContent = /\b(?:file|files|tree|source(?: code)?|contents|readme|directory|folder|code|structure|module|route)\b/i.test(text);
  if (isRepositoryStatusQuestion(text) && !asksForSpecificContent) return false;

  const action = /\b(?:read|inspect|analy[sz]e|review|search|find|explain|summari[sz]e|scan|browse|list|show|check|debug|modify|update|fix|edit|change|implement|open|describe)\b/i.test(text);
  const target = /\b(?:github|repo|repos|repository|repositories|codebase|project|file|files|source|code|readme|tree|directory|folder|module|route)\b/i.test(text);
  const asksWhatIsInside = /\b(?:what(?:'s| is) in|show me|tell me about)\b.{0,100}\b(?:repo|repository|codebase|project)\b/i.test(text);
  return (action && target) || asksWhatIsInside;
}

function isSpecificFileEditRequest(value) {
  const text = String(value || "").trim();
  if (!text || /\b(?:github|repo|repository|codebase)\b/i.test(text)) return false;
  const editAction = /\b(?:fix|edit|update|modify|repair|rewrite|refactor|change)\b/i.test(text);
  const specificFile = /\b(?:my|this|that|the|attached|uploaded|previous|earlier)\s+(?:(?:[\w.-]+\s+){0,2})?(?:file|document|script)\b/i.test(text)
    || /\b(?:file|document|script)\b.{0,80}\b(?:i (?:sent|uploaded|attached)|from earlier|above)\b/i.test(text);
  return editAction && specificFile;
}

function includesInlineCode(value) {
  const text = String(value || "");
  return /```[\s\S]*?```/.test(text)
    || /`[^`\n]{3,}`/.test(text)
    || /^\s*(?:#!|import\s|export\s|const\s|let\s|var\s|function\s|class\s|def\s|public\s|private\s|package\s|<\?php)/m.test(text);
}

export function getCodingChatContext(messages, { repositoryContextEnabled = false, currentRequestHasAttachments = false } = {}) {
  const recent = Array.isArray(messages) ? messages.slice(-MAX_CONTEXT_MESSAGES) : [];
  let contextStart = 0;
  for (let index = 0; index < recent.length; index += 1) {
    if (recent[index]?.role === "user" && (isCodingContextResetMessage(messageText(recent[index])) || isRepositoryStatusQuestion(messageText(recent[index])))) contextStart = index;
  }
  const activeMessages = recent.slice(contextStart);
  const latestUserMessage = [...activeMessages].reverse().find((message) => message?.role === "user") || null;
  const latestText = messageText(latestUserMessage);
  const repositoryFilesRequested = isRepositoryFilesRequest(latestText);
  const repositoryStatusRequested = isRepositoryStatusQuestion(latestText) && !repositoryFilesRequested;
  const missingCurrentFile = currentRequestHasAttachments !== true && isSpecificFileEditRequest(latestText) && !includesInlineCode(latestText);
  return {
    messages: missingCurrentFile && latestUserMessage ? [latestUserMessage] : activeMessages,
    latestUserMessage,
    repositoryStatusRequested,
    missingCurrentFile,
    includeRepositoryContext: repositoryContextEnabled === true && repositoryFilesRequested && !missingCurrentFile,
  };
}

export function formatRepositoryStatusAnswer(status = {}) {
  if (!status.connected) {
    return "GitHub is not currently connected to this ES Teams account. Connect GitHub and select a repository in the GitHub Agent settings. I did not read any repository files for this answer.";
  }
  const login = status.login ? `@${String(status.login).replace(/^@/, "")}` : "your GitHub account";
  const selected = status.selectedRepo;
  if (!selected?.owner || !selected?.repo) {
    return `GitHub is connected as ${login}, but no repository is selected yet. Choose one in the GitHub Agent settings. I did not read any repository files for this answer.`;
  }
  const name = selected.fullName || `${selected.owner}/${selected.repo}`;
  const branch = selected.branch || "default branch";
  if (selected.permissions?.pull === false) {
    return `GitHub is connected as ${login}, and the selected repository is ${name} (${branch}), but GitHub reports that this account does not have read permission for it. I did not read any repository files for this answer.`;
  }
  const permissionNote = status.needsPermissionUpgrade ? " The GitHub connection may need a permission refresh for private-repository access." : "";
  return `GitHub is connected as ${login}. The selected repository I can access is ${name} on branch ${branch}.${permissionNote} I did not read any repository files to answer; I will inspect files only when you ask me to.`;
}
