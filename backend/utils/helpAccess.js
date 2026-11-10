// One place decides who may read which help text. Both the Help Center API and
// the ClubAssist prompt go through this, so the assistant can never describe a
// screen the caller cannot actually see.

// Legacy rows may still carry club_member; it behaves as a student.
const EFFECTIVE_ROLE = {
  student: 'student',
  club_member: 'student',
  club_leader: 'club_leader',
  admin: 'admin'
};

export const normalizeHelpRole = (role) =>
  EFFECTIVE_ROLE[role] || 'student';

export const canSee = (roles = [], effectiveRole) => {
  if (!Array.isArray(roles) || roles.length === 0) return true;
  if (roles.includes('all')) return true;

  // An administrator can perform every documented action, so leader and
  // student guides are visible to them as well.
  if (effectiveRole === 'admin') return true;

  return roles.includes(effectiveRole);
};

export const filterHelpForRole = (
  { categories = [], articles = [], faqs = [] },
  role
) => {
  const effectiveRole = normalizeHelpRole(role);

  const visibleArticles = articles.filter((article) =>
    canSee(article.roles, effectiveRole)
  );

  const visibleFaqs = faqs.filter((faq) =>
    canSee(faq.roles, effectiveRole)
  );

  const articleCategories = new Set(visibleArticles.map((a) => a.categoryId));
  const faqCategories = new Set(visibleFaqs.map((f) => f.categoryId));

  // A category card with nothing behind it would open an empty panel.
  const visibleCategories = categories.filter((category) =>
    articleCategories.has(category.id) || faqCategories.has(category.id)
  );

  return {
    effectiveRole,
    categories: visibleCategories,
    articles: visibleArticles,
    faqs: visibleFaqs
  };
};
