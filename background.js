
    // Initialize state
    let activeDownloads = new Map();
    let currentVideoInfo = null;

    // Set up extension when installed
    chrome.runtime.onInstalled.addListener(() => {
        console.log('Extension installed');
        // Configure side panel to open on extension icon click
        chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
            .catch(err => console.error('Failed to set panel behavior:', err));
    });

    // Handle extension icon clicks
    chrome.action.onClicked.addListener((tab) => {
        chrome.sidePanel.open({ windowId: tab.windowId })
            .catch(err => console.error('Failed to open side panel:', err));
    });

    // Listen for messages from content script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        console.log('Received message:', message);
        
        if (message.action === 'openSidePanel') {
            // Store video info
            currentVideoInfo = {
                id: message.videoId,
                url: message.videoUrl,
                title: message.title
            };
            
            // Open side panel
            chrome.sidePanel.open({
                windowId: sender.tab.windowId
            }).catch(err => console.error('Failed to open side panel:', err));
            
            return true;
        }
        
        if (message.action === 'startDownload') {
            handleDownload(message.format, message.quality);
            return true;
        }
    });

    // Handle download request
    async function handleDownload(format, quality) {
        try {
            if (!currentVideoInfo) {
                throw new Error('No video selected');
            }

            console.log('Starting download:', format, quality);

            // Get video URL based on format and quality
            const downloadUrl = await getVideoUrl(currentVideoInfo.id, format, quality);
            
            // Start download
            const downloadId = await chrome.downloads.download({
                url: downloadUrl,
                filename: `${currentVideoInfo.title}.${format === 'audio' ? 'mp3' : 'mp4'}`,
                saveAs: true
            });

            // Track download
            activeDownloads.set(downloadId, {
                title: currentVideoInfo.title,
                format,
                quality
            });

            // Notify success
            chrome.runtime.sendMessage({
                type: 'DOWNLOAD_STARTED',
                downloadId: downloadId
            });

        } catch (error) {
            console.error('Download failed:', error);
            chrome.runtime.sendMessage({
                type: 'DOWNLOAD_ERROR',
                error: error.message
            });
        }
    }

    // Track download progress
    chrome.downloads.onChanged.addListener((delta) => {
        if (activeDownloads.has(delta.id)) {
            if (delta.state) {
                chrome.runtime.sendMessage({
                    type: 'DOWNLOAD_STATE',
                    state: delta.state.current
                });
            }
            if (delta.bytesReceived) {
                const progress = Math.round(
                    (delta.bytesReceived.current / delta.totalBytes.current) * 100
                );
                chrome.runtime.sendMessage({
                    type: 'DOWNLOAD_PROGRESS',
                    progress: progress
                });
            }
        }
    });

    // Helper function to get video URL
    async function getVideoUrl(videoId, format, quality) {
        const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`);
        const html = await response.text();
        
        const match = html.match(/ytInitialPlayerResponse = ({.*?});/);
        if (!match) throw new Error('Could not find video info');
        
        const data = JSON.parse(match[1]);
        const formats = data.streamingData.adaptiveFormats;
        
        if (format === 'video') {
            const videoFormat = formats.find(f => 
                f.mimeType.includes('video/mp4') && 
                f.qualityLabel.includes(quality)
            );
            return videoFormat?.url;
        } else {
            const audioFormat = formats.find(f => 
                f.mimeType.includes('audio/mp4')
            );
            return audioFormat?.url;
        }
    }
    