/**
 * PostSnag Service Worker Background Script (Manifest V3)
 */

chrome.runtime.onInstalled.addListener(() => {
  console.log('[PostSnag Background] Extension installed successfully.');
  chrome.storage.local.set({
    serverUrl: 'https://fbscrabe.vercel.app',
    collectedPosts: []
  });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'SYNC_TO_SERVER') {
    const { serverUrl, posts } = request;
    fetch(`${serverUrl}/api/posts/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ posts })
    })
      .then((res) => res.json())
      .then((data) => sendResponse({ success: true, data }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }
});
