document.addEventListener('DOMContentLoaded', () => {
  const postCountEl = document.getElementById('postCount');
  const scanBtn = document.getElementById('scanBtn');
  const autoScrollBtn = document.getElementById('autoScrollBtn');
  const sendBtn = document.getElementById('sendBtn');
  const clearBtn = document.getElementById('clearBtn');
  const serverUrlInput = document.getElementById('serverUrl');
  const statusMsg = document.getElementById('statusMsg');

  // Load saved settings & status
  chrome.storage.local.get(['serverUrl', 'collectedPosts'], (res) => {
    if (res.serverUrl) serverUrlInput.value = res.serverUrl;
    if (res.collectedPosts && Array.isArray(res.collectedPosts)) {
      postCountEl.innerText = `${res.collectedPosts.length} posts`;
    }
  });

  serverUrlInput.addEventListener('change', () => {
    chrome.storage.local.set({ serverUrl: serverUrlInput.value.trim() });
    showStatus('Server URL updated');
  });

  // Query Active Tab
  function sendToActiveTab(message, callback) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length === 0) {
        showStatus('No active tab');
        return;
      }
      chrome.tabs.sendMessage(tabs[0].id, message, (response) => {
        if (chrome.runtime.lastError) {
          showStatus('Open Facebook to start collecting');
        } else if (callback) {
          callback(response);
        }
      });
    });
  }

  // Initial Sync
  sendToActiveTab({ action: 'GET_STATUS' }, (res) => {
    if (res) {
      postCountEl.innerText = `${res.count || 0} posts`;
      if (res.isAutoScrolling) {
        autoScrollBtn.innerText = '⏸️ Pause Auto-Scroll';
        autoScrollBtn.style.background = '#ef4444';
      }
    }
  });

  scanBtn.onclick = () => {
    sendToActiveTab({ action: 'SCAN_POSTS' }, (res) => {
      if (res) {
        postCountEl.innerText = `${res.count} posts`;
        showStatus(`Scanned! ${res.count} total in buffer`);
      }
    });
  };

  autoScrollBtn.onclick = () => {
    sendToActiveTab({ action: 'TOGGLE_AUTO_SCROLL' }, (res) => {
      if (res) {
        if (res.isAutoScrolling) {
          autoScrollBtn.innerText = '⏸️ Pause Auto-Scroll';
          autoScrollBtn.style.background = '#ef4444';
          showStatus('Auto-scrolling page...');
        } else {
          autoScrollBtn.innerText = '🔄 Start Auto-Scroll & Collect';
          autoScrollBtn.style.background = '#7c3aed';
          showStatus('Auto-scroll paused');
        }
      }
    });
  };

  sendBtn.onclick = () => {
    showStatus('Sending to PostSnag...');
    sendToActiveTab({ action: 'SEND_TO_DASHBOARD' }, (res) => {
      postCountEl.innerText = '0 posts';
      showStatus('Ingested into Dashboard!');
    });
  };

  clearBtn.onclick = () => {
    sendToActiveTab({ action: 'CLEAR_POSTS' }, () => {
      postCountEl.innerText = '0 posts';
      showStatus('Buffer cleared');
    });
  };

  function showStatus(text) {
    statusMsg.innerText = text;
    setTimeout(() => {
      statusMsg.innerText = '';
    }, 3000);
  }
});
