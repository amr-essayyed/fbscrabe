import { getDb } from './db';
import { AIAnalysisResult, PostCategory, PostCharacteristics } from './types';

export async function analyzePostWithAI(
  postText: string,
  reactions: number = 0,
  comments: number = 0,
  shares: number = 0,
  customCategories?: string[]
): Promise<AIAnalysisResult> {
  const db = getDb();
  
  // Fetch settings from DB
  let apiKey: string | undefined;
  let model = 'google/gemini-2.0-flash-001';

  try {
    const apiKeyRow = await db.execute({ sql: "SELECT value FROM settings WHERE key = 'openrouter_api_key'", args: [] });
    const modelRow = await db.execute({ sql: "SELECT value FROM settings WHERE key = 'openrouter_model'", args: [] });
    apiKey = apiKeyRow.rows[0]?.value as string | undefined;
    if (modelRow.rows[0]?.value) {
      model = modelRow.rows[0].value as string;
    }
  } catch (err) {
    // Ignore settings fetch error if table not init yet
  }

  if (apiKey && apiKey.trim().length > 0) {
    try {
      return await callOpenRouterAPI(apiKey, model, postText, reactions, comments, shares, customCategories);
    } catch (err) {
      console.warn('OpenRouter API call failed, falling back to rule-based engine:', err);
    }
  }

  // Fallback Rule-Based Engine
  return analyzePostWithRules(postText, reactions, comments, shares, customCategories);
}

async function callOpenRouterAPI(
  apiKey: string,
  model: string,
  postText: string,
  reactions: number,
  comments: number,
  shares: number,
  customCategories?: string[]
): Promise<AIAnalysisResult> {
  const prompt = `You are an expert Meta (Facebook) Paid Ads Specialist & Direct Response Copywriter.
Analyze the following Facebook post to determine if it is a strong candidate for turning into a paid advertisement.

POST CONTENT:
"""
${postText}
"""

ENGAGEMENT METRICS:
- Reactions/Likes: ${reactions}
- Comments: ${comments}
- Shares: ${shares}

Evaluate the post across these criteria:
1. Hook strength
2. Product/service visibility
3. Clear value proposition
4. Emotional appeal
5. Social proof
6. Offer strength
7. CTA clarity
8. Conversion potential

CATEGORIES (pick exactly ONE primary category from the list below):
${customCategories && customCategories.length > 0
  ? customCategories.map(c => `"${c}"`).join(', ')
  : '"Product", "Promotion / Offer", "Educational", "Testimonial", "Customer Story", "Brand / Awareness", "Announcement", "Event", "Entertainment", "Question / Engagement", "Other"'}

CHARACTERISTICS (boolean flags):
has_product, has_offer, has_discount, has_cta, has_price, has_testimonial, has_customer_problem, has_solution, has_emotional_appeal, has_social_proof, has_urgency, has_educational_value, has_strong_hook

Return ONLY a valid JSON object matching this exact structure:
{
  "overall_score": 85,
  "rating": "Excellent", // "Excellent" | "Good" | "Average" | "Poor"
  "hook_strength": 9,
  "product_visibility": 8,
  "value_proposition": 9,
  "emotional_appeal": 7,
  "social_proof": 8,
  "offer_strength": 8,
  "cta_clarity": 9,
  "conversion_potential": 9,
  "strengths": ["bullet point 1", "bullet point 2"],
  "weaknesses": ["bullet point 1"],
  "why_ad": "Explanation of why this post would work as an ad...",
  "suggested_angle": "e.g. Problem -> Solution -> Limited Offer",
  "suggested_improvement": "Actionable recommendation to improve copy/media for ad spend...",
  "category": "Product",
  "characteristics": {
    "has_product": true,
    "has_offer": true,
    "has_discount": false,
    "has_cta": true,
    "has_price": false,
    "has_testimonial": false,
    "has_customer_problem": true,
    "has_solution": true,
    "has_emotional_appeal": true,
    "has_social_proof": true,
    "has_urgency": false,
    "has_educational_value": false,
    "has_strong_hook": true
  }
}`;

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'PostSnag-AdAnalyzer'
    },
    body: JSON.stringify({
      model: model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenRouter API error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const rawContent = data.choices?.[0]?.message?.content || '{}';
  const parsed = JSON.parse(rawContent) as AIAnalysisResult;

  parsed.evaluated_at = new Date().toISOString();
  return parsed;
}

export function analyzePostWithRules(
  postText: string,
  reactions: number = 0,
  comments: number = 0,
  shares: number = 0,
  customCategories?: string[]
): AIAnalysisResult {
  const lower = postText.toLowerCase();

  // Detect Characteristics
  const characteristics: PostCharacteristics = {
    has_product: /product|item|gear|collection|tool|app|shop|buy|order|link|store|stock|shipping/i.test(postText),
    has_offer: /sale|discount|off|code|promo|free|deal|special|save|bonus|gift/i.test(postText),
    has_discount: /\d+%|percent off|code|save \$|discount/i.test(postText),
    has_cta: /click|link|bio|order|get yours|shop now|swipe|grab|comment below|sign up|claim/i.test(postText),
    has_price: /\$\d+|\d+ dollars|only \$|priced at/i.test(postText),
    has_testimonial: /"|”|customer|client|review|said|quoted|testimonial|stars|rating|experience/i.test(postText),
    has_customer_problem: /tired of|struggling|hard to|problem|frustrated|stop|hate|issue|pain|worst/i.test(postText),
    has_solution: /introducing|solution|fixed|helped|solved|built|designed to|allows you|tech/i.test(postText),
    has_emotional_appeal: /🔥|🚀|❤️|😍|life-changing|unbelievable|obsessed|love|game changer|dream/i.test(postText),
    has_social_proof: /5,000\+|10,000\+|thousands|verified|rated|best-selling|reviews|loved by/i.test(postText),
    has_urgency: /today only|this week|limited|fast|expires|ending soon|don't miss|hurry/i.test(postText),
    has_educational_value: /tip|guide|how to|learn|3 ways|steps|reason|did you know|secret/i.test(postText),
    has_strong_hook: /^([🔥🚨⚡️💡"”\?]|tired of|stop|here's|why|how|are you|don't)/i.test(postText.trim())
  };

  // Determine Category — restricted to customCategories if provided
  const categoryAllowed = (cat: string): boolean =>
    !customCategories || customCategories.length === 0 || customCategories.includes(cat);

  let category: string = (customCategories && customCategories.length > 0) ? customCategories[0] : 'Other';
  if (categoryAllowed('Testimonial') && characteristics.has_testimonial) {
    category = 'Testimonial';
  } else if (categoryAllowed('Promotion / Offer') && (characteristics.has_offer || characteristics.has_discount)) {
    category = 'Promotion / Offer';
  } else if (categoryAllowed('Educational') && characteristics.has_educational_value) {
    category = 'Educational';
  } else if (categoryAllowed('Product') && characteristics.has_product) {
    category = 'Product';
  } else if (categoryAllowed('Question / Engagement') && /question|\?|what is your|comment below|drop your|poll/i.test(lower)) {
    category = 'Question / Engagement';
  } else if (categoryAllowed('Announcement') && /announcing|new release|launch|we're excited|update/i.test(lower)) {
    category = 'Announcement';
  } else if (categoryAllowed('Customer Story') && /story|my journey|behind the scenes|started when/i.test(lower)) {
    category = 'Customer Story';
  } else if (categoryAllowed('Event') && /event|live|webinar|workshop|join us/i.test(lower)) {
    category = 'Event';
  } else if (categoryAllowed('Brand / Awareness') && characteristics.has_emotional_appeal) {
    category = 'Brand / Awareness';
  }

  // Scoring Logic (0 - 100)
  let score = 50; // Base score

  // Text signals
  if (characteristics.has_strong_hook) score += 8;
  if (characteristics.has_product) score += 7;
  if (characteristics.has_offer || characteristics.has_discount) score += 10;
  if (characteristics.has_cta) score += 6;
  if (characteristics.has_social_proof) score += 9;
  if (characteristics.has_customer_problem && characteristics.has_solution) score += 10;
  if (characteristics.has_urgency) score += 4;

  // Engagement signals
  const totalEngagement = reactions + comments * 2 + shares * 3;
  if (totalEngagement > 1500) score += 10;
  else if (totalEngagement > 500) score += 6;
  else if (totalEngagement > 100) score += 3;

  if (shares > 50) score += 5; // Share virality

  // Cap score 0-100
  score = Math.min(98, Math.max(25, score));

  // Determine rating category
  let rating: 'Excellent' | 'Good' | 'Average' | 'Poor' = 'Average';
  if (score >= 85) rating = 'Excellent';
  else if (score >= 70) rating = 'Good';
  else if (score >= 50) rating = 'Average';
  else rating = 'Poor';

  const hookStrength = Math.min(10, Math.max(3, Math.round((characteristics.has_strong_hook ? 8 : 4) + (postText.length > 50 ? 2 : 0))));
  const productVisibility = Math.min(10, Math.max(2, characteristics.has_product ? 9 : 4));
  const valueProposition = Math.min(10, Math.max(3, characteristics.has_solution ? 9 : 5));
  const emotionalAppeal = Math.min(10, Math.max(2, characteristics.has_emotional_appeal ? 8 : 4));
  const socialProof = Math.min(10, Math.max(2, characteristics.has_social_proof ? 9 : 4));
  const offerStrength = Math.min(10, Math.max(1, characteristics.has_offer ? 9 : 3));
  const ctaClarity = Math.min(10, Math.max(2, characteristics.has_cta ? 9 : 4));
  const conversionPotential = Math.round((score / 100) * 10);

  const strengths: string[] = [];
  if (characteristics.has_strong_hook) strengths.push('Strong opening hook catches user attention in newsfeed');
  if (characteristics.has_social_proof) strengths.push('High social proof elements validate product credibility');
  if (characteristics.has_offer) strengths.push('Clear promo/discount incentive lowers friction to purchase');
  if (characteristics.has_customer_problem && characteristics.has_solution) strengths.push('Clear Problem → Solution copywriting framework');
  if (shares > 30) strengths.push(`High viral share count (${shares} shares) signals organic interest`);
  if (strengths.length === 0) strengths.push('Decent post structure and readable copy');

  const weaknesses: string[] = [];
  if (!characteristics.has_cta) weaknesses.push('Lacks a direct Call To Action (CTA) telling users where to buy');
  if (!characteristics.has_offer) weaknesses.push('No immediate discount or special offer to drive impulse conversion');
  if (!characteristics.has_product) weaknesses.push('Product positioning could be more prominent');
  if (weaknesses.length === 0) weaknesses.push('Minor tweak needed to append direct lander link');

  let suggestedAngle = 'Problem → Solution → Social Proof → Call to Action';
  if (category === 'Testimonial') suggestedAngle = 'Customer Review Story & Social Proof Transformation';
  else if (category === 'Promotion / Offer') suggestedAngle = 'Direct Offer & Limited-Time Urgency Push';
  else if (category === 'Educational') suggestedAngle = 'Value-First Lead Magnet / Educational Discovery';

  return {
    overall_score: score,
    rating,
    hook_strength: hookStrength,
    product_visibility: productVisibility,
    value_proposition: valueProposition,
    emotional_appeal: emotionalAppeal,
    social_proof: socialProof,
    offer_strength: offerStrength,
    cta_clarity: ctaClarity,
    conversion_potential: conversionPotential,
    strengths,
    weaknesses,
    why_ad: score >= 75
      ? `This post demonstrates strong engagement (${reactions} reactions, ${comments} comments) and includes key direct-response triggers suitable for Meta Ads.`
      : `Moderate performance post that may require stronger CTA or direct product focus before running as a paid campaign.`,
    suggested_angle: suggestedAngle,
    suggested_improvement: !characteristics.has_cta
      ? 'Add a direct landing page link and high-converting Call-To-Action (e.g., "Shop Now & Save 20%").'
      : 'Optimize graphic/video creative for mobile square (1:1) or vertical (4:5) ad formats.',
    category: category as PostCategory,
    characteristics,
    evaluated_at: new Date().toISOString()
  };
}
