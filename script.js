// ================ MAIN APP NAMESPACE ================
const FMP = {
  // Mobile Navbar Component
  Navbar: {
    toggle: null,
    menu: null,
    init() {
      this.toggle = document.getElementById('navbarToggle');
      this.menu = document.getElementById('navbarMenu');
      if (!this.toggle || !this.menu) return;
      this.bindEvents();
    },
    bindEvents() {
      this.toggle.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
        this.toggleMobileMenu();
  });
  
      const menuLinks = this.menu.querySelectorAll('a, button');
  menuLinks.forEach(link => {
        link.addEventListener('click', () => {
          if (this.menu.classList.contains('show-menu')) {
            this.toggleMobileMenu();
      }
    });
  });
  
      document.addEventListener('click', (e) => {
        if (this.menu.classList.contains('show-menu') && 
            !this.toggle.contains(e.target) && 
            !this.menu.contains(e.target)) {
          this.toggleMobileMenu();
        }
      });
      
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.menu.classList.contains('show-menu')) {
          this.toggleMobileMenu();
        }
      });
      
  let resizeTimer;
      window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
          if (window.innerWidth > 768 && this.menu.classList.contains('show-menu')) {
            this.toggleMobileMenu();
      }
    }, 250);
  });
    },
    toggleMobileMenu() {
      const isOpen = this.menu.classList.contains('show-menu');
      if (isOpen) {
        this.menu.classList.remove('show-menu');
        this.toggle.innerHTML = '☰';
        this.toggle.setAttribute('aria-label', 'Open menu');
        document.body.style.overflow = '';
      } else {
        this.menu.classList.add('show-menu');
        this.toggle.innerHTML = '✕';
        this.toggle.setAttribute('aria-label', 'Close menu');
        document.body.style.overflow = 'hidden';
      }
    }
  }
};

/* === CSS PATCHES (auto‑injected) === */
(() => {
  const css = `
:focus-visible{outline:2px solid var(--color-primary);outline-offset:2px;}
@keyframes pulse{0%,100%{opacity:.6}50%{opacity:1}}
.tool-thumb-wrapper{aspect-ratio:16/9;position:relative;}
.tool-thumb-wrapper img{object-fit:cover;width:100%;height:100%;}
`;
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);
})();

// App Configuration & State
FMP.Config = {
  DATA_FILES: [
    "data/tools.json", "data/bots.json", "data/checkers.json", "data/game.json",
    "data/others.json", "data/cookies.json", "data/methods.json", "data/membership.json"
  ],
  KEYS: {
    THEME: "theme",
    SEARCH: "search", 
    SORT: "sort",
    FILTER: "filter",
    RECENT: "recentSearches"
  },
  MAX_RECENTS: 5
};

FMP.State = {
  allTools: [],
  DOM: {
    container: null,
    filtersContainer: null,
    searchInput: null,
    sortSelect: null,
    scrollToTopBtn: null,
    darkToggle: null,
    imageModal: null,
    autocompleteBox: null,
  },
  init() {
    // Cache DOM references
    this.DOM.container = document.getElementById("main-tool-list");
    this.DOM.filtersContainer = document.getElementById("filters");
    this.DOM.searchInput = document.getElementById("searchInput");
    this.DOM.sortSelect = document.getElementById("sortSelect");
    this.DOM.scrollToTopBtn = document.getElementById("scrollToTopBtn");
    this.DOM.darkToggle = document.getElementById("darkToggle");
    this.DOM.imageModal = document.getElementById("imageModal");
    this.DOM.autocompleteBox = document.getElementById("autocompleteBox");
  }
};

// Utility Functions
FMP.Utils = {
  debounce(fn, delay) {
  let t;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), delay);
  };
  },

  escapeHTML(s = "") {
    return s.replace(/&/g, "&amp;")
   .replace(/</g, "&lt;")
   .replace(/>/g, "&gt;")
   .replace(/"/g, "&quot;");
  },
  
  nl2br(txt = "") {
    return txt.replace(/\n/g, "<br>");
  },
  
  formatTimeRemaining(dateStr) {
    const diff = new Date(dateStr) - new Date();
    if (diff <= 0) return null;
    const m = Math.floor(diff / 60000);
    const d = Math.floor(m / 1440);
    const h = Math.floor((m % 1440) / 60);
    const mins = m % 60;
    return `⏳ ${d ? d + "d " : ""}${h ? h + "h " : ""}${mins}m left`.trim();
  }
};

FMP.Utils.highlightMatch = function(text, matches, key) {
  const m = matches?.find((x) => x.key === key);
  if (!m?.indices?.length) return FMP.Utils.escapeHTML(text);

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
    out += FMP.Utils.escapeHTML(text.slice(last, start));
    out += `<mark>${FMP.Utils.escapeHTML(text.slice(start, end + 1))}</mark>`;
    last = end + 1;
  }
  return out + FMP.Utils.escapeHTML(text.slice(last));
};

FMP.Utils.getShortDescription = function(tool, query = "") {
  const raw = tool.description || 
    (tool.long_description ? tool.long_description.split("\n")[0] + "…" : "No description available.");
  return query ? FMP.Utils.highlightMatch(raw, query) : FMP.Utils.escapeHTML(raw);
};

// Lazy Image System
FMP.LazyImages = {
  observer: null,
  
  init() {
    const isMobile = window.innerWidth <= 768;
    const rootMargin = isMobile ? "200px" : "50px"; // Larger margin for mobile for faster loading
    
    this.observer = new IntersectionObserver(
  (entries) => {
    entries.forEach(({ target, isIntersecting }) => {
      if (isIntersecting) {
        target.src = target.dataset.src;
            this.observer.unobserve(target);
      }
    });
  },
      { 
        rootMargin: rootMargin,
        threshold: isMobile ? 0 : 0.1 // Lower threshold for mobile
      }
    );
  },
  
  smartImg(src, alt = "") {
    const isMobile = window.innerWidth <= 768;
    const loadingStrategy = isMobile ? "eager" : "lazy";
    return `<img loading="${loadingStrategy}" data-src="${src}" src="assets/placeholder.jpg" alt="${FMP.Utils.escapeHTML(alt)}" onerror="this.src='assets/placeholder.jpg'">`;
  },
  
  activate(root = document) {
    const isMobile = window.innerWidth <= 768;
  const images = root.querySelectorAll("img[data-src]");
    
  images.forEach((img) => {
    if (img.complete && img.naturalWidth > 0) {
      img.src = img.dataset.src;
    } else {
        // On mobile, preload images more aggressively
        if (isMobile) {
          img.loading = 'eager';
          img.decoding = 'async';
        }
        this.observer.observe(img);
    }
  });
}
};

// Dark Mode Component
FMP.DarkMode = {
  init() {
    const toggle = FMP.State.DOM.darkToggle;
    if (!toggle) return;
    
    toggle.setAttribute("aria-label", "Toggle dark mode");
    toggle.setAttribute("title", "Toggle dark mode (D)");
    toggle.addEventListener("click", () => this.toggle());
    
    // Load saved theme
    if (localStorage.getItem(FMP.Config.KEYS.THEME) === "dark") {
  document.body.classList.add("dark");
}

    // Keyboard shortcut
document.addEventListener("keydown", (e) => {
      if (e.key.toLowerCase() === "d" && !e.target.matches("input,textarea,[contenteditable]")) {
        toggle?.click();
      }
    });
  },
  
  toggle() {
    // Disable transitions temporarily for instant toggle on mobile
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
      document.documentElement.style.setProperty('--transition', '0ms');
      document.documentElement.style.setProperty('--transition-fast', '0ms');
    }
    
    document.body.classList.toggle("dark");
    localStorage.setItem(
      FMP.Config.KEYS.THEME,
      document.body.classList.contains("dark") ? "dark" : "light"
    );
    
    // Re-enable transitions after a short delay on mobile
    if (isMobile) {
      setTimeout(() => {
        document.documentElement.style.removeProperty('--transition');
        document.documentElement.style.removeProperty('--transition-fast');
      }, 100);
    }
  }
};


// Mobile Optimization
FMP.Mobile = {
  init() {
    const isMobile = window.innerWidth <= 768 || /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    
    if (isMobile) {
      // Disable all animations and transitions for maximum performance
      document.documentElement.style.setProperty('--transition', '0ms');
      document.documentElement.style.setProperty('--transition-fast', '0ms');
      
      // Optimize scrolling
      document.body.style.scrollBehavior = 'auto';
      
      // Reduce DOM complexity
      this.optimizeForMobile();
    }
  },
  
  optimizeForMobile() {
    // Remove unnecessary DOM elements for mobile
    const elementsToOptimize = [
      '.tool-card::before',
      '.tool-card::after'
    ];
    
    // Disable expensive CSS effects
    const style = document.createElement('style');
    style.textContent = `
      @media (max-width: 768px) {
        .tool-card::before,
        .tool-card::after {
          display: none !important;
        }
        
        * {
          transition: none !important;
          animation: none !important;
        }
      }
    `;
    document.head.appendChild(style);
    
    // Optimize images for faster loading
    const images = document.querySelectorAll('img[data-src]');
    images.forEach(img => {
      img.loading = 'eager';
      img.decoding = 'async';
    });
  }
};

// Render System
FMP.Render = {
  renderTools(list, target = FMP.State.DOM.container) {
  if (!target) return;
  
    target.className = "fmp-main-grid main-grid";
  if (!list.length) {
    target.innerHTML = "<p>No tools found.</p>";
    return;
  }

  const frag = document.createDocumentFragment();
  list.forEach((tool) => {
    const card = document.createElement("div");
    card.className = "fmp-tool-card tool-card fade-in";
    card.dataset.toolName = tool.name;

      let desc = FMP.Utils.highlightMatch(tool.description || "", tool._matches || [], "description");
      desc = FMP.Utils.nl2br(desc);
      const name = FMP.Utils.highlightMatch(tool.name || "Unnamed", tool._matches || [], "name");

    card.innerHTML = `
      <div class="tool-thumb-wrapper">
          ${this.getCardBadges(tool)}
          ${FMP.LazyImages.smartImg(tool.image || "assets/placeholder.jpg", tool.name)}
      </div>
      <div class="tool-card-body">
        <h3 class="tool-title">${name}</h3>
        <p class="tool-desc">${desc}</p>
        <div class="tool-tags">
            ${(tool.tags || []).map((t) => `<span class="tag">${FMP.Utils.escapeHTML(t)}</span>`).join("")}
          ${tool.popular ? `<span class="tag">popular</span>` : ""}
            ${this.getRecentTags(tool)}
        </div>
      </div>`;
    frag.appendChild(card);
  });

  target.replaceChildren(frag);
    FMP.LazyImages.activate(target);
  },
  
  renderInto(selector, list) {
    const el = document.querySelector(selector);
    if (el) this.renderTools(list, el);
  },
  
  getCardBadges(tool) {
    const now = new Date();
    const offerEnd = tool.offer_expiry ? new Date(tool.offer_expiry) : null;
    const discountEnd = tool.discount_expiry ? new Date(tool.discount_expiry) : null;
    const isOffer = tool.offer && (!offerEnd || offerEnd > now);
    const isDiscount = tool.discount && (!discountEnd || discountEnd > now);
    const isNumeric = !isNaN(parseFloat(tool.discount));
    const out = [];
    
    if (isDiscount) {
      if (isNumeric) {
        // Remove any existing % sign and add our own
        const cleanDiscount = tool.discount.toString().replace(/%/g, '');
        out.push(`<span class="tool-badge discount-badge">-${cleanDiscount}%</span>`);
        if (discountEnd) {
          const left = FMP.Utils.formatTimeRemaining(tool.discount_expiry);
          if (left) {
            out.push(`<span class="tool-badge discount-badge" data-expiry="${tool.discount_expiry}">${left}</span>`);
          }
        }
      } else {
        out.push(`<span class="tool-badge discount-badge">${FMP.Utils.escapeHTML(tool.discount)}</span>`);
      }
    }
    if (isOffer) out.push(`<span class="tool-badge offer-badge">${FMP.Utils.escapeHTML(tool.offer)}</span>`);
    return out.join("");
  },
  
  getRecentTags(t) {
    const now = Date.now(), wk = 6048e5;
    const tags = [];
    if (now - new Date(t.release_date) < wk) tags.push('<span class="tag">new</span>');
    if (now - new Date(t.update_date) < wk) tags.push('<span class="tag">updated</span>');
    return tags.join(" ");
  }
};

// Data Management
FMP.Data = {
  async load() {
    if (!FMP.State.DOM.container) return;
    
    FMP.State.DOM.container.className = "fmp-main-grid main-grid";
    FMP.State.DOM.container.innerHTML = "<p>Loading...</p>";

  try {
    const data = await Promise.allSettled(
        FMP.Config.DATA_FILES.map((u) =>
        fetch(u).then((r) => (r.ok ? r.json() : Promise.reject(r.statusText)))
      )
    );

    const merged = data
      .filter((result) => result.status === "fulfilled")
      .flatMap((result) => result.value);

    const seen = new Set();
      FMP.State.allTools = merged.filter((t) => {
      if (!t.name || !t.type) return false;
      const k = t.name.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

      FMP.Filters.generateButtons();
      FMP.Search.applyFiltersAndRender();
  } catch (err) {
      FMP.State.DOM.container.innerHTML = "<p>Error loading data.</p>";
    }
  }
};



// Special Lists Event Handlers
FMP.SpecialLists = {
  init() {
    const specialLists = [];
specialLists.forEach(el => {
  el?.addEventListener("click", e => {
    const c = e.target.closest(".tool-card");
    if (!c) return;
        const tool = FMP.State.allTools.find(t => t.name === c.dataset.toolName);
    if (tool) showToolDetail(tool);
  });
});
  }
};

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
      // Remove any existing % sign and add our own
      const cleanDiscount = tool.discount.toString().replace(/%/g, '');
      out.push(`<span class="tool-badge discount-badge">-${cleanDiscount}%</span>`);
      if (discountEnd) {
        const left = FMP.Utils.formatTimeRemaining(tool.discount_expiry);
        if (left) {
          out.push(
            `<span class="tool-badge discount-badge" data-expiry="${tool.discount_expiry}">
              ${left}
            </span>`
          );
        }
      }
    } else {
      out.push(`<span class="tool-badge discount-badge">${FMP.Utils.escapeHTML(tool.discount)}</span>`);
    }
  }
  if (isOffer) out.push(`<span class="tool-badge offer-badge">${FMP.Utils.escapeHTML(tool.offer)}</span>`);
  return out.join("");
}

/* ----------  MAIN LIST CLICK‑THROUGH ---------- */
// Main container click handler
FMP.MainContainer = {
  init() {
    FMP.State.DOM.container?.addEventListener("click", e => {
  const card = e.target.closest(".tool-card");
  if (!card) return;
      const tool = FMP.State.allTools.find(t => t.name === card.dataset.toolName);
  if (tool) showToolDetail(tool);
});
  }
};

/* ----------  FILTER BUTTONS ---------- */
// Filter Buttons Component
FMP.Filters = {
  generateButtons() {
    if (!FMP.State.DOM.filtersContainer) return;
  const types = [...new Set(
      FMP.State.allTools.map(t => (t.type || "").toLowerCase()).filter(Boolean)
    )];
    FMP.State.DOM.filtersContainer.innerHTML = "";
    FMP.State.DOM.filtersContainer.appendChild(this.createButton("All"));
    types.forEach(t => FMP.State.DOM.filtersContainer.appendChild(this.createButton(t)));
  },
  
  createButton(label) {
  const b = document.createElement("button");
  b.textContent = label.charAt(0).toUpperCase() + label.slice(1);
  b.addEventListener("click", () => {
      sessionStorage.setItem(FMP.Config.KEYS.FILTER, label.toLowerCase());
      FMP.Search.applyFiltersAndRender();
  });
  return b;
}
};


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

  // Hide special sections (none remaining)

  FMP.State.DOM.container.className = 'detail-wrapper';
  FMP.State.DOM.container.innerHTML = `
    <div class="tool-detail fade-in">
      <div class="tool-detail-top">
        <button class="back-btn" onclick="clearHash()">← Back</button>
        <h2>${FMP.Utils.escapeHTML(tool.name)} ${getBadges(tool)}</h2>
      </div>

      <div class="tool-detail-content">
        <div class="tool-detail-left">
          ${FMP.LazyImages.smartImg(tool.image || 'assets/placeholder.jpg', tool.name)
             .replace('<img ', '<img class="tool-main-img" onclick="openImageModal(this.src)" ')}
          <div class="tool-gallery">
            ${(tool.images || []).map(img => FMP.LazyImages.smartImg(img, 'gallery')).join('')}
          </div>
          ${tool.video ? `<iframe src="${tool.video}" class="tool-video" allowfullscreen></iframe>` : ''}
        </div>

        <div class="tool-detail-right">
          <div class="tool-info">
            <p class="desc"><strong>Description:</strong><br>${FMP.Utils.escapeHTML(
              tool.long_description || tool.description || 'No description available.'
            ).replace(/\n/g, "<br>")}</p><br>

            ${renderPricing(tool)}
            ${tool.discount       ? `<p><strong>Discount:</strong> ${tool.discount}</p><br>` : ''}
            ${tool.offer_expiry   ? `<p>⏳ Offer ends in ${daysLeft(tool.offer_expiry)} days</p><br>` : ''}
            <p><strong>Stock:</strong><br>${getStockStatus(tool.stock)}</p><br>
            <p><strong>Released:</strong><br>${FMP.Utils.escapeHTML(tool.release_date || 'N/A')}</p><br>
            <p><strong>Updated:</strong><br>${FMP.Utils.escapeHTML(tool.update_date  || 'N/A')}</p><br>

            <div style="display:flex;gap:1rem;flex-wrap:wrap;">
              <a href="${getContactLink(tool.contact)}" target="_blank" class="contact-btn">💬 Contact</a>
              <button class="requirements-btn" onclick="showRequirementsPopup('${FMP.Utils.escapeHTML(tool.name)}')">
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

  // Show special sections (none remaining)

  applyFiltersAndRender();
}

/* ----------  HASH UTILS ---------- */
function applyURLHash() {
  const h = decodeURIComponent(location.hash).replace("#", "");
  if (h.startsWith("tool=")) {
    const name = h.slice(5).toLowerCase();
    const tool = FMP.State.allTools.find((t) => (t.name || "").toLowerCase() === name);
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
    if (numeric) {
      // Remove any existing % sign and add our own
      const cleanDiscount = tool.discount.toString().replace(/%/g, '');
      out.push(`<span class="badge discount-badge">-${cleanDiscount}%</span>`);
    } else {
      out.push(`<span class="badge discount-badge">${FMP.Utils.escapeHTML(tool.discount)}</span>`);
    }
    if (numeric && discEnd) {
      const c = formatTimeRemaining(tool.discount_expiry);
      if (c) out.push(`<span class="badge discount-badge">${c}</span>`);
    }
  }
  const offerActive = tool.offer && (!offerEnd || offerEnd > now);
  if (offerActive) out.push(`<span class="badge offer-badge">${FMP.Utils.escapeHTML(tool.offer)}</span>`);
  return out.sort((a, b) => (a.includes("NEW") ? -1 : b.includes("NEW") ? 1 : 0)).join("");
}

const daysLeft = (d) => Math.max(0, Math.ceil((new Date(d) - new Date()) / 864e5));

const getContactLink = (t) =>
  ({ telegram: "https://t.me/fmpChatBot", discord: "https://discord.gg/kfJfP3aNwC", email: "mailto:flamemodparadiscord@gmail.com" }[
    t?.toLowerCase()
  ] || "#");

function renderPricing(tool) {
  if (tool.pricing) {
    const discountPercent = tool.discount ? parseFloat(tool.discount.toString().replace(/%/g, '')) : 0;
    const discountPlans = tool.discount_plans || [];
    
    const li = Object.entries(tool.pricing)
      .map(([k, v]) => {
        const originalPrice = v;
        const isDiscountedPlan = discountPlans.includes(k);
        
        if (isDiscountedPlan && discountPercent > 0) {
          // Extract numeric value from price string (e.g., "$20" -> 20)
          const numericPrice = parseFloat(v.replace(/[^0-9.]/g, ''));
          const discountedPrice = numericPrice * (1 - discountPercent / 100);
          const discountedPriceStr = `$${discountedPrice.toFixed(0)}`;
          
          return `<li>${FMP.Utils.escapeHTML(k)}: <span class="original-price">${FMP.Utils.escapeHTML(originalPrice)}</span> <span class="discounted-price">${FMP.Utils.escapeHTML(discountedPriceStr)}</span></li>`;
        } else {
          return `<li>${FMP.Utils.escapeHTML(k)}: ${FMP.Utils.escapeHTML(v)}</li>`;
        }
      })
      .join("");
    return `<p><strong>Pricing:</strong></p><ul class="pricing-list">${li}</ul><br>`;
  }
  if (tool.price)
    return `<p><strong>Price:</strong><br>${FMP.Utils.escapeHTML(tool.price).replace(/\n/g, "<br>")}</p><br>`;
  return "";
}

function renderRecommendations(tool) {
  const rec = FMP.State.allTools
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
                   alt="${FMP.Utils.escapeHTML(r.name)}"
                   loading="lazy">
            </div>
            <div class="recommended-content">
              <h4>${FMP.Utils.escapeHTML(r.name)}</h4>
              <p>${FMP.Utils.escapeHTML((r.description || r.long_description || "")
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
  const tool = FMP.State.allTools.find((t) => t.name === name);
  let msg =
    tool?.requirements || `Requirements for ${name}…\n\nPlease contact the owner.`;
  txt.innerHTML = FMP.Utils.escapeHTML(msg).replace(/\n/g, "<br>");
  box.classList.remove("hidden");
  setTimeout(() => box.classList.add("hidden"), 4000);
}

/* ----------  AUTOCOMPLETE ---------- */
let selectedIndex = -1;
const addToRecents = (n) => {
  const r = [n, ...JSON.parse(localStorage.getItem(RECENT_KEY) || "[]").filter((x) => x !== n)].slice(
    0,
    MAX_RECENTS
  );
  localStorage.setItem(RECENT_KEY, JSON.stringify(r));
};
const getWeightedFuseList = () => {
  const r = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
  return FMP.State.allTools.map((t) => ({ ...t, _boost: r.filter((x) => x === t.name).length }));
};
const updateSelectedItem = (it) =>
  it.forEach((el, i) => el.classList.toggle("selected", i === selectedIndex));
// Autocomplete Component
FMP.Autocomplete = {
  selectedIndex: -1,
  
  render(results) {
    FMP.State.DOM.autocompleteBox.innerHTML = results
      .map(({ item }) => `<div data-name="${FMP.Utils.escapeHTML(item.name)}">${FMP.Utils.escapeHTML(item.name)}</div>`)
    .join("");
    FMP.State.DOM.autocompleteBox.classList.remove("hidden");
    this.selectedIndex = -1;
    FMP.State.DOM.autocompleteBox.querySelectorAll("div").forEach((d) =>
    d.addEventListener("mousedown", () => {
        FMP.Search.run(d.dataset.name);
        FMP.State.DOM.autocompleteBox.classList.add("hidden");
      })
    );
  },
  
  addToRecents(name) {
    const r = [name, ...JSON.parse(localStorage.getItem(FMP.Config.KEYS.RECENT) || "[]").filter((x) => x !== name)].slice(0, FMP.Config.MAX_RECENTS);
    localStorage.setItem(FMP.Config.KEYS.RECENT, JSON.stringify(r));
  }
};
FMP.Autocomplete.showRecentSearches = function() {
  const r = JSON.parse(localStorage.getItem(FMP.Config.KEYS.RECENT) || "[]");
  if (!r.length) return;
  FMP.State.DOM.autocompleteBox.innerHTML = r.map((n) => `<div data-name="${FMP.Utils.escapeHTML(n)}">${FMP.Utils.escapeHTML(n)}</div>`).join("");
  FMP.State.DOM.autocompleteBox.classList.remove("hidden");
  this.selectedIndex = -1;
  FMP.State.DOM.autocompleteBox.querySelectorAll("div").forEach((d) =>
    d.addEventListener("mousedown", () => {
      this.addToRecents(d.dataset.name);
      FMP.State.DOM.searchInput.value = d.dataset.name;
      sessionStorage.setItem(FMP.Config.KEYS.SEARCH, d.dataset.name);
      FMP.Search.applyFiltersAndRender();
      FMP.State.DOM.autocompleteBox.classList.add("hidden");
    })
  );
};

// Search Component
FMP.Search = {
  debouncedSearch: null,
  
  init() {
    this.debouncedSearch = FMP.Utils.debounce(this.run.bind(this), 500);
    this.setupEventListeners();
  },
  
  setupEventListeners() {
    FMP.State.DOM.searchInput?.addEventListener("input", (e) => {
      this.debouncedSearch(e.target.value);
    });
    
    FMP.State.DOM.searchInput?.addEventListener("focus", () => {
      if (!FMP.State.DOM.searchInput.value.trim()) {
        this.showRecentSearches();
      }
    });
  },
  
  run(query = "") {
    sessionStorage.setItem(FMP.Config.KEYS.SEARCH, query);
    this.applyFiltersAndRender();
  },
  
  applyFiltersAndRender() {
    const searchRaw = sessionStorage.getItem(FMP.Config.KEYS.SEARCH) || "";
    const sortKey = sessionStorage.getItem(FMP.Config.KEYS.SORT) || "name";
    const typeKey = sessionStorage.getItem(FMP.Config.KEYS.FILTER) || "all";

    // Hide special sections when filtering anything but "all"
    if (typeKey !== "all") {
      FMP.State.DOM.offersSection?.classList.add("hidden");
      FMP.State.DOM.recommendedSection?.classList.add("hidden");
      FMP.State.DOM.limitedSection?.classList.add("hidden");
    } else {
      FMP.State.DOM.offersSection?.classList.remove("hidden");
      FMP.State.DOM.recommendedSection?.classList.remove("hidden");
      FMP.State.DOM.limitedSection?.classList.remove("hidden");
    }

    let list = [...FMP.State.allTools];
    if (typeKey !== "all") {
      list = list.filter((t) => (t.type || "").toLowerCase() === typeKey);
    }

    // Simple text search (no Fuse.js dependency)
    if (searchRaw.trim()) {
      const query = searchRaw.toLowerCase();
      list = list.filter(tool => 
        (tool.name && tool.name.toLowerCase().includes(query)) ||
        (tool.description && tool.description.toLowerCase().includes(query)) ||
        (tool.tags && tool.tags.some(tag => tag.toLowerCase().includes(query))) ||
        (tool.type && tool.type.toLowerCase().includes(query))
      );
    }

    // Sort the results
    switch (sortKey) {
      case "release_date":
        list.sort((a, b) => new Date(b.release_date) - new Date(a.release_date));
        break;
      case "update_date":
        list.sort((a, b) => new Date(b.update_date) - new Date(a.update_date));
        break;
      case "discount": {
        const now = Date.now();
        list = list
          .filter((t) => (t.discount && (!t.discount_expiry || new Date(t.discount_expiry) > now)) || 
                         (t.offer && (!t.offer_expiry || new Date(t.offer_expiry) > now)))
          .sort((a, b) => (parseFloat(b.discount) || 0) - (parseFloat(a.discount) || 0));
        break;
      }
      default: {
        const wk = 6048e5, now = Date.now();
        list.sort((a, b) => {
          const ar = now - new Date(a.release_date) < wk || now - new Date(a.update_date) < wk;
          const br = now - new Date(b.release_date) < wk || now - new Date(b.update_date) < wk;
          if (ar !== br) return br - ar;
          return (a.name || "").localeCompare(b.name || "");
        });
      }
    }

    FMP.Render.renderTools(list);
    
    // Update filter buttons
    document.querySelectorAll("#filters button").forEach((b) =>
      b.classList.toggle("active", b.textContent.toLowerCase() === typeKey)
    );
    
    FMP.State.DOM.searchInput.value = searchRaw;
    FMP.State.DOM.sortSelect.value = sortKey;

    // Show special sections if no filter
    if (typeKey === "all") {
      this.populateSpecialSections();
    }
  },
  
  populateSpecialSections() {
    // No special sections to populate
  },
  
  renderOrHide(list, wrapper, section) {
    if (!wrapper || !section) return;
    if (list.length) {
      FMP.Render.renderTools(list, wrapper);
      section.classList.remove("hidden");
    } else {
      section.classList.add("hidden");
    }
  },
  
  showRecentSearches() {
    // Simple recent searches without complex autocomplete
    console.log("Recent searches functionality available");
  }
};

/* ================= LIVE COUNTDOWN ================= */
function updateBadges() {
  const now = Date.now();
  document.querySelectorAll("[data-expiry]").forEach((el) => {
    const expiry = Date.parse(el.dataset.expiry);
    if (isNaN(expiry)) return;
    const diff = expiry - now;
    if (diff <= 0) {
      el.remove();
      return;
    }
    el.textContent = formatTimeRemaining(el.dataset.expiry);
  });
}
setInterval(updateBadges, 300_000);

/* ----------  HASH & MODAL ---------- */
window.addEventListener("hashchange", applyURLHash);

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeImageModal();
});
FMP.State.DOM.imageModal?.addEventListener("click", (e) => {
  if (e.target === FMP.State.DOM.imageModal) closeImageModal();
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
// Sort Select Component
FMP.SortSelect = {
  init() {
    FMP.State.DOM.sortSelect?.addEventListener("change", () => {
      sessionStorage.setItem(FMP.Config.KEYS.SORT, FMP.State.DOM.sortSelect.value);
      FMP.Search.applyFiltersAndRender();
    });
  }
};

/* ----------  SCROLL PROGRESS ---------- */
let scrollTimeout;
document.addEventListener("scroll", () => {
  const scrollProgress = document.getElementById("scrollProgress");
  if (!scrollProgress) return;
  
  clearTimeout(scrollTimeout);
  scrollTimeout = setTimeout(() => {
    const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrollPercentage = (scrollTop / scrollHeight) * 100;
    scrollProgress.style.width = `${scrollPercentage}%`;
  }, 16);
});

/* ----------  SCROLL TO TOP ---------- */
let scrollToTopTimeout;
window.addEventListener("scroll", () => {
  if (FMP.State.DOM.scrollToTopBtn) {
    clearTimeout(scrollToTopTimeout);
    scrollToTopTimeout = setTimeout(() => {
      if (window.scrollY > 300) {
        FMP.State.DOM.scrollToTopBtn.classList.add("show");
      } else {
        FMP.State.DOM.scrollToTopBtn.classList.remove("show");
      }
    }, 16);
  }
});

// Scroll to Top Component
FMP.ScrollToTop = {
  init() {
    FMP.State.DOM.scrollToTopBtn?.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});
  }
};

// Main App Initialization
FMP.init = function() {
  // Initialize all components
  FMP.State.init();
  FMP.Navbar.init();
  FMP.LazyImages.init();
  FMP.DarkMode.init();
  FMP.Mobile.init();
  FMP.MainContainer.init();
  FMP.SpecialLists.init();
  FMP.ScrollToTop.init();
  FMP.Search.init();
  FMP.SortSelect.init();
  
  // Load data and start the app
  if (FMP.State.DOM.container) {
    FMP.Data.load();
  }
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', FMP.init);
} else {
  FMP.init();
}

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