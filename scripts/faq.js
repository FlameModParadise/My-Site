document.addEventListener("DOMContentLoaded", () => {
  const faqContainer = document.getElementById("faq-container");
  const openAllBtn = document.getElementById("openAllBtn");
  const closeAllBtn = document.getElementById("closeAllBtn");

  // Fetch the JSON data for FAQs
  fetch("../json/faq.json")
    .then((response) => response.json())
    .then((faqData) => {
      // Render each FAQ item
      faqData.forEach((item, index) => {
        // Create the container for each Q&A
        const faqItem = document.createElement("div");
        faqItem.classList.add("faq-item");
        faqItem.setAttribute("aria-expanded", "false");

        // Unique ID for direct linking: "faq-0", "faq-1", etc.
        const faqId = `faq-${index}`;

        // Create the question element
        const questionEl = document.createElement("h2");
        questionEl.classList.add("faq-question");
        questionEl.id = faqId;
        questionEl.textContent = item.question;

        // Create the answer element
        const answerEl = document.createElement("p");
        answerEl.classList.add("faq-answer");
        answerEl.textContent = item.answer;

        // Toggle event – no scrolling is performed
        questionEl.addEventListener("click", () => {
          const isOpen = faqItem.classList.toggle("open");
          answerEl.classList.toggle("visible");
          faqItem.setAttribute("aria-expanded", isOpen);

        });
        // Combine elements and append to container
        faqItem.appendChild(questionEl);
        faqItem.appendChild(answerEl);
        faqContainer.appendChild(faqItem);
      });

      // Check if URL has a hash indicating a specific FAQ item to open
      applyURLHash();
    })
    .catch((error) => {
      console.error("Error fetching FAQ data:", error);
      faqContainer.innerHTML = "<p>Could not load FAQs at this time.</p>";
    });

  // "Open All" / "Close All" buttons (if present)
  openAllBtn?.addEventListener("click", () => {
    document.querySelectorAll(".faq-item").forEach((item) => {
      item.classList.add("open");
      item.setAttribute("aria-expanded", "true");
      item.querySelector(".faq-answer").classList.add("visible");
    });
  });

  closeAllBtn?.addEventListener("click", () => {
    document.querySelectorAll(".faq-item").forEach((item) => {
      item.classList.remove("open");
      item.setAttribute("aria-expanded", "false");
      item.querySelector(".faq-answer").classList.remove("visible");
    });
    history.replaceState(null, null, " ");
  });

  // Open FAQ item if URL contains a hash (e.g., #faq-0)
  function applyURLHash() {
    const hash = location.hash.replace("#", "");
    if (!hash) return;
    const questionEl = document.getElementById(hash);
    if (questionEl && questionEl.classList.contains("faq-question")) {
      const parent = questionEl.parentElement;
      parent.classList.add("open");
      parent.setAttribute("aria-expanded", "true");
      parent.querySelector(".faq-answer").classList.add("visible");
    }
  }
});
