// ================ MOBILE NAVBAR FIX (SINGLE IMPLEMENTATION) ================ 
document.addEventListener('DOMContentLoaded', function() {
  const toggle = document.getElementById('navbarToggle');
  const menu = document.getElementById('navbarMenu');
  
  if (!toggle || !menu) return;
  
  // Simple toggle function
  function toggleMobileMenu() {
    const isOpen = menu.classList.contains('show-menu');
    
    if (isOpen) {
      // Close menu
      menu.classList.remove('show-menu');
      toggle.innerHTML = '☰';
      toggle.setAttribute('aria-label', 'Open menu');
      document.body.style.overflow = '';
    } else {
      // Open menu
      menu.classList.add('show-menu');
      toggle.innerHTML = '✕';
      toggle.setAttribute('aria-label', 'Close menu');
      document.body.style.overflow = 'hidden';
    }
  }
  
  // Single click handler
  toggle.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    toggleMobileMenu();
  });
  
  // Close on link click
  const menuLinks = menu.querySelectorAll('a, button');
  menuLinks.forEach(link => {
    link.addEventListener('click', function() {
      if (menu.classList.contains('show-menu')) {
        toggleMobileMenu();
      }
    });
  });
  
  // Close on outside click
  document.addEventListener('click', function(e) {
    if (menu.classList.contains('show-menu') && 
        !toggle.contains(e.target) && 
        !menu.contains(e.target)) {
      toggleMobileMenu();
    }
  });
  
  // Close on escape
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && menu.classList.contains('show-menu')) {
      toggleMobileMenu();
    }
  });
  
  // Close on resize to desktop
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

const THEME_KEY   = "theme";
const SEARCH_KEY  = "search";
const SORT_KEY    = "sort";
const FILTER_KEY  = "filter";
const RECENT_KEY  = "recentSearches";
const MAX_RECENTS = 5;

/* DOM - Cached references */
const DOM = {
  container: document.getElementById("main-tool-list"),
  filtersContainer: document.getElementById("filters"),
  searchInput: document.getElementById("searchInput"),
  sortSelect: document.getElementById("sortSelect"),
  scrollToTopBtn: document.getElementById("scrollToTopBtn"),
  darkToggle: document.getElementById("darkToggle"),
  imageModal: document.getElementById("imageModal"),
  autocompleteBox: document.getElementById("autocompleteBox")
};

let allTools = [];

/* ----------  HELPERS  ---------- */
const debounce = (fn, delay) => {
  let t;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), delay);
  };
};

const escapeHTML = (s = "") =>
  s.replace(/&/g, "&amp;")
   .replace(/</g, "&lt;")
   .replace(/>/g, "&gt;")
   .replace(/"/g, "&quot;");

const nl2br = (txt = "") => txt.replace(/\n/g, "<br>");

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

/* ----------  OPTIMIZED LAZY‑IMAGE SYSTEM ---------- */
// Enhanced Intersection Observer with better performance
const io = new IntersectionObserver(
  (entries) => {
    entries.forEach(({ target, isIntersecting }) => {
      if (isIntersecting) {
        loadImage(target);
        io.unobserve(target);
      }
    });
  },
  { 
    rootMargin: "100px", // Load images earlier
    threshold: 0.1 // Trigger when 10% visible
  }
);

// Image loading with progressive enhancement and error handling
function loadImage(img) {
  if (!img.dataset.src) return;
  
  // Add loading state
  img.classList.add('loading');
  
  // Create new image to preload
  const tempImg = new Image();
  
  // Set timeout for slow loading images
  const timeout = setTimeout(() => {
    if (img.classList.contains('loading')) {
      console.warn('Image loading timeout:', img.dataset.src);
      img.src = 'assets/placeholder.jpg';
      img.classList.remove('loading');
      img.classList.add('timeout');
    }
  }, 10000); // 10 second timeout
  
  tempImg.onload = () => {
    clearTimeout(timeout);
    
    // Progressive loading: blur to sharp
    img.style.filter = 'blur(5px)';
    img.style.transition = 'filter 0.3s ease';
    img.src = img.dataset.src;
    
    // Remove blur after image loads
    img.onload = () => {
      img.style.filter = 'none';
      img.classList.remove('loading');
      img.classList.add('loaded');
    };
    
    // Clean up
    img.removeAttribute('data-src');
  };
  
  tempImg.onerror = () => {
    clearTimeout(timeout);
    console.warn('Image failed to load:', img.dataset.src);
    img.src = 'assets/placeholder.jpg';
    img.classList.remove('loading');
    img.classList.add('error');
  };
  
  tempImg.src = img.dataset.src;
}

// Image loading performance monitoring
function trackImagePerformance() {
  const images = document.querySelectorAll('img');
  images.forEach(img => {
    img.addEventListener('load', () => {
      const loadTime = performance.now() - performance.timing.navigationStart;
      if (loadTime > 3000) { // Log slow loading images
        console.warn('Slow image load:', img.src, `${loadTime}ms`);
      }
    });
  });
}

// Enhanced image function with WebP support and responsive sizing
function smartImg(src, alt = "", options = {}) {
  const { 
    priority = false, 
    sizes = "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw",
    quality = 80,
    simple = false // For gallery images that need simple img tags
  } = options;
  
  // For gallery images, use simple img tags to avoid conflicts with click handlers
  if (simple) {
    return `
      <img 
        ${priority ? 'loading="eager"' : 'loading="lazy"'}
        data-src="${src}"
        src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' fill='%23f0f0f0'/%3E%3C/svg%3E"
        alt="${escapeHTML(alt)}"
        class="lazy-image"
        onerror="this.src='assets/placeholder.jpg'"
      >
    `.trim();
  }
  
  // Generate WebP and fallback URLs
  const webpSrc = src.replace(/\.(jpg|jpeg|png)$/i, '.webp');
  const baseSrc = src;
  
  // Create responsive srcset for better performance
  const srcset = [
    `${baseSrc}?w=400&q=${quality} 400w`,
    `${baseSrc}?w=800&q=${quality} 800w`,
    `${baseSrc}?w=1200&q=${quality} 1200w`
  ].join(', ');
  
  const webpSrcset = [
    `${webpSrc}?w=400&q=${quality} 400w`,
    `${webpSrc}?w=800&q=${quality} 800w`,
    `${webpSrc}?w=1200&q=${quality} 1200w`
  ].join(', ');
  
  return `
    <picture>
      <source 
        type="image/webp" 
        data-srcset="${webpSrcset}"
        sizes="${sizes}"
      >
      <img 
        ${priority ? 'loading="eager"' : 'loading="lazy"'}
        data-src="${baseSrc}"
        data-srcset="${srcset}"
        sizes="${sizes}"
        src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300'%3E%3Crect width='400' height='300' fill='%23f0f0f0'/%3E%3C/svg%3E"
        alt="${escapeHTML(alt)}"
        class="lazy-image"
        onerror="this.src='assets/placeholder.jpg'"
      >
    </picture>
  `.trim();
}

// Preload critical images
function preloadCriticalImages() {
  const criticalImages = [
    'assets/icons/fmp-icon.gif',
    'assets/logo.png'
  ];
  
  criticalImages.forEach(src => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = src;
    document.head.appendChild(link);
  });
}

// Enhanced lazy loading activation
function activateLazyImages(root = document) {
  const images = root.querySelectorAll("img[data-src], picture source[data-srcset]");
  
  images.forEach((element) => {
    if (element.tagName === 'IMG') {
      const img = element;
      if (img.complete && img.naturalWidth > 0) {
        loadImage(img);
      } else {
        io.observe(img);
      }
    } else if (element.tagName === 'SOURCE') {
      const source = element;
      const img = source.parentElement.querySelector('img');
      if (img && img.complete && img.naturalWidth > 0) {
        source.srcset = source.dataset.srcset;
        img.srcset = img.dataset.srcset;
        img.src = img.dataset.src;
      } else if (img) {
        io.observe(img);
      }
    }
  });
}

// Image optimization utilities
function optimizeImageUrl(url, options = {}) {
  const { width, height, quality = 80, format = 'auto' } = options;
  const params = new URLSearchParams();
  
  if (width) params.set('w', width);
  if (height) params.set('h', height);
  if (quality) params.set('q', quality);
  if (format !== 'auto') params.set('f', format);
  
  return params.toString() ? `${url}?${params.toString()}` : url;
}

/* ----------  DARK MODE  ---------- */
if (DOM.darkToggle) {
  DOM.darkToggle.setAttribute("aria-label", "Toggle dark mode");
  DOM.darkToggle.setAttribute("title", "Toggle dark mode (D)");
  DOM.darkToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    localStorage.setItem(
      THEME_KEY,
      document.body.classList.contains("dark") ? "dark" : "light"
    );
  });
}

if (localStorage.getItem(THEME_KEY) === "dark") {
  document.body.classList.add("dark");
}

document.addEventListener("keydown", (e) => {
  if (
    e.key.toLowerCase() === "d" &&
    !e.target.matches("input,textarea,[contenteditable]")
  ) {
    DOM.darkToggle?.click();
  }
});


/* ----------  MOBILE OPTIMIZATION  ---------- */
if (/Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
  document.documentElement.style.setProperty('--transition', '0.1s ease');
}

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
        ${smartImg(tool.image || "assets/placeholder.jpg", tool.name, {
          priority: tool.popular || tool.featured,
          sizes: "(max-width: 480px) 100vw, (max-width: 768px) 50vw, 33vw"
        }).trim()}
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
async function loadData() {
  if (!DOM.container) return;
  
  DOM.container.className = "main-grid";
  DOM.container.innerHTML = "<p>Loading...</p>";

  try {
    const data = await Promise.allSettled(
      DATA_FILES.map((u) =>
        fetch(u).then((r) => (r.ok ? r.json() : Promise.reject(r.statusText)))
      )
    );

    const merged = data
      .filter((result) => result.status === "fulfilled")
      .flatMap((result) => result.value);

    const seen = new Set();
    allTools = merged.filter((t) => {
      if (!t.name || !t.type) return false;
      const k = t.name.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    generateFilterButtons();
    applyFiltersAndRender();
    applyURLHash();
  } catch (err) {
    DOM.container.innerHTML = "<p>Error loading data.</p>";
  }
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
  // Sections removed - no special sections needed
}


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
function runSearch(raw = "") {
  sessionStorage.setItem(SEARCH_KEY, raw);
  applyFiltersAndRender();
}

function applyFiltersAndRender() {
  const searchRaw = sessionStorage.getItem(SEARCH_KEY) || "";
  const sortKey   = sessionStorage.getItem(SORT_KEY)   || "name";
  const typeKey   = sessionStorage.getItem(FILTER_KEY) || "all";

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
    const fuse = new Fuse(getWeightedFuseList(), {
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
    list = fuse
      .search(searchRaw.trim())
      .map(({ item, matches }) => ({ ...item, _matches: matches }));
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
  DOM.searchInput.value = searchRaw;
  DOM.sortSelect.value = sortKey;

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
      out.push(`<span class="tool-badge discount-badge">-${tool.discount}</span>`);
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
  if (isOffer) {
    // Shorten long offer text for better display
    let offerText = escapeHTML(tool.offer);
    if (offerText.length > 25) {
      offerText = offerText.substring(0, 22) + '...';
    }
    out.push(`<span class="tool-badge offer-badge" title="${escapeHTML(tool.offer)}">${offerText}</span>`);
  }
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
    sessionStorage.setItem(FILTER_KEY, label.toLowerCase());
    applyFiltersAndRender();
  });
  return b;
}

/* ----------  DETAIL VIEW ---------- */
function swapMainImage(thumb) {
  const main = document.querySelector('.tool-main-img');
  if (!main) return;

  // Handle both simple img elements and picture elements
  let src;
  if (thumb.tagName === 'IMG') {
    src = thumb.dataset.src || thumb.src;
  } else {
    // If it's a picture element, find the img inside
    const img = thumb.querySelector('img');
    src = img ? (img.dataset.src || img.src) : null;
  }
  
  if (!src) return;
  
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
          ${smartImg(tool.image || 'assets/placeholder.jpg', tool.name, {
            priority: true,
            sizes: "(max-width: 768px) 100vw, 50vw",
            simple: true
          }).replace('<img ', '<img class="tool-main-img" onclick="openImageModal(this.src)" ')}
          <div class="tool-gallery">
            ${(tool.images || []).map(img => smartImg(img, 'gallery', {
              simple: true
            })).join('')}
          </div>
          ${tool.video ? `<iframe src="${tool.video}" class="tool-video" allowfullscreen></iframe>` : ''}
        </div>

        <div class="tool-detail-right">
          <div class="tool-info">
            <p class="desc"><strong>Description:</strong><br>${escapeHTML(
              tool.long_description || tool.description || 'No description available.'
            ).replace(/\n/g, "<br>")}</p><br>

            ${renderPricing(tool)}
            ${tool.discount       ? `<p><strong>Discount:</strong> ${tool.discount}</p><br>` : ''}
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
  
  if (mainImg && mainImg.dataset.src) {
    mainImg.src = mainImg.dataset.src;
  }

  galleryImgs.forEach(img => {
    if (img.dataset.src) {
      img.src = img.dataset.src;
    }
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
    const lbl = numeric ? `-${tool.discount}` : escapeHTML(tool.discount);
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
    const discountPercent = tool.discount ? parseFloat(tool.discount.replace('%', '')) : 0;
    const hasActiveDiscount = discountPercent > 0 && (!tool.offer_expiry || new Date(tool.offer_expiry) > new Date());
    
    const li = Object.entries(tool.pricing)
      .map(([key, value]) => {
        const originalPrice = parseFloat(value.replace('$', ''));
        let displayPrice = value;
        
        if (hasActiveDiscount && originalPrice > 0) {
          // Check if this specific plan should get discount
          const shouldDiscount = !tool.discount_plans || tool.discount_plans.includes(key);
          
          if (shouldDiscount) {
            const discountedPrice = originalPrice * (1 - discountPercent / 100);
            const formattedDiscountedPrice = discountedPrice.toFixed(2);
            displayPrice = `<span style="text-decoration: line-through;">${value}</span> ${formattedDiscountedPrice}`;
          }
        }
        
        // Add context to pricing
        const contextKey = key.toLowerCase();
        let context = '';
        if (contextKey.includes('day')) context = ' (per day)';
        else if (contextKey.includes('month')) context = ' (per month)';
        else if (contextKey.includes('week')) context = ' (per week)';
        else if (contextKey.includes('year')) context = ' (per year)';
        else if (contextKey.includes('piece')) context = ' (per piece)';
        else if (contextKey.includes('lifetime')) context = ' (one-time)';
        else if (contextKey.includes('source')) context = ' (one-time)';
        
        return `<li>${escapeHTML(key)}${context}: ${displayPrice}</li>`;
      })
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
              ${smartImg(r.image || 'assets/placeholder.jpg', r.name, {
                sizes: "(max-width: 768px) 50vw, 20vw"
              })}
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
  return allTools.map((t) => ({ ...t, _boost: r.filter((x) => x === t.name).length }));
};
const updateSelectedItem = (it) =>
  it.forEach((el, i) => el.classList.toggle("selected", i === selectedIndex));
const renderAutocomplete = (res) => {
  DOM.autocompleteBox.innerHTML = res
    .map(({ item }) => `<div data-name="${escapeHTML(item.name)}">${escapeHTML(item.name)}</div>`)
    .join("");
  DOM.autocompleteBox.classList.remove("hidden");
  selectedIndex = -1;
  DOM.autocompleteBox.querySelectorAll("div").forEach((d) =>
    d.addEventListener("mousedown", () => {
      runSearch(d.dataset.name);
      DOM.autocompleteBox.classList.add("hidden");
    })
  );
};
const showRecentSearches = () => {
  const r = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
  if (!r.length) return;
  DOM.autocompleteBox.innerHTML = r.map((n) => `<div data-name="${escapeHTML(n)}">${escapeHTML(n)}</div>`).join("");
  DOM.autocompleteBox.classList.remove("hidden");
  selectedIndex = -1;
  DOM.autocompleteBox.querySelectorAll("div").forEach((d) =>
    d.addEventListener("mousedown", () => {
      addToRecents(d.dataset.name);
      DOM.searchInput.value = d.dataset.name;
      sessionStorage.setItem(SEARCH_KEY, d.dataset.name);
      applyFiltersAndRender();
      DOM.autocompleteBox.classList.add("hidden");
    })
  );
};

const debouncedSearch = debounce(runSearch, 500);

searchInput?.addEventListener("input", () => {
  const q = DOM.searchInput.value.trim();
  if (!q) {
    DOM.autocompleteBox.classList.add("hidden");
    debouncedSearch("");
    return;
  }

  // Only show autocomplete for longer queries
  if (q.length < 2) {
    DOM.autocompleteBox.classList.add("hidden");
    debouncedSearch(q);
    return;
  }

  const fuse = new Fuse(getWeightedFuseList(), {
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
      { name: "long_description", weight: 0.2 },
      { name: "_boost", weight: 0.8 }
    ]
  });

  const results = fuse.search(q).slice(0, 3);
  results.length ? renderAutocomplete(results) : DOM.autocompleteBox.classList.add("hidden");
  debouncedSearch(q);
});

searchInput?.addEventListener("keydown", (e) => {
  const items = DOM.autocompleteBox.querySelectorAll("div");
  if (!items.length) return;

  if (e.key === "ArrowDown") {
    e.preventDefault();
    selectedIndex = (selectedIndex + 1) % items.length;
    updateSelectedItem(items);
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    selectedIndex = (selectedIndex - 1 + items.length) % items.length;
    updateSelectedItem(items);
  } else if (e.key === "Enter") {
    e.preventDefault();
    if (selectedIndex !== -1) items[selectedIndex].dispatchEvent(new Event("mousedown"));
    else debouncedSearch(DOM.searchInput.value);
    DOM.autocompleteBox.classList.add("hidden");
  }
});

searchInput?.addEventListener("focus", () => {
  if (!DOM.searchInput.value.trim()) showRecentSearches();
});

searchInput?.addEventListener("blur", () => { setTimeout(() => DOM.autocompleteBox.classList.add("hidden"), 150)});

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
sortSelect?.addEventListener("change", () => {
  sessionStorage.setItem(SORT_KEY, DOM.sortSelect.value);
  applyFiltersAndRender();
});

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
  if (DOM.scrollToTopBtn) {
    clearTimeout(scrollToTopTimeout);
    scrollToTopTimeout = setTimeout(() => {
      if (window.scrollY > 300) {
        DOM.scrollToTopBtn.classList.add("show");
      } else {
        DOM.scrollToTopBtn.classList.remove("show");
      }
    }, 16);
  }
});

DOM.scrollToTopBtn?.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

/* ----------  GO ---------- */
if (DOM.container) {
  // Preload critical images first
  preloadCriticalImages();
  
  // Initialize performance tracking
  trackImagePerformance();
  
  loadData();
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