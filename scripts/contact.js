// Updated Contact Page JavaScript
document.addEventListener("DOMContentLoaded", () => {
  const cardWrapper = document.getElementById("contact-card-wrapper");
  const FALLBACK_ICON = "assets/icons/default-contact.png";
  
  // Show loading state with spinner
  cardWrapper.innerHTML = '<div class="loading">Loading contacts</div>';
  
  // Fetch contact data
  fetch("../json/contact.json")
    .then(response => {
      if (!response.ok) {
        throw new Error(`Network response was not ok: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      // Clear wrapper
      cardWrapper.innerHTML = "";
      
      if (!Array.isArray(data) || !data.length) {
        cardWrapper.innerHTML = '<p style="text-align: center; color: #666;">No contact methods found.</p>';
        return;
      }
      
      // Create cards with staggered animation
      data.forEach((item, index) => {
        const {
          icon = FALLBACK_ICON,
          type = "Contact",
          title = "Untitled",
          description = "",
          link = "#",
          buttonText = "Contact"
        } = item;
        
        // Create flip card
        const flipCard = document.createElement("div");
        flipCard.classList.add("flip-card");
        // Set custom property for staggered animation
        flipCard.style.setProperty("--index", index);
        
        const flipCardInner = document.createElement("div");
        flipCardInner.classList.add("flip-card-inner");
        
        // ========== FRONT SIDE ==========
        const frontSide = document.createElement("div");
        frontSide.classList.add("flip-card-front");
        frontSide.title = type;
        
        const frontImg = document.createElement("img");
        frontImg.src = icon;
        frontImg.alt = `${type} Icon`;
        frontImg.loading = "lazy"; // Lazy load images
        frontImg.onerror = function() {
          this.src = FALLBACK_ICON; // Fallback if image fails
        };
        
        const frontTitle = document.createElement("h3");
        frontTitle.textContent = title;
        
        const frontDesc = document.createElement("p");
        frontDesc.textContent = description;
        
        frontSide.appendChild(frontImg);
        frontSide.appendChild(frontTitle);
        frontSide.appendChild(frontDesc);
        
        // ========== BACK SIDE ==========
        const backSide = document.createElement("div");
        backSide.classList.add("flip-card-back");
        
        const backTitle = document.createElement("h3");
        backTitle.textContent = title;
        
        const backDesc = document.createElement("p");
        backDesc.textContent = description;
        
        const backLink = document.createElement("a");
        backLink.href = link;
        backLink.target = "_blank";
        backLink.rel = "noopener noreferrer"; // Security
        backLink.textContent = buttonText;
        
        backSide.appendChild(backTitle);
        backSide.appendChild(backDesc);
        backSide.appendChild(backLink);
        
        // ========== Assemble Card ==========
        flipCardInner.appendChild(frontSide);
        flipCardInner.appendChild(backSide);
        flipCard.appendChild(flipCardInner);
        cardWrapper.appendChild(flipCard);
        
        // ========== Interaction Handlers ==========
        // Click to flip (for mobile and accessibility)
        flipCard.addEventListener("click", (e) => {
          // Don't flip if clicking the link
          if (e.target.tagName !== 'A') {
            flipCardInner.classList.toggle("flipped");
          }
        });
        
        // Keyboard accessibility
        flipCard.setAttribute("tabindex", "0");
        flipCard.setAttribute("role", "button");
        flipCard.setAttribute("aria-label", `${title} contact card. Press Enter to flip.`);
        
        flipCard.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            flipCardInner.classList.toggle("flipped");
          }
        });
        
        // Prevent flip when clicking the link
        backLink.addEventListener("click", (e) => {
          e.stopPropagation();
        });
      });
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