document.addEventListener('DOMContentLoaded', () => {
    // State management
    let releaseNotes = [];
    let currentFilter = 'all';
    let searchQuery = '';
    let selectedUpdate = null;

    // DOM Elements
    const refreshBtn = document.getElementById('refresh-btn');
    const refreshIcon = document.getElementById('refresh-icon');
    const searchInput = document.getElementById('search-input');
    const clearSearchBtn = document.getElementById('clear-search');
    const updateCountSpan = document.getElementById('update-count');
    const filterPills = document.getElementById('filter-pills');
    const skeletonLoader = document.getElementById('skeleton-loader');
    const notesContainer = document.getElementById('notes-container');
    const emptyState = document.getElementById('empty-state');
    const resetFiltersBtn = document.getElementById('reset-filters');
    
    // Modal Elements
    const tweetModal = document.getElementById('tweet-modal');
    const tweetTextarea = document.getElementById('tweet-textarea');
    const charCountSpan = document.getElementById('char-count');
    const charWarning = document.getElementById('char-warning');
    const postTweetBtn = document.getElementById('post-tweet-btn');
    const cancelTweetBtn = document.getElementById('cancel-tweet-btn');
    const closeModalBtn = document.getElementById('close-modal-btn');
    
    // Toast Elements
    const toast = document.getElementById('toast');
    const toastIcon = document.getElementById('toast-icon');
    const toastMessage = document.getElementById('toast-message');

    // Load initial data
    fetchReleaseNotes();

    // Event Listeners
    refreshBtn.addEventListener('click', fetchReleaseNotes);
    
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        clearSearchBtn.style.display = searchQuery ? 'flex' : 'none';
        renderNotes();
    });

    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        clearSearchBtn.style.display = 'none';
        searchInput.focus();
        renderNotes();
    });

    filterPills.addEventListener('click', (e) => {
        const pill = e.target.closest('.pill');
        if (!pill) return;

        // Update active class
        filterPills.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');

        currentFilter = pill.dataset.filter;
        renderNotes();
    });

    resetFiltersBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        clearSearchBtn.style.display = 'none';
        currentFilter = 'all';
        
        filterPills.querySelectorAll('.pill').forEach(p => {
            p.classList.remove('active');
            if (p.dataset.filter === 'all') p.classList.add('active');
        });

        renderNotes();
    });

    // Close Modal Events
    closeModalBtn.addEventListener('click', closeTweetModal);
    cancelTweetBtn.addEventListener('click', closeTweetModal);
    tweetModal.addEventListener('click', (e) => {
        if (e.target === tweetModal) closeTweetModal();
    });

    // Tweet Textarea Typing Event
    tweetTextarea.addEventListener('input', updateTweetCharCount);

    // Share Tweet Button
    postTweetBtn.addEventListener('click', shareOnTwitter);

    // Fetch release notes from backend
    async function fetchReleaseNotes() {
        showLoading(true);
        try {
            const response = await fetch('/api/release-notes');
            if (!response.ok) throw new Error('Network response was not ok');
            const result = await response.json();
            
            if (result.status === 'success') {
                releaseNotes = result.updates;
                renderNotes();
            } else {
                showToast('Failed to load release notes.', 'fa-circle-exclamation');
            }
        } catch (error) {
            console.error('Error fetching release notes:', error);
            showToast('Connection error. Please try again.', 'fa-circle-exclamation');
        } finally {
            showLoading(false);
        }
    }

    // Toggle loading states
    function showLoading(isLoading) {
        if (isLoading) {
            refreshIcon.classList.add('spinning');
            refreshBtn.disabled = true;
            skeletonLoader.style.display = 'grid';
            notesContainer.style.display = 'none';
            emptyState.style.display = 'none';
        } else {
            // Add a small delay for a smooth transition
            setTimeout(() => {
                refreshIcon.classList.remove('spinning');
                refreshBtn.disabled = false;
                skeletonLoader.style.display = 'none';
            }, 500);
        }
    }

    // Filter release notes logic
    function getFilteredNotes() {
        return releaseNotes.filter(note => {
            // Category filter check
            const matchesCategory = matchesFilter(note, currentFilter);
            
            // Search text check
            const textContent = `${note.type} ${note.date} ${note.text}`.toLowerCase();
            const matchesSearch = !searchQuery || textContent.includes(searchQuery);

            return matchesCategory && matchesSearch;
        });
    }

    function matchesFilter(note, filterVal) {
        if (filterVal === 'all') return true;
        
        const type = (note.type || '').toLowerCase();
        const f = filterVal.toLowerCase();
        
        if (f === 'feature') return type.includes('feature');
        if (f === 'issue') return type.includes('issue') || type.includes('bug');
        if (f === 'notice') return type.includes('notice') || type.includes('announc');
        
        return type === f;
    }

    // Render cards to UI
    function renderNotes() {
        const filtered = getFilteredNotes();
        updateCountSpan.textContent = filtered.length;

        if (filtered.length === 0) {
            notesContainer.style.display = 'none';
            emptyState.style.display = 'flex';
            return;
        }

        emptyState.style.display = 'none';
        notesContainer.style.display = 'grid';
        notesContainer.innerHTML = '';

        filtered.forEach(note => {
            const card = document.createElement('div');
            const cardClass = getCardClass(note.type);
            card.className = `note-card ${cardClass}`;

            // Clean content link tags to open in a new window
            let sanitizedContent = note.content;
            
            card.innerHTML = `
                <div>
                    <div class="card-header">
                        <div class="card-meta">
                            <span class="card-date"><i class="fa-regular fa-calendar-days"></i> ${note.date}</span>
                            <span class="card-type-badge">${note.type || 'Update'}</span>
                        </div>
                        <button class="tweet-shortcut-btn" title="Tweet this update">
                            <i class="fa-brands fa-x-twitter"></i>
                        </button>
                    </div>
                    <div class="card-content">
                        ${sanitizedContent}
                    </div>
                </div>
                <div class="card-actions">
                    ${note.link ? `
                        <a href="${note.link}" target="_blank" class="read-more-link">
                            <span>Official Release Notes</span>
                            <i class="fa-solid fa-arrow-up-right-from-square"></i>
                        </a>
                    ` : '<span></span>'}
                    <button class="btn btn-secondary btn-tweet-main">
                        <i class="fa-brands fa-x-twitter"></i>
                        <span>Tweet Update</span>
                    </button>
                </div>
            `;

            // Open all content links in new tab
            card.querySelectorAll('.card-content a').forEach(a => {
                a.target = '_blank';
                a.rel = 'noopener noreferrer';
            });

            // Bind Tweet triggers
            const tweetShortcutBtn = card.querySelector('.tweet-shortcut-btn');
            const tweetMainBtn = card.querySelector('.btn-tweet-main');
            
            const triggerTweet = () => openTweetModal(note);
            tweetShortcutBtn.addEventListener('click', triggerTweet);
            tweetMainBtn.addEventListener('click', triggerTweet);

            notesContainer.appendChild(card);
        });
    }

    // Helper to get card background theme class based on update type
    function getCardClass(type) {
        const t = (type || '').toLowerCase();
        if (t.includes('feature')) return 'type-feature';
        if (t.includes('issue') || t.includes('bug')) return 'type-issue';
        if (t.includes('notice') || t.includes('announc')) return 'type-notice';
        return 'type-default';
    }

    // Open X Composer Modal
    function openTweetModal(note) {
        selectedUpdate = note;
        const text = generateTweetText(note);
        tweetTextarea.value = text;
        updateTweetCharCount();

        tweetModal.style.display = 'flex';
        // Trigger reflow for transition
        void tweetModal.offsetWidth;
        tweetModal.classList.add('active');
        tweetTextarea.focus();
    }

    // Close Modal
    function closeTweetModal() {
        tweetModal.classList.remove('active');
        setTimeout(() => {
            tweetModal.style.display = 'none';
            selectedUpdate = null;
        }, 300);
    }

    // Character counter logic
    function updateTweetCharCount() {
        const length = tweetTextarea.value.length;
        charCountSpan.textContent = length;

        // Warnings for Twitter 280 character limit
        if (length > 280) {
            charCountSpan.style.color = '#ef4444';
            charWarning.textContent = 'Character limit exceeded!';
            charWarning.style.display = 'inline';
            charWarning.className = 'warning-text exceeded';
            postTweetBtn.disabled = true;
        } else if (length >= 250) {
            charCountSpan.style.color = '#f59e0b';
            charWarning.textContent = 'Approaching limit!';
            charWarning.style.display = 'inline';
            charWarning.className = 'warning-text';
            postTweetBtn.disabled = false;
        } else {
            charCountSpan.style.color = 'var(--text-muted)';
            charWarning.style.display = 'none';
            postTweetBtn.disabled = false;
        }
    }

    // Generate balanced Twitter copy matching standard constraints
    function generateTweetText(update) {
        const date = update.date || '';
        const type = update.type || 'Update';
        const link = update.link || 'https://cloud.google.com/bigquery/docs/release-notes';
        const hashtags = ' #BigQuery #GoogleCloud';
        
        // Base prefix and suffix formats
        const prefix = `📢 BigQuery Update (${date}):\n🔹 [${type}] `;
        const suffix = `\n🔗 Read more: ${link}${hashtags}`;
        
        // Reserved spacing checks
        const reservedLength = prefix.length + suffix.length;
        const maxContentLength = 280 - reservedLength - 5; // Safety margin
        
        let content = update.text || '';
        // Standardize whitespaces
        content = content.replace(/\s+/g, ' ').trim();
        
        if (content.length > maxContentLength) {
            content = content.substring(0, maxContentLength) + '...';
        }
        
        return `${prefix}${content}${suffix}`;
    }

    // Redirect to X (Twitter) Share Intent
    function shareOnTwitter() {
        const tweetText = tweetTextarea.value;
        const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
        
        window.open(url, '_blank', 'width=550,height=420,toolbar=no,menubar=no,scrollbars=yes');
        
        closeTweetModal();
        showToast('Opening tweet composer on X!', 'fa-circle-check');
    }

    // Dynamic Toast alerts helper
    function showToast(message, iconClass) {
        toastIcon.className = `fa-solid ${iconClass}`;
        toastMessage.textContent = message;
        
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3500);
    }
});
