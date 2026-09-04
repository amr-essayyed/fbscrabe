/**
 * PostSnag Facebook Collector Content Script (Manifest V3)
 * Safely extracts visible Facebook Page posts, metrics, and media.
 */

(function () {
  if (window.__postsnagCollectorInitialized) return;
  window.__postsnagCollectorInitialized = true;

  console.log('[PostSnag Collector] Loaded content script on Facebook.');

  let collectedPostsMap = new Map(); // hash -> post object
  let isAutoScrolling = false;
  let scrollTimer = null;
  let serverUrl = 'https://fbscrabe.vercel.app';
  let debounceScanTimeout = null;

  // Load configuration from storage
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['serverUrl', 'collectedPosts'], (res) => {
      if (res.serverUrl) serverUrl = res.serverUrl;
      if (res.collectedPosts && Array.isArray(res.collectedPosts)) {
        res.collectedPosts.forEach((p) => {
          const key = p.facebook_url || p.text;
          if (key) collectedPostsMap.set(key, p);
        });
        updateWidgetCount();
      }
    });
  }

  // 1. Create Floating Widget UI on Facebook
  function injectWidget() {
    if (document.getElementById('postsnag-widget')) return;

    const widget = document.createElement('div');
    widget.id = 'postsnag-widget';
    widget.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 2147483647;
      background: #0f172a;
      color: #f8fafc;
      border: 1px solid #334155;
      border-radius: 16px;
      padding: 14px 18px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5);
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      min-width: 240px;
      backdrop-filter: blur(12px);
    `;

    widget.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <div style="display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 14px; color: #818cf8;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
          PostSnag Collector
        </div>
        <button id="ps-close-btn" style="background: none; border: none; color: #94a3b8; cursor: pointer; font-size: 16px;">✕</button>
      </div>

      <div style="background: #1e293b; padding: 8px 12px; border-radius: 10px; border: 1px solid #334155; display: flex; justify-content: space-between; align-items: center;">
        <span style="color: #94a3b8; font-size: 12px;">Collected:</span>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span id="ps-count" style="font-weight: 800; font-size: 15px; color: #38bdf8;">0 posts</span>
          <button id="ps-clear-btn" title="Clear memory" style="background: #334155; border: none; color: #cbd5e1; border-radius: 4px; padding: 2px 6px; font-size: 10px; cursor: pointer;">Clear</button>
        </div>
      </div>

      <div style="display: flex; gap: 6px;">
        <button id="ps-scan-btn" style="flex: 1; background: #3b82f6; color: white; border: none; padding: 7px 10px; border-radius: 8px; font-weight: 600; font-size: 11px; cursor: pointer;">
          Scan Visible
        </button>
        <button id="ps-autoscroll-btn" style="flex: 1; background: #8b5cf6; color: white; border: none; padding: 7px 10px; border-radius: 8px; font-weight: 600; font-size: 11px; cursor: pointer;">
          Auto-Scroll
        </button>
      </div>

      <button id="ps-send-btn" style="background: #10b981; color: white; border: none; padding: 9px 12px; border-radius: 10px; font-weight: 700; font-size: 12px; cursor: pointer; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">
        Send to Dashboard
      </button>

      <div id="ps-status" style="font-size: 11px; color: #94a3b8; text-align: center; display: none;"></div>
    `;

    (document.documentElement || document.body).appendChild(widget);

    // Safe Event handlers
    const closeBtn = document.getElementById('ps-close-btn');
    if (closeBtn) {
      closeBtn.onclick = () => {
        if (widget && widget.parentNode) {
          widget.parentNode.removeChild(widget);
        }
      };
    }

    const scanBtn = document.getElementById('ps-scan-btn');
    if (scanBtn) {
      scanBtn.onclick = () => {
        scanVisiblePosts();
      };
    }

    const clearBtn = document.getElementById('ps-clear-btn');
    if (clearBtn) {
      clearBtn.onclick = () => {
        collectedPostsMap.clear();
        saveToStorage();
        updateWidgetCount();
        showStatus('Cleared collected posts');
      };
    }

    const autoScrollBtn = document.getElementById('ps-autoscroll-btn');
    if (autoScrollBtn) autoScrollBtn.onclick = toggleAutoScroll;

    const sendBtn = document.getElementById('ps-send-btn');
    if (sendBtn) sendBtn.onclick = sendToDashboard;
  }

  function showStatus(msg) {
    const el = document.getElementById('ps-status');
    if (el) {
      el.innerText = msg;
      el.style.display = 'block';
      setTimeout(() => {
        if (el) el.style.display = 'none';
      }, 3500);
    }
  }

  function updateWidgetCount() {
    const el = document.getElementById('ps-count');
    if (el) {
      el.innerText = `${collectedPostsMap.size} post${collectedPostsMap.size === 1 ? '' : 's'}`;
    }
  }

  // 2. DOM Parser Engine for Facebook Posts
  function scanVisiblePosts() {
    try {
      const pageName = getPageName();
      const pageUrl = window.location.href.split('?')[0];

      // Find all potential post containers on Facebook
      let rawArticles = Array.from(document.querySelectorAll('div[role="article"]'));
      
      if (rawArticles.length === 0) {
        rawArticles = Array.from(document.querySelectorAll('div[data-pagelet*="FeedUnit"], div[data-pagelet*="TimelineFeed"]'));
      }
      if (rawArticles.length === 0) {
        const feed = document.querySelector('[role="feed"]');
        if (feed) {
          rawArticles = Array.from(feed.children).filter((child) => child.tagName === 'DIV');
        }
      }

      console.log(`[PostSnag Collector] Raw containers found: ${rawArticles.length}`);

      // Filter out comments and nested child items
      const articles = rawArticles.filter((art) => {
        if (art.closest('[aria-label*="Comment"], [aria-label*="comment"], [aria-label*="Reply"], [aria-label*="reply"], [data-commentid], ul, ol, form')) {
          return false;
        }
        return true;
      });

      console.log(`[PostSnag Collector] Post containers after filtering: ${articles.length}`);

      let newFound = 0;

      articles.forEach((art) => {
        try {
          const postData = parsePostElement(art, pageName, pageUrl);
          if (postData && postData.text && postData.text.length > 5) {
            const key = postData.facebook_url || postData.text;
            if (!collectedPostsMap.has(key)) {
              collectedPostsMap.set(key, postData);
              newFound++;
            }
          }
        } catch (err) {
          console.warn('[PostSnag Collector] Parse error:', err);
        }
      });

      saveToStorage();
      updateWidgetCount();

      if (newFound > 0) {
        showStatus(`Scanned ${newFound} new post${newFound === 1 ? '' : 's'}!`);
      } else if (articles.length > 0) {
        showStatus(`${articles.length} visible post${articles.length === 1 ? '' : 's'} already saved (${collectedPostsMap.size} total)`);
      } else {
        showStatus(`No posts detected on screen. Try scrolling.`);
      }

      return newFound;
    } catch (err) {
      console.error('[PostSnag Collector] scanVisiblePosts error:', err);
      showStatus('Error scanning page.');
      return 0;
    }
  }

  function debouncedScan() {
    if (debounceScanTimeout) clearTimeout(debounceScanTimeout);
    debounceScanTimeout = setTimeout(() => {
      scanVisiblePosts();
    }, 400);
  }

  function getPageName() {
    try {
      const h1 = document.querySelector('h1');
      if (h1 && h1.innerText && h1.innerText.trim().length > 0) {
        return h1.innerText.trim();
      }
      const title = document.title.replace(/\s*\|.*$/, '').replace(/\s*-.*$/, '').trim();
      return title || 'Facebook Page';
    } catch (err) {
      return 'Facebook Page';
    }
  }

  function getPostText(art) {
    if (!art) return '';

    // 1. Check explicit Facebook preview message attributes
    const priorityEl = art.querySelector('[data-ad-preview="message"], [data-ad-comet-preview="message"]');
    if (priorityEl && priorityEl.innerText && priorityEl.innerText.trim().length > 5) {
      return cleanPostText(priorityEl.innerText);
    }

    // 2. Scan dir="auto" elements
    const dirElements = Array.from(art.querySelectorAll('[dir="auto"]'));
    let candidates = [];

    for (const el of dirElements) {
      // Exclude comment section
      if (el.closest('[aria-label*="Comment"], [aria-label*="comment"], [aria-label*="Reply"], [aria-label*="reply"], ul, form, [data-commentid]')) {
        continue;
      }
      // Exclude header titles, headings, and timestamps
      if (el.closest('h1, h2, h3, h4, h5, h6, [role="heading"], abbr, time')) {
        continue;
      }

      const t = el.innerText ? el.innerText.trim() : '';

      if (isSystemUiLabel(t)) {
        continue;
      }

      if (t.length > 5) {
        candidates.push(t);
      }
    }

    if (candidates.length === 0) {
      // Fallback scan: all divs or spans not in header/comments
      const allEls = Array.from(art.querySelectorAll('div, span, p'));
      for (const el of allEls) {
        if (el.closest('[aria-label*="Comment"], [aria-label*="comment"], ul, form, h1, h2, h3, h4, h5, h6, abbr, time')) {
          continue;
        }
        const t = el.innerText ? el.innerText.trim() : '';
        if (t.length > 15 && !isSystemUiLabel(t)) {
          if (t.length < (art.innerText || '').length * 0.9) {
            candidates.push(t);
          }
        }
      }
    }

    if (candidates.length === 0) return '';

    candidates.sort((a, b) => b.length - a.length);
    return cleanPostText(candidates[0]);
  }

  function cleanPostText(str) {
    if (!str) return '';
    return str.replace(/\.\.\.\s*See\s+more/gi, '').replace(/See\s+More/gi, '').trim();
  }

  function isSystemUiLabel(str) {
    if (!str) return true;
    const s = str.trim().toLowerCase();
    const uiLabels = [
      'like', 'comment', 'share', 'send', 'write a comment...', 'write a comment…',
      'reply', 'view more comments', 'most relevant', 'all comments', 'follow',
      'sponsored', 'public', 'shared with public', 'see more', 'see original',
      'rate this translation'
    ];
    if (uiLabels.includes(s)) return true;
    if (/^[0-9.,]+[kkmm]?\s*(comments?|shares?|reactions?|likes?)?$/i.test(s)) return true;
    return false;
  }

  function parsePostElement(art, pageName, pageUrl) {
    if (!art) return null;

    // Post Text
    const text = getPostText(art);
    if (!text || text.length < 5) return null;

    // Post URL / Link
    let fbUrl = '';
    const links = Array.from(art.querySelectorAll('a[href*="/posts/"], a[href*="/permalink.php"], a[href*="pfbid"], a[href*="/videos/"], a[href*="/photos/"], a[href*="/reel/"], a[href*="/story.php"]'));
    const validLinks = links.filter(link => !link.closest('[aria-label*="Comment"], [aria-label*="comment"], ul, form'));
    const targetLink = validLinks.length > 0 ? validLinks[0] : links[0];
    if (targetLink) {
      const rawHref = targetLink.getAttribute('href') || '';
      fbUrl = rawHref.startsWith('http') ? rawHref.split('?')[0] : `https://www.facebook.com${rawHref.split('?')[0]}`;
    }

    // Media (Image or Video)
    let mediaUrl = '';
    let mediaType = 'text';

    const video = art.querySelector('video');
    if (video) {
      mediaType = 'video';
      if (video.poster) mediaUrl = video.poster;
      else if (video.src && !video.src.startsWith('blob:')) mediaUrl = video.src;
    } else {
      const imgs = Array.from(art.querySelectorAll('img'));
      for (const img of imgs) {
        const src = img.src || '';
        const alt = (img.alt || '').toLowerCase();
        const width = img.width || img.clientWidth || 0;
        const height = img.height || img.clientHeight || 0;

        if (alt.includes('profile') || alt.includes('avatar') || alt.includes('emoji')) continue;
        if ((width > 0 && width < 100) || (height > 0 && height < 100)) continue;

        if (src.includes('fbcdn') || src.includes('scontent')) {
          mediaUrl = src;
          mediaType = 'image';
          break;
        }
      }
    }

    // Metrics (Reactions, Comments, Shares)
    let reactions = 0;
    let comments = 0;
    let shares = 0;

    let fullText = art.innerText || '';
    const ariaEls = art.querySelectorAll('[aria-label]');
    ariaEls.forEach((el) => {
      fullText += ' ' + (el.getAttribute('aria-label') || '');
    });

    // Reactions regex parse (e.g. 1.4K, 520, 10K)
    const reactionMatch = fullText.match(/([0-9.,]+[KkMm]?)\s*(?:reactions|likes|others|\uD83D\uDC4D)/i);
    if (reactionMatch) reactions = parseMetricValue(reactionMatch[1]);

    // Comments regex parse
    const commentMatch = fullText.match(/([0-9.,]+[KkMm]?)\s*comments/i);
    if (commentMatch) comments = parseMetricValue(commentMatch[1]);

    // Shares regex parse
    const shareMatch = fullText.match(/([0-9.,]+[KkMm]?)\s*shares/i);
    if (shareMatch) shares = parseMetricValue(shareMatch[1]);

    // Date
    let dateStr = new Date().toISOString();
    const timeEl = art.querySelector('abbr, time, a[aria-label*="ago"], a[aria-label*="202"]');
    if (timeEl) {
      const label = timeEl.getAttribute('aria-label') || timeEl.innerText;
      if (label) dateStr = label;
    }

    return {
      text,
      facebook_url: fbUrl,
      page_name: pageName,
      page_url: pageUrl,
      date: dateStr,
      media_url: mediaUrl,
      media_type: mediaType,
      reactions,
      comments,
      shares
    };
  }

  function parseMetricValue(valStr) {
    if (!valStr) return 0;
    let clean = valStr.toUpperCase().trim();
    let multiplier = 1;

    if (clean.includes('K')) {
      multiplier = 1000;
      clean = clean.replace('K', '');
    } else if (clean.includes('M')) {
      multiplier = 1000000;
      clean = clean.replace('M', '');
    }

    const num = parseFloat(clean.replace(',', ''));
    return isNaN(num) ? 0 : Math.round(num * multiplier);
  }

  // 3. Auto-Scroll Engine
  function toggleAutoScroll() {
    const btn = document.getElementById('ps-autoscroll-btn');
    if (isAutoScrolling) {
      stopAutoScroll();
      if (btn) {
        btn.innerText = 'Auto-Scroll';
        btn.style.background = '#8b5cf6';
      }
      showStatus('Auto-scroll stopped.');
    } else {
      isAutoScrolling = true;
      if (btn) {
        btn.innerText = 'Pause Scroll';
        btn.style.background = '#ef4444';
      }
      showStatus('Auto-scrolling page...');
      runAutoScrollLoop();
    }
  }

  function runAutoScrollLoop() {
    if (!isAutoScrolling) return;

    scanVisiblePosts();
    window.scrollBy({ top: 800, behavior: 'smooth' });

    scrollTimer = setTimeout(() => {
      if (isAutoScrolling) runAutoScrollLoop();
    }, 2200);
  }

  function stopAutoScroll() {
    isAutoScrolling = false;
    if (scrollTimer) clearTimeout(scrollTimer);
  }

  // 4. Send Collected Posts to PostSnag API Backend
  async function sendToDashboard() {
    const posts = Array.from(collectedPostsMap.values());
    if (posts.length === 0) {
      showStatus('No posts collected yet!');
      return;
    }

    showStatus('Sending to PostSnag...');

    try {
      const response = await fetch(`${serverUrl}/api/posts/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ posts })
      });

      const data = await response.json();
      if (data.success) {
        showStatus(`Done! ${data.created_count} new, ${data.duplicate_count} duplicates`);
        collectedPostsMap.clear();
        saveToStorage();
        updateWidgetCount();
      } else {
        showStatus(`Error: ${data.error || 'Ingest failed'}`);
      }
    } catch (err) {
      showStatus(`Cannot connect to ${serverUrl}`);
    }
  }

  function saveToStorage() {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({
        collectedPosts: Array.from(collectedPostsMap.values())
      });
    }
  }

  // Auto inject widget on page load safely
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(injectWidget, 1000);
  } else {
    window.addEventListener('DOMContentLoaded', () => setTimeout(injectWidget, 1000));
  }

  // Monitor DOM changes safely using debounced observer
  const observer = new MutationObserver(() => {
    debouncedScan();
  });

  try {
    observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
  } catch (e) {}

  // Chrome Extension Messaging API Listener
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'SCAN_POSTS') {
        const count = scanVisiblePosts();
        sendResponse({ count: collectedPostsMap.size, newCount: count });
      } else if (request.action === 'TOGGLE_AUTO_SCROLL') {
        toggleAutoScroll();
        sendResponse({ isAutoScrolling });
      } else if (request.action === 'SEND_TO_DASHBOARD') {
        sendToDashboard().then(() => sendResponse({ success: true }));
        return true;
      } else if (request.action === 'GET_STATUS') {
        sendResponse({ count: collectedPostsMap.size, isAutoScrolling, serverUrl });
      } else if (request.action === 'CLEAR_POSTS') {
        collectedPostsMap.clear();
        saveToStorage();
        updateWidgetCount();
        sendResponse({ success: true });
      }
    });
  }
})();
