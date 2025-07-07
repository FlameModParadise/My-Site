document.addEventListener("DOMContentLoaded", () => {
  const categoryOverview = document.getElementById("categoryOverview");
  const categoryDetail = document.getElementById("categoryDetail");
  const backButton = document.getElementById("backButton");
  const detailTitle = document.getElementById("detailTitle");
  const detailPhotosDiv = document.getElementById("detailPhotos");

  let groupedReviews = {};

  // Fetch reviews data from json/reviews.json
  fetch("../json/reviews.json")
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to load reviews data. Status: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      if (!Array.isArray(data) || data.length === 0) {
        categoryOverview.innerHTML = "<p>No reviews available at this time.</p>";
        return;
      }

      // New compact format: each category contains an array of images
      groupedReviews = {};
      data.forEach((item) => {
        const cat = item.category || "Others";
        groupedReviews[cat] = item.images || [];
      });

      buildCategoryOverview();
    })
    .catch((error) => {
      console.error("Error loading reviews:", error);
      categoryOverview.innerHTML = "<p>Sorry, no reviews are available at this time.</p>";
    });

  // Build the category overview (stacked collage)
  function buildCategoryOverview() {
    categoryOverview.innerHTML = "";
    Object.keys(groupedReviews).forEach((category) => {
      const images = groupedReviews[category] || [];

      const catCard = document.createElement("div");
      catCard.classList.add("category-card");

      const collage = document.createElement("div");
      collage.classList.add("stacked-collage");

      // Use up to 3 images for the collage
      const coverImages = images.slice(0, 3);
      coverImages.forEach((imgSrc, idx) => {
        const img = document.createElement("img");
        img.src = imgSrc || "../assets/placeholder.jpg";
        img.alt = `${category} cover ${idx + 1}`;
        img.onerror = () => {
          img.src = "../assets/placeholder.jpg";
        };
        img.classList.add(`stacked-${idx + 1}`);
        collage.appendChild(img);
      });

      const label = document.createElement("h3");
      label.textContent = `${category} (${images.length} images)`;

      catCard.appendChild(collage);
      catCard.appendChild(label);

      // Click event => show detail for this category
      catCard.addEventListener("click", () => {
        showCategoryDetail(category);
      });

      categoryOverview.appendChild(catCard);
    });
  }

  // Show full detail gallery for a selected category
  function showCategoryDetail(category) {
    categoryOverview.classList.add("hidden");
    categoryDetail.classList.remove("hidden");
    detailTitle.textContent = category;
    detailPhotosDiv.innerHTML = "";

    const images = groupedReviews[category] || [];
    if (images.length === 0) {
      detailPhotosDiv.innerHTML = "<p>No images found for this category.</p>";
      return;
    }

    images.forEach((src) => {
      const img = document.createElement("img");
      img.src = src || "../assets/placeholder.jpg";
      img.alt = `${category} full image`;
      img.onerror = () => {
        img.src = "../assets/placeholder.jpg";
      };
      detailPhotosDiv.appendChild(img);
    });
  }

  // "Back" button returns to overview
  backButton.addEventListener("click", () => {
    categoryDetail.classList.add("hidden");
    categoryOverview.classList.remove("hidden");
  });

  // Add a single event listener to detailPhotosDiv to open modal on image click
  detailPhotosDiv.addEventListener("click", (e) => {
    if (e.target && e.target.tagName === "IMG") {
      openImageModal(e.target.src, e.target.alt);
    }
  });

  // Enhanced modal with zoom and pan functionality
  function openImageModal(src, alt) {
    let currentZoom = 1;
    const minZoom = 0.5;
    const maxZoom = 3;
    const zoomStep = 0.25;
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let translateX = 0;
    let translateY = 0;

    // Create modal overlay
    const modal = document.createElement("div");
    modal.classList.add("image-modal");

    // Create wrapper for better centering
    const wrapper = document.createElement("div");
    wrapper.classList.add("image-modal-wrapper");

    // Create modal content container
    const modalContent = document.createElement("div");
    modalContent.classList.add("image-modal-content");

    // Create the image element
    const largeImg = document.createElement("img");
    largeImg.src = src;
    largeImg.alt = alt;
    largeImg.onerror = () => {
      largeImg.src = "../assets/placeholder.jpg";
    };

    // Create close button
    const closeBtn = document.createElement("button");
    closeBtn.classList.add("modal-close-btn");
    closeBtn.innerHTML = "✕";
    closeBtn.onclick = () => document.body.removeChild(modal);

    // Create zoom controls
    const zoomControls = document.createElement("div");
    zoomControls.classList.add("zoom-controls");

    const zoomOutBtn = document.createElement("button");
    zoomOutBtn.classList.add("zoom-btn");
    zoomOutBtn.innerHTML = "−";
    
    const zoomLevel = document.createElement("span");
    zoomLevel.classList.add("zoom-level");
    zoomLevel.textContent = "100%";
    
    const zoomInBtn = document.createElement("button");
    zoomInBtn.classList.add("zoom-btn");
    zoomInBtn.innerHTML = "+";

    const resetBtn = document.createElement("button");
    resetBtn.classList.add("zoom-btn");
    resetBtn.innerHTML = "⟲";
    resetBtn.title = "Reset";

    // Update zoom function
    function updateZoom(newZoom) {
      currentZoom = Math.max(minZoom, Math.min(maxZoom, newZoom));
      largeImg.style.transform = `scale(${currentZoom}) translate(${translateX}px, ${translateY}px)`;
      zoomLevel.textContent = `${Math.round(currentZoom * 100)}%`;
      
      // Update button states
      zoomOutBtn.disabled = currentZoom <= minZoom;
      zoomInBtn.disabled = currentZoom >= maxZoom;
      
      // Reset position if zoomed out
      if (currentZoom <= 1) {
        translateX = 0;
        translateY = 0;
        largeImg.style.transform = `scale(${currentZoom})`;
      }
    }

    // Zoom button handlers
    zoomOutBtn.onclick = () => updateZoom(currentZoom - zoomStep);
    zoomInBtn.onclick = () => updateZoom(currentZoom + zoomStep);
    resetBtn.onclick = () => {
      translateX = 0;
      translateY = 0;
      updateZoom(1);
    };

    // Mouse wheel zoom
    modalContent.addEventListener("wheel", (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -zoomStep : zoomStep;
      updateZoom(currentZoom + delta);
    });

    // Touch pinch zoom for mobile
    let lastTouchDistance = 0;
    modalContent.addEventListener("touchstart", (e) => {
      if (e.touches.length === 2) {
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        lastTouchDistance = Math.hypot(
          touch2.clientX - touch1.clientX,
          touch2.clientY - touch1.clientY
        );
      }
    });

    modalContent.addEventListener("touchmove", (e) => {
      if (e.touches.length === 2 && lastTouchDistance > 0) {
        e.preventDefault();
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const distance = Math.hypot(
          touch2.clientX - touch1.clientX,
          touch2.clientY - touch1.clientY
        );
        const scale = distance / lastTouchDistance;
        updateZoom(currentZoom * scale);
        lastTouchDistance = distance;
      }
    });

    // Pan functionality (only when zoomed in)
    modalContent.addEventListener("mousedown", (e) => {
      if (currentZoom > 1) {
        isDragging = true;
        startX = e.clientX - translateX;
        startY = e.clientY - translateY;
        modalContent.style.cursor = "grabbing";
      }
    });

    modalContent.addEventListener("mousemove", (e) => {
      if (isDragging && currentZoom > 1) {
        e.preventDefault();
        translateX = e.clientX - startX;
        translateY = e.clientY - startY;
        largeImg.style.transform = `scale(${currentZoom}) translate(${translateX}px, ${translateY}px)`;
      }
    });

    modalContent.addEventListener("mouseup", () => {
      isDragging = false;
      modalContent.style.cursor = currentZoom > 1 ? "move" : "default";
    });

    modalContent.addEventListener("mouseleave", () => {
      isDragging = false;
      modalContent.style.cursor = currentZoom > 1 ? "move" : "default";
    });

    // Double-click to zoom
    largeImg.addEventListener("dblclick", (e) => {
      e.preventDefault();
      if (currentZoom === 1) {
        updateZoom(2);
      } else {
        translateX = 0;
        translateY = 0;
        updateZoom(1);
      }
    });

    // Assemble the modal
    zoomControls.appendChild(zoomOutBtn);
    zoomControls.appendChild(zoomLevel);
    zoomControls.appendChild(zoomInBtn);
    zoomControls.appendChild(resetBtn);
    
    modalContent.appendChild(largeImg);
    wrapper.appendChild(modalContent);
    wrapper.appendChild(closeBtn);
    wrapper.appendChild(zoomControls);
    modal.appendChild(wrapper);
    document.body.appendChild(modal);

    // Close modal when clicking outside
    modal.addEventListener("click", (event) => {
      if (event.target === modal) {
        document.body.removeChild(modal);
      }
    });

    // Keyboard controls
    document.addEventListener("keydown", function handleKeyPress(e) {
      if (!document.body.contains(modal)) {
        document.removeEventListener("keydown", handleKeyPress);
        return;
      }
      
      switch(e.key) {
        case "Escape":
          document.body.removeChild(modal);
          document.removeEventListener("keydown", handleKeyPress);
          break;
        case "+":
        case "=":
          updateZoom(currentZoom + zoomStep);
          break;
        case "-":
        case "_":
          updateZoom(currentZoom - zoomStep);
          break;
        case "0":
          translateX = 0;
          translateY = 0;
          updateZoom(1);
          break;
      }
    });
  }
});