// === THEME FILES & ELEMENTS ===
const DATA_FILES = [
  "data/tools.json",
  "data/bots.json",
  "data/checkers.json",
  "data/steam.json",
  "data/others.json",
  "data/cookies.json",
  "data/methods.json",
];

// DOM references
const container = document.getElementById("main-tool-list");
const filtersContainer = document.getElementById("filters");
const searchInput = document.getElementById("searchInput");
const sortSelect = document.getElementById("sortSelect");
const scrollToTopBtn = document.getElementById("scrollToTopBtn");

const darkToggle = document.getElementById("darkToggle");
const banner = document.getElementById("announcement-banner");
const closeBanner = document.getElementById("close-banner");

let allTools = [];

// === DARK MODE TOGGLE ===
if (darkToggle) {
  darkToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    localStorage.setItem(
      "theme",
      document.body.classList.contains("dark") ? "dark" : "light"
    );
  });
}
if (localStorage.getItem("theme") === "dark") {
  document.body.classList.add("dark");
}

// === OFFER BANNER ===
if (banner && closeBanner && !localStorage.getItem("hideBanner")) {
  setTimeout(() => banner.classList.remove("hidden"), 500);
  closeBanner.addEventListener("click", () => {
    banner.classList.add("hidden");
    localStorage.setItem("hideBanner", true);
  });
}

// === LOAD DATA ===
async function loadData() {
  container.innerHTML = "<p>Loading...</p>";

  /* 
    Optional improvement: More verbose error handling when fetching each file.
    This way you can see in the console if a particular JSON fails to load 
  */
  const data = await Promise.all(
    DATA_FILES.map(url =>
      fetch(url)
        .then(res => {
          if (!res.ok) {
            throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
          }
          return res.json();
        })
        .catch(err => {
          console.error(`Failed to load ${url}:`, err);
          return []; // fallback to empty array
        })
    )
  );

  // Merge all arrays
  const merged = data.flatMap(arr => (Array.isArray(arr) ? arr : []));
  const seen = new Set();

  // Filter out duplicates and invalid items (must have both 'name' and 'type')
  allTools = merged.filter(tool => {
    const nameKey = (tool.name || "").toLowerCase();
    const valid = tool.name && tool.type;
    if (!valid || seen.has(nameKey)) return false;
    seen.add(nameKey);
    return true;
  });

  generateFilterButtons();
  applyURLState();
}

// === APPLY HASH / SESSION STATE ===
function applyURLState() {
  const hash = decodeURIComponent(location.hash || "").replace("#", "");
  if (hash.startsWith("tool=")) {
    const name = hash.replace("tool=", "").toLowerCase();
    const matched = allTools.find(t => t.name?.toLowerCase() === name);
    if (matched) return showToolDetail(matched, true);
  }

  const savedSearch = sessionStorage.getItem("search") || "";
  const savedSort = sessionStorage.getItem("sort") || "name";
  const savedFilter = sessionStorage.getItem("filter") || "all";

  // Real-time filtering
  let filtered = allTools.filter(
    t => typeof t.name === "string" && typeof t.type === "string"
  );

  // SEARCH
  if (savedSearch) {
    const q = savedSearch.toLowerCase();
    filtered = filtered.filter(
      t =>
        t.name?.toLowerCase().includes(q) ||
        (t.keywords || []).some(k => k.toLowerCase().includes(q))
    );
  }

  // FILTER BY TYPE
  if (savedFilter !== "all") {
    filtered = filtered.filter(t => t.type?.toLowerCase() === savedFilter);
  }

  // SORT
  if (savedSort === "name") {
    filtered.sort((a, b) =>
      a.name?.toLowerCase().localeCompare(b.name?.toLowerCase())
    );
  } else if (savedSort === "release_date") {
    filtered.sort(
      (a, b) => new Date(b.release_date) - new Date(a.release_date)
    );
  } else if (savedSort === "update_date") {
    filtered.sort(
      (a, b) => new Date(b.update_date) - new Date(a.update_date)
    );
  } else if (savedSort === "discount") {
    filtered.sort((a, b) => (b.discount || 0) - (a.discount || 0));
  }

  renderTools(filtered);

  // UPDATE FILTER BUTTON STATES
  document.querySelectorAll("#filters button").forEach(btn => {
    btn.classList.remove("active");
    if (btn.textContent.toLowerCase() === savedFilter) {
      btn.classList.add("active");
    }
  });
}

// === RENDER TOOLS (GRID) ===
function renderTools(data) {
  container.className = "main-grid";
  container.innerHTML = "";

  if (!data.length) {
    container.innerHTML = "<p>No tools found.</p>";
    return;
  }

  data.forEach(tool => {
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
          ${(tool.tags || [])
            .map(tag => `<span class="tag">${tag}</span>`)
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

// === SHOW TOOL DETAIL ===
function showToolDetail(tool, isInitial = false) {
  if (!isInitial) {
    location.hash = `tool=${encodeURIComponent(tool.name)}`;
  }

  container.className = "detail-wrapper";

  // Stock status
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
          />
          <div class="tool-gallery">
            ${(tool.images || [])
              .map(img => `<img src="${img}" alt="gallery" />`)
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
              ${
                (tool.long_description || tool.description || "No description available.")
                  .replace(/\n/g, "<br>")
                  .replace(/(<br>\s*)$/, "<br>&nbsp;")
              }
            </p>
            <br>
            ${
              tool.pricing
                ? `<p><strong>Pricing:</strong></p>
                   <ul class="pricing-list">
                     ${Object.entries(tool.pricing)
                       .map(([k, v]) => `<li>${k}: ${v}</li>`)
                       .join("")}
                   </ul><br>`
                : tool.price
                ? `<p><strong>Price:</strong><br>
                     ${tool.price
                       .replace(/\n/g, "<br>")
                       .replace(/(<br>\s*)$/, "<br>&nbsp;")}
                   </p><br>`
                : ""
            }
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
            <!-- Stock display -->
            <p><strong>Stock:</strong><br>${stockStatus}</p><br>

            <p><strong>Released:</strong><br>${tool.release_date || "N/A"}</p><br>
            <p><strong>Updated:</strong><br>${tool.update_date || "N/A"}</p><br>

            <!-- Contact & Extra Requirements Buttons -->
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

  // Enable gallery swapping
  const mainImg = document.querySelector(".tool-main-img");
  document.querySelectorAll(".tool-gallery img").forEach(img => {
    img.addEventListener("click", () => {
      if (mainImg && img.src) {
        mainImg.src = img.src;
      }
    });
  });
}

// === getStockStatus FUNCTION ===
function getStockStatus(value) {
  // numeric
  if (typeof value === "number") {
    if (value === 0) {
      return "Not in stock";
    }
    return value + " in stock";
  }
  // string
  if (typeof value === "string") {
    const lower = value.toLowerCase();
    if (lower === "unlimited") return "Unlimited";
    if (lower === "very limited") return "Very limited";
    return value; // fallback for any other string
  }
  return "Need to contact owner"; // fallback
}

// === POPUP FOR REQUIREMENTS BTN ===
function showRequirementsPopup(productName) {
  const tool = allTools.find(t => t.name === productName);
  let message = tool && tool.requirements
    ? tool.requirements
    : `Requirements for ${productName}...\n\nPlease contact the owner.`;

  message = message.replace(/\n/g, "<br>");

  const popupBox = document.getElementById("popupMessage");
  const popupText = document.getElementById("popupText");

  // Use `.innerHTML` here, not `.textContent`
  popupText.innerHTML = message;

  popupBox.classList.remove("hidden");

  // auto-hide after 4 seconds
  setTimeout(() => popupBox.classList.add("hidden"), 4000);
}

// === CLOSE POPUP ===
function closePopup() {
  document.getElementById("popupMessage").classList.add("hidden");
}

// === CLEAR HASH ===
// Optional improvement: go back in history instead of just clearing hash
function clearHash() {
  history.back();
}
function clearHash() {
  location.hash = "";
  window.scrollTo({ top: 0, behavior: "smooth" });
  applyURLState();
}

// === RECOMMENDATIONS ===
function renderRecommendations(tool) {
  const recs = allTools
    .filter(
      t =>
        t.name !== tool.name &&
        t.type?.toLowerCase() === tool.type?.toLowerCase()
    )
    .slice(0, 6);

  if (!recs.length) return "";
  return `
    <section class="recommended-section fade-in">
      <h3>You may also like</h3>
      <div class="recommended-scroll">
        ${recs
          .map(
            r => `
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
          .join("")}
      </div>
    </section>
  `;
}

// === UTILS ===
function getShortDescription(tool) {
  if (tool.description) return tool.description;
  if (tool.long_description) {
    return tool.long_description.split("\n")[0] + "...";
  }
  return "No description available.";
}
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
  // "DISCOUNT" if discount != null and offer not expired
  if (tool.discount && offerEnd && offerEnd > now) {
    badges.push('<span class="badge discount-badge">DISCOUNT</span>');
  }
  // "OFFER" if tool.offer != null and not expired
  if (tool.offer && offerEnd && offerEnd > now) {
    badges.push('<span class="badge offer-badge">OFFER</span>');
  }
  return badges.join(" ");
}
function getRecentTags(tool) {
  const now = new Date();
  const release = new Date(tool.release_date);
  const update = new Date(tool.update_date);

  const tags = [];
  if ((now - release) / (1000 * 60 * 60 * 24) <= 7) {
    tags.push(`<span class="tag">new</span>`);
  }
  if ((now - update) / (1000 * 60 * 60 * 24) <= 7) {
    tags.push(`<span class="tag">updated</span>`);
  }
  return tags.join(" ");
}
function daysLeft(date) {
  const diff = new Date(date) - new Date();
  return diff > 0 ? Math.ceil(diff / (1000 * 60 * 60 * 24)) : 0;
}
function getContactLink(type) {
  // map contact type to actual URL
  const links = {
    telegram: "https://t.me/fmpChatBot",
    discord: "https://discord.gg/kfJfP3aNwC",
    email: "mailto:flamemodparadiscord@gmail.com",
  };
  return links[type?.toLowerCase()] || "#";
}

// === FILTER BUTTONS ===
function generateFilterButtons() {
  // Make sure to filter out falsy or undefined types
  const types = [
    ...new Set(
      allTools
        .map(t => (t.type || "").toLowerCase())
        .filter(Boolean)
    ),
  ];
  filtersContainer.innerHTML = "";

  // 'All' Button
  const allBtn = createFilterBtn("All", () => filterByType("all"));
  filtersContainer.appendChild(allBtn);

  // Type-based Buttons
  types.forEach(type => {
    const btn = createFilterBtn(type, () => filterByType(type));
    filtersContainer.appendChild(btn);
  });
}
function createFilterBtn(label, fn) {
  const btn = document.createElement("button");
  btn.textContent = label.charAt(0).toUpperCase() + label.slice(1);
  btn.onclick = () => {
    document.querySelectorAll("#filters button").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    fn();
  };
  return btn;
}
function filterByType(type) {
  sessionStorage.setItem("filter", type.toLowerCase());
  highlightActiveNav(type.toLowerCase());
  applyURLState();
}
function highlightActiveNav(type) {
  document.querySelectorAll(".navbar-right a").forEach(link => {
    link.classList.remove("active");
    if (link.textContent.toLowerCase() === type) link.classList.add("active");
  });
}

// === SCROLL TO TOP ===
window.addEventListener("scroll", () => {
  scrollToTopBtn.classList.toggle("show", window.scrollY > 300);
});
scrollToTopBtn?.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

// === NAVBAR TOGGLE ===
const navbarToggle = document.getElementById("navbarToggle");
const navbarMenu = document.getElementById("navbarMenu");
if (navbarToggle && navbarMenu) {
  navbarToggle.addEventListener("click", () => {
    navbarMenu.classList.toggle("show-menu");
  });
}

// ===  Real-time search as the user types ===
searchInput.addEventListener("input", () => {
  sessionStorage.setItem("search", searchInput.value);
  applyURLState();
});

// === INIT ===
loadData();

// Listen for changes in the URL hash (tool detail)
window.addEventListener("hashchange", applyURLState);
