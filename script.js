// === DATA FILES & ELEMENT REFERENCES ===
const DATA_FILES = [
  "data/tools.json",
  "data/bots.json",
  "data/checkers.json",
  "data/steam.json",
  "data/others.json",
  "data/cookies.json",
  "data/methods.json",
];

const container = document.getElementById("main-tool-list");
const filtersContainer = document.getElementById("filters");
const searchInput = document.getElementById("searchInput");
const sortSelect = document.getElementById("sortSelect");
const scrollToTopBtn = document.getElementById("scrollToTopBtn");

// === DARK MODE TOGGLE ===
const darkToggle = document.getElementById("darkToggle");
if (darkToggle) {
  darkToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    localStorage.setItem("theme", document.body.classList.contains("dark") ? "dark" : "light");
  });
}
if (localStorage.getItem("theme") === "dark") {
  document.body.classList.add("dark");
}

// === OFFER BANNER ===
const banner = document.getElementById("announcement-banner");
const closeBanner = document.getElementById("close-banner");
if (banner && closeBanner && !localStorage.getItem("hideBanner")) {
  setTimeout(() => banner.classList.remove("hidden"), 500);
  closeBanner.addEventListener("click", () => {
    banner.classList.add("hidden");
    localStorage.setItem("hideBanner", true);
  });
}

let allTools = [];

// === DATA LOADING ===
async function loadData() {
  container.innerHTML = "<p>Loading...</p>";

  const data = await Promise.all(
    DATA_FILES.map(url =>
      fetch(url).then(res => (res.ok ? res.json() : [])).catch(() => [])
    )
  );

  const flatData = data.flatMap(d => Array.isArray(d) ? d : []);  // Ignore non-arrays
  const seen = new Set();

  allTools = flatData.filter(tool => {
    const nameKey = (tool.name || "").toLowerCase();
    const isValid = tool.name && tool.type;
    if (!isValid || seen.has(nameKey)) return false;
    seen.add(nameKey);
    return true;
  });

  generateFilterButtons();
  applyURLState();
}

// === STATEFUL LOADING ===
function applyURLState() {
  const hash = decodeURIComponent(location.hash || "").replace("#", "");
  if (hash.startsWith("tool=")) {
    const name = hash.replace("tool=", "").toLowerCase();
    const t = allTools.find(t => t.name?.toLowerCase() === name);
    if (t) return showToolDetail(t, true);
  }

  const savedSearch = sessionStorage.getItem("search") || "";
  const savedSort = sessionStorage.getItem("sort") || "name";
  const savedFilter = sessionStorage.getItem("filter") || "all";

  searchInput.value = savedSearch;
  sortSelect.value = savedSort;

  // let filtered = [...allTools];
  let filtered = allTools.filter(t => typeof t.name === "string" && typeof t.type === "string");
  if (savedSearch) {
    const q = savedSearch.toLowerCase();
    filtered = filtered.filter(t =>
      t.name?.toLowerCase().includes(q) ||
      (t.keywords || []).some(k => k.toLowerCase().includes(q))
    );
  }
  if (savedFilter !== "all") {
    filtered = filtered.filter(t => t.type?.toLowerCase() === savedFilter);
  }
  if (savedSort === "name")
    filtered.sort((a, b) => a.name?.toLowerCase().localeCompare(b.name?.toLowerCase()));
  if (savedSort === "release_date")
    filtered.sort((a, b) => new Date(b.release_date) - new Date(a.release_date));
  if (savedSort === "update_date")
    filtered.sort((a, b) => new Date(b.update_date) - new Date(a.update_date));
  if (savedSort === "discount")
    filtered.sort((a, b) => (b.discount || 0) - (a.discount || 0));

  renderTools(filtered);

  document.querySelectorAll("#filters button").forEach(b => {
    b.classList.remove("active");
    if (b.textContent.toLowerCase() === savedFilter) b.classList.add("active");
  });
}


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
      <img src="${tool.image || 'assets/placeholder.jpg'}" onerror="this.src='assets/placeholder.jpg'" alt="${tool.name}" class="tool-thumb" />
      <div class="tool-card-body">
        <h3 class="tool-title">${tool.name}</h3>
        <p class="tool-desc">${getShortDescription(tool)}</p>
        <div class="tool-tags">
          ${(tool.tags || []).map(tag => `<span class="tag">${tag}</span>`).join("")}
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

function showToolDetail(tool, isInitial = false) {
  if (!isInitial) location.hash = `tool=${encodeURIComponent(tool.name)}`;

  container.className = "detail-wrapper";
  container.innerHTML = `
    <div class="tool-detail fade-in">
      <div class="tool-detail-top">
        <button class="back-btn" onclick="clearHash()">← Back</button>
        <h2>${tool.name} ${getBadges(tool)}</h2>
      </div>
      <div class="tool-detail-content">
        <div class="tool-detail-left">
          <img src="${tool.image || 'assets/placeholder.jpg'}" onerror="this.src='assets/placeholder.jpg'" class="tool-main-img" />
          <div class="tool-gallery">
            ${(tool.images || []).map(img => `<img src="${img}" alt="gallery" />`).join("")}
          </div>
          ${tool.video ? `<iframe src="${tool.video}" class="tool-video" allowfullscreen></iframe>` : ""}
        </div>
        <div class="tool-detail-right">
          <div class="tool-info">
            <p class="desc">
              <strong>Description:</strong><br>
              ${(tool.long_description || tool.description || "No description available.")
                .replace(/\n/g, "<br>")
                .replace(/(<br>\s*)$/, "<br>&nbsp;")}
            </p>
            <br>
            ${tool.pricing ? `
              <p><strong>Pricing:</strong></p>
              <ul class="pricing-list">
                ${Object.entries(tool.pricing).map(([k, v]) => `<li>${k}: ${v}</li>`).join("")}
              </ul>
              <br>` :
              tool.price ? `<p><strong>Price:</strong><br>${tool.price.replace(/\n/g, "<br>").replace(/(<br>\s*)$/, "<br>&nbsp;")}</p><br>` : ""
            }
            ${tool.discount ? `<p><strong>Discount:</strong> ${tool.discount}%</p><br>` : ""}
            ${tool.offer_expiry ? `<p>⏳ Offer ends in ${daysLeft(tool.offer_expiry)} days</p><br>` : ""}
            <p><strong>Released:</strong><br>${tool.release_date || "N/A"}</p><br>
            <p><strong>Updated:</strong><br>${tool.update_date || "N/A"}</p><br>
            <a href="${getContactLink(tool.contact)}" target="_blank" class="contact-btn">💬 Contact</a>
          </div>
        </div>
      </div>
    </div>
    ${renderRecommendations(tool)}
  `;

  const mainImg = document.querySelector(".tool-main-img");
  document.querySelectorAll(".tool-gallery img").forEach(img => {
    img.addEventListener("click", () => {
      if (mainImg && img.src) {
        mainImg.src = img.src;
      }
    });
  });
}

function clearHash() {
  location.hash = "";
  window.scrollTo({ top: 0, behavior: "smooth" });
  applyURLState();
}

function renderRecommendations(tool) {
  const recs = allTools
    .filter(t => t.name !== tool.name && t.type?.toLowerCase() === tool.type?.toLowerCase())
    .slice(0, 6);
  if (!recs.length) return "";
  return `
    <section class="recommended-section fade-in">
      <h3>You may also like</h3>
      <div class="recommended-scroll">
        ${recs.map(r => `
          <div class="recommended-card" onclick='location.hash="tool=${encodeURIComponent(r.name)}"' >
            <img src="${r.image || 'assets/placeholder.jpg'}" onerror="this.src='assets/placeholder.jpg'" />
            <h4>${r.name}</h4>
            <p>${getShortDescription(r)}</p>
          </div>`).join("")}
      </div>
    </section>
  `;
}

// === HELPER FUNCTIONS ===
function getShortDescription(tool) {
  if (tool.description) return tool.description;
  if (tool.long_description) return tool.long_description.split("\n")[0] + "...";
  return "No description available.";
}
function getBadges(tool) {
  const now = new Date();
  const release = new Date(tool.release_date);
  const update = new Date(tool.update_date);
  const offerEnd = tool.offer_expiry ? new Date(tool.offer_expiry) : null;
  const badges = [];
  if ((now - release) / (1000 * 60 * 60 * 24) <= 7) badges.push('<span class="badge new-badge">NEW</span>');
  if ((now - update) / (1000 * 60 * 60 * 24) <= 7) badges.push('<span class="badge updated-badge">UPDATED</span>');
  if (tool.discount && offerEnd && offerEnd > now) badges.push('<span class="badge discount-badge">DISCOUNT</span>');
  if (tool.offer && offerEnd && offerEnd > now) badges.push('<span class="badge offer-badge">OFFER</span>');
  return badges.join(" ");
}
function getRecentTags(tool) {
  const now = new Date();
  const release = new Date(tool.release_date);
  const update = new Date(tool.update_date);
  const tags = [];
  if ((now - release) / (1000 * 60 * 60 * 24) <= 7) tags.push(`<span class="tag">new</span>`);
  if ((now - update) / (1000 * 60 * 60 * 24) <= 7) tags.push(`<span class="tag">updated</span>`);
  return tags.join(" ");
}
function daysLeft(date) {
  const d = Math.ceil((new Date(date) - new Date()) / (1000 * 60 * 60 * 24));
  return d > 0 ? d : 0;
}
function getContactLink(type) {
  const links = {
    telegram: "https://t.me/fmpChatBot",
    discord: "https://discord.gg/kfJfP3aNwC",
    email: "mailto:flamemodparadiscord@gmail.com"
  };
  return links[type?.toLowerCase()] || "#";
}
function getPrice(tool) {
  if (tool.pricing) return tool.pricing["1 Day"] || Object.values(tool.pricing)[0];
  if (tool.price) return tool.price;
  return "$1";
}

// === FILTER BUTTONS ===
function generateFilterButtons() {
  const types = [...new Set(allTools.map(t => t.type?.toLowerCase()))];
  console.log('Types:', types);  // Log the types array to inspect its contents
  filtersContainer.innerHTML = "";

  if (types.length === 0) {
    console.error('No valid types found in tools data.');
    return;
  }

  const allBtn = createFilterBtn("All", () => filterByType("all"));
  filtersContainer.appendChild(allBtn);

  types.forEach(type => {
    if (type) {
      const btn = createFilterBtn(type, () => filterByType(type));
      filtersContainer.appendChild(btn);
    } else {
      console.warn('Skipping invalid filter type:', type);
    }
  });
}

function createFilterBtn(label, fn) {
  const btn = document.createElement("button");
  btn.textContent = label.charAt(0).toUpperCase() + label.slice(1);
  btn.onclick = () => {
    document.querySelectorAll("#filters button").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    fn();
    showPopup(label.toLowerCase());
  };
  return btn;
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

function highlightActiveNav(type) {
  document.querySelectorAll(".navbar-right a").forEach(link => {
    link.classList.remove("active");
    if (link.textContent.toLowerCase() === type) link.classList.add("active");
  });
}

function filterByType(type) {
  sessionStorage.setItem("filter", type.toLowerCase());
  highlightActiveNav(type.toLowerCase());
  applyURLState();
}

// === INIT ===
loadData();
window.addEventListener("hashchange", applyURLState);
