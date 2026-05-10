const core = require('@actions/core');
const fs = require('fs');
const PROMPT = `You are a helpful assistant specializing in improving pull request (PR) descriptions. Your goal is to make PR descriptions clear, complete, and concise, enabling faster and more effective code reviews.

**Input:**

*   **PR Title:** {pr_title}
*   **PR Description:** {pr_description}
*   **Code Changes (brief summary or list of files changed):** {code_changes}
*   **Context (optional background information or related issues/tickets):** {context}

**Instructions:**

Analyze the provided PR title, description, code changes, and context.  Provide suggestions for improving the PR description, focusing on the following aspects:

1.  **Clarity:** Is the purpose of the PR immediately understandable?  Suggest rephrasing for better clarity.
2.  **Completeness:** Does the description adequately explain *why* the changes are being made? Does it cover the problem being solved or the feature being implemented? Does it mention any potential side effects or dependencies? Suggest adding missing information.
3.  **Conciseness:** Is the description unnecessarily verbose? Suggest removing redundant information or rephrasing for brevity.
4.  **Structure:** Is the description well-organized? Suggest using headings, bullet points, or numbered lists to improve readability.
5.  **Impact:** Does the description clearly state the impact of the changes? (e.g., performance improvements, bug fixes, new features).
6.  **Testing:** Does the description mention how the changes were tested? Suggest adding information about testing strategies.
7.  **Screenshots/GIFs (if applicable):** Suggest adding visual aids if they would help reviewers understand the changes.
8.  **Links:** Suggest adding links to relevant issues, tickets, or documentation.

**Output:**

Provide your suggestions in a structured format, clearly indicating the original text and your proposed improvement. Use the following format for each suggestion:

**Suggestion:**

*   **Original:** [Quote the original text from the PR descripti`;
async function run() {
  try {
    const key = core.getInput('gemini_api_key');
    const token = core.getInput('service_token');
    const ctx = { repoName: process.env.GITHUB_REPOSITORY || '', event: process.env.GITHUB_EVENT_NAME || '' };
    try { Object.assign(ctx, JSON.parse(fs.readFileSync('package.json', 'utf8'))); } catch {}
    let prompt = PROMPT;
    for (const [k, v] of Object.entries(ctx)) prompt = prompt.replace(new RegExp('{' + k + '}', 'g'), String(v || ''));
    let result;
    if (key) {
      const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + key, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.3, maxOutputTokens: 2000 } })
      });
      result = (await r.json()).candidates?.[0]?.content?.parts?.[0]?.text || '';
    } else if (token) {
      const r = await fetch('https://action-factory.walshd1.workers.dev/generate/pr-description-improver', {
        method: 'POST', headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify(ctx)
      });
      result = (await r.json()).content || '';
    } else throw new Error('Need gemini_api_key or service_token');
    console.log(result);
    core.setOutput('result', result);
  } catch (e) { core.setFailed(e.message); }
}
run();
