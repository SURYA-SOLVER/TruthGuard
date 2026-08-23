export type Verdict = 'SUPPORTED' | 'REFUTED' | 'INSUFFICIENT_EVIDENCE';

export interface EvidenceItem {
  source: 'google_fact_check' | 'wikipedia' | 'wikidata' | 'groq_reasoning';
  title: string;
  url?: string;
  excerpt: string;
  publishedAt?: string;
}

export interface VerificationResult {
  verdict: Verdict;
  confidenceScore: number;
  summary: string;
  evidence: EvidenceItem[];
  layersUsed: string[];
  warnings: string[];
}

interface GoogleClaim {
  text?: string;
  claimReview?: Array<{
    publisher?: { name?: string; site?: string };
    url?: string;
    title?: string;
    textualRating?: string;
    reviewDate?: string;
  }>;
}

interface WikidataSearchResponse {
  search?: Array<{ label?: string; description?: string; concepturi?: string }>;
}

interface WikipediaSearchResponse {
  query?: {
    search?: Array<{ title?: string; snippet?: string; timestamp?: string; wordcount?: number }>;
  };
}

interface GroqResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

export interface VerificationEngineOptions {
  googleFactCheckApiKey?: string;
  groqApiKey?: string;
  groqModel?: string;
  fetchImpl?: typeof fetch;
}

const DEFAULT_GROQ_MODEL = 'openai/gpt-oss-20b';

const REFUTED_RATINGS = /false|incorrect|misleading|pants on fire|fake|scam|untrue|no evidence/i;
const SUPPORTED_RATINGS = /true|correct|accurate|mostly true|verified/i;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function ratingVerdict(rating: string): Verdict {
  if (REFUTED_RATINGS.test(rating)) return 'REFUTED';
  if (SUPPORTED_RATINGS.test(rating)) return 'SUPPORTED';
  return 'INSUFFICIENT_EVIDENCE';
}

function factCheckConfidence(verdict: Verdict, rating: string): number {
  if (verdict === 'REFUTED') return /pants on fire|false|fake|scam/i.test(rating) ? 0.94 : 0.84;
  if (verdict === 'SUPPORTED') return /true|correct|accurate/i.test(rating) ? 0.86 : 0.76;
  return 0.5;
}

/** Evidence-first verification: search hits and writing style never become a factual verdict. */
export class VerificationEngine {
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly options: VerificationEngineOptions = {}) {
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  get capabilities() {
    return {
      googleFactCheck: !!this.options.googleFactCheckApiKey,
      openKnowledgeContext: true,
      groqReasoning: !!this.options.groqApiKey,
      groqModel: this.options.groqModel ?? DEFAULT_GROQ_MODEL,
    };
  }

  async verify(claim: string, context?: string): Promise<VerificationResult> {
    const evidence: EvidenceItem[] = [];
    const layersUsed: string[] = [];
    const warnings: string[] = [];

    const factCheck = await this.lookupFactChecks(claim, warnings);
    if (factCheck) {
      evidence.push(factCheck.evidence);
      layersUsed.push('google_fact_check');
      return { ...factCheck, evidence, layersUsed, warnings };
    }

    const knowledgeContext = await this.lookupOpenKnowledge(claim, warnings);
    if (knowledgeContext.length > 0) {
      evidence.push(...knowledgeContext);
      layersUsed.push('open_knowledge_context');
    }

    if (this.options.groqApiKey && evidence.length > 0) {
      const synthesis = await this.reasonWithGroq(claim, context, evidence, warnings);
      if (synthesis) {
        layersUsed.push('groq_reasoning');
        evidence.push(synthesis.evidence);
        return { ...synthesis, evidence, layersUsed, warnings };
      }
    }

    warnings.push('No independent ClaimReview verdict was found. Entity lookup is context, not proof; the claim is not verified.');
    return {
      verdict: 'INSUFFICIENT_EVIDENCE', confidenceScore: 0,
      summary: 'No authoritative fact-check verdict was available for this claim.',
      evidence, layersUsed, warnings,
    };
  }

  private async lookupFactChecks(claim: string, warnings: string[]) {
    if (!this.options.googleFactCheckApiKey) return undefined;
    try {
      const url = new URL('https://factchecktools.googleapis.com/v1alpha1/claims:search');
      url.searchParams.set('query', claim);
      url.searchParams.set('languageCode', 'en');
      url.searchParams.set('key', this.options.googleFactCheckApiKey);
      const response = await this.fetchImpl(url, { signal: AbortSignal.timeout(3_000) });
      if (!response.ok) {
        warnings.push(`Google Fact Check lookup returned HTTP ${response.status}; continuing without it.`);
        return undefined;
      }
      const body = (await response.json()) as { claims?: GoogleClaim[] };
      const matchedClaim = body.claims?.[0];
      const review = matchedClaim?.claimReview?.[0];
      const rating = review?.textualRating?.trim();
      if (!matchedClaim || !review || !rating) return undefined;
      const verdict = ratingVerdict(rating);
      const publisher = review.publisher?.name ?? 'Fact-check publisher';
      return {
        verdict, confidenceScore: factCheckConfidence(verdict, rating),
        summary: `${publisher} rated a matching claim “${rating}”.`,
        evidence: {
          source: 'google_fact_check' as const,
          title: review.title ?? `${publisher} ClaimReview`, url: review.url ?? review.publisher?.site,
          excerpt: `${matchedClaim.text ?? claim} — rating: ${rating}`, publishedAt: review.reviewDate,
        },
      };
    } catch {
      warnings.push('Google Fact Check lookup timed out or was unavailable; continuing without it.');
      return undefined;
    }
  }

  /** Layer 2: keyless open-knowledge retrieval. Context only — never a verdict on its own. */
  private async lookupOpenKnowledge(claim: string, warnings: string[]): Promise<EvidenceItem[]> {
    const [wikipedia, wikidata] = await Promise.allSettled([
      this.lookupWikipedia(claim),
      this.lookupWikidata(claim),
    ]);
    if (wikipedia.status === 'rejected') warnings.push('Wikipedia context lookup was unavailable.');
    if (wikidata.status === 'rejected') warnings.push('Wikidata context lookup was unavailable.');
    return [
      ...(wikipedia.status === 'fulfilled' ? wikipedia.value : []),
      ...(wikidata.status === 'fulfilled' ? wikidata.value : []),
    ].slice(0, 3);
  }

  private stripHtml(value: string): string {
    return value.replace(/<[^>]*>/g, '').trim();
  }

  private async lookupWikipedia(claim: string): Promise<EvidenceItem[]> {
    const url = new URL('https://en.wikipedia.org/w/api.php');
    url.searchParams.set('action', 'query');
    url.searchParams.set('list', 'search');
    url.searchParams.set('srsearch', claim.slice(0, 300));
    url.searchParams.set('srlimit', '2');
    url.searchParams.set('format', 'json');
    url.searchParams.set('origin', '*');
    const response = await this.fetchImpl(url, {
      headers: { 'User-Agent': 'TruthGuard-x402/1.0 (evidence lookup)' },
      signal: AbortSignal.timeout(3_000),
    });
    if (!response.ok) return [];
    const body = (await response.json()) as WikipediaSearchResponse;
    return (body.query?.search ?? [])
      .filter(hit => hit.title && hit.snippet)
      .slice(0, 2)
      .map(hit => ({
        source: 'wikipedia' as const,
        title: hit.title!,
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(hit.title!.replaceAll(' ', '_'))}`,
        excerpt: this.stripHtml(hit.snippet!),
        publishedAt: hit.timestamp,
      }));
  }

  private async lookupWikidata(claim: string): Promise<EvidenceItem[]> {
    try {
      const url = new URL('https://www.wikidata.org/w/api.php');
      url.searchParams.set('action', 'wbsearchentities');
      url.searchParams.set('search', claim.slice(0, 250));
      url.searchParams.set('language', 'en');
      url.searchParams.set('format', 'json');
      url.searchParams.set('origin', '*');
      const response = await this.fetchImpl(url, { headers: { 'User-Agent': 'TruthGuard-x402/1.0 (evidence lookup)' }, signal: AbortSignal.timeout(3_000) });
      if (!response.ok) return [];
      const body = (await response.json()) as WikidataSearchResponse;
      const entity = body.search?.[0];
      if (!entity?.label || !entity.description) return [];
      return [{ source: 'wikidata' as const, title: entity.label, url: entity.concepturi, excerpt: entity.description }];
    } catch {
      return [];
    }
  }

  private async reasonWithGroq(claim: string, context: string | undefined, evidence: EvidenceItem[], warnings: string[]) {
    try {
      const response = await this.fetchImpl('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.options.groqApiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.options.groqModel ?? DEFAULT_GROQ_MODEL, temperature: 0, response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: 'Classify only from retrieved evidence. Return JSON {"verdict":"SUPPORTED|REFUTED|INSUFFICIENT_EVIDENCE","confidence":0..1,"summary":"short evidence-bound explanation"}. Interpret claims by their common contemporary meaning unless the evidence explicitly addresses that exact phrasing; do not refute a claim over historical or unit-scale trivia the claim does not assert. Never treat user context as evidence.' },
            { role: 'user', content: JSON.stringify({ claim, userContext: context ?? null, evidence }) },
          ],
        }),
        signal: AbortSignal.timeout(5_000),
      });
      if (!response.ok) { warnings.push(`Groq reasoning returned HTTP ${response.status}; continuing without it.`); return undefined; }
      const body = (await response.json()) as GroqResponse;
      const parsed = JSON.parse(body.choices?.[0]?.message?.content ?? '{}') as { verdict?: Verdict; confidence?: number; summary?: string };
      if (!parsed.verdict || !['SUPPORTED', 'REFUTED', 'INSUFFICIENT_EVIDENCE'].includes(parsed.verdict)) return undefined;
      return {
        verdict: parsed.verdict, confidenceScore: clamp(Number(parsed.confidence) || 0, 0, 0.75),
        summary: parsed.summary?.slice(0, 600) || 'Evidence was insufficient for a reliable conclusion.',
        evidence: { source: 'groq_reasoning' as const, title: 'Groq evidence-bounded synthesis', excerpt: 'Optional synthesis over retrieved evidence; not an independent source.' },
      };
    } catch {
      warnings.push('Groq reasoning timed out or returned invalid JSON; continuing without it.');
      return undefined;
    }
  }
}
