importScripts('jszip.min.js');

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'download') {
    // run scraping script in the active tab
    chrome.scripting.executeScript({
      target: { tabId: sender.tab.id },
      func: scrapePinterestImages,
      args: [message.mode]
    }).then((results) => {
      // results contains return value from scrapePinterestImages
      const images = (results && results[0] && results[0].result) || [];
      if (!images || images.length === 0) {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icon128.png',
          title: 'Pinterest Downloader',
          message: 'No images found on the page.',
          requireInteraction: true
        });
        return;
      }
      if (message.mode === 'zip') {
        if (typeof JSZip === 'undefined') {
          chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icon128.png',
            title: 'Pinterest Downloader',
            message: 'JSZip not found. Please add jszip.min.js to the extension folder.',
            requireInteraction: true
          });
          return;
        }
        const zip = new JSZip();
        let fetchPromises = images.map((url, idx) =>
          fetch(url).then(r => r.blob()).then(blob => zip.file('image_' + (idx+1) + getExtension(url), blob)).catch(e => null)
        );
        Promise.all(fetchPromises).then(() => {
          zip.generateAsync({type:'blob'}).then(content => {
            const url = URL.createObjectURL(content);
            chrome.downloads.download({url, filename: 'pinterest_images.zip', saveAs: true}, () => {
              chrome.notifications.create({
                type: 'basic',
                iconUrl: 'icon128.png',
                title: 'ZIP created',
                message: 'ZIP file created with ' + images.length + ' images',
                requireInteraction: true
              });
            });
          });
        });
      } else {
        // individual downloads
        let count = 0;
        images.forEach((url, idx) => {
          const filename = 'pinterest_image_' + (idx+1) + getExtension(url);
          chrome.downloads.download({url, filename, saveAs: false}, () => {
            count++;
            if (count === images.length) {
              chrome.notifications.create({
                type: 'basic',
                iconUrl: 'icon128.png',
                title: 'Downloads finished',
                message: images.length + ' images downloaded individually',
                requireInteraction: true
              });
            }
          });
        });
      }
    }).catch(err => {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon128.png',
        title: 'Error',
        message: 'Failed to scan the page: ' + err,
        requireInteraction: true
      });
    });
  }
});

function getExtension(url) {
  try {
    const u = new URL(url);
    const p = u.pathname;
    const m = p.match(/\.([^./?#]+)$/);
    if (m && m[1]) return '.' + m[1].split('?')[0];
  } catch(e) {}
  return '.jpg';
}

// This function executes in the page context to scroll and collect images
function scrapePinterestImages(mode) {
  return (async function() {
    const images = new Set();
    let lastHeight = -1;
    let sameCount = 0;
    for (let i=0;i<40;i++) {
      document.querySelectorAll('img').forEach(img => {
        const src = img.currentSrc || img.src;
        if (src) images.add(src.split('?')[0]);
      });
      window.scrollBy(0, window.innerHeight);
      await new Promise(r => setTimeout(r, 1000));
      let h = document.body.scrollHeight;
      if (h === lastHeight) sameCount++; else sameCount=0;
      if (sameCount > 2) break;
      lastHeight = h;
    }
    return Array.from(images);
  })();
}
