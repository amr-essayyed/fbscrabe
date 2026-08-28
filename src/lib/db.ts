import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

const dbPath = process.env.VERCEL
  ? path.join('/tmp', 'postsnag.db')
  : path.join(process.cwd(), 'postsnag.db');

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    initDb(db);
  }
  return db;
}

export function generateTextHash(text: string): string {
  return crypto.createHash('sha256').update(text.trim().toLowerCase()).digest('hex');
}

function initDb(database: Database.Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS pages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      url TEXT NOT NULL UNIQUE,
      categories TEXT DEFAULT '[]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      page_id INTEGER,
      facebook_url TEXT UNIQUE,
      text TEXT NOT NULL,
      date TEXT,
      media_url TEXT,
      media_type TEXT DEFAULT 'none',
      reactions INTEGER DEFAULT 0,
      comments INTEGER DEFAULT 0,
      shares INTEGER DEFAULT 0,
      category TEXT DEFAULT 'Other',
      characteristics TEXT DEFAULT '{}',
      status TEXT DEFAULT 'Unreviewed',
      ad_score INTEGER DEFAULT 0,
      ai_analysis TEXT DEFAULT '{}',
      manual_notes TEXT DEFAULT '',
      text_hash TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (page_id) REFERENCES pages(id)
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_posts_fb_url ON posts(facebook_url);
    CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
    CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category);
    CREATE INDEX IF NOT EXISTS idx_posts_ad_score ON posts(ad_score);
    CREATE INDEX IF NOT EXISTS idx_posts_text_hash ON posts(text_hash);
  `);

  // Migration: add categories column to pages if it doesn't exist (for existing DBs)
  try {
    database.exec(`ALTER TABLE pages ADD COLUMN categories TEXT DEFAULT '[]'`);
  } catch {
    // Column already exists — safe to ignore
  }

  // Check if we need to seed initial sample data
  const countRow = database.prepare('SELECT COUNT(*) as count FROM posts').get() as { count: number };
  if (countRow.count === 0) {
    seedSampleData(database);
  }
}

function seedSampleData(database: Database.Database) {
  const insertPage = database.prepare('INSERT OR IGNORE INTO pages (name, url) VALUES (?, ?)');
  insertPage.run('Acme Fitness & Apparel', 'https://www.facebook.com/acmefitness');

  const page = database.prepare('SELECT id FROM pages WHERE url = ?').get('https://www.facebook.com/acmefitness') as { id: number };
  const pageId = page ? page.id : 1;

  const samplePosts = [
    {
      page_id: pageId,
      facebook_url: 'https://www.facebook.com/acmefitness/posts/pfbid02xK9aL21',
      text: '🔥 Tired of workout gear that tears after 3 weeks? We tested our Pro-Fit Compression Shorts against 100+ intense gym sessions. Zero tearing, sweat-wicking tech, and built-in smartphone pocket. 🚀 Get 20% off this week only with code POWER20. Link in bio!',
      date: new Date(Date.now() - 1 * 86400000).toISOString(),
      media_url: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800&auto=format&fit=crop&q=60',
      media_type: 'image',
      reactions: 1420,
      comments: 215,
      shares: 89,
      category: 'Product',
      status: 'Selected',
      ad_score: 92,
      characteristics: JSON.stringify({
        has_product: true,
        has_offer: true,
        has_discount: true,
        has_cta: true,
        has_price: false,
        has_customer_problem: true,
        has_solution: true,
        has_social_proof: true,
        has_urgency: true,
        has_strong_hook: true
      }),
      ai_analysis: JSON.stringify({
        overall_score: 92,
        rating: 'Excellent',
        hook_strength: 9,
        product_visibility: 10,
        value_proposition: 9,
        emotional_appeal: 8,
        social_proof: 9,
        offer_strength: 9,
        cta_clarity: 10,
        conversion_potential: 9,
        strengths: [
          'Strong hook addressing common pain point (gear tearing)',
          'Clear discount offer with code POWER20',
          'High organic engagement to reaction ratio'
        ],
        weaknesses: [
          'Link is in bio instead of direct clickable URL in post body'
        ],
        why_ad: 'This post has unusually high engagement and clearly demonstrates the product\'s benefit with proof testing.',
        suggested_angle: 'Problem → Product → Result + Limited Time Discount',
        suggested_improvement: 'Add direct checkout URL at the end of post body for Facebook Ads feed optimization.',
        category: 'Product',
        characteristics: {
          has_product: true,
          has_offer: true,
          has_discount: true,
          has_cta: true,
          has_customer_problem: true,
          has_solution: true,
          has_social_proof: true,
          has_urgency: true,
          has_strong_hook: true
        }
      }),
      manual_notes: 'Top candidate for retargeting campaign on Meta.'
    },
    {
      page_id: pageId,
      facebook_url: 'https://www.facebook.com/acmefitness/posts/pfbid04mQ18b',
      text: '"I bought the Ultra-Grip Lifting Straps 6 months ago. Added 40lbs to my deadlift without grip fatigue. Couldn\'t train without them now!" — Marcus T., Verified Customer. See why 5,000+ lifters upgraded their gear.',
      date: new Date(Date.now() - 3 * 86400000).toISOString(),
      media_url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&auto=format&fit=crop&q=60',
      media_type: 'image',
      reactions: 980,
      comments: 134,
      shares: 45,
      category: 'Testimonial',
      status: 'Selected',
      ad_score: 88,
      characteristics: JSON.stringify({
        has_product: true,
        has_testimonial: true,
        has_social_proof: true,
        has_customer_problem: true,
        has_solution: true,
        has_strong_hook: true
      }),
      ai_analysis: JSON.stringify({
        overall_score: 88,
        rating: 'Excellent',
        hook_strength: 9,
        product_visibility: 8,
        value_proposition: 9,
        emotional_appeal: 8,
        social_proof: 10,
        offer_strength: 7,
        cta_clarity: 8,
        conversion_potential: 9,
        strengths: [
          'Specific metric result (+40lbs to deadlift)',
          'High social proof (5,000+ lifters)',
          'Authentic customer quote'
        ],
        weaknesses: [
          'No immediate discount incentive'
        ],
        why_ad: 'Customer testimonial ads with concrete numerical improvements convert exceptionally well for middle-of-funnel audiences.',
        suggested_angle: 'Social Proof & Transformation Story',
        suggested_improvement: 'Test video testimonial format with Marcus T if available.',
        category: 'Testimonial',
        characteristics: {
          has_product: true,
          has_testimonial: true,
          has_social_proof: true,
          has_customer_problem: true,
          has_solution: true,
          has_strong_hook: true
        }
      }),
      manual_notes: 'Great social proof ad copy.'
    },
    {
      page_id: pageId,
      facebook_url: 'https://www.facebook.com/acmefitness/posts/pfbid09kL33z',
      text: 'Quick tip: Are you flared out at the elbows during shoulder press? Here are 3 form adjustments to protect your rotator cuff while lifting heavier. Swipe through the guide! 💡',
      date: new Date(Date.now() - 5 * 86400000).toISOString(),
      media_url: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=800&auto=format&fit=crop&q=60',
      media_type: 'image',
      reactions: 2150,
      comments: 340,
      shares: 512,
      category: 'Educational',
      status: 'Review Later',
      ad_score: 76,
      characteristics: JSON.stringify({
        has_educational_value: true,
        has_customer_problem: true,
        has_solution: true,
        has_strong_hook: true
      }),
      ai_analysis: JSON.stringify({
        overall_score: 76,
        rating: 'Good',
        hook_strength: 8,
        product_visibility: 5,
        value_proposition: 8,
        emotional_appeal: 6,
        social_proof: 9,
        offer_strength: 4,
        cta_clarity: 6,
        conversion_potential: 7,
        strengths: [
          'Extremely high viral share rate (512 shares)',
          'Provides genuine value to audience'
        ],
        weaknesses: [
          'No clear product pitch or direct sales call to action'
        ],
        why_ad: 'Excellent top-of-funnel lead magnet or brand awareness ad candidate.',
        suggested_angle: 'Value-First Educational Lead Magnet',
        suggested_improvement: 'Add a soft plug for lifting straps/apparel at the end of the educational tip.',
        category: 'Educational',
        characteristics: {
          has_educational_value: true,
          has_customer_problem: true,
          has_solution: true,
          has_strong_hook: true
        }
      }),
      manual_notes: ''
    },
    {
      page_id: pageId,
      facebook_url: 'https://www.facebook.com/acmefitness/posts/pfbid088JkL1',
      text: 'Happy Friday team! What is your go-to post-workout meal? Drop your recipes below! 👇',
      date: new Date(Date.now() - 7 * 86400000).toISOString(),
      media_url: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&auto=format&fit=crop&q=60',
      media_type: 'image',
      reactions: 320,
      comments: 95,
      shares: 8,
      category: 'Question / Engagement',
      status: 'Rejected',
      ad_score: 42,
      characteristics: JSON.stringify({
        has_cta: true,
        has_emotional_appeal: false
      }),
      ai_analysis: JSON.stringify({
        overall_score: 42,
        rating: 'Poor',
        hook_strength: 4,
        product_visibility: 2,
        value_proposition: 3,
        emotional_appeal: 4,
        social_proof: 3,
        offer_strength: 1,
        cta_clarity: 5,
        conversion_potential: 3,
        strengths: ['Organic community question'],
        weaknesses: [
          'No product connection',
          'Low ad conversion potential'
        ],
        why_ad: 'Organic engagement question post with minimal paid conversion value.',
        suggested_angle: 'N/A',
        suggested_improvement: 'Keep as organic social content, do not promote as paid ad.',
        category: 'Question / Engagement',
        characteristics: {
          has_cta: true
        }
      }),
      manual_notes: 'Organic post only.'
    }
  ];

  const insertPost = database.prepare(`
    INSERT INTO posts (
      page_id, facebook_url, text, date, media_url, media_type,
      reactions, comments, shares, category, status, ad_score,
      characteristics, ai_analysis, manual_notes, text_hash
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const post of samplePosts) {
    insertPost.run(
      post.page_id,
      post.facebook_url,
      post.text,
      post.date,
      post.media_url,
      post.media_type,
      post.reactions,
      post.comments,
      post.shares,
      post.category,
      post.status,
      post.ad_score,
      post.characteristics,
      post.ai_analysis,
      post.manual_notes,
      generateTextHash(post.text)
    );
  }
}
