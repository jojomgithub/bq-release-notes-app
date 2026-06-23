// State Management
let state = {
    allNotes: [],       // Raw entries from API
    parsedUpdates: [],  // Segmented updates with type, content, date, original link
    activeFilter: 'all',
    searchQuery: '',
    selectedUpdate: null,
    currentStyle: 'standard'
};

// SVG Progress Ring Math Constants
const RING_RADIUS = 10;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

// DOM Elements
const elements = {
    refreshBtn: document.getElementById('refresh-btn'),
    refreshIcon: document.getElementById('refresh-icon'),
    searchInput: document.getElementById('search-input'),
    statTotal: document.getElementById('stat-total'),
    statFeatures: document.getElementById('stat-features'),
    statLastChecked: document.getElementById('stat-last-checked'),
    loadingState: document.getElementById('loading-state'),
    errorState: document.getElementById('error-state'),
    errorMessage: document.getElementById('error-message'),
    emptyState: document.getElementById('empty-state'),
    feedTimeline: document.getElementById('feed-timeline'),
    retryBtn: document.getElementById('retry-btn'),
    navItems: document.querySelectorAll('.nav-item'),
    
    // Modal Elements
    tweetModal: document.getElementById('tweet-modal'),
    modalCloseBtn: document.getElementById('modal-close-btn'),
    previewBadge: document.getElementById('preview-badge'),
    previewDate: document.getElementById('preview-date'),
    previewContent: document.getElementById('preview-content'),
    styleBtns: document.querySelectorAll('.style-btn'),
    tweetTextarea: document.getElementById('tweet-textarea'),
    charProgress: document.getElementById('char-progress'),
    charCountText: document.getElementById('char-count-text'),
    mockTweetText: document.getElementById('mock-tweet-text'),
    btnCopyTweet: document.getElementById('btn-copy-tweet'),
    copyIcon: document.getElementById('copy-icon'),
    copyBtnText: document.getElementById('copy-btn-text'),
    btnShareX: document.getElementById('btn-share-x'),
    
    // Toast
    toast: document.getElementById('toast'),
    toastMessage: document.getElementById('toast-message')
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    // Setup Lucide icons initially
    lucide.createIcons();
    
    // Event Listeners
    elements.refreshBtn.addEventListener('click', fetchReleaseNotes);
    elements.retryBtn.addEventListener('click', fetchReleaseNotes);
    elements.searchInput.addEventListener('input', handleSearch);
    
    elements.navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            const filterVal = e.currentTarget.getAttribute('data-filter');
            setActiveFilter(filterVal);
        });
    });
    
    // Modal Listeners
    elements.modalCloseBtn.addEventListener('click', closeTweetModal);
    elements.tweetModal.addEventListener('click', (e) => {
        if (e.target === elements.tweetModal) closeTweetModal();
    });
    
    elements.styleBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const style = e.currentTarget.getAttribute('data-style');
            setTweetStyle(style);
        });
    });
    
    elements.tweetTextarea.addEventListener('input', handleTweetTextChange);
    elements.btnCopyTweet.addEventListener('click', copyTweetToClipboard);
    elements.btnShareX.addEventListener('click', shareOnX);
    
    // Setup Progress Ring
    elements.charProgress.style.strokeDasharray = `${RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}`;
    elements.charProgress.style.strokeDashoffset = RING_CIRCUMFERENCE;
    
    // Initial Load
    fetchReleaseNotes();
});

// Fetch Release Notes from API
async function fetchReleaseNotes() {
    // UI state: loading
    elements.refreshBtn.classList.add('loading');
    elements.refreshBtn.disabled = true;
    
    elements.loadingState.classList.remove('hidden');
    elements.errorState.classList.add('hidden');
    elements.emptyState.classList.add('hidden');
    elements.feedTimeline.classList.add('hidden');
    
    try {
        const response = await fetch('/api/notes');
        const data = await response.json();
        
        if (data.status === 'success') {
            state.allNotes = data.notes;
            processReleaseNotes();
            updateStats();
            renderTimeline();
            
            // UI state: success
            elements.loadingState.classList.add('hidden');
            elements.feedTimeline.classList.remove('hidden');
            
            // Set last checked time
            const now = new Date();
            elements.statLastChecked.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else {
            throw new Error(data.message || 'Unknown server error');
        }
    } catch (err) {
        console.error('Fetch error:', err);
        elements.errorMessage.textContent = err.message || 'Failed to connect to the server.';
        elements.loadingState.classList.add('hidden');
        elements.errorState.classList.remove('hidden');
    } finally {
        elements.refreshBtn.classList.remove('loading');
        elements.refreshBtn.disabled = false;
        lucide.createIcons();
    }
}

// Process entries and split them into distinct, structured update cards
function processReleaseNotes() {
    state.parsedUpdates = [];
    
    state.allNotes.forEach(note => {
        const updatesFromDay = parseEntryContent(note.content, note.date, note.link);
        state.parsedUpdates.push(...updatesFromDay);
    });
}

// Parse entry HTML content into individual update segments
function parseEntryContent(contentHtml, date, link) {
    if (!contentHtml) return [];
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(contentHtml, 'text/html');
    const bodyChildren = Array.from(doc.body.children);
    
    if (bodyChildren.length === 0) {
        return [{
            id: generateId(),
            type: 'update',
            content: contentHtml,
            date: date,
            link: link
        }];
    }
    
    const updates = [];
    let currentUpdate = null;
    
    bodyChildren.forEach(child => {
        if (child.tagName === 'H3') {
            if (currentUpdate) {
                updates.push(currentUpdate);
            }
            currentUpdate = {
                id: generateId(),
                type: child.textContent.trim(),
                elements: [],
                date: date,
                link: link
            };
        } else {
            if (!currentUpdate) {
                currentUpdate = {
                    id: generateId(),
                    type: 'update',
                    elements: [],
                    date: date,
                    link: link
                };
            }
            currentUpdate.elements.push(child.outerHTML);
        }
    });
    
    if (currentUpdate) {
        updates.push(currentUpdate);
    }
    
    return updates.map(u => ({
        id: u.id,
        type: u.type,
        content: u.elements.join('\n'),
        date: u.date,
        link: u.link
    }));
}

// Helper to generate a unique random ID
function generateId() {
    return Math.random().toString(36).substring(2, 9);
}

// Update Stats Board
function updateStats() {
    elements.statTotal.textContent = state.parsedUpdates.length;
    
    const featureCount = state.parsedUpdates.filter(
        u => u.type.toLowerCase().includes('feature')
    ).length;
    
    elements.statFeatures.textContent = featureCount;
}

// Handle Filters
function setActiveFilter(filterVal) {
    state.activeFilter = filterVal;
    
    // Update active nav style
    elements.navItems.forEach(item => {
        if (item.getAttribute('data-filter') === filterVal) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
    
    renderTimeline();
}

// Handle Search
function handleSearch(e) {
    state.searchQuery = e.target.value.toLowerCase();
    renderTimeline();
}

// Get filtered updates based on state
getFilteredUpdates = () => {
    return state.parsedUpdates.filter(update => {
        // Filter by category type
        const typeLower = update.type.toLowerCase();
        let matchesFilter = true;
        if (state.activeFilter !== 'all') {
            matchesFilter = typeLower.includes(state.activeFilter);
        }
        
        // Filter by search query
        let matchesSearch = true;
        if (state.searchQuery) {
            const textContent = stripHtml(update.content).toLowerCase();
            const dateText = update.date.toLowerCase();
            matchesSearch = textContent.includes(state.searchQuery) || 
                            typeLower.includes(state.searchQuery) ||
                            dateText.includes(state.searchQuery);
        }
        
        return matchesFilter && matchesSearch;
    });
};

// Render Timeline
function renderTimeline() {
    const filtered = getFilteredUpdates();
    
    if (filtered.length === 0) {
        elements.feedTimeline.classList.add('hidden');
        elements.emptyState.classList.remove('hidden');
        return;
    }
    
    elements.emptyState.classList.add('hidden');
    elements.feedTimeline.classList.remove('hidden');
    elements.feedTimeline.innerHTML = '';
    
    // Group updates by date
    const groups = {};
    filtered.forEach(update => {
        if (!groups[update.date]) {
            groups[update.date] = [];
        }
        groups[update.date].push(update);
    });
    
    // Render day groups
    Object.keys(groups).forEach(date => {
        const dayUpdates = groups[date];
        const dayGroupEl = document.createElement('div');
        dayGroupEl.className = 'day-group';
        
        // Generate relative date string if possible
        const relativeText = getRelativeDateText(date);
        
        dayGroupEl.innerHTML = `
            <div class="day-header">
                <div class="day-sticky">
                    <h3 class="day-title">${date}</h3>
                    <span class="day-relative">${relativeText}</span>
                </div>
            </div>
            <div class="day-cards">
                <!-- Cards will render here -->
            </div>
        `;
        
        const cardsContainer = dayGroupEl.querySelector('.day-cards');
        
        dayUpdates.forEach(update => {
            const cardEl = document.createElement('div');
            cardEl.className = 'note-card';
            cardEl.setAttribute('data-id', update.id);
            
            const badgeClass = getBadgeClass(update.type);
            
            cardEl.innerHTML = `
                <div class="note-card-header">
                    <span class="badge ${badgeClass}">${update.type}</span>
                    <div class="card-actions">
                        <a href="${update.link}" target="_blank" class="btn-card-action" title="View official release page">
                            <i data-lucide="external-link"></i>
                        </a>
                        <button class="btn-card-action tweet-btn" title="Tweet about this update">
                            <i data-lucide="twitter"></i>
                        </button>
                    </div>
                </div>
                <div class="note-card-body">
                    ${update.content}
                </div>
            `;
            
            // Attach Tweet Button Click
            const tweetBtn = cardEl.querySelector('.tweet-btn');
            tweetBtn.addEventListener('click', () => openTweetModal(update));
            
            cardsContainer.appendChild(cardEl);
        });
        
        elements.feedTimeline.appendChild(dayGroupEl);
    });
    
    // Re-bind Lucide icons for the newly rendered markup
    lucide.createIcons();
}

// Helpers for badges and dates
function getBadgeClass(type) {
    const typeLower = type.toLowerCase();
    if (typeLower.includes('feature')) return 'feature';
    if (typeLower.includes('change')) return 'changed';
    if (typeLower.includes('deprecation')) return 'deprecation';
    if (typeLower.includes('announcement')) return 'announcement';
    return 'update';
}

function getRelativeDateText(dateStr) {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const updateDate = new Date(dateStr);
        updateDate.setHours(0, 0, 0, 0);
        
        const diffTime = today - updateDate;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
        
        return 'Earlier';
    } catch {
        return '';
    }
}

// HTML stripper to get pure text content
function stripHtml(html) {
    const tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    
    // Insert spacing for bullet lists
    const lis = tmp.getElementsByTagName("li");
    for (let i = 0; i < lis.length; i++) {
        lis[i].innerHTML = "• " + lis[i].innerHTML + " \n";
    }
    
    return tmp.textContent || tmp.innerText || "";
}

// Tweet Composer Modal Controllers
function openTweetModal(update) {
    state.selectedUpdate = update;
    state.currentStyle = 'standard';
    
    // Update active style button UI
    elements.styleBtns.forEach(btn => {
        if (btn.getAttribute('data-style') === 'standard') {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Set preview details
    elements.previewBadge.textContent = update.type;
    elements.previewBadge.className = `badge ${getBadgeClass(update.type)}`;
    elements.previewDate.textContent = update.date;
    elements.previewContent.textContent = stripHtml(update.content);
    
    // Generate text
    regenerateTweetText();
    
    // Open modal
    elements.tweetModal.classList.remove('hidden');
    elements.tweetTextarea.focus();
}

function closeTweetModal() {
    elements.tweetModal.classList.add('hidden');
    state.selectedUpdate = null;
}

function setTweetStyle(style) {
    state.currentStyle = style;
    
    elements.styleBtns.forEach(btn => {
        if (btn.getAttribute('data-style') === style) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    regenerateTweetText();
}

// Tweet Generator
function regenerateTweetText() {
    if (!state.selectedUpdate) return;
    
    const update = state.selectedUpdate;
    const cleanUpdateText = stripHtml(update.content).replace(/\s+/g, ' ').trim();
    const link = update.link;
    const date = update.date;
    
    let tweetText = '';
    
    // Base links & tags sizes
    const hashtags = ' #BigQuery #GoogleCloud';
    
    switch (state.currentStyle) {
        case 'excited':
            const excitedIntro = `🚀 BigQuery updates! `;
            const excitedBody = truncateText(cleanUpdateText, 280 - excitedIntro.length - link.length - hashtags.length - 8);
            tweetText = `${excitedIntro}${excitedBody}\n\nDetails: ${link}${hashtags}`;
            break;
            
        case 'bullet':
            const bulletIntro = `📝 BigQuery release note (${date}):\n`;
            const bulletBody = truncateText(cleanUpdateText, 280 - bulletIntro.length - link.length - hashtags.length - 8);
            tweetText = `${bulletIntro}• ${bulletBody}\n\nDocs: ${link}${hashtags}`;
            break;
            
        case 'technical':
            const techIntro = `⚙️ BQ API / Engine Update: `;
            const techBody = truncateText(cleanUpdateText, 280 - techIntro.length - link.length - hashtags.length - 8);
            tweetText = `${techIntro}${techBody}\n\nRead more: ${link}${hashtags}`;
            break;
            
        case 'standard':
        default:
            const stdIntro = `BigQuery Update (${date}): `;
            const stdBody = truncateText(cleanUpdateText, 280 - stdIntro.length - link.length - hashtags.length - 8);
            tweetText = `${stdIntro}${stdBody}\n\nLink: ${link}${hashtags}`;
            break;
    }
    
    elements.tweetTextarea.value = tweetText;
    updateTweetProgress(tweetText.length);
}

// Intelligent Truncator helper to keep Tweet within 280 character limit
function truncateText(text, maxChars) {
    if (text.length <= maxChars) return text;
    return text.substring(0, maxChars - 3) + '...';
}

function handleTweetTextChange(e) {
    updateTweetProgress(e.target.value.length);
}

// Update Tweet Progress indicator
function updateTweetProgress(length) {
    const charsRemaining = 280 - length;
    elements.charCountText.textContent = charsRemaining;
    
    // Update mock layout in real time
    elements.mockTweetText.textContent = elements.tweetTextarea.value || 'Draft your tweet...';
    
    // Radial Progress Calculation
    const percent = Math.min((length / 280) * 100, 100);
    const offset = RING_CIRCUMFERENCE - (percent / 100) * RING_CIRCUMFERENCE;
    elements.charProgress.style.strokeDashoffset = offset;
    
    // Styles indicator depending on character budget remaining
    if (charsRemaining < 0) {
        elements.charCountText.style.color = 'var(--accent-red)';
        elements.charProgress.style.stroke = 'var(--accent-red)';
        elements.btnShareX.disabled = true;
        elements.btnShareX.style.opacity = 0.5;
        elements.btnShareX.style.cursor = 'not-allowed';
    } else if (charsRemaining <= 20) {
        elements.charCountText.style.color = 'var(--accent-orange)';
        elements.charProgress.style.stroke = 'var(--accent-orange)';
        elements.btnShareX.disabled = false;
        elements.btnShareX.style.opacity = 1;
        elements.btnShareX.style.cursor = 'pointer';
    } else {
        elements.charCountText.style.color = 'var(--text-secondary)';
        elements.charProgress.style.stroke = 'var(--accent-indigo)';
        elements.btnShareX.disabled = false;
        elements.btnShareX.style.opacity = 1;
        elements.btnShareX.style.cursor = 'pointer';
    }
}

// Clipboard Copy logic
async function copyTweetToClipboard() {
    const tweetText = elements.tweetTextarea.value;
    try {
        await navigator.clipboard.writeText(tweetText);
        
        // Show Success UI state
        showToast('Tweet text copied to clipboard!');
        elements.copyBtnText.textContent = 'Copied!';
        elements.copyIcon.setAttribute('data-lucide', 'check');
        lucide.createIcons();
        
        setTimeout(() => {
            elements.copyBtnText.textContent = 'Copy Text';
            elements.copyIcon.setAttribute('data-lucide', 'copy');
            lucide.createIcons();
        }, 2000);
        
    } catch (err) {
        console.error('Clipboard error:', err);
        showToast('Failed to copy to clipboard', true);
    }
}

// Trigger Web Intent sharing
function shareOnX() {
    const tweetText = elements.tweetTextarea.value;
    if (tweetText.length > 280) {
        showToast('Tweet exceeds character limit!', true);
        return;
    }
    
    const xIntentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
    window.open(xIntentUrl, '_blank', 'width=550,height=420');
}

// Toast Notifications Helper
function showToast(message, isError = false) {
    elements.toastMessage.textContent = message;
    
    const toastIcon = elements.toast.querySelector('.toast-icon');
    if (isError) {
        elements.toast.classList.add('error-toast');
        toastIcon.setAttribute('data-lucide', 'alert-circle');
    } else {
        elements.toast.classList.remove('error-toast');
        toastIcon.setAttribute('data-lucide', 'check-circle');
    }
    
    lucide.createIcons();
    
    elements.toast.classList.remove('hidden');
    
    setTimeout(() => {
        elements.toast.classList.add('hidden');
    }, 3000);
}
