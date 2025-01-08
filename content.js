
    // Add download button to YouTube player
    function addDownloadButton() {
        const controls = document.querySelector('.ytp-right-controls');
        if (!controls || document.getElementById('yt-download-btn')) return;

        const button = document.createElement('button');
        button.id = 'yt-download-btn';
        button.className = 'ytp-button';
        button.title = 'Download Video';
        button.innerHTML = `
            <svg height="100%" version="1.1" viewBox="0 0 36 36" width="100%">
                <path d="M 12,12 L 20,12 L 20,24 L 24,24 L 18,30 L 12,24 L 16,24 Z" fill="#ff0000"></path>
            </svg>
        `;

        button.addEventListener('click', () => {
            const videoId = new URLSearchParams(window.location.search).get('v');
            const videoUrl = window.location.href;
            const videoTitle = document.title.replace(' - YouTube', '');
            
            chrome.runtime.sendMessage({
                action: "openSidePanel",
                videoId: videoId,
                videoUrl: videoUrl,
                title: videoTitle
            });
        });

        controls.insertBefore(button, controls.firstChild);
    }

    // Watch for YouTube player
    const observer = new MutationObserver(() => {
        if (document.querySelector('.ytp-right-controls')) {
            addDownloadButton();
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // Initial check
    if (document.querySelector('.ytp-right-controls')) {
        addDownloadButton();
    }
    