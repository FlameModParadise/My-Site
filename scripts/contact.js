document.addEventListener("DOMContentLoaded", () => {
    const cardWrapper = document.getElementById("contact-card-wrapper");
  
    // Fetch the contact data from contact.json
    fetch("../json/contact.json")
      .then(response => {
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        return response.json();
      })
      .then(data => {
        // Clear existing content
        cardWrapper.innerHTML = "";
        
        // For each contact method, create a flip card
        data.forEach(item => {
          // Create the main flip card container
          const flipCard = document.createElement("div");
          flipCard.classList.add("flip-card");
  
          // Create the inner container
          const flipCardInner = document.createElement("div");
          flipCardInner.classList.add("flip-card-inner");
  
          // Create the front side
          const frontSide = document.createElement("div");
          frontSide.classList.add("flip-card-front");
  
          // Create front content
          const frontImg = document.createElement("img");
          frontImg.src = item.icon;
          frontImg.alt = `${item.type} Icon`;
  
          const frontTitle = document.createElement("h3");
          frontTitle.textContent = item.title;
  
          const frontDesc = document.createElement("p");
          frontDesc.textContent = item.description;
  
          frontSide.appendChild(frontImg);
          frontSide.appendChild(frontTitle);
          frontSide.appendChild(frontDesc);
  
          // Create the back side
          const backSide = document.createElement("div");
          backSide.classList.add("flip-card-back");
  
          const backTitle = document.createElement("h3");
          backTitle.textContent = item.title;
  
          const backDesc = document.createElement("p");
          backDesc.textContent = item.description;
  
          const backLink = document.createElement("a");
          backLink.href = item.link;
          backLink.target = "_blank";
          backLink.textContent = item.buttonText;
  
          backSide.appendChild(backTitle);
          backSide.appendChild(backDesc);
          backSide.appendChild(backLink);
  
          // Assemble the flip card
          flipCardInner.appendChild(frontSide);
          flipCardInner.appendChild(backSide);
          flipCard.appendChild(flipCardInner);
          cardWrapper.appendChild(flipCard);
  
          // For mobile devices where hover is not reliable, we add an event listener:
          flipCard.addEventListener("click", () => {
            // Toggle a "flipped" class on the inner container
            flipCardInner.classList.toggle("flipped");
          });
        });
      })
      .catch(error => {
        console.error("Error loading contact data:", error);
        cardWrapper.innerHTML = "<p>Unable to load contact information at this time.</p>";
      });
  });
  