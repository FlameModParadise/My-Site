//CONFIGURATION
const DATA_FILES = [
  "data/tools.json",
  "data/bots.json",
  "data/checkers.json",
  "data/game.json",
  "data/others.json",
  "data/cookies.json",
  "data/methods.json",
];

// Constants for local/session storage keys
const THEME_KEY = "theme";
const SEARCH_KEY = "search";
const SORT_KEY = "sort";
const FILTER_KEY = "filter";
const BANNER_KEY = "hideBanner";

//DOM REFERENCES
const container = document.getElementById("main-tool-list");
const filtersContainer = document.getElementById("filters");
const searchInput = document.getElementById("searchInput");
const sortSelect = document.getElementById("sortSelect");
const scrollToTopBtn = document.getElementById("scrollToTopBtn");
const darkToggle = document.getElementById("darkToggle");
const banner = document.getElementById("announcement-banner");
const closeBanner = document.getElementById("close-banner");
const navbarToggle = document.getElementById("navbarToggle");
const navbarMenu = document.getElementById("navbarMenu");
const imageModal = document.getElementById("imageModal");

let allTools = [];

//HELPER FUNCTIONS

// Debounce for search
function debounce(func, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => func(...args), delay);
  };
}

// Escape HTML to prevent XSS
function escapeHTML(str = "") {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Highlight matched text in a search query
function highlightMatch(text, matches, key) {
  const match = matches?.find((m) => m.key === key);
  if (!match || !match.indices.length) return escapeHTML(text);

  let result = "";
  let lastIndex = 0;

  match.indices.forEach(([start, end]) => {
    result += escapeHTML(text.slice(lastIndex, start));
    result += "<mark>" + escapeHTML(text.slice(start, end + 1)) + "</mark>";
    lastIndex = end + 1;
  });

  result += escapeHTML(text.slice(lastIndex));
  return result;
}

// Return short or fallback description, with optional highlighting
function getShortDescription(tool, query = "") {
  let raw = tool.description
    ? tool.description
    : tool.long_description
    ? tool.long_description.split("\n")[0] + "..."
    : "No description available.";

  return highlightMatch(raw, query);
}

//DARK MODE
if (darkToggle) {
  darkToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    localStorage.setItem(
      THEME_KEY,
      document.body.classList.contains("dark") ? "dark" : "light"
    );
  });
}

// Restore theme from localStorage
if (localStorage.getItem(THEME_KEY) === "dark") {
  document.body.classList.add("dark");
}

//BANNER VISIBILITY
if (banner && closeBanner && !localStorage.getItem(BANNER_KEY)) {
  // Show banner after short delay
  setTimeout(() => banner.classList.remove("hidden"), 500);

  closeBanner.addEventListener("click", () => {
    banner.classList.add("hidden");
    localStorage.setItem(BANNER_KEY, true);
  });
}

//LOAD ALL JSON DATA
async function loadData() {
  container.innerHTML = "<p>Loading...</p>";

  try {
    // Fetch all JSON files in parallel
    const data = await Promise.all(
      DATA_FILES.map((url) =>
        fetch(url)
          .then((res) => {
            if (!res.ok) {
              throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
            }
            return res.json();
          })
          .catch((err) => {
            console.error(`Failed to load ${url}:`, err);
            // Return empty array if this particular file fails
            return [];
          })
      )
    );

    // Flatten all arrays from the multiple files
    const merged = data.flatMap((arr) => (Array.isArray(arr) ? arr : []));
    const seen = new Set();

    // Deduplicate by "name" and ensure each tool has name + type
    allTools = merged.filter((tool) => {
      if (!tool.name || !tool.type) return false;
      const nameKey = tool.name.toLowerCase();
      if (seen.has(nameKey)) return false;
      seen.add(nameKey);
      return true;
    });

    generateFilterButtons();

    // Apply search/filter/sort from sessionStorage and then render
    applyFiltersAndRender();

    // Also check if the URL hash indicates a specific tool to show
    applyURLHash();
  } catch (error) {
    console.error("Error loading data:", error);
    container.innerHTML = "<p>Error loading data. Please try again later.</p>";
  }
}

//APPLY CURRENT SEARCH/FILTER
function applyFiltersAndRender() {
  const savedSearch = sessionStorage.getItem(SEARCH_KEY) || "";
  const savedSort = sessionStorage.getItem(SORT_KEY) || "name";
  const savedFilter = sessionStorage.getItem(FILTER_KEY) || "all";

  let filtered = [...allTools];

  // 1) SEARCH
  if (savedSearch) {
    const fuse = new Fuse(allTools, {
      includeScore: true,
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
      ],
    });
    const fuseResults = fuse.search(savedSearch);
    filtered = fuseResults.map((r) => ({
      ...r.item,
      _matches: r.matches,
    }));
  }

  // 2) FILTER BY TYPE
  if (savedFilter !== "all") {
    filtered = filtered.filter(
      (t) => (t.type || "").toLowerCase() === savedFilter.toLowerCase()
    );
  }

  // 3) SORT / SPECIAL FILTER
  switch (savedSort) {
    case "release_date":
      // Sort by release_date descending (newest first)
      filtered.sort(
        (a, b) => new Date(b.release_date) - new Date(a.release_date)
      );
      break;

    case "update_date":
      // Sort by update_date descending (most recently updated first)
      filtered.sort(
        (a, b) => new Date(b.update_date) - new Date(a.update_date)
      );
      break;

    case "discount":
      // Filter to only those with an active discount or offer
      const now = new Date();
      filtered = filtered.filter((tool) => {
        const hasActiveDiscount =
          tool.discount &&
          (!tool.discount_expiry || new Date(tool.discount_expiry) > now);
        const hasActiveOffer =
          tool.offer &&
          (!tool.offer_expiry || new Date(tool.offer_expiry) > now);
        return hasActiveDiscount || hasActiveOffer;
      });

      // Sort discount items
      filtered.sort((a, b) => {
        const parseDiscount = (tool) => {
          const val = parseFloat(tool.discount);
          return !isNaN(val) && isFinite(val) ? val : 0;
        };
        const discountA = parseDiscount(a);
        const discountB = parseDiscount(b);

        // Higher numeric discount first
        if (discountA !== discountB) return discountB - discountA;

        // Then any discount vs no discount
        const hasDiscountA = a.discount ? 1 : 0;
        const hasDiscountB = b.discount ? 1 : 0;
        if (hasDiscountA !== hasDiscountB) return hasDiscountB - hasDiscountA;

        // Finally alphabetically
        return (a.name || "").localeCompare(b.name || "");
      });
      break;

    default:
      // ======================
      // YOUR CUSTOM "All" SORT:
      // Show new/updated items first, then alphabetical
      // ======================

      // Helper to check if a tool is "recent" (new or updated within 7 days)
      const isRecent = (tool) => {
        const now = Date.now();
        const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;
        const released = new Date(tool.release_date).getTime() || 0;
        const updated = new Date(tool.update_date).getTime() || 0;
        return (now - released <= ONE_WEEK) || (now - updated <= ONE_WEEK);
      };

      filtered.sort((a, b) => {
        // Sort by "recent" status first
        const aRecent = isRecent(a) ? 1 : 0;
        const bRecent = isRecent(b) ? 1 : 0;

        // If one is recent and the other isn’t, put the recent one first
        if (bRecent !== aRecent) {
          return bRecent - aRecent; 
        }

        // Otherwise, sort alphabetically
        return (a.name || "")
          .toLowerCase()
          .localeCompare((b.name || "").toLowerCase());
      });
      break;
  }

  // Finally, render
  renderTools(filtered);

  // Update filter buttons, inputs, and dropdowns
  document.querySelectorAll("#filters button").forEach((btn) => {
    const btnTxt = btn.textContent.toLowerCase();
    btn.classList.toggle("active", btnTxt === savedFilter.toLowerCase());
  });
  if (searchInput) searchInput.value = savedSearch;
  if (sortSelect) sortSelect.value = savedSort;
}

function getCardBadges(tool) {
  const now = new Date();
  const offerEnd = tool.offer_expiry ? new Date(tool.offer_expiry) : null;
  const discountEnd = tool.discount_expiry ? new Date(tool.discount_expiry) : null;

  const isOfferActive = tool.offer && (!offerEnd || offerEnd > now);
  const isDiscountActive = tool.discount && (!discountEnd || discountEnd > now);
  const isNumericDiscount = !isNaN(parseFloat(tool.discount)) && isFinite(tool.discount);

  const badges = [];

  if (isDiscountActive) {
    if (isNumericDiscount) {
      badges.push(`<span class="tool-badge discount-badge">-${tool.discount}%</span>`);
      if (discountEnd) {
        const left = formatTimeRemaining(tool.discount_expiry);
        if (left) {
          badges.push(`<span class="tool-badge discount-badge">${left}</span>`);
        }
      }
    } else {
      badges.push(`<span class="tool-badge discount-badge">${escapeHTML(tool.discount)}</span>`);
    }
  }

  if (isOfferActive) {
    badges.push(`<span class="tool-badge offer-badge">${escapeHTML(tool.offer)}</span>`);
  }

  return badges.join("\n");
}

//RENDER TOOL CARDS
function renderTools(data) {
  container.className = "main-grid";
  container.innerHTML = "";

  if (!data.length) {
    container.innerHTML = "<p>No tools found.</p>";
    return;
  }

  const searchQuery = (sessionStorage.getItem(SEARCH_KEY) || "").trim();

  data.forEach((tool) => {
    const card = document.createElement("div");
    card.className = "tool-card fade-in";

    const isOfferActive =
      tool.offer &&
      (!tool.offer_expiry || new Date(tool.offer_expiry) > new Date());

      const shortDesc = highlightMatch(tool.description || "", tool._matches || [], "description");
      const safeName = highlightMatch(tool.name || "Unnamed Tool", tool._matches || [], "name");      

    card.innerHTML = `
      <div class="tool-thumb-wrapper">
        ${getCardBadges(tool)}
        <img
          loading="lazy"
          src="${tool.image || "assets/placeholder.jpg"}"
          onerror="this.src='assets/placeholder.jpg'"
          alt="${escapeHTML(tool.name || "Tool")}"
          class="tool-thumb"
        />
      </div>
      <div class="tool-card-body">
        <h3 class="tool-title">${safeName}</h3>
        <p class="tool-desc">${shortDesc}</p>
        <div class="tool-tags">
          ${(tool.tags || [])
            .map((tag) => `<span class="tag">${escapeHTML(tag)}</span>`)
            .join("")}
          ${tool.popular ? `<span class="tag">popular</span>` : ""}
          ${getRecentTags(tool)}
        </div>
      </div>
    `;

    card.onclick = () => {
      location.hash = `tool=${encodeURIComponent(tool.name)}`;
      showToolDetail(tool);
    };

    container.appendChild(card);
  });
}

//GENERATE FILTER BUTTONS
function generateFilterButtons() {
  // Collect unique types
  const types = [
    ...new Set(allTools.map((t) => (t.type || "").toLowerCase()).filter(Boolean)),
  ];

  filtersContainer.innerHTML = "";

  // Always have an "All" button
  const allBtn = createFilterBtn("All");
  filtersContainer.appendChild(allBtn);

  // Then a button for each unique type
  types.forEach((type) => {
    const btn = createFilterBtn(type);
    filtersContainer.appendChild(btn);
  });
}

function createFilterBtn(label) {
  const btn = document.createElement("button");
  btn.textContent = label.charAt(0).toUpperCase() + label.slice(1);
  btn.addEventListener("click", () => {
    sessionStorage.setItem(FILTER_KEY, label.toLowerCase());
    applyFiltersAndRender();
  });
  return btn;
}

//SHOW DETAIL PAGE
function showToolDetail(tool, isInitial = false) {
  // If this is not the initial load, update the hash
  if (!isInitial) {
    location.hash = `tool=${encodeURIComponent(tool.name)}`;
  }

  // Change the layout class and inject the new detail HTML
  container.className = "detail-wrapper";
  container.innerHTML = `
    <div class="tool-detail fade-in">
      <div class="tool-detail-top">
        <button class="back-btn" onclick="clearHash()">← Back</button>
        <h2>
          ${escapeHTML(tool.name || "Unnamed Tool")}
          ${getBadges(tool)}
        </h2>
      </div>

      <div class="tool-detail-content">
        <div class="tool-detail-left">
          <img
            loading="lazy"
            src="${tool.image || "assets/placeholder.jpg"}"
            onerror="this.src='assets/placeholder.jpg'"
            class="tool-main-img"
            alt="${escapeHTML(tool.name || "Tool")}"
            onclick="openImageModal(this.src)"
          />
          <div class="tool-gallery">
            ${(tool.images || [])
              .map(
                (img) => `
                  <img
                    loading="lazy"
                    src="${img}"
                    alt="gallery"
                  />
                `
              )
              .join("")}
          </div>
          ${
            tool.video
              ? `<iframe src="${tool.video}" class="tool-video" allowfullscreen></iframe>`
              : ""
          }
        </div>

        <div class="tool-detail-right">
          <div class="tool-info">
            <p class="desc">
              <strong>Description:</strong><br>
              <!-- This will be replaced by HTML below -->
              ${escapeHTML(tool.long_description || tool.description || "No description available.")}
            </p>
            <br>
            ${renderPricing(tool)}
            ${
              tool.discount
                ? `<p><strong>Discount:</strong> ${tool.discount}%</p><br>`
                : ""
            }
            ${
              tool.offer_expiry
                ? `<p>⏳ Offer ends in ${daysLeft(tool.offer_expiry)} days</p><br>`
                : ""
            }
            <p><strong>Stock:</strong><br>${getStockStatus(tool.stock)}</p><br>
            <p><strong>Released:</strong><br>${escapeHTML(tool.release_date || "N/A")}</p><br>
            <p><strong>Updated:</strong><br>${escapeHTML(tool.update_date || "N/A")}</p><br>

            <!-- Contact & Requirements Buttons -->
            <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
              <a
                href="${getContactLink(tool.contact)}"
                target="_blank"
                class="contact-btn"
              >
                💬 Contact
              </a>
              <button class="requirements-btn" onclick="showRequirementsPopup('${escapeHTML(
                tool.name
              )}')">
                Requirements
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    ${renderRecommendations(tool)}
  `;

  // ✅ Render raw HTML from tool.description, if available
  const descContainer = document.querySelector(".tool-detail-right .tool-info .desc");
  if (descContainer && tool.description) {
    descContainer.innerHTML = `<strong>Description:</strong><br>` + tool.description;
  }

  // Swap main image from the gallery if clicked
  const mainImg = document.querySelector(".tool-main-img");
  document.querySelectorAll(".tool-gallery img").forEach((img) => {
    img.addEventListener("click", () => {
      if (mainImg && img.src) {
        mainImg.src = img.src;
      }
    });
  });

  // After content is rendered, scroll to the top (delay for layout)
  setTimeout(() => {
    const detail = document.querySelector(".tool-detail");
    if (!detail) return;
  
    // Get where .tool-detail starts on the page
    const detailTop = detail.getBoundingClientRect().top + window.scrollY;
  
    // Subtract however many pixels you want as padding (e.g., 100)
    window.scrollTo({ top: detailTop - 100, behavior: "smooth" });
  }, 0);
  
}

//SUPPORT FUNCTIONS
function applyURLHash() {
  const hash = decodeURIComponent(location.hash || "").replace("#", "");
  if (hash.startsWith("tool=")) {
    const name = hash.replace("tool=", "").toLowerCase();
    const matched = allTools.find((t) => (t.name || "").toLowerCase() === name);
    if (matched) showToolDetail(matched, true);
  }
}

// For "new"/"updated" tag chips under each card
function getRecentTags(tool) {
  const now = new Date();
  const release = new Date(tool.release_date);
  const update = new Date(tool.update_date);

  const tags = [];
  // show "new" if within 7 days of release
  if ((now - release) / (1000 * 60 * 60 * 24) <= 7) {
    tags.push('<span class="tag">new</span>');
  }
  // show "updated" if within 7 days
  if ((now - update) / (1000 * 60 * 60 * 24) <= 7) {
    tags.push('<span class="tag">updated</span>');
  }
  return tags.join(" ");
}

// Return a "stock" string
function getStockStatus(value) {
  if (typeof value === "number") {
    if (value === 0) return "Not in stock";
    return `${value} in stock`;
  }
  if (typeof value === "string") {
    const lower = value.toLowerCase();
    if (lower === "unlimited") return "Unlimited";
    if (lower === "very limited") return "Very limited";
    return value;
  }
  return "Need to contact owner";
}

function formatTimeRemaining(dateStr) {
  const now = new Date();
  const end = new Date(dateStr);
  const diffMs = end - now;

  if (diffMs <= 0) return null;

  const totalMinutes = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  let result = "⏳ ";
  if (days) result += `${days}d `;
  if (hours) result += `${hours}h `;
  result += `${minutes}m left`;

  return result.trim();
}


// Collect relevant badges (NEW, UPDATED, DISCOUNT, OFFER)
function getBadges(tool) {
  const now = new Date();
  const release = new Date(tool.release_date);
  const update = new Date(tool.update_date);
  const offerEnd = tool.offer_expiry ? new Date(tool.offer_expiry) : null;
  const discountEnd = tool.discount_expiry ? new Date(tool.discount_expiry) : null;

  const badges = [];

  // NEW (within 7 days)
  if ((now - release) / (1000 * 60 * 60 * 24) <= 7) {
    badges.push('<span class="badge new-badge">NEW</span>');
  }

  // UPDATED (within 7 days)
  if ((now - update) / (1000 * 60 * 60 * 24) <= 7) {
    badges.push('<span class="badge updated-badge">UPDATED</span>');
  }

  // DISCOUNT (active only if no expiry or future expiry)
  const isDiscountActive = tool.discount && (!discountEnd || discountEnd > now);
  if (isDiscountActive) {
    const isNumeric = !isNaN(parseFloat(tool.discount)) && isFinite(tool.discount);
    const label = isNumeric ? `-${tool.discount}%` : escapeHTML(tool.discount);

    // Main badge
    badges.push(`<span class="badge discount-badge">${label}</span>`);

    // Countdown badge (only for numeric)
    if (isNumeric && discountEnd) {
      const countdown = formatTimeRemaining(tool.discount_expiry);
      if (countdown) {
        badges.push(`<span class="badge discount-badge">${countdown}</span>`);
      }
    }
  }

  // OFFER (just a static label, no countdown)
  const isOfferActive = tool.offer && (!offerEnd || offerEnd > now);
  if (isOfferActive) {
    badges.push(`<span class="badge offer-badge">${escapeHTML(tool.offer)}</span>`);
  }

  return badges.join(" ");
}

//-------------------------------------------------
// Return days left before an offer expires
function daysLeft(date) {
  const diff = new Date(date) - new Date();
  return diff > 0 ? Math.ceil(diff / (1000 * 60 * 60 * 24)) : 0;
}

// Get URL for contact based on the 'contact' field
function getContactLink(type) {
  const links = {
    telegram: "https://t.me/fmpChatBot",
    discord: "https://discord.gg/kfJfP3aNwC",
    email: "mailto:flamemodparadiscord@gmail.com",
  };
  return links[type?.toLowerCase()] || "#";
}

// Utility: render "Pricing" details if present
function renderPricing(tool) {
  if (tool.pricing) {
    // If "pricing" is an object with multiple tiers
    const list = Object.entries(tool.pricing)
      .map(([k, v]) => `<li>${escapeHTML(k)}: ${escapeHTML(v)}</li>`)
      .join("");
    return `<p><strong>Pricing:</strong></p>
            <ul class="pricing-list">${list}</ul><br>`;
  } else if (tool.price) {
    // Single price
    const safePrice = escapeHTML(tool.price)
      .replace(/\n/g, "<br>")
      .replace(/(<br>\s*)$/, "<br>&nbsp;");
    return `<p><strong>Price:</strong><br>${safePrice}</p><br>`;
  }
  return "";
}

//RECOMMENDATIONS
function renderRecommendations(tool) {
  // find up to 6 "related" tools of the same type
  const recs = allTools
    .filter(
      (t) => (t.name || "") !== (tool.name || "") &&
             (t.type || "").toLowerCase() === (tool.type || "").toLowerCase()
    )
    .slice(0, 6);

  if (!recs.length) return "";

  // highlight search not needed here, just showing related
  const cardsHTML = recs
    .map(
      (r) => `
        <div class="recommended-card" onclick='location.hash="tool=${encodeURIComponent(
          r.name
        )}"'>
          <img
            loading="lazy"
            src="${r.image || "assets/placeholder.jpg"}"
            onerror="this.src='assets/placeholder.jpg'"
          />
          <h4>${escapeHTML(r.name)}</h4>
          <p>${escapeHTML(
            r.description ||
              (r.long_description || "No description").split("\n")[0] + "..."
          )}</p>
        </div>
      `
    )
    .join("");

  return `
    <section class="recommended-section fade-in">
      <h3>You may also like</h3>
      <div class="recommended-scroll">
        ${cardsHTML}
      </div>
    </section>
  `;
}

//REQUIREMENTS POPUP
function showRequirementsPopup(productName) {
  const popupBox = document.getElementById("popupMessage");
  const popupText = document.getElementById("popupText");
  const tool = allTools.find((t) => t.name === productName);

  let message = tool && tool.requirements
    ? tool.requirements
    : `Requirements for ${productName}...\n\nPlease contact the owner.`;

  // Insert HTML line breaks + escape
  message = escapeHTML(message).replace(/\n/g, "<br>");
  popupText.innerHTML = message;

  popupBox.classList.remove("hidden");

  // optional auto-hide
  setTimeout(() => popupBox.classList.add("hidden"), 4000);
}

// Close popup manually
function closePopup() {
  document.getElementById("popupMessage").classList.add("hidden");
}

//CLEAR HASH (BACK BTN)
function clearHash() {
  location.hash = "";
  window.scrollTo({ top: 0, behavior: "smooth" });
  // Return to the main list
  applyFiltersAndRender();
}

//NAVBAR TOGGLE (MOBILE)
if (navbarToggle && navbarMenu) {
  navbarToggle.addEventListener("click", () => {
    navbarMenu.classList.toggle("show-menu");
  });
}

//SCROLL TO TOP BUTTON
window.addEventListener("scroll", () => {
  scrollToTopBtn.classList.toggle("show", window.scrollY > 300);
});

scrollToTopBtn?.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

//DEBOUNCED SEARCH
const debouncedSearchHandler = debounce(() => {
  sessionStorage.setItem(SEARCH_KEY, searchInput.value);
  applyFiltersAndRender();
}, 300);

searchInput?.addEventListener("input", debouncedSearchHandler);

//SORT SELECT
sortSelect?.addEventListener("change", () => {
  sessionStorage.setItem(SORT_KEY, sortSelect.value);
  applyFiltersAndRender();
});

//INIT
loadData();

const autocompleteBox = document.getElementById("autocompleteBox");

searchInput.addEventListener("input", () => {
  const query = searchInput.value.trim();
  if (!query) {
    autocompleteBox.classList.add("hidden");
    autocompleteBox.innerHTML = "";
    return;
  }

  const fuse = new Fuse(allTools, {
    includeScore: true,
    shouldSort: true,
    threshold: 0.4,
    ignoreLocation: true,
    minMatchCharLength: 2,
    keys: ["name", "keywords", "tags", "type"]
  });

  const results = fuse.search(query).slice(0, 5);
  if (!results.length) {
    autocompleteBox.classList.add("hidden");
    return;
  }

  autocompleteBox.innerHTML = results.map(({ item }) => `<div>${escapeHTML(item.name)}</div>`).join("");
  autocompleteBox.classList.remove("hidden");

  autocompleteBox.querySelectorAll("div").forEach((div, i) => {
    div.addEventListener("click", () => {
      searchInput.value = results[i].item.name;
      sessionStorage.setItem(SEARCH_KEY, results[i].item.name);
      applyFiltersAndRender();
      autocompleteBox.classList.add("hidden");
    });
  });
});

searchInput.addEventListener("blur", () => {
  setTimeout(() => autocompleteBox.classList.add("hidden"), 150);
});


// If user changes #hash manually, or navigates back/forward
window.addEventListener("hashchange", () => {
  // Check if a "tool=" hash is present, otherwise show main list
  applyURLHash();
});

//ESC KEY FOR IMAGE MODAL
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeImageModal();
});

// imageModal click outside to close
imageModal?.addEventListener("click", (e) => {
  if (e.target === imageModal) {
    closeImageModal();
  }
});

let deferredPrompt = null;
const installWrapper = document.getElementById("install-wrapper");
const installBtn = document.getElementById("manual-install-btn");
const installHelp = document.getElementById("install-help");

// Show install button only when supported
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installWrapper.classList.remove("hidden");
  installHelp.classList.add("hidden"); // hide fallback help
});

// If button is clicked
installBtn?.addEventListener("click", async () => {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log("User response:", outcome);
    deferredPrompt = null;
    installBtn.classList.add("hidden");
  } else {
    // Show fallback instructions if not supported
    installHelp.classList.remove("hidden");
  }
});

// If not supported at all, show fallback after DOM loaded
document.addEventListener("DOMContentLoaded", () => {
  const isSupported = "onbeforeinstallprompt" in window;
  if (!isSupported) {
    installWrapper.classList.remove("hidden");
    installHelp.classList.remove("hidden");
  }
});

