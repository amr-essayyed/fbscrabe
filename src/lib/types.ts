export type PostStatus = 'Unreviewed' | 'Selected' | 'Rejected' | 'Review Later';

export type PostCategory =
  | 'Product'
  | 'Promotion / Offer'
  | 'Educational'
  | 'Testimonial'
  | 'Customer Story'
  | 'Brand / Awareness'
  | 'Announcement'
  | 'Event'
  | 'Entertainment'
  | 'Question / Engagement'
  | 'Other';

export interface PostCharacteristics {
  has_product?: boolean;
  has_offer?: boolean;
  has_discount?: boolean;
  has_cta?: boolean;
  has_price?: boolean;
  has_testimonial?: boolean;
  has_customer_problem?: boolean;
  has_solution?: boolean;
  has_emotional_appeal?: boolean;
  has_social_proof?: boolean;
  has_urgency?: boolean;
  has_educational_value?: boolean;
  has_strong_hook?: boolean;
}

export interface AIAnalysisResult {
  overall_score: number; // 0-100
  rating: 'Excellent' | 'Good' | 'Average' | 'Poor';
  hook_strength: number; // 0-10
  product_visibility: number; // 0-10
  value_proposition: number; // 0-10
  emotional_appeal: number; // 0-10
  social_proof: number; // 0-10
  offer_strength: number; // 0-10
  cta_clarity: number; // 0-10
  conversion_potential: number; // 0-10
  strengths: string[];
  weaknesses: string[];
  why_ad: string;
  suggested_angle: string;
  suggested_improvement: string;
  category: PostCategory;
  characteristics: PostCharacteristics;
  evaluated_at?: string;
}

export interface PageRecord {
  id: number;
  name: string;
  url: string;
  categories: string[]; // custom AI categories configured for this page
  post_count?: number;
  created_at: string;
}

export interface PostRecord {
  id: number;
  page_id?: number;
  page_name?: string;
  page_url?: string;
  facebook_url: string;
  text: string;
  date: string;
  media_url?: string;
  media_type?: 'image' | 'video' | 'none';
  reactions: number;
  comments: number;
  shares: number;
  category: PostCategory;
  characteristics?: PostCharacteristics;
  status: PostStatus;
  ad_score: number;
  ai_analysis?: AIAnalysisResult;
  manual_notes?: string;
  text_hash?: string;
  created_at: string;
  updated_at: string;
}

export interface DashboardStats {
  total_posts: number;
  posts_this_week: number;
  selected_count: number;
  rejected_count: number;
  review_later_count: number;
  unreviewed_count: number;
  avg_engagement: number;
  avg_ad_score: number;
  top_categories: { category: string; count: number }[];
  best_candidates: PostRecord[];
  top_performing: PostRecord[];
}

export interface SettingsData {
  openrouter_api_key?: string;
  openrouter_model?: string;
}
