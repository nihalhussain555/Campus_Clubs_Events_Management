import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  Award,
  Bell,
  BookOpen,
  Bot,
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileText,
  HelpCircle,
  LayoutDashboard,
  LifeBuoy,
  LogIn,
  Search,
  Send,
  Settings,
  ShieldCheck,
  TrendingUp,
  Users,
  X
} from 'lucide-react';

import Navbar from '../components/Navbar';
import Toast from '../components/Toast';
import SkeletonGrid from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import ClubAssist from '../components/ClubAssist';

import { helpAPI } from '../services/api';

// Map server-provided icon names to components. Unknown names fall back to
// BookOpen rather than crashing, since the categories are authored in the DB.
const CATEGORY_ICONS = {
  LogIn,
  LayoutDashboard,
  Users,
  CalendarDays,
  Award,
  TrendingUp,
  Bell,
  CalendarRange,
  Settings,
  ShieldCheck
};

const iconFor = (name) => CATEGORY_ICONS[name] || BookOpen;

// Issue categories posted to helpAPI.createRequest. The `value` strings are a
// fixed contract with the backend; labels are display-only.
const ISSUE_OPTIONS = [
  { value: 'account', label: 'Account & login' },
  { value: 'clubs', label: 'Clubs' },
  { value: 'events', label: 'Events' },
  { value: 'certificates', label: 'Certificates' },
  { value: 'leaderboard', label: 'Leaderboard' },
  { value: 'technical', label: 'Technical problem' },
  { value: 'feedback', label: 'Feedback' }
];

// Status accents are drawn from the colour utilities that already have a
// matching `.dark` override in styles.css.
const STATUS_META = {
  open: { label: 'Open', className: 'border-amber-200 bg-amber-50 text-amber-700' },
  in_progress: { label: 'In progress', className: 'border-[#bcddeb] bg-[#e8f5fb] text-[#145f82]' },
  resolved: { label: 'Resolved', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  closed: { label: 'Closed', className: 'border-slate-200 bg-slate-100 text-slate-700' }
};

const findCategoryByToken = (categories, token) =>
  categories.find(
    (category) =>
      String(category.id) === token ||
      (category.route || '').replace(/^\//, '') === token ||
      category.title?.toLowerCase() === token
  );

const StatusChip = ({ status }) => {
  const meta =
    STATUS_META[status] || {
      label: status || 'Unknown',
      className: 'border-slate-200 bg-slate-100 text-slate-700'
    };

  return <span className={`chip ${meta.className}`}>{meta.label}</span>;
};

const ArticleCard = ({ article, onNavigate, highlighted }) => (
  <article
    id={`article-${article.id}`}
    className={`app-card transition ${highlighted ? 'ring-2 ring-[#2d7a9b]' : ''}`}
  >
    <h3 className="text-lg font-black text-[#073c57]">{article.title}</h3>
    <p className="mt-2 text-sm leading-6 text-slate-600">{article.summary}</p>

    {article.steps?.length > 0 && (
      <ol className="mt-4 space-y-2">
        {article.steps.map((step, index) => (
          <li key={index} className="flex gap-3 text-sm text-slate-700">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#e8f5fb] text-xs font-black text-[#145f82]">
              {index + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
    )}

    {article.relatedRoutes?.length > 0 && (
      <div className="mt-5 flex flex-wrap gap-2">
        {article.relatedRoutes.map((route) => (
          <button
            key={route.path}
            type="button"
            onClick={() => onNavigate(route.path)}
            className="btn-secondary px-3 py-1.5 text-xs"
          >
            {route.label}
            <ArrowUpRight size={14} />
          </button>
        ))}
      </div>
    )}
  </article>
);

const FaqItem = ({ faq, open, onToggle }) => (
  <article
    role="button"
    tabIndex={0}
    aria-expanded={open}
    onClick={onToggle}
    onKeyDown={(event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onToggle();
      }
    }}
    className="app-card cursor-pointer transition-colors hover:bg-slate-50"
  >
    <div className="flex items-center justify-between gap-4">
      <h3 className="font-black text-black">{faq.question}</h3>
      <span className="shrink-0 text-slate-400">
        {open ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </span>
    </div>
    {open && <p className="mt-3 text-sm leading-6 text-slate-600">{faq.answer}</p>}
  </article>
);

const Help = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [expandedFaq, setExpandedFaq] = useState(null);

  const [toast, setToast] = useState(null);
  const [starter, setStarter] = useState('');
  const [focusArticleId, setFocusArticleId] = useState(null);

  const [form, setForm] = useState({ issueCategory: '', subject: '', description: '' });
  const [formErrors, setFormErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [received, setReceived] = useState(null);

  const [requests, setRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [requestsError, setRequestsError] = useState(null);

  // ---------------------------------------------- content load
  const loadContent = useCallback(
    async ({ signalCancel } = {}) => {
      setLoading(true);

      try {
        const response = await helpAPI.getContent();

        if (!signalCancel?.()) {
          setContent(response.data);
          setError(null);
        }
      } catch (err) {
        if (!signalCancel?.()) {
          setError(
            err.response?.data?.message || 'The help centre could not be loaded.'
          );
        }
      } finally {
        if (!signalCancel?.()) setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    let cancelled = false;
    loadContent({ signalCancel: () => cancelled });
    return () => {
      cancelled = true;
    };
  }, [loadContent]);

  // ---------------------------------------------- requests load
  const loadRequests = useCallback(
    async ({ signalCancel } = {}) => {
      setRequestsLoading(true);

      try {
        const response = await helpAPI.myRequests();

        if (!signalCancel?.()) {
          setRequests(response.data?.requests || []);
          setRequestsError(null);
        }
      } catch (err) {
        if (!signalCancel?.()) {
          setRequestsError(
            err.response?.data?.message || 'Your requests could not be loaded.'
          );
        }
      } finally {
        if (!signalCancel?.()) setRequestsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    let cancelled = false;
    loadRequests({ signalCancel: () => cancelled });
    return () => {
      cancelled = true;
    };
  }, [loadRequests]);

  // ---------------------------------------------- deep links
  useEffect(() => {
    if (!content) return;

    const token = searchParams.get('category');
    if (!token) return;

    const match = findCategoryByToken(content.categories || [], token);
    if (match) setActiveCategory(String(match.id));
  }, [content, searchParams]);

  useEffect(() => {
    if (location.hash !== '#support') return;

    const timer = setTimeout(() => {
      document.getElementById('support')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }, 60);

    return () => clearTimeout(timer);
  }, [location.hash]);

  useEffect(() => {
    if (!focusArticleId) return;

    document
      .getElementById(`article-${focusArticleId}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' });

    const timer = setTimeout(() => setFocusArticleId(null), 1500);
    return () => clearTimeout(timer);
  }, [focusArticleId]);

  // ---------------------------------------------- derived data
  const { categories, articles, faqs } = useMemo(
    () => ({
      categories: content?.categories || [],
      articles: content?.articles || [],
      faqs: content?.faqs || []
    }),
    [content]
  );

  const assistantEnabled = Boolean(content?.assistantEnabled);
  const searchMode = query.trim().length > 0;

  const matchesQuery = useCallback(
    (q, article) =>
      (article.title || '').toLowerCase().includes(q) ||
      (article.summary || '').toLowerCase().includes(q) ||
      (article.steps || []).some((step) => (step || '').toLowerCase().includes(q)),
    []
  );

  const searchArticles = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? articles.filter((article) => matchesQuery(q, article)) : [];
  }, [articles, matchesQuery, query]);

  const searchFaqs = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    return faqs.filter(
      (faq) =>
        (faq.question || '').toLowerCase().includes(q) ||
        (faq.answer || '').toLowerCase().includes(q)
    );
  }, [faqs, query]);

  const activeArticles = useMemo(
    () =>
      activeCategory === 'all'
        ? articles
        : articles.filter((article) => String(article.categoryId) === String(activeCategory)),
    [activeCategory, articles]
  );

  const faqGroups = useMemo(() => {
    const known = new Set(categories.map((category) => String(category.id)));
    const groups = categories
      .map((category) => ({
        category,
        items: faqs.filter((faq) => String(faq.categoryId) === String(category.id))
      }))
      .filter((group) => group.items.length > 0);

    // Keep any FAQ whose category is missing so we always render everything
    // the server sent.
    const orphans = faqs.filter((faq) => !known.has(String(faq.categoryId)));
    if (orphans.length > 0) {
      groups.push({ category: { id: '__other', title: 'More questions' }, items: orphans });
    }

    return groups;
  }, [categories, faqs]);

  const isEmptyPayload =
    !loading &&
    !error &&
    categories.length === 0 &&
    articles.length === 0 &&
    faqs.length === 0;

  // ---------------------------------------------- handlers
  const toggleCategory = (id) =>
    setActiveCategory((current) => (current === String(id) ? 'all' : String(id)));

  const handleArticleSelect = (suggestion) => {
    setQuery('');
    if (suggestion?.categoryId) setActiveCategory(String(suggestion.categoryId));
    if (suggestion?.articleId) setFocusArticleId(suggestion.articleId);
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setFormErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const errors = {};
    if (!form.issueCategory) errors.issueCategory = 'Choose an issue category.';
    if (!form.subject.trim()) errors.subject = 'Add a short subject.';
    else if (form.subject.length > 120) errors.subject = 'Keep the subject under 120 characters.';
    if (!form.description.trim()) errors.description = 'Describe what you need help with.';
    else if (form.description.length > 2000) errors.description = 'Keep it under 2000 characters.';

    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      setToast({ message: 'Please fix the highlighted fields.', type: 'error' });
      return;
    }

    setSubmitting(true);
    setFormError('');

    try {
      const response = await helpAPI.createRequest({
        subject: form.subject.trim(),
        category: form.issueCategory,
        description: form.description.trim()
      });

      const request = response.data?.request || {};

      setReceived({
        reference:
          request.referenceId || request.id || request._id || response.data?.message || '',
        status: request.status || 'open'
      });
      setForm({ issueCategory: '', subject: '', description: '' });
      setToast({
        message: response.data?.message || 'Your request has been submitted.',
        type: 'success'
      });

      loadRequests();
    } catch (err) {
      setFormError(
        err.response?.data?.message || 'We could not send your request. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="app-page">
      <Navbar />

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      <main className="page-section pt-8">
        <div className="page-container">
          {/* ---------------------------------------------- header */}
          <div className="mb-8 space-y-4">
            <button
              type="button"
              onClick={() => navigate('/profile')}
              className="btn-secondary px-4"
            >
              <ArrowLeft size={16} />
              Back to profile
            </button>

            <span className="eyebrow">Support centre</span>
            <h1 className="display-title text-4xl sm:text-5xl">Help &amp; Support</h1>
            <p className="section-copy mt-4">
              Guides, walkthroughs and answers for every part of Campus Clubs.
            </p>
            {assistantEnabled && (
              <p className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                <Bot size={16} className="text-[#145f82]" />
                Need a quick answer? Ask ClubAssist, the helper in the bottom corner.
              </p>
            )}
          </div>

          {/* ---------------------------------------------- search */}
          <div className="mb-6 space-y-4">
            <div className="relative">
              <Search
                size={18}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="field pl-12 pr-12"
                placeholder="Search guides, steps and questions"
                aria-label="Search help content"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-500 hover:bg-slate-100 hover:text-black"
                  aria-label="Clear search"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {!searchMode && categories.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveCategory('all')}
                  className={`filter-pill ${activeCategory === 'all' ? 'filter-pill-active' : ''}`}
                >
                  All topics
                </button>
                {categories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setActiveCategory(String(category.id))}
                    className={`filter-pill ${
                      activeCategory === String(category.id) ? 'filter-pill-active' : ''
                    }`}
                  >
                    {category.title}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ---------------------------------------------- guide */}
          {loading ? (
            <SkeletonGrid count={6} className="grid gap-5 lg:grid-cols-2" />
          ) : error ? (
            <EmptyState
              icon={AlertTriangle}
              title="Help centre unavailable"
              message={error}
              actionLabel="Retry"
              onAction={() => loadContent()}
            />
          ) : isEmptyPayload ? (
            <EmptyState
              icon={BookOpen}
              title="No guides published yet"
              message="Help articles will appear here as soon as they are published. In the meantime, use the support form below to reach the team."
            />
          ) : searchMode ? (
            searchArticles.length + searchFaqs.length === 0 ? (
              <EmptyState
                icon={Search}
                title="No matches found"
                message={`Nothing matches “${query.trim()}”. Try a shorter phrase, or send a support request below.`}
                actionLabel="Clear search"
                onAction={() => setQuery('')}
              />
            ) : (
              <section>
                <h2 className="section-title mb-6 text-2xl sm:text-2xl">
                  Results for “{query.trim()}”
                </h2>
                <div className="grid gap-5 lg:grid-cols-2">
                  {searchArticles.map((article) => (
                    <ArticleCard
                      key={article.id}
                      article={article}
                      highlighted={String(article.id) === String(focusArticleId)}
                      onNavigate={navigate}
                    />
                  ))}
                </div>
                {searchFaqs.length > 0 && (
                  <div className="mt-8">
                    <h3 className="mb-4 text-sm font-black uppercase tracking-wider text-slate-500">
                      Related questions
                    </h3>
                    <div className="space-y-4">
                      {searchFaqs.map((faq) => (
                        <FaqItem
                          key={faq.id}
                          faq={faq}
                          open={expandedFaq === String(faq.id)}
                          onToggle={() =>
                            setExpandedFaq((prev) =>
                              prev === String(faq.id) ? null : String(faq.id)
                            )
                          }
                        />
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )
          ) : (
            <>
              {/* Categories */}
              {categories.length > 0 && (
                <section className="mb-10">
                  <h2 className="section-title mb-6 text-2xl sm:text-2xl">Browse by topic</h2>
                  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {categories.map((category) => {
                      const Icon = iconFor(category.icon);
                      const count = articles.filter(
                        (article) => String(article.categoryId) === String(category.id)
                      ).length;
                      const selected = activeCategory === String(category.id);

                      return (
                        <article
                          key={category.id}
                          role="button"
                          tabIndex={0}
                          aria-pressed={selected}
                          onClick={() => toggleCategory(category.id)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              toggleCategory(category.id);
                            }
                          }}
                          className={`app-card app-card-hover cursor-pointer ${
                            selected ? 'border-[#145f82]' : ''
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <span className="icon-tile">
                              <Icon size={22} />
                            </span>
                            {selected && (
                              <span className="chip bg-[#145f82] text-white">Selected</span>
                            )}
                          </div>

                          <h3 className="mt-4 text-lg font-black text-[#073c57]">
                            {category.title}
                          </h3>
                          <p className="mt-1 text-sm leading-6 text-slate-600">{category.blurb}</p>
                          <p className="mt-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                            {count} {count === 1 ? 'guide' : 'guides'}
                          </p>

                          {assistantEnabled && (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                setStarter(
                                  `I need help with ${category.title}. Where do I start?`
                                );
                              }}
                              className="btn-soft mt-4 px-3 py-1.5 text-xs"
                            >
                              <Bot size={14} />
                              Ask ClubAssist
                            </button>
                          )}
                        </article>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Articles for the selected category */}
              <section className="mb-10">
                <h2 className="section-title mb-6 text-2xl sm:text-2xl">
                  {activeCategory === 'all'
                    ? 'All guides'
                    : categories.find((c) => String(c.id) === activeCategory)?.title || 'Guides'}
                </h2>

                {activeArticles.length === 0 ? (
                  <EmptyState
                    icon={BookOpen}
                    title="Nothing here yet"
                    message="There are no guides in this topic yet. Try another topic or clear the filter."
                    actionLabel="Show all topics"
                    onAction={() => setActiveCategory('all')}
                  />
                ) : (
                  <div className="grid gap-5 lg:grid-cols-2">
                    {activeArticles.map((article) => (
                      <ArticleCard
                        key={article.id}
                        article={article}
                        highlighted={String(article.id) === String(focusArticleId)}
                        onNavigate={navigate}
                      />
                    ))}
                  </div>
                )}
              </section>

              {/* FAQ */}
              {faqGroups.length > 0 && (
                <section className="mb-10">
                  <div className="mb-6 flex items-center gap-3">
                    <span className="icon-tile">
                      <HelpCircle size={22} />
                    </span>
                    <h2 className="section-title text-2xl sm:text-2xl">
                      Frequently asked questions
                    </h2>
                  </div>

                  <div className="space-y-8">
                    {faqGroups.map((group) => (
                      <div key={group.category.id}>
                        <h3 className="mb-3 text-sm font-black uppercase tracking-wider text-slate-500">
                          {group.category.title}
                        </h3>
                        <div className="space-y-4">
                          {group.items.map((faq) => (
                            <FaqItem
                              key={faq.id}
                              faq={faq}
                              open={expandedFaq === String(faq.id)}
                              onToggle={() =>
                                setExpandedFaq((prev) =>
                                  prev === String(faq.id) ? null : String(faq.id)
                                )
                              }
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}

          {/* ---------------------------------------------- support form */}
          <section id="support" className="mb-10 scroll-mt-24">
            <div className="app-card">
              <div className="mb-6 flex items-center gap-3">
                <span className="icon-tile">
                  <LifeBuoy size={22} />
                </span>
                <div>
                  <h2 className="text-xl font-black text-[#073c57]">Contact &amp; support</h2>
                  <p className="text-sm text-slate-600">
                    Can’t find it above? Send the team a request and we’ll follow up.
                  </p>
                </div>
              </div>

              {received ? (
                <div className="blue-panel">
                  <p className="flex items-center gap-2 text-sm font-black text-[#145f82]">
                    <CheckCircle2 size={18} />
                    Request received
                  </p>
                  <p className="mt-3 text-sm text-slate-600">
                    Reference:{' '}
                    <span className="font-black text-black">
                      {received.reference || '—'}
                    </span>
                  </p>
                  <p className="mt-1 flex items-center gap-2 text-sm text-slate-600">
                    Status: <StatusChip status={received.status} />
                  </p>
                  <button
                    type="button"
                    onClick={() => setReceived(null)}
                    className="btn-secondary mt-4 px-4 py-1.5 text-xs"
                  >
                    Submit another request
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                  {formError && (
                    <div
                      role="alert"
                      className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700"
                    >
                      {formError}
                    </div>
                  )}

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label className="field-label" htmlFor="issue-category">
                        Issue category
                      </label>
                      <div className="relative">
                        <select
                          id="issue-category"
                          name="issueCategory"
                          value={form.issueCategory}
                          onChange={handleFormChange}
                          className="field appearance-none pr-10"
                          aria-invalid={Boolean(formErrors.issueCategory)}
                        >
                          <option value="">Choose one…</option>
                          {ISSUE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <ChevronDown
                          size={16}
                          className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500"
                        />
                      </div>
                      {formErrors.issueCategory && (
                        <p className="mt-1 text-xs font-bold text-red-600">
                          {formErrors.issueCategory}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="field-label" htmlFor="subject">
                        Subject
                      </label>
                      <input
                        id="subject"
                        name="subject"
                        type="text"
                        maxLength={120}
                        value={form.subject}
                        onChange={handleFormChange}
                        className="field"
                        placeholder="A one-line summary"
                        aria-invalid={Boolean(formErrors.subject)}
                      />
                      <div className="mt-1 flex items-center justify-between">
                        {formErrors.subject ? (
                          <p className="text-xs font-bold text-red-600">{formErrors.subject}</p>
                        ) : (
                          <span />
                        )}
                        <span className="text-xs text-slate-500">{form.subject.length}/120</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="field-label" htmlFor="description">
                      Description
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      rows={5}
                      maxLength={2000}
                      value={form.description}
                      onChange={handleFormChange}
                      className="field min-h-36"
                      placeholder="What happened and what did you expect?"
                      aria-invalid={Boolean(formErrors.description)}
                    />
                    <div className="mt-1 flex items-center justify-between">
                      {formErrors.description ? (
                        <p className="text-xs font-bold text-red-600">{formErrors.description}</p>
                      ) : (
                        <span />
                      )}
                      <span className="text-xs text-slate-500">
                        {form.description.length}/2000
                      </span>
                    </div>
                  </div>

                  <button type="submit" disabled={submitting} className="btn-primary">
                    <Send size={18} />
                    {submitting ? 'Sending…' : 'Send request'}
                  </button>
                </form>
              )}
            </div>
          </section>

          {/* ---------------------------------------------- previous requests */}
          <section>
            <div className="mb-4 flex items-center gap-3">
              <span className="icon-tile">
                <FileText size={22} />
              </span>
              <h2 className="text-xl font-black text-[#073c57]">Your previous requests</h2>
            </div>

            {requestsLoading ? (
              <SkeletonGrid count={2} className="grid gap-5 lg:grid-cols-2" />
            ) : requestsError ? (
              <EmptyState
                icon={AlertTriangle}
                title="Could not load your requests"
                message={requestsError}
                actionLabel="Retry"
                onAction={() => loadRequests()}
              />
            ) : requests.length === 0 ? (
              <EmptyState
                icon={LifeBuoy}
                title="No requests yet"
                message="Requests you submit here will show up with their status and any reply from the support team."
              />
            ) : (
              <div className="space-y-4">
                {requests.map((request) => (
                  <article key={String(request.id ?? request._id)} className="app-card">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <h3 className="truncate font-black text-black">
                          {request.subject || 'Support request'}
                        </h3>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className="chip">
                            {ISSUE_OPTIONS.find((option) => option.value === request.category)
                              ?.label || request.category || 'General'}
                          </span>
                          <StatusChip status={request.status} />
                        </div>
                      </div>
                      {request.referenceId && (
                        <p className="shrink-0 text-xs font-bold uppercase tracking-wider text-slate-500">
                          Ref {request.referenceId}
                        </p>
                      )}
                    </div>

                    {request.description && (
                      <p className="mt-3 text-sm leading-6 text-slate-600">
                        {request.description}
                      </p>
                    )}

                    {(request.adminResponse || request.response) && (
                      <div className="soft-panel mt-4">
                        <p className="mb-1 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#145f82]">
                          <Bot size={14} />
                          Support reply
                        </p>
                        <p className="text-sm leading-6 text-slate-700">
                          {request.adminResponse || request.response}
                        </p>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      {assistantEnabled && (
        <ClubAssist
          starterQuestion={starter}
          onStarterConsumed={() => setStarter('')}
          onArticleSelect={handleArticleSelect}
        />
      )}
    </div>
  );
};

export default Help;
