// ==============================
//         CONFIGURATION
// ==============================
const DATA_FILES = [
  "data/tools.json",
  "data/bots.json",
  "data/checkers.json",
  "data/steam.json",
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

// ==============================
//        DOM REFERENCES
// ==============================
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

let allTools = [];

// ==============================
//          DARK MODE
// ==============================
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

// ==============================
//      BANNER VISIBILITY
// ==============================
if (banner && closeBanner && !localStorage.getItem(BANNER_KEY)) {
  // Show banner after short delay
  setTimeout(() => banner.classList.remove("hidden"), 500);

  closeBanner.addEventListener("click", () => {
    banner.classList.add("hidden");
    localStorage.setItem(BANNER_KEY, true);
  });
}

// ==============================
//       LOAD ALL JSON DATA
// ==============================
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

// ==============================
//   APPLY CURRENT SEARCH/FILTER
// ==============================
function applyFiltersAndRender() {
  const savedSearch = sessionStorage.getItem(SEARCH_KEY) || "";
  const savedSort = sessionStorage.getItem(SORT_KEY) || "name";
  const savedFilter = sessionStorage.getItem(FILTER_KEY) || "all";

  let filtered = [...allTools];

  // 1) SEARCH
  if (savedSearch) {
    const query = savedSearch.toLowerCase();
    filtered = filtered.filter((t) => {
      return (
        t.name?.toLowerCase().includes(query) ||
        (t.keywords || []).some((k) => k.toLowerCase().includes(query))
      );
    });
  }

  // 2) FILTER BY TYPE
  if (savedFilter !== "all") {
    filtered = filtered.filter(
      (t) => t.type?.toLowerCase() === savedFilter.toLowerCase()
    );
  }

  // 3) SORT
  switch (savedSort) {
    case "release_date":
      filtered.sort((a, b) => new Date(b.release_date) - new Date(a.release_date));
      break;
    case "update_date":
      filtered.sort((a, b) => new Date(b.update_date) - new Date(a.update_date));
      break;
    case "discount":
      filtered.sort((a, b) => (b.discount || 0) - (a.discount || 0));
      break;
    default:
      // "name"
      filtered.sort((a, b) =>
        a.name?.toLowerCase().localeCompare(b.name?.toLowerCase())
      );
      break;
  }

  // Actually render
  renderTools(filtered);

  // Update active filter button styles
  document.querySelectorAll("#filters button").forEach((btn) => {
    btn.classList.remove("active");
    const btnTxt = btn.textContent.toLowerCase();
    if (btnTxt === savedFilter.toLowerCase()) {
      btn.classList.add("active");
    }
  });
}

// ==============================
//     RENDER TOOL CARDS
// ==============================
function renderTools(data) {
  container.className = "main-grid";
  container.innerHTML = "";

  if (!data.length) {
    container.innerHTML = "<p>No tools found.</p>";
    return;
  }

  data.forEach((tool) => {
    const card = document.createElement("div");
    card.className = "tool-card fade-in";
    card.innerHTML = `
      <img
        src="${tool.image || "assets/placeholder.jpg"}"
        onerror="this.src='assets/placeholder.jpg'"
        alt="${tool.name || "Tool"}"
        class="tool-thumb"
      />
      <div class="tool-card-body">
        <h3 class="tool-title">${tool.name || "Unnamed Tool"}</h3>
        <p class="tool-desc">${getShortDescription(tool)}</p>
        <div class="tool-tags">
          ${(tool.tags || []).map((tag) => `<span class="tag">${tag}</span>`).join("")}
          ${tool.popular ? `<span class="tag">popular</span>` : ""}
          ${getRecentTags(tool)}
        </div>
      </div>
    `;

    // Click => show detail
    card.onclick = () => {
      location.hash = `tool=${encodeURIComponent(tool.name)}`;
      showToolDetail(tool);
    };
    container.appendChild(card);
  });
}

// ==============================
//   GENERATE FILTER BUTTONS
// ==============================
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
    // Mark active
    document.querySelectorAll("#filters button").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    // Save filter to session, re-apply
    sessionStorage.setItem(FILTER_KEY, label.toLowerCase());
    applyFiltersAndRender();
  });
  return btn;
}

// ==============================
//     SHOW DETAIL PAGE
// ==============================
function showToolDetail(tool, isInitial = false) {
  if (!isInitial) {
    location.hash = `tool=${encodeURIComponent(tool.name)}`;
  }
  container.className = "detail-wrapper";

  const stockStatus = getStockStatus(tool.stock);
  container.innerHTML = `
    <div class="tool-detail fade-in">
      <div class="tool-detail-top">
        <button class="back-btn" onclick="clearHash()">← Back</button>
        <h2>
          ${tool.name || "Unnamed Tool"} 
          ${getBadges(tool)}
        </h2>
      </div>

      <div class="tool-detail-content">
        <div class="tool-detail-left">
          <img
            src="${tool.image || "assets/placeholder.jpg"}"
            onerror="this.src='assets/placeholder.jpg'"
            class="tool-main-img"
            onclick="openImageModal(this.src)"
          />
          <div class="tool-gallery">
            ${(tool.images || []).map((img) => `<img src="${img}" alt="gallery" />`).join("")}
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
              ${
                (tool.long_description || tool.description || "No description available.")
                  .replace(/\n/g, "<br>")
                  .replace(/(<br>\s*)$/, "<br>&nbsp;")
              }
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
            <p><strong>Stock:</strong><br>${stockStatus}</p><br>
            <p><strong>Released:</strong><br>${tool.release_date || "N/A"}</p><br>
            <p><strong>Updated:</strong><br>${tool.update_date || "N/A"}</p><br>

            <!-- Contact & Requirements Buttons -->
            <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
              <a
                href="${getContactLink(tool.contact)}"
                target="_blank"
                class="contact-btn"
              >
                💬 Contact
              </a>
              <button class="requirements-btn" onclick="showRequirementsPopup('${tool.name}')">
                Requirements
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    ${renderRecommendations(tool)}
  `;

  // Swap main image from the gallery
  const mainImg = document.querySelector(".tool-main-img");
  document.querySelectorAll(".tool-gallery img").forEach((img) => {
    img.addEventListener("click", () => {
      if (mainImg && img.src) {
        mainImg.src = img.src;
      }
    });
  });
}

// ==============================
//      SUPPORT FUNCTIONS
// ==============================
function applyURLHash() {
  const hash = decodeURIComponent(location.hash || "").replace("#", "");
  if (hash.startsWith("tool=")) {
    const name = hash.replace("tool=", "").toLowerCase();
    const matched = allTools.find((t) => t.name?.toLowerCase() === name);
    if (matched) showToolDetail(matched, true);
  }
}

// Return short or fallback description
function getShortDescription(tool) {
  if (tool.description) return tool.description;
  if (tool.long_description) {
    return tool.long_description.split("\n")[0] + "...";
  }
  return "No description available.";
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

// Collect relevant badges (NEW, UPDATED, DISCOUNT, OFFER)
function getBadges(tool) {
  const now = new Date();
  const release = new Date(tool.release_date);
  const update = new Date(tool.update_date);
  const offerEnd = tool.offer_expiry ? new Date(tool.offer_expiry) : null;

  const badges = [];

  // "NEW" if released in last 7 days
  if ((now - release) / (1000 * 60 * 60 * 24) <= 7) {
    badges.push('<span class="badge new-badge">NEW</span>');
  }
  // "UPDATED" if updated in last 7 days
  if ((now - update) / (1000 * 60 * 60 * 24) <= 7) {
    badges.push('<span class="badge updated-badge">UPDATED</span>');
  }
  // "DISCOUNT" if tool has discount and the offer isn't expired
  if (tool.discount && offerEnd && offerEnd > now) {
    badges.push('<span class="badge discount-badge">DISCOUNT</span>');
  }
  // "OFFER" if tool.offer is set and not expired
  if (tool.offer && offerEnd && offerEnd > now) {
    badges.push('<span class="badge offer-badge">OFFER</span>');
  }
  return badges.join(" ");
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
      .map(([k, v]) => `<li>${k}: ${v}</li>`)
      .join("");
    return `<p><strong>Pricing:</strong></p>
            <ul class="pricing-list">${list}</ul><br>`;
  } else if (tool.price) {
    // Single price
    return `<p><strong>Price:</strong><br>
              ${tool.price.replace(/\n/g, "<br>").replace(/(<br>\s*)$/, "<br>&nbsp;")}
            </p><br>`;
  }
  return "";
}

// ==============================
//       RECOMMENDATIONS
// ==============================
function renderRecommendations(tool) {
  // find up to 6 "related" tools of the same type
  const recs = allTools
    .filter(
      (t) => t.name !== tool.name && t.type?.toLowerCase() === tool.type?.toLowerCase()
    )
    .slice(0, 6);

  if (!recs.length) return "";

  const cardsHTML = recs
    .map(
      (r) => `
        <div class="recommended-card" onclick='location.hash="tool=${encodeURIComponent(
          r.name
        )}"'>
          <img
            src="${r.image || "assets/placeholder.jpg"}"
            onerror="this.src='assets/placeholder.jpg'"
          />
          <h4>${r.name}</h4>
          <p>${getShortDescription(r)}</p>
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

// ==============================
//     REQUIREMENTS POPUP
// ==============================
function showRequirementsPopup(productName) {
  const popupBox = document.getElementById("popupMessage");
  const popupText = document.getElementById("popupText");

  const tool = allTools.find((t) => t.name === productName);

  let message = tool && tool.requirements
    ? tool.requirements
    : `Requirements for ${productName}...\n\nPlease contact the owner.`;

  // Insert HTML line breaks
  message = message.replace(/\n/g, "<br>");
  popupText.innerHTML = message;

  popupBox.classList.remove("hidden");

  // optional auto-hide
  setTimeout(() => popupBox.classList.add("hidden"), 4000);
}

// Close popup manually
function closePopup() {
  document.getElementById("popupMessage").classList.add("hidden");
}

// ==============================
//     CLEAR HASH (BACK BTN)
// ==============================
function clearHash() {
  location.hash = "";
  window.scrollTo({ top: 0, behavior: "smooth" });
  // Return to the main list
  applyFiltersAndRender();
}

// ==============================
//    NAVBAR TOGGLE (MOBILE)
// ==============================
if (navbarToggle && navbarMenu) {
  navbarToggle.addEventListener("click", () => {
    navbarMenu.classList.toggle("show-menu");
  });
}

// ==============================
//   SCROLL TO TOP BUTTON
// ==============================
window.addEventListener("scroll", () => {
  scrollToTopBtn.classList.toggle("show", window.scrollY > 300);
});

scrollToTopBtn?.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

// ==============================
//       LIVE SEARCH
// ==============================
searchInput?.addEventListener("input", () => {
  sessionStorage.setItem(SEARCH_KEY, searchInput.value);
  applyFiltersAndRender();
});

// ==============================
//         SORT SELECT
// ==============================
sortSelect?.addEventListener("change", () => {
  sessionStorage.setItem(SORT_KEY, sortSelect.value);
  applyFiltersAndRender();
});

// ==============================
//         INIT
// ==============================
loadData();

// If user changes #hash manually, or navigates back/forward
window.addEventListener("hashchange", () => {
  // Check if a "tool=" hash is present, otherwise show main list
  applyURLHash();
});

document.getElementById("imageModal").addEventListener("click", function (e) {
  if (e.target === this) {
    closeImageModal();
  }
});

