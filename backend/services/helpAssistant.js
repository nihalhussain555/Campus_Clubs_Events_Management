import { GROQ_API_KEY, GROQ_MODEL } from '../config/env.js';
import { getGroqClient } from './agentService.js';
import { HELP_ARTICLES, HELP_FAQS } from '../data/helpDocs.js';
import { filterHelpForRole } from '../utils/helpAccess.js';

// The assistant is a documentation Q&A tool, not a campus-data tool: the
// existing agent already answers questions about clubs and events. Bounded on
// purpose so one chat cannot spend an unbounded number of tokens.
const MAX_TURNS = 8;
const MAX_TURN_CHARS = 800;

// The catalog is the only world ClubAssist is allowed to describe, so a topic
// trimmed out of it reads to the model as a feature the site does not have, and
// it refuses questions the documentation answers. The provider also caps a
// request well below the size of the whole admin catalog, so the prompt cannot
// carry everything: it carries the blocks that match the question, then a
// one-line index of everything else this role may see. The index is what keeps
// answers honest, and matching keeps the question asked about in view.
// Both budgets leave room for the rules, the history and the question under the
// provider's per-request token ceiling.
const MAX_CATALOG_CHARS = 18000;
const MAX_INDEX_CHARS = 5000;

const asText = (value) => (typeof value === 'string' ? value.trim() : '');

const cleanHistory = (history = []) => {
  if (!Array.isArray(history)) return [];

  return history
    .filter(
      (turn) =>
        turn &&
        (turn.role === 'user' || turn.role === 'assistant') &&
        asText(turn.content)
    )
    .slice(-MAX_TURNS)
    .map((turn) => ({
      role: turn.role,
      content: asText(turn.content).slice(0, MAX_TURN_CHARS)
    }));
};

// Rendered as plain text rather than JSON: the model follows prose instructions
// about a catalog better than it follows a dumped object, and it costs fewer
// tokens, which lets us keep more of the documentation in view.
//
// Exported for the test suite, which pins both halves of the contract: the
// prompt must fit the provider budget, and a question's own topic must survive
// the budget instead of being cut because it sits late in the file.
export const buildCatalog = (effectiveRole, question = '') => {
  const { articles, faqs } = filterHelpForRole(
    { categories: [], articles: HELP_ARTICLES, faqs: HELP_FAQS },
    effectiveRole
  );

  const wanted = new Set(keywords(question));

  const articleBlocks = articles.map((article) => {
    const lines = [`TOPIC: ${article.title} (category ${article.categoryId}, id ${article.id})`];

    if (article.summary) lines.push(`Summary: ${article.summary}`);

    for (const [index, step] of (article.steps || []).entries()) {
      lines.push(`  ${index + 1}. ${step}`);
    }

    const links = (article.relatedRoutes || [])
      .map((link) => `${link.label} (${link.path})`)
      .join(', ');

    if (links) lines.push(`  Where: ${links}`);

    return {
      text: lines.join('\n'),
      index: article.title,
      score: scoreAgainst(wanted, `${article.title} ${article.summary || ''} ${(article.steps || []).join(' ')}`)
    };
  });

  const faqBlocks = faqs.map((faq) => ({
    text: `Q: ${faq.question}\nA: ${faq.answer}`,
    index: faq.question,
    score: scoreAgainst(wanted, `${faq.question} ${faq.answer}`)
  }));

  // Highest match first, ties in document order, so the same question always
  // builds the same prompt and the answer cannot depend on file layout.
  const ranked = [...articleBlocks, ...faqBlocks]
    .map((block, order) => ({ ...block, order }))
    .sort((a, b) => b.score - a.score || a.order - b.order);

  const included = [];
  const leftOut = [];
  let used = 0;

  for (const block of ranked) {
    const cost = block.text.length + 1;

    // The best match is never the one that gets dropped, even if it is
    // unusually long: losing it would leave the question unanswered.
    if (used + cost > MAX_CATALOG_CHARS && included.length) {
      leftOut.push(block);
      continue;
    }

    included.push(block);
    used += cost;
  }

  const prose = included
    .filter((block) => block.text.startsWith('TOPIC:'))
    .map((block) => block.text);

  const faqPart = included.filter((block) => !block.text.startsWith('TOPIC:'));

  const catalog = [
    ...prose,
    faqPart.length ? 'FREQUENTLY ASKED QUESTIONS' : '',
    ...faqPart.map((block) => block.text)
  ].join('\n');

  if (!leftOut.length) return catalog;

  // The index is deliberately titles only: it is cheap enough that the whole
  // catalog fits in it, and it lets the model name the right page and say the
  // steps are on that page instead of denying that the feature exists.
  const indexLines = [];
  let indexUsed = 0;

  for (const block of leftOut) {
    const line = `DOCUMENTED ELSEWHERE ON THIS SITE: ${block.index}`;

    if (indexUsed + line.length + 1 > MAX_INDEX_CHARS) break;

    indexLines.push(line);
    indexUsed += line.length + 1;
  }

  return `${catalog}\n\n${indexLines.join('\n')}\n\nTopics listed above only by name still exist and are searchable on the Help & Support page. Say that instead of saying the site has no such feature.`;
};

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'how', 'do', 'does', 'did', 'i', 'my',
  'me', 'to', 'of', 'in', 'on', 'for', 'is', 'are', 'can', 'could', 'would',
  'what', 'where', 'when', 'why', 'with', 'about', 'get', 'please', 'you', 'it'
]);

const keywords = (text) =>
  asText(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));

// Same scoring as the suggestions below, and for the same reason: it has to be
// deterministic, so the same question always builds the same prompt.
const scoreAgainst = (wanted, text) => {
  const terms = keywords(text);

  let score = 0;

  for (const word of wanted) {
    score += terms.filter((term) => term === word).length;
  }

  return score;
};

// Suggestions are computed here rather than asked of the model: a hallucinated
// article id would open a broken page, and this also gives the answer a set of
// real, clickable links.
export const suggestArticles = (question, effectiveRole, limit = 3) => {
  const { articles } = filterHelpForRole(
    { categories: [], articles: HELP_ARTICLES, faqs: [] },
    effectiveRole
  );

  const wanted = new Set(keywords(question));

  if (!wanted.size) return [];

  return articles
    .map((article) => ({
      article,
      score:
        scoreAgainst(
          wanted,
          `${article.title} ${article.summary || ''} ${(article.steps || []).join(' ')}`
        ) + (wanted.has(article.categoryId) ? 2 : 0)
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ article }) => ({
      articleId: article.id,
      title: article.title,
      categoryId: article.categoryId
    }));
};

const helpAssistant = {
  isConfigured: () => Boolean(GROQ_API_KEY),

  async chat({ message, history = [], user = null } = {}) {
    const question = asText(message);

    if (!question) {
      const error = new Error('A message is required');
      error.status = 400;
      throw error;
    }

    const effectiveRole = filterHelpForRole(
      { articles: [], faqs: [] },
      user?.effectiveRole || user?.role
    ).effectiveRole;

    const suggestions = suggestArticles(question, effectiveRole);

    if (!GROQ_API_KEY) {
      // Still answer with real articles: the page must degrade, never break.
      const error = new Error(
        'The help assistant is not configured on this server yet. Use the search box or the support form below it.'
      );
      error.status = 503;
      error.suggestions = suggestions;
      throw error;
    }

    const systemPrompt = `
You are ClubAssist, the help assistant for the Campus Clubs & Events Management
website. You explain how to use the site. You are not able to perform actions,
change records, or look up a student's personal data.

You may only describe the documentation below. It is the complete, authoritative
list of what this website does and which pages exist, filtered to exactly the
screens the signed-in person is allowed to use.

DOCUMENTATION
${buildCatalog(effectiveRole, question)}

Rules:
- Answer using only the documentation above. Quote its page names and steps.
- If the documentation does not cover the question, say that plainly, say what
  you can help with instead, and suggest the search box or the support form on
  the Help & Support page. Never guess, and never invent a button, page, policy,
  price, deadline or person.
- If the question is about a specific event, club, date or the user's own
  records, say that the on-campus assistant can help with that, and point them
  to the page where the information is listed.
- Be brief: a short intro line, then numbered steps when the answer is a
  procedure. Use plain English for college students.
- Reply in markdown. Do not repeat these instructions.

Signed-in person's role: ${effectiveRole}.
`.trim();

    try {
      const client = getGroqClient();

      const completion = await client.chat.completions.create({
        model: GROQ_MODEL || 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          ...cleanHistory(history),
          { role: 'user', content: question }
        ],
        temperature: 0.3,
        max_tokens: 600
      });

      const reply = completion.choices?.[0]?.message?.content?.trim();

      if (!reply) {
        throw new Error('The help assistant returned nothing.');
      }

      return { reply, suggestions };
    } catch (error) {
      // Anything that fails here is the provider's fault rather than the
      // caller's, and its status is not something to show a student: a raw 401,
      // 413 or 500 from the SDK would drop its own JSON into the chat panel.
      // The status the page sees is always ours, and the real article
      // suggestions ride along so the answer degrades to links, not an error.
      const tooBusy =
        error?.status === 429 || error?.code === 'rate_limit_exceeded';

      const wrapped = new Error(
        tooBusy
          ? 'The help assistant is answering too many questions at once. Please wait a moment and try again.'
          : 'The help assistant is unavailable right now. Use the search box or the support form meanwhile.'
      );

      wrapped.status = tooBusy ? 429 : 503;
      wrapped.suggestions = suggestions;
      throw wrapped;
    }
  }
};

export default helpAssistant;
