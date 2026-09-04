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
        <span id="ps-count" style="font-weight: 800; font-size: 15px; color: #38bdf8;">0 posts</span>
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
        const count = scanVisiblePosts();
        showStatus(`Scanned ${count} new posts!`);
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

      // Facebook posts use [role="article"] or [data-pagelet^="FeedUnit"] or [dir="auto"] containers
      const articles = Array.from(document.querySelectorAll('div[role="article"], div[data-pagelet*="FeedUnit"], div[data-ad-preview="message"]'));
      let newFound = 0;

      articles.forEach((art) => {
        try {
          // Skip comments by ensuring the element isn't nested inside another article or comment-like container
          if (art.closest('[aria-label="Comment"]') || 
              art.closest('ul') || 
              (art.getAttribute('role') === 'article' && art.parentElement?.closest('[role="article"]'))) {
            return;
          }

          const postData = parsePostElement(art, pageName, pageUrl);
          if (postData && postData.text && postData.text.length > 10) {
            const key = postData.facebook_url || postData.text;
            if (!collectedPostsMap.has(key)) {
              collectedPostsMap.set(key, postData);
              newFound++;
            }
          }
        } catch (err) {
          // Safe DOM parse fallback
        }
      });

      saveToStorage();
      updateWidgetCount();
      return newFound;
    } catch (err) {
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

  function parsePostElement(art, pageName, pageUrl) {
    if (!art) return null;

    // Post Text
    let text = '';
    const textEls = art.querySelectorAll('[data-ad-preview="message"], [dir="auto"]');
    textEls.forEach((el) => {
      if (!el.closest('[role="button"]') && el.innerText && el.innerText.trim().length > text.length) {
        text = el.innerText.trim();
      }
    });

    if (!text || text.length < 5) return null;

    // Post URL / Link
    let fbUrl = '';
    const links = Array.from(art.querySelectorAll('a[href*="/posts/"], a[href*="/permalink.php"], a[href*="pfbid"], a[href*="/videos/"], a[href*="/photos/"]'));
    if (links.length > 0) {
      const rawHref = links[0].getAttribute('href') || '';
      fbUrl = rawHref.startsWith('http') ? rawHref.split('?')[0] : `https://www.facebook.com${rawHref.split('?')[0]}`;
    }

    // Media (Image or Video)
    let mediaUrl = '';
    let mediaType = 'text';

    const img = art.querySelector('img[src*="fbcdn"], img[src*="scontent"]');
    if (img && img.src) {
      mediaUrl = img.src;
      mediaType = 'image';
    }

    const video = art.querySelector('video');
    if (video) {
      mediaType = 'video';
      if (video.poster) mediaUrl = video.poster;
    }

    // Metrics (Reactions, Comments, Shares)
    let reactions = 0;
    let comments = 0;
    let shares = 0;

    const fullText = art.innerText || '';

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
