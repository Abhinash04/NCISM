import GithubSlugger from 'github-slugger';

/**
 * Generates heading ids with the SAME algorithm rehype-slug uses
 * (github-slugger), so outline links always match the rendered heading ids.
 * Instantiate one slugger per document to get identical duplicate-counters.
 */
export function slugifyHeadings(headingTexts) {
  const slugger = new GithubSlugger();
  return headingTexts.map((text) => slugger.slug(text));
}
