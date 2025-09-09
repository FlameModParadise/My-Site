// Optimized Contact Page JavaScript
document.addEventListener("DOMContentLoaded", () => {
  const cardWrapper = document.getElementById("contact-card-wrapper");
  const FALLBACK_ICON = "assets/icons/default-contact.png";
  
  if (!cardWrapper) {
    console.error("Contact card wrapper not found");
    return;
  }
  
  // Show loading state
  cardWrapper.innerHTML = '<div class="loading">Loading contacts</div>';
  
  // Fetch contact data with error handling
  fetch("../data/json/contact.json")
    .then(response => {
      if (response.status === 404) {
        throw new Error('Contact data file not found');
      }
      if (!response.ok) {
        throw new Error(`Network response was not ok: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      if (!Array.isArray(data) || !data.length) {
        cardWrapper.innerHTML = '<p style="text-align: center; color: #666;">No contact methods found.</p>';
        return;
      }
      
      // Create cards efficiently
      const fragment = document.createDocumentFragment();
      data.forEach((item, index) => {
        const card = createContactCard(item, index);
        fragment.appendChild(card);
      });
      
      cardWrapper.innerHTML = "";
      cardWrapper.appendChild(fragment);
    })
    .catch(error => {
      console.error("Error loading contact data:", error);
      cardWrapper.innerHTML = `
        <div style="text-align: center; padding: 2rem;">
          <p style="color: #d32f2f; margin-bottom: 1rem;">
            Unable to load contact information.
          </p>
          <button onclick="location.reload()" style="
            padding: 0.5rem 1rem;
            background: #0288d1;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
          ">
            Retry
          </button>
        </div>
      `;
    });
});

function createContactCard(item, index) {
  const {
    icon = "assets/icons/default-contact.png",
    type = "Contact",
    title = "Untitled",
    description = "",
    link = "#",
    buttonText = "Contact"
  } = item;
  
  const flipCard = document.createElement("div");
  flipCard.classList.add("flip-card");
  flipCard.style.setProperty("--index", index);
  
  const flipCardInner = document.createElement("div");
  flipCardInner.classList.add("flip-card-inner");
  
  // Front side
  const frontSide = document.createElement("div");
  frontSide.classList.add("flip-card-front");
  frontSide.title = type;
  
  const frontImg = document.createElement("img");
  frontImg.src = icon;
  frontImg.alt = `${type} Icon`;
  frontImg.loading = "lazy";
  frontImg.onerror = function() {
    this.src = "assets/icons/default-contact.png";
  };
  
  const frontTitle = document.createElement("h3");
  frontTitle.textContent = title;
  
  const frontDesc = document.createElement("p");
  frontDesc.textContent = description;
  
  frontSide.appendChild(frontImg);
  frontSide.appendChild(frontTitle);
  frontSide.appendChild(frontDesc);
  
  // Back side
  const backSide = document.createElement("div");
  backSide.classList.add("flip-card-back");
  
  const backTitle = document.createElement("h3");
  backTitle.textContent = title;
  
  const backDesc = document.createElement("p");
  backDesc.textContent = description;
  
  const backLink = document.createElement("a");
  backLink.href = link;
  backLink.target = "_blank";
  backLink.rel = "noopener noreferrer";
  backLink.textContent = buttonText;
  
  backSide.appendChild(backTitle);
  backSide.appendChild(backDesc);
  backSide.appendChild(backLink);
  
  // Assemble card
  flipCardInner.appendChild(frontSide);
  flipCardInner.appendChild(backSide);
  flipCard.appendChild(flipCardInner);
  
  // Event handlers
  flipCard.addEventListener("click", (e) => {
    if (e.target.tagName !== 'A') {
      flipCardInner.classList.toggle("flipped");
    }
  });
  
  flipCard.setAttribute("tabindex", "0");
  flipCard.setAttribute("role", "button");
  flipCard.setAttribute("aria-label", `${title} contact card. Press Enter to flip.`);
  
  flipCard.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      flipCardInner.classList.toggle("flipped");
    }
  });
  
  backLink.addEventListener("click", (e) => {
    e.stopPropagation();
  });
  
  return flipCard;
}
