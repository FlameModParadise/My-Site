// ================ MOBILE NAVBAR FIX (SINGLE IMPLEMENTATION) ================ 
document.addEventListener('DOMContentLoaded', function() {
  const toggle = document.getElementById('navbarToggle');
  const menu = document.getElementById('navbarMenu');
  
  if (!toggle || !menu) return;
  
  // Simple toggle function with improved accessibility
  function toggleMobileMenu() {
    const isOpen = menu.classList.contains('show-menu');
    
    if (isOpen) {
      // Close menu
      menu.classList.remove('show-menu');
      toggle.innerHTML = '☰';
      toggle.setAttribute('aria-label', 'Open menu');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    } else {
      // Open menu
      menu.classList.add('show-menu');
      toggle.innerHTML = '✕';
      toggle.setAttribute('aria-label', 'Close menu');
      toggle.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
    }
  }
  
  // Event delegation for better performance
  document.addEventListener('click', function(e) {
    if (e.target === toggle) {
      e.preventDefault();
      e.stopPropagation();
      toggleMobileMenu();
    } else if (menu.classList.contains('show-menu') && 
               !toggle.contains(e.target) && 
               !menu.contains(e.target)) {
      toggleMobileMenu();
    } else if (menu.contains(e.target) && (e.target.tagName === 'A' || e.target.tagName === 'BUTTON')) {
      toggleMobileMenu();
    }
  });
  
  // Improved keyboard navigation
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && menu.classList.contains('show-menu')) {
      toggleMobileMenu();
      toggle.focus(); // Return focus to toggle button
    }
  });
  
  // Debounced resize handler
  let resizeTimer;
  window.addEventListener('resize', function() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function() {
      if (window.innerWidth > 768 && menu.classList.contains('show-menu')) {
        toggleMobileMenu();
      }
    }, 250);
  });
});

/* === CSS PATCHES (auto‑injected) === */
(() => {
  const css = `
:focus-visible{outline:2px solid var(--color-primary);outline-offset:2px;}
@keyframes pulse{0%,100%{opacity:.6}50%{opacity:1}}
.tool-thumb-wrapper{aspect-ratio:16/9;position:relative;}
.tool-thumb-wrapper img{object-fit:cover;width:100%;height:100%;}
.skip-link{position:absolute;top:-40px;left:6px;background:var(--color-primary);color:#fff;padding:8px;text-decoration:none;border-radius:4px;z-index:1000;}
.skip-link:focus{top:6px;}
`;
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);
})();

/* ----------  CONSTANTS & DOM REFS  ---------- */
const DATA_FILES = [
  "data/tools.json",
  "data/bots.json", 
  "data/checkers.json",
  "data/game.json",
  "data/others.json",
  "data/cookies.json",
  "data/methods.json",
  "data/membership.json"
];

const STORAGE_KEYS = {
  THEME: "theme",
  SEARCH: "search",
  SORT: "sort",
  FILTER: "filter",
  RECENT: "recentSearches"
};

const CONFIG = {
  MAX_RECENTS: 5,
  SEARCH_DEBOUNCE: 300,
  RESIZE_DEBOUNCE: 250,
  SCROLL_DEBOUNCE: 16,
  BADGE_UPDATE_INTERVAL: 300000, // 5 minutes
  MOBILE_BREAKPOINT: 768
};

/* DOM - Cached references with null checks */
const DOM = {
  container: document.getElementById("main-tool-list"),
  filtersContainer: document.getElementById("filters"),
  searchInput: document.getElementById("searchInput"),
  sortSelect: document.getElementById("sortSelect"),
  scrollToTopBtn: document.getElementById("scrollToTopBtn"),
  darkToggle: document.getElementById("darkToggle"),
  imageModal: document.getElementById("imageModal"),
  autocompleteBox: document.getElementById("autocompleteBox"),
  offersList: document.getElementById("offers-list"),
  recommendedList: document.getElementById("recommended-list"),
  limitedList: document.getElementById("limited-list"),
  offersSection: document.getElementById("offers-section"),
  recommendedSection: document.getElementById("recommended-section"),
  limitedSection: document.getElementById("limited-section")
};

// Validate DOM elements
const missingElements = Object.entries(DOM).filter(([key, element]) => !element);
if (missingElements.length > 0) {
  console.warn('Missing DOM elements:', missingElements.map(([key]) => key));
}

let allTools = [];

/* ----------  HELPERS  ---------- */
const debounce = (fn, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
};

const throttle = (fn, delay) => {
  let lastCall = 0;
  return (...args) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      fn(...args);
    }
  };
};

const escapeHTML = (s = "") => {
  if (typeof s !== 'string') return '';
  return s.replace(/&/g, "&amp;")
           .replace(/</g, "&lt;")
           .replace(/>/g, "&gt;")
           .replace(/"/g, "&quot;")
           .replace(/'/g, "&#x27;");
};

const nl2br = (txt = "") => {
  if (typeof txt !== 'string') return '';
  return txt.replace(/\n/g, "<br>");
};

const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleDateString();
  } catch {
    return 'Invalid Date';
  }
};

function highlightMatch(text, matches, key) {
  const m = matches?.find((x) => x.key === key);
  if (!m?.indices?.length) return escapeHTML(text);

  // Merge adjacent/overlapping ranges
  const merged = m.indices
    .sort((a, b) => a[0] - b[0])
    .reduce((acc, [s, e]) => {
      if (!acc.length || s > acc[acc.length - 1][1] + 1) {
        acc.push([s, e]);
      } else {
        acc[acc.length - 1][1] = Math.max(acc[acc.length - 1][1], e);
      }
      return acc;
    }, []);

  // Filter out runs shorter than the minimum length
  const MIN_RUN = 2;
  const goodRuns = merged.filter(([s, e]) => e - s + 1 >= MIN_RUN);

  // Build the highlighted string
  let out = "", last = 0;
  for (const [start, end] of goodRuns) {
    out += escapeHTML(text.slice(last, start));
    out += `<mark>${escapeHTML(text.slice(start, end + 1))}</mark>`;
    last = end + 1;
  }
  return out + escapeHTML(text.slice(last));
}

function getShortDescription(tool, query = "") {
  const raw =
    tool.description ||
    (tool.long_description
      ? tool.long_description.split("\n")[0] + "…"
      : "No description available.");
  return query ? highlightMatch(raw, query) : escapeHTML(raw);
}

/* ----------  LAZY‑IMAGE SYSTEM ---------- */
const imageObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach(({ target, isIntersecting }) => {
      if (isIntersecting && target.dataset.src) {
        target.src = target.dataset.src;
        target.removeAttribute('data-src');
        imageObserver.unobserve(target);
      }
    });
  },
  { 
    rootMargin: "50px",
    threshold: 0.1
  }
);

// Cleanup observer on page unload
window.addEventListener('beforeunload', () => {
  imageObserver.disconnect();
});

function smartImg(src, alt = "") {
  const safeSrc = isValidUrl(src) ? src : "assets/placeholder.jpg";
  const safeAlt = escapeHTML(alt || '');
  
  return `
    <img loading="lazy"
         data-src="${safeSrc}"
         src="assets/placeholder.jpg"
         alt="${safeAlt}"
         onerror="this.src='assets/placeholder.jpg'; this.onerror=null;"
         role="img"
         aria-label="${safeAlt}"
    >
  `.trim();
}

function activateLazyImages(root = document) {
  const images = root.querySelectorAll("img[data-src]");
  images.forEach((img) => {
    if (img.complete && img.naturalWidth > 0) {
      img.src = img.dataset.src;
      img.removeAttribute('data-src');
    } else {
      imageObserver.observe(img);
    }
  });
}

/* ----------  DARK MODE  ---------- */
class ThemeManager {
  constructor() {
    this.init();
    this.bindEvents();
  }
  
  init() {
    const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldUseDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
    
    if (shouldUseDark) {
      document.body.classList.add("dark");
    }
    
    if (DOM.darkToggle) {
      DOM.darkToggle.setAttribute("aria-label", "Toggle dark mode");
      DOM.darkToggle.setAttribute("title", "Toggle dark mode (D)");
      DOM.darkToggle.setAttribute("aria-pressed", shouldUseDark.toString());
    }
  }
  
  toggle() {
    const isDark = document.body.classList.contains("dark");
    
    if (isDark) {
      document.body.classList.remove("dark");
      localStorage.setItem(STORAGE_KEYS.THEME, "light");
    } else {
      document.body.classList.add("dark");
      localStorage.setItem(STORAGE_KEYS.THEME, "dark");
    }
    
    if (DOM.darkToggle) {
      DOM.darkToggle.setAttribute("aria-pressed", (!isDark).toString());
    }
  }
  
  bindEvents() {
    DOM.darkToggle?.addEventListener("click", () => this.toggle());
    
    document.addEventListener("keydown", (e) => {
      if (
        e.key.toLowerCase() === "d" &&
        !e.target.matches("input,textarea,[contenteditable]") &&
        !e.ctrlKey && !e.metaKey
      ) {
        e.preventDefault();
        this.toggle();
      }
    });
    
    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!localStorage.getItem(STORAGE_KEYS.THEME)) {
        if (e.matches) {
          document.body.classList.add("dark");
        } else {
          document.body.classList.remove("dark");
        }
        if (DOM.darkToggle) {
          DOM.darkToggle.setAttribute("aria-pressed", e.matches.toString());
        }
      }
    });
  }
}

// Initialize theme manager
const themeManager = new ThemeManager();


/* ----------  MOBILE OPTIMIZATION  ---------- */
class MobileOptimizer {
  constructor() {
    this.isMobile = this.detectMobile();
    this.applyOptimizations();
  }
  
  detectMobile() {
    return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || 
           window.innerWidth <= CONFIG.MOBILE_BREAKPOINT;
  }
  
  applyOptimizations() {
    if (this.isMobile) {
      document.documentElement.style.setProperty('--transition', '0.1s ease');
      // Disable hover effects on mobile
      document.body.classList.add('mobile-device');
    }
    
    // Add touch class for better touch handling
    if ('ontouchstart' in window) {
      document.body.classList.add('touch-device');
    }
  }
}

// Initialize mobile optimizer
const mobileOptimizer = new MobileOptimizer();

/* ----------  WILL-CHANGE OPTIMIZATION  ---------- */
class WillChangeOptimizer {
  constructor() {
    this.optimizeWillChange();
  }
  
  optimizeWillChange() {
    // Only apply will-change on hover for interactive elements
    const interactiveElements = document.querySelectorAll('.tool-card, .recommended-card, .tag, .filter-tags button, .logo');
    
    interactiveElements.forEach(element => {
      element.addEventListener('mouseenter', () => {
        if (!mobileOptimizer.isMobile) {
          element.style.willChange = 'transform';
        }
      });
      
      element.addEventListener('mouseleave', () => {
        element.style.willChange = 'auto';
      });
    });
  }
}

// Initialize will-change optimizer
const willChangeOptimizer = new WillChangeOptimizer();

/* --------------------------------------------------
     RENDER UTIL THAT WORKS FOR *ANY* CONTAINER
   -------------------------------------------------- */
function renderTools(list, target = DOM.container) {
  if (!target) return;
  
  target.className = "main-grid";

  if (!list.length) {
    target.innerHTML = "<p>No tools found.</p>";
    return;
  }

  // Build everything in a DocumentFragment for better performance
  const frag = document.createDocumentFragment();
  list.forEach((tool) => {
    const card = document.createElement("div");
    card.className = "tool-card fade-in";
    card.dataset.toolName = tool.name;

    let desc = highlightMatch(
      tool.description || "",
      tool._matches || [],
      "description"
    );
    desc = nl2br(desc);

    const name = highlightMatch(
      tool.name || "Unnamed",
      tool._matches || [],
      "name"
    );

    card.innerHTML = `
      <div class="tool-thumb-wrapper">
        ${getCardBadges(tool)}
        ${smartImg(tool.image || "assets/placeholder.jpg", tool.name).trim()}
      </div>
      <div class="tool-card-body">
        <h3 class="tool-title">${name}</h3>
        <p class="tool-desc">${desc}</p>
        <div class="tool-tags">
          ${(tool.tags || [])
            .map((t) => `<span class="tag">${escapeHTML(t)}</span>`)
            .join("")}
          ${tool.popular ? `<span class="tag">popular</span>` : ""}
          ${getRecentTags(tool)}
        </div>
      </div>`;
    frag.appendChild(card);
  });

  // Replace all children with one operation
  target.replaceChildren(frag);

  // Wire up lazy-loading
  activateLazyImages(target);
}

/* helper: render a list into any selector */
function renderInto(selector, list) {
  const el = document.querySelector(selector);
  if (el) renderTools(list, el);
}

/* ----------  LOAD DATA  ---------- */
class DataLoader {
  constructor() {
    this.cache = new Map();
    this.retryAttempts = 3;
  }
  
  async fetchWithRetry(url, attempts = this.retryAttempts) {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'max-age=300' // 5 minutes cache
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      if (attempts > 1) {
        console.warn(`Retrying fetch for ${url}, attempts left: ${attempts - 1}`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return this.fetchWithRetry(url, attempts - 1);
      }
      throw error;
    }
  }
  
  async loadData() {
    if (!DOM.container) {
      console.error('Main container not found');
      return;
    }
    
    DOM.container.className = "main-grid";
    DOM.container.innerHTML = '<div class="loading-spinner">Loading...</div>';
    
    try {
      const dataPromises = DATA_FILES.map(async (url) => {
        if (this.cache.has(url)) {
          return this.cache.get(url);
        }
        
        const data = await this.fetchWithRetry(url);
        this.cache.set(url, data);
        return data;
      });
      
      const results = await Promise.allSettled(dataPromises);
      
      const successfulResults = results
        .filter((result) => result.status === "fulfilled")
        .map((result) => result.value);
      
      const failedResults = results.filter((result) => result.status === "rejected");
      
      if (failedResults.length > 0) {
        console.warn('Some data files failed to load:', failedResults);
      }
      
      const merged = successfulResults.flat();
      
      // Deduplicate and validate tools
      const seen = new Set();
      allTools = merged.filter((tool) => {
        if (!tool || typeof tool !== 'object') return false;
        if (!tool.name || !tool.type) return false;
        
        const key = tool.name.toLowerCase().trim();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      
      console.log(`Loaded ${allTools.length} tools successfully`);
      
      generateFilterButtons();
      applyFiltersAndRender();
      applyURLHash();
      
    } catch (error) {
      console.error('Error loading data:', error);
      DOM.container.innerHTML = '<div class="error-message">Error loading data. Please try refreshing the page.</div>';
    }
  }
}

const dataLoader = new DataLoader();

// Main load function
async function loadData() {
  await dataLoader.loadData();
}

function renderOrHide(list, wrapper, section) {
  if (!wrapper || !section) return;
  
  if (list.length) {
    renderTools(list, wrapper);
    section.classList.remove("hidden");
  } else {
    section.classList.add("hidden");
  }
}

function populateSpecialSections() {
  const now = Date.now();

  /* OFFERS & DISCOUNTS */
  const offers = allTools.filter(t => {
    const hasKeyword = (t.keywords || []).includes("offer");
    const disc = t.discount && (!t.discount_expiry || new Date(t.discount_expiry) > now);
    const off  = t.offer    && (!t.offer_expiry    || new Date(t.offer_expiry)    > now);
    return hasKeyword || disc || off;
  });

  renderOrHide(offers, DOM.offersList, DOM.offersSection);

  /* RECOMMENDED */
  const recommended = allTools.filter(t =>
    (t.keywords || []).includes("recommended")
  );
  renderOrHide(recommended, DOM.recommendedList, DOM.recommendedSection);

  /* LIMITED‑TIME */
  const limited = allTools.filter(t =>
    (t.keywords || []).includes("limited") || t.stock === 1
  );
  renderOrHide(limited, DOM.limitedList, DOM.limitedSection);
}

/* allow clicking cards in the extra lists */
const specialLists = [DOM.offersList, DOM.recommendedList, DOM.limitedList];
specialLists.forEach(el => {
  el?.addEventListener("click", e => {
    const c = e.target.closest(".tool-card");
    if (!c) return;
    const tool = allTools.find(t => t.name === c.dataset.toolName);
    if (tool) showToolDetail(tool);
  });
});

/* =========  MOBILE SWIPE HINT  ========= */
function addSwipeHint(wrapperId) {
  const list = document.getElementById(wrapperId);
  const parent = list?.parentElement;
  if (!list || !parent) return;

  // Show the hint initially
  parent.classList.add("has-scroll-hint");

  // Hide after the user scrolls a bit (or after 6s as fallback)
  const hide = () => parent.classList.remove("has-scroll-hint");
  list.addEventListener(
    "scroll",
    () => {
      if (list.scrollLeft > 24) hide();
    },
    { passive: true }
  );

  setTimeout(hide, 6000); // Auto-fade in case they don't scroll
}

/* ========= APPLY SECTION SCRIPTS ========= */
function applySectionScripts() {
  const ids = ["offers-list", "recommended-list", "limited-list"];
  if (window.innerWidth > 480) {
    ids.forEach(addSwipeHint);
  }
}

// Run once on load
applySectionScripts();

// Re-run if the user resizes the window
window.addEventListener("resize", applySectionScripts);

/* ----------  SEARCH / FILTER / SORT  ---------- */
class SearchManager {
  constructor() {
    this.fuse = null;
    this.searchCache = new Map();
    this.initFuse();
  }
  
  initFuse() {
    if (typeof Fuse === 'undefined') {
      console.warn('Fuse.js not loaded, search will be limited');
      return;
    }
  }
  
  createFuseInstance() {
    if (!this.fuse || this.searchCache.size === 0) {
      const weightedList = this.getWeightedFuseList();
      this.fuse = new Fuse(weightedList, {
        includeScore: true,
        includeMatches: true,
        threshold: 0.3,
        distance: 100,
        ignoreLocation: true,
        minMatchCharLength: 2,
        keys: [
          { name: "name", weight: 1.0 },
          { name: "keywords", weight: 0.6 },
          { name: "tags", weight: 0.5 },
          { name: "description", weight: 0.3 },
          { name: "long_description", weight: 0.2 },
          { name: "type", weight: 0.1 },
          { name: "_boost", weight: 0.8 }
        ]
      });
    }
    return this.fuse;
  }
  
  getWeightedFuseList() {
    const recent = JSON.parse(localStorage.getItem(STORAGE_KEYS.RECENT) || "[]");
    return allTools.map((tool) => ({ 
      ...tool, 
      _boost: recent.filter((name) => name === tool.name).length 
    }));
  }
  
  search(query) {
    const trimmedQuery = query.trim();
    
    if (!trimmedQuery) {
      return allTools;
    }
    
    // Check cache first
    if (this.searchCache.has(trimmedQuery)) {
      return this.searchCache.get(trimmedQuery);
    }
    
    if (!this.fuse) {
      // Fallback to simple search if Fuse.js not available
      return this.simpleSearch(trimmedQuery);
    }
    
    const results = this.createFuseInstance()
      .search(trimmedQuery)
      .map(({ item, matches }) => ({ ...item, _matches: matches }));
    
    // Cache results (limit cache size)
    if (this.searchCache.size > 50) {
      const firstKey = this.searchCache.keys().next().value;
      this.searchCache.delete(firstKey);
    }
    this.searchCache.set(trimmedQuery, results);
    
    return results;
  }
  
  simpleSearch(query) {
    const lowerQuery = query.toLowerCase();
    return allTools.filter(tool => 
      tool.name?.toLowerCase().includes(lowerQuery) ||
      tool.description?.toLowerCase().includes(lowerQuery) ||
      tool.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }
}

const searchManager = new SearchManager();

function runSearch(raw = "") {
  sessionStorage.setItem(STORAGE_KEYS.SEARCH, raw);
  applyFiltersAndRender();
}

function applyFiltersAndRender() {
  const searchRaw = sessionStorage.getItem(STORAGE_KEYS.SEARCH) || "";
  const sortKey   = sessionStorage.getItem(STORAGE_KEYS.SORT)   || "name";
  const typeKey   = sessionStorage.getItem(STORAGE_KEYS.FILTER) || "all";

  // Hide special sections when filtering anything but "all"
  if (typeKey !== "all") {
    DOM.offersSection?.classList.add("hidden");
    DOM.recommendedSection?.classList.add("hidden");
    DOM.limitedSection?.classList.add("hidden");
  } else {
    DOM.offersSection?.classList.remove("hidden");
    DOM.recommendedSection?.classList.remove("hidden");
    DOM.limitedSection?.classList.remove("hidden");
  }

  let list = [...allTools];
  if (typeKey !== "all")
    list = list.filter(
      (t) => (t.type || "").toLowerCase() === typeKey
    );

  if (searchRaw.trim()) {
    list = searchManager.search(searchRaw.trim());
  }

  switch (sortKey) {
    case "release_date":
      list.sort(
        (a, b) =>
          new Date(b.release_date) - new Date(a.release_date)
      );
      break;
    case "update_date":
      list.sort(
        (a, b) =>
          new Date(b.update_date) - new Date(a.update_date)
      );
      break;
    case "discount": {
      const now = Date.now();
      list = list
        .filter(
          (t) =>
            (t.discount &&
              (!t.discount_expiry ||
                new Date(t.discount_expiry) > now)) ||
            (t.offer &&
              (!t.offer_expiry ||
                new Date(t.offer_expiry) > now))
        )
        .sort(
          (a, b) =>
            (parseFloat(b.discount) || 0) -
            (parseFloat(a.discount) || 0)
        );
      break;
    }
    default: {
      const wk = 6048e5,
        now = Date.now();
      list.sort((a, b) => {
        const ar =
          now - new Date(a.release_date) < wk ||
          now - new Date(a.update_date) < wk;
        const br =
          now - new Date(b.release_date) < wk ||
          now - new Date(b.update_date) < wk;
        if (ar !== br) return br - ar;
        return (a.name || "").localeCompare(b.name || "");
      });
    }
  }

  renderTools(list);

  document
    .querySelectorAll("#filters button")
    .forEach((b) =>
      b.classList.toggle(
        "active",
        b.textContent.toLowerCase() === typeKey
      )
    );
  if (DOM.searchInput) DOM.searchInput.value = searchRaw;
  if (DOM.sortSelect) DOM.sortSelect.value = sortKey;

  // Dynamically hide or show special sections
  if (typeKey === "all") {
    populateSpecialSections();
  }
}

/* ----------  BADGE HELPERS & CARD MARKUP ---------- */
function getCardBadges(tool) {
  const now = new Date();
  const offerEnd    = tool.offer_expiry    ? new Date(tool.offer_expiry)    : null;
  const discountEnd = tool.discount_expiry ? new Date(tool.discount_expiry) : null;

  const isOffer    = tool.offer    && (!offerEnd    || offerEnd    > now);
  const isDiscount = tool.discount && (!discountEnd || discountEnd > now);
  const isNumeric  = !isNaN(parseFloat(tool.discount));

  const out = [];
  if (isDiscount) {
    if (isNumeric) {
      out.push(`<span class="tool-badge discount-badge">-${tool.discount}%</span>`);
      if (discountEnd) {
        const left = formatTimeRemaining(tool.discount_expiry);
        if (left) {
          out.push(
            `<span class="tool-badge discount-badge" data-expiry="${tool.discount_expiry}">
              ${left}
            </span>`
          );
        }
      }
    } else {
      out.push(`<span class="tool-badge discount-badge">${escapeHTML(tool.discount)}</span>`);
    }
  }
  if (isOffer) out.push(`<span class="tool-badge offer-badge">${escapeHTML(tool.offer)}</span>`);
  return out.join("");
}

/* ----------  MAIN LIST CLICK‑THROUGH ---------- */
DOM.container?.addEventListener("click", e => {
  const card = e.target.closest(".tool-card");
  if (!card) return;
  const tool = allTools.find(t => t.name === card.dataset.toolName);
  if (tool) showToolDetail(tool);
});

/* ----------  FILTER BUTTONS ---------- */
function generateFilterButtons() {
  if (!DOM.filtersContainer) return;
  const types = [...new Set(
    allTools.map(t => (t.type || "").toLowerCase()).filter(Boolean)
  )];
  DOM.filtersContainer.innerHTML = "";
  DOM.filtersContainer.appendChild(createFilterBtn("All"));
  types.forEach(t => DOM.filtersContainer.appendChild(createFilterBtn(t)));
}

function createFilterBtn(label) {
  const b = document.createElement("button");
  b.textContent = label.charAt(0).toUpperCase() + label.slice(1);
  b.addEventListener("click", () => {
    sessionStorage.setItem(STORAGE_KEYS.FILTER, label.toLowerCase());
    applyFiltersAndRender();
  });
  return b;
}

/* ----------  DETAIL VIEW ---------- */
function swapMainImage(thumb) {
  const main = document.querySelector('.tool-main-img');
  if (!main) return;

  const src = thumb.dataset.src || thumb.src;
  main.src = src;
  main.dataset.src = src;

  document.querySelectorAll('.tool-gallery img')
          .forEach(i => i.classList.remove('active'));
  thumb.classList.add('active');
}

function showToolDetail(tool, initial = false) {
  if (!initial) {
    location.hash = `tool=${encodeURIComponent(tool.name)}`;
    document.body.classList.add('detail-mode');
  }

  // Hide special sections
  document.getElementById("offers-section")?.classList.add("hidden");
  document.getElementById("recommended-section")?.classList.add("hidden");
  document.getElementById("limited-section")?.classList.add("hidden");

  DOM.container.className = 'detail-wrapper';
  DOM.container.innerHTML = `
    <div class="tool-detail fade-in">
      <div class="tool-detail-top">
        <button class="back-btn" onclick="clearHash()">← Back</button>
        <h2>${escapeHTML(tool.name)} ${getBadges(tool)}</h2>
      </div>

      <div class="tool-detail-content">
        <div class="tool-detail-left">
          ${smartImg(tool.image || 'assets/placeholder.jpg', tool.name)
             .replace('<img ', '<img class="tool-main-img" onclick="openImageModal(this.src)" ')}
          <div class="tool-gallery">
            ${(tool.images || []).map(img => smartImg(img, 'gallery')).join('')}
          </div>
          ${tool.video ? `<iframe src="${tool.video}" class="tool-video" allowfullscreen></iframe>` : ''}
        </div>

        <div class="tool-detail-right">
          <div class="tool-info">
            <p class="desc"><strong>Description:</strong><br>${escapeHTML(
              tool.long_description || tool.description || 'No description available.'
            ).replace(/\n/g, "<br>")}</p><br>

            ${renderPricing(tool)}
            ${tool.discount       ? `<p><strong>Discount:</strong> ${tool.discount}%</p><br>` : ''}
            ${tool.offer_expiry   ? `<p>⏳ Offer ends in ${daysLeft(tool.offer_expiry)} days</p><br>` : ''}
            <p><strong>Stock:</strong><br>${getStockStatus(tool.stock)}</p><br>
            <p><strong>Released:</strong><br>${escapeHTML(tool.release_date || 'N/A')}</p><br>
            <p><strong>Updated:</strong><br>${escapeHTML(tool.update_date  || 'N/A')}</p><br>

            <div style="display:flex;gap:1rem;flex-wrap:wrap;">
              <a href="${getContactLink(tool.contact)}" target="_blank" class="contact-btn">💬 Contact</a>
              <button class="requirements-btn" onclick="showRequirementsPopup('${escapeHTML(tool.name)}')">
                Requirements
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    ${renderRecommendations(tool)}
  `;

  // Force load images in the detail view
  const mainImg = document.querySelector('.tool-main-img');
  const galleryImgs = document.querySelectorAll('.tool-gallery img');
  if (mainImg && mainImg.dataset.src) mainImg.src = mainImg.dataset.src;

  galleryImgs.forEach(img => {
    if (img.dataset.src) img.src = img.dataset.src;
    img.style.cursor = 'pointer';
    img.addEventListener('click', () => swapMainImage(img));
  });

  // Scroll the detail card into view
  setTimeout(() => {
    const detail = document.querySelector('.tool-detail');
    if (detail) window.scrollTo({ top: detail.getBoundingClientRect().top + window.scrollY - 100 });
  }, 0);
}

function clearHash() {
  document.body.classList.remove("detail-mode");
  location.hash = "";
  window.scrollTo(0, 0);

  // Show special sections
  document.getElementById("offers-section")?.classList.remove("hidden");
  document.getElementById("recommended-section")?.classList.remove("hidden");
  document.getElementById("limited-section")?.classList.remove("hidden");

  applyFiltersAndRender();
}

/* ----------  HASH UTILS ---------- */
function applyURLHash() {
  const h = decodeURIComponent(location.hash).replace("#", "");
  if (h.startsWith("tool=")) {
    const name = h.slice(5).toLowerCase();
    const tool = allTools.find((t) => (t.name || "").toLowerCase() === name);
    if (tool) showToolDetail(tool, true);
  }
}

/* ----------  MISC UTILITIES ---------- */
function getRecentTags(t) {
  const now = Date.now(), wk = 6048e5;
  const tags = [];
  if (now - new Date(t.release_date) < wk) tags.push('<span class="tag">new</span>');
  if (now - new Date(t.update_date)  < wk) tags.push('<span class="tag">updated</span>');
  return tags.join(" ");
}
const getStockStatus = (v) =>
  typeof v === "number"
    ? v === 0
      ? "Not in stock"
      : `${v} in stock`
    : typeof v === "string"
    ? { unlimited: "Unlimited", "very limited": "Very limited" }[v.toLowerCase()] || v
    : "Need to contact owner";

function formatTimeRemaining(dateStr) {
  const diff = new Date(dateStr) - new Date();
  if (diff <= 0) return null;
  const m = Math.floor(diff / 60000),
    d = Math.floor(m / 1440),
    h = Math.floor((m % 1440) / 60),
    mins = m % 60;
  return `⏳ ${d ? d + "d " : ""}${h ? h + "h " : ""}${mins}m left`.trim();
}

function getBadges(tool) {
  const now = Date.now(),
    wk = 6048e5,
    offerEnd = tool.offer_expiry && new Date(tool.offer_expiry),
    discEnd = tool.discount_expiry && new Date(tool.discount_expiry);

  const out = [];
  if (now - new Date(tool.release_date) < wk) out.push('<span class="badge new-badge">NEW</span>');
  if (now - new Date(tool.update_date)  < wk) out.push('<span class="badge updated-badge">UPDATED</span>');

  const discActive = tool.discount && (!discEnd || discEnd > now);
  if (discActive) {
    const numeric = !isNaN(parseFloat(tool.discount));
    const lbl = numeric ? `-${tool.discount}%` : escapeHTML(tool.discount);
    out.push(`<span class="badge discount-badge">${lbl}</span>`);
    if (numeric && discEnd) {
      const c = formatTimeRemaining(tool.discount_expiry);
      if (c) out.push(`<span class="badge discount-badge">${c}</span>`);
    }
  }
  const offerActive = tool.offer && (!offerEnd || offerEnd > now);
  if (offerActive) out.push(`<span class="badge offer-badge">${escapeHTML(tool.offer)}</span>`);
  return out.sort((a, b) => (a.includes("NEW") ? -1 : b.includes("NEW") ? 1 : 0)).join("");
}

const daysLeft = (d) => Math.max(0, Math.ceil((new Date(d) - new Date()) / 864e5));

const getContactLink = (t) =>
  ({ telegram: "https://t.me/fmpChatBot", discord: "https://discord.gg/kfJfP3aNwC", email: "mailto:flamemodparadiscord@gmail.com" }[
    t?.toLowerCase()
  ] || "#");

function renderPricing(tool) {
  if (tool.pricing) {
    const li = Object.entries(tool.pricing)
      .map(([k, v]) => `<li>${escapeHTML(k)}: ${escapeHTML(v)}</li>`)
      .join("");
    return `<p><strong>Pricing:</strong></p><ul class="pricing-list">${li}</ul><br>`;
  }
  if (tool.price)
    return `<p><strong>Price:</strong><br>${escapeHTML(tool.price).replace(/\n/g, "<br>")}</p><br>`;
  return "";
}

function renderRecommendations(tool) {
  const rec = allTools
    .filter((t) => t.name !== tool.name && (t.type || "").toLowerCase() === (tool.type || "").toLowerCase())
    .slice(0, 5);
  if (!rec.length) return "";
  return `
    <section class="recommended-section fade-in">
      <h3>You may also like</h3>
      <div class="recommended-grid">
        ${rec
          .map(
            (r) => `
          <div class="recommended-card" onclick='location.hash="tool=${encodeURIComponent(r.name)}"'>
            <div class="recommended-image">
              <img src="${r.image || 'assets/placeholder.jpg'}"
                   alt="${escapeHTML(r.name)}"
                   loading="lazy">
            </div>
            <div class="recommended-content">
              <h4>${escapeHTML(r.name)}</h4>
              <p>${escapeHTML((r.description || r.long_description || "")
                .split("\n")[0] || "No description")}</p>
            </div>
          </div>`
          )
          .join("")}
      </div>
    </section>`;
}

/* ----------  REQUIREMENTS POPUP ---------- */
function showRequirementsPopup(name) {
  const box = document.getElementById("popupMessage"),
    txt = document.getElementById("popupText");
  const tool = allTools.find((t) => t.name === name);
  let msg =
    tool?.requirements || `Requirements for ${name}…\n\nPlease contact the owner.`;
  txt.innerHTML = escapeHTML(msg).replace(/\n/g, "<br>");
  box.classList.remove("hidden");
  setTimeout(() => box.classList.add("hidden"), 4000);
}

/* ----------  AUTOCOMPLETE ---------- */
class AutocompleteManager {
  constructor() {
    this.selectedIndex = -1;
    this.autocompleteCache = new Map();
  }
  
  addToRecents(name) {
    const recent = JSON.parse(localStorage.getItem(STORAGE_KEYS.RECENT) || "[]");
    const updated = [name, ...recent.filter((x) => x !== name)].slice(0, CONFIG.MAX_RECENTS);
    localStorage.setItem(STORAGE_KEYS.RECENT, JSON.stringify(updated));
    
    // Clear search cache when recents change
    searchManager.searchCache.clear();
  }
  
  getRecentSearches() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.RECENT) || "[]");
  }
  
  searchAutocomplete(query) {
    if (query.length < 2) return [];
    
    // Check cache
    if (this.autocompleteCache.has(query)) {
      return this.autocompleteCache.get(query);
    }
    
    const fuse = new Fuse(allTools, {
      includeScore: true,
      includeMatches: true,
      threshold: 0.4,
      ignoreLocation: true,
      minMatchCharLength: 2,
      keys: [
        { name: "name", weight: 0.4 },
        { name: "keywords", weight: 0.3 },
        { name: "tags", weight: 0.1 },
        { name: "type", weight: 0.1 },
        { name: "description", weight: 0.3 },
        { name: "long_description", weight: 0.2 }
      ]
    });
    
    const results = fuse.search(query).slice(0, 3);
    
    // Cache results
    if (this.autocompleteCache.size > 20) {
      const firstKey = this.autocompleteCache.keys().next().value;
      this.autocompleteCache.delete(firstKey);
    }
    this.autocompleteCache.set(query, results);
    
    return results;
  }
}

const autocompleteManager = new AutocompleteManager();
const updateSelectedItem = (items) => {
  items.forEach((el, i) => el.classList.toggle("selected", i === autocompleteManager.selectedIndex));
};

const renderAutocomplete = (results) => {
  if (!DOM.autocompleteBox) return;
  
  DOM.autocompleteBox.innerHTML = results
    .map(({ item }) => `<div data-name="${escapeHTML(item.name)}" role="option">${escapeHTML(item.name)}</div>`)
    .join("");
  
  DOM.autocompleteBox.classList.remove("hidden");
  DOM.autocompleteBox.setAttribute('aria-expanded', 'true');
  autocompleteManager.selectedIndex = -1;
  
  // Use event delegation for better performance
  DOM.autocompleteBox.querySelectorAll("div").forEach((item) => {
    item.addEventListener("mousedown", (e) => {
      e.preventDefault();
      selectAutocompleteItem(item.dataset.name);
    });
  });
};

const showRecentSearches = () => {
  if (!DOM.autocompleteBox) return;
  
  const recent = autocompleteManager.getRecentSearches();
  if (!recent.length) return;
  
  DOM.autocompleteBox.innerHTML = recent
    .map((name) => `<div data-name="${escapeHTML(name)}" role="option">${escapeHTML(name)}</div>`)
    .join("");
  
  DOM.autocompleteBox.classList.remove("hidden");
  DOM.autocompleteBox.setAttribute('aria-expanded', 'true');
  autocompleteManager.selectedIndex = -1;
  
  DOM.autocompleteBox.querySelectorAll("div").forEach((item) => {
    item.addEventListener("mousedown", (e) => {
      e.preventDefault();
      selectAutocompleteItem(item.dataset.name, true);
    });
  });
};

const selectAutocompleteItem = (name, isRecent = false) => {
  if (isRecent) {
    autocompleteManager.addToRecents(name);
    DOM.searchInput.value = name;
    sessionStorage.setItem(STORAGE_KEYS.SEARCH, name);
  } else {
    runSearch(name);
  }
  
  DOM.autocompleteBox.classList.add("hidden");
  DOM.autocompleteBox.setAttribute('aria-expanded', 'false');
};

const debouncedSearch = debounce(runSearch, CONFIG.SEARCH_DEBOUNCE);

DOM.searchInput?.addEventListener("input", () => {
  const query = DOM.searchInput.value.trim();
  
  if (!query) {
    DOM.autocompleteBox?.classList.add("hidden");
    DOM.autocompleteBox?.setAttribute('aria-expanded', 'false');
    debouncedSearch("");
    return;
  }

  // Only show autocomplete for longer queries
  if (query.length < 2) {
    DOM.autocompleteBox?.classList.add("hidden");
    DOM.autocompleteBox?.setAttribute('aria-expanded', 'false');
    debouncedSearch(query);
    return;
  }

  const results = autocompleteManager.searchAutocomplete(query);
  
  if (results.length) {
    renderAutocomplete(results);
  } else {
    DOM.autocompleteBox?.classList.add("hidden");
    DOM.autocompleteBox?.setAttribute('aria-expanded', 'false');
  }
  
  debouncedSearch(query);
});

DOM.searchInput?.addEventListener("keydown", (e) => {
  const items = DOM.autocompleteBox?.querySelectorAll("div");
  if (!items?.length) return;

  switch (e.key) {
    case "ArrowDown":
      e.preventDefault();
      autocompleteManager.selectedIndex = (autocompleteManager.selectedIndex + 1) % items.length;
      updateSelectedItem(items);
      break;
      
    case "ArrowUp":
      e.preventDefault();
      autocompleteManager.selectedIndex = (autocompleteManager.selectedIndex - 1 + items.length) % items.length;
      updateSelectedItem(items);
      break;
      
    case "Enter":
      e.preventDefault();
      if (autocompleteManager.selectedIndex !== -1) {
        items[autocompleteManager.selectedIndex].dispatchEvent(new Event("mousedown"));
      } else {
        debouncedSearch(DOM.searchInput.value);
      }
      DOM.autocompleteBox?.classList.add("hidden");
      DOM.autocompleteBox?.setAttribute('aria-expanded', 'false');
      break;
      
    case "Escape":
      DOM.autocompleteBox?.classList.add("hidden");
      DOM.autocompleteBox?.setAttribute('aria-expanded', 'false');
      break;
  }
});

DOM.searchInput?.addEventListener("focus", () => {
  if (!DOM.searchInput.value.trim()) {
    showRecentSearches();
  }
});

DOM.searchInput?.addEventListener("blur", () => { 
  setTimeout(() => {
    DOM.autocompleteBox?.classList.add("hidden");
    DOM.autocompleteBox?.setAttribute('aria-expanded', 'false');
  }, 150);
});

/* ================= LIVE COUNTDOWN ================= */
class CountdownManager {
  constructor() {
    this.updateInterval = null;
    this.start();
  }
  
  start() {
    this.updateInterval = setInterval(() => this.updateBadges(), CONFIG.BADGE_UPDATE_INTERVAL);
  }
  
  stop() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }
  
  updateBadges() {
    const now = Date.now();
    const expiryElements = document.querySelectorAll("[data-expiry]");
    
    expiryElements.forEach((element) => {
      const expiry = Date.parse(element.dataset.expiry);
      if (isNaN(expiry)) {
        element.remove();
        return;
      }
      
      const diff = expiry - now;
      if (diff <= 0) {
        element.remove();
        return;
      }
      
      const timeRemaining = formatTimeRemaining(element.dataset.expiry);
      if (timeRemaining) {
        element.textContent = timeRemaining;
      } else {
        element.remove();
      }
    });
  }
}

const countdownManager = new CountdownManager();

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  countdownManager.stop();
});

/* ----------  HASH & MODAL ---------- */
window.addEventListener("hashchange", applyURLHash);

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeImageModal();
});

DOM.imageModal?.addEventListener("click", (e) => {
  if (e.target === DOM.imageModal) closeImageModal();
});
function openImageModal(src) {
  const modal = document.getElementById("imageModal");
  const modalImg = document.getElementById("modalImage");
  if (modal && modalImg) {
    modalImg.src = src;
    modal.classList.remove("hidden");
  }
}
function closeImageModal() {
  const modal = document.getElementById("imageModal");
  if (modal) modal.classList.add("hidden");
}

/* ----------  SORT SELECT ---------- */
DOM.sortSelect?.addEventListener("change", () => {
  sessionStorage.setItem(STORAGE_KEYS.SORT, DOM.sortSelect.value);
  applyFiltersAndRender();
});

/* ----------  SCROLL PROGRESS ---------- */
class ScrollProgressManager {
  constructor() {
    this.scrollProgress = document.getElementById("scrollProgress");
    this.throttledUpdate = throttle(() => this.updateProgress(), CONFIG.SCROLL_DEBOUNCE);
    this.bindEvents();
  }
  
  bindEvents() {
    if (!this.scrollProgress) return;
    
    document.addEventListener("scroll", this.throttledUpdate, { passive: true });
  }
  
  updateProgress() {
    if (!this.scrollProgress) return;
    
    const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrollPercentage = Math.min((scrollTop / scrollHeight) * 100, 100);
    
    this.scrollProgress.style.width = `${scrollPercentage}%`;
  }
}

const scrollProgressManager = new ScrollProgressManager();

/* ----------  SCROLL TO TOP ---------- */
class ScrollToTopManager {
  constructor() {
    this.scrollToTopBtn = DOM.scrollToTopBtn;
    this.throttledUpdate = throttle(() => this.updateVisibility(), CONFIG.SCROLL_DEBOUNCE);
    this.bindEvents();
  }
  
  bindEvents() {
    if (!this.scrollToTopBtn) return;
    
    window.addEventListener("scroll", this.throttledUpdate, { passive: true });
    
    this.scrollToTopBtn.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }
  
  updateVisibility() {
    if (!this.scrollToTopBtn) return;
    
    if (window.scrollY > 300) {
      this.scrollToTopBtn.classList.add("show");
    } else {
      this.scrollToTopBtn.classList.remove("show");
    }
  }
}

const scrollToTopManager = new ScrollToTopManager();

// Scroll to top functionality is now handled by ScrollToTopManager

/* ----------  INITIALIZATION ---------- */
document.addEventListener('DOMContentLoaded', () => {
  // Initialize the application
  if (DOM.container) {
    loadData();
  } else {
    console.error('Main container not found. Application cannot initialize.');
  }
});

// Smooth scrolling for internal links
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener("click", function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute("href"));
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });
});