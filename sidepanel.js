
    document.addEventListener('DOMContentLoaded', () => {
        // Tab switching
        const tabs = document.querySelectorAll('.tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                const sections = document.querySelectorAll('.section');
                sections.forEach(s => s.classList.remove('active'));
                document.getElementById(tab.dataset.section + '-section').classList.add('active');
            });
        });

        // Categories Management
        const categoriesList = document.getElementById('categories-list');
        const addCategoryBtn = document.getElementById('add-category');

        // Load saved categories
        loadCategories();

        addCategoryBtn.addEventListener('click', async () => {
            const name = prompt('Enter category name:');
            if (name) {
                await addCategory(name);
            }
        });

        async function loadCategories() {
            const storage = await chrome.storage.sync.get('categories');
            const categories = storage.categories || {};
            
            categoriesList.innerHTML = '';
            Object.entries(categories).forEach(([name, data]) => {
                createCategoryElement(name, data);
            });
        }

        async function addCategory(name) {
            const storage = await chrome.storage.sync.get('categories');
            const categories = storage.categories || {};
            
            if (!categories[name]) {
                categories[name] = {
                    channels: {},
                    expanded: false
                };
                await chrome.storage.sync.set({ categories });
                createCategoryElement(name, categories[name]);
            }
        }

        function createCategoryElement(name, data) {
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'category';
            if (data.expanded) categoryDiv.classList.add('expanded');

            categoryDiv.innerHTML = `
                <div class="category-header">
                    <span>${name}</span>
                    <button class="add-button">Add Channel</button>
                </div>
                <div class="category-content"></div>
            `;

            const header = categoryDiv.querySelector('.category-header');
            const content = categoryDiv.querySelector('.category-content');
            const addChannelBtn = categoryDiv.querySelector('.add-button');

            header.addEventListener('click', (e) => {
                if (e.target !== addChannelBtn) {
                    categoryDiv.classList.toggle('expanded');
                    updateCategoryExpanded(name, categoryDiv.classList.contains('expanded'));
                }
            });

            addChannelBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const channelName = prompt('Enter channel name:');
                if (channelName) {
                    addChannel(name, channelName);
                }
            });

            // Load existing channels
            Object.entries(data.channels || {}).forEach(([channelName, videos]) => {
                createChannelElement(content, name, channelName, videos);
            });

            categoriesList.appendChild(categoryDiv);
        }

        async function addChannel(categoryName, channelName) {
            const storage = await chrome.storage.sync.get('categories');
            const categories = storage.categories;
            
            if (!categories[categoryName].channels[channelName]) {
                categories[categoryName].channels[channelName] = [];
                await chrome.storage.sync.set({ categories });
                
                const categoryDiv = Array.from(categoriesList.children)
                    .find(div => div.querySelector('.category-header span').textContent === categoryName);
                
                if (categoryDiv) {
                    createChannelElement(
                        categoryDiv.querySelector('.category-content'),
                        categoryName,
                        channelName,
                        []
                    );
                }
            }
        }

        function createChannelElement(container, categoryName, channelName, videos) {
            const channelDiv = document.createElement('div');
            channelDiv.className = 'channel';
            channelDiv.innerHTML = `
                <div class="channel-header">
                    <span>${channelName}</span>
                    <button class="add-button">Add Video</button>
                </div>
                <div class="videos-list"></div>
            `;

            const addVideoBtn = channelDiv.querySelector('.add-button');
            const videosList = channelDiv.querySelector('.videos-list');

            addVideoBtn.addEventListener('click', async () => {
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                if (tab.url.includes('youtube.com/watch')) {
                    const videoId = new URLSearchParams(new URL(tab.url).search).get('v');
                    const videoTitle = tab.title.replace(' - YouTube', '');
                    addVideo(categoryName, channelName, {
                        id: videoId,
                        title: videoTitle,
                        url: tab.url
                    });
                } else {
                    alert('Please navigate to a YouTube video first');
                }
            });

            // Load existing videos
            videos.forEach(video => {
                createVideoElement(videosList, video);
            });

            container.appendChild(channelDiv);
        }

        function createVideoElement(container, video) {
            const videoDiv = document.createElement('a');
            videoDiv.className = 'video-link';
            videoDiv.href = video.url;
            videoDiv.target = '_blank';
            videoDiv.innerHTML = `
                <img src="https://img.youtube.com/vi/${video.id}/default.jpg" alt="Thumbnail">
                <div class="video-info">
                    <div class="video-title">${video.title}</div>
                </div>
            `;
            container.appendChild(videoDiv);
        }

        async function addVideo(categoryName, channelName, video) {
            const storage = await chrome.storage.sync.get('categories');
            const categories = storage.categories;
            
            if (!categories[categoryName].channels[channelName].find(v => v.id === video.id)) {
                categories[categoryName].channels[channelName].push(video);
                await chrome.storage.sync.set({ categories });
                
                const categoryDiv = Array.from(categoriesList.children)
                    .find(div => div.querySelector('.category-header span').textContent === categoryName);
                
                if (categoryDiv) {
                    const channelDiv = Array.from(categoryDiv.querySelectorAll('.channel'))
                        .find(div => div.querySelector('.channel-header span').textContent === channelName);
                    
                    if (channelDiv) {
                        createVideoElement(channelDiv.querySelector('.videos-list'), video);
                    }
                }
            }
        }

        async function updateCategoryExpanded(categoryName, expanded) {
            const storage = await chrome.storage.sync.get('categories');
            const categories = storage.categories;
            categories[categoryName].expanded = expanded;
            await chrome.storage.sync.set({ categories });
        }

        // ... rest of your downloader code ...
    });
    