---
name: Firecrawl job analysis
description: Firecrawl is used for public job-URL extraction and resume matching, not as the primary structured job-listing provider.
---

Use Firecrawl for a user-supplied public job URL: extract the main posting content, compare it with the saved resume, and generate role-specific gaps, truthful resume changes, interview questions, and a speaking prompt. Keep Adzuna/Remotive for structured vacancy search.

**Why:** Job-board scraping is slower, less stable, and more likely to duplicate or misclassify listings than a job API, while a pasted job URL creates a clear, high-value personalization workflow.

**How to apply:** Cache or rate-limit future scraping work, validate public HTTP(S) URLs, never expose the Firecrawl secret to the browser, and cap scraped content before sending it to the AI fallback.