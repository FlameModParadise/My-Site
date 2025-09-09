// Optimized FAQ JavaScript
document.addEventListener("DOMContentLoaded", () => {
  const faqContainer = document.getElementById("faq-container");
  const openAllBtn = document.getElementById("openAllBtn");
  const closeAllBtn = document.getElementById("closeAllBtn");

  if (!faqContainer) {
    console.error("FAQ container not found");
    return;
  }

  // Fetch FAQ data
  fetch("../data/json/faq.json")
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Network response was not ok: ${response.status}`);
      }
      return response.json();
    })
    .then((faqData) => {
      if (!Array.isArray(faqData) || !faqData.length) {
        faqContainer.innerHTML = "<p>No FAQ items available at this time.</p>";
        return;
      }

      // Create FAQ items efficiently
      const fragment = document.createDocumentFragment();
      faqData.forEach((item, index) => {
        const faqItem = createFAQItem(item, index);
        fragment.appendChild(faqItem);
      });
      
      faqContainer.appendChild(fragment);
      applyURLHash();
    })
    .catch((error) => {
      console.error("Error fetching FAQ data:", error);
      faqContainer.innerHTML = "<p>Could not load FAQs at this time.</p>";
    });

  // Control buttons
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
});

function createFAQItem(item, index) {
  const questionText = item.question || "Untitled Question";
  const answerText = item.answer || "No answer provided.";
  const faqId = `faq-${index}`;

  const faqItem = document.createElement("div");
  faqItem.classList.add("faq-item");
  faqItem.setAttribute("aria-expanded", "false");

  const questionEl = document.createElement("h2");
  questionEl.classList.add("faq-question");
  questionEl.id = faqId;
  questionEl.textContent = questionText;

  const answerEl = document.createElement("p");
  answerEl.classList.add("faq-answer");
  answerEl.textContent = answerText;

  // Toggle event
  questionEl.addEventListener("click", () => {
    const isOpen = faqItem.classList.toggle("open");
    answerEl.classList.toggle("visible");
    faqItem.setAttribute("aria-expanded", isOpen);

    // Highlight current item
    document.querySelectorAll(".faq-item").forEach((item) => {
      item.classList.remove("highlight");
    });
    if (isOpen) {
      faqItem.classList.add("highlight");
    }

    // Update URL hash
    if (isOpen) {
      location.hash = faqId;
    } else {
      history.replaceState(null, "", " ");
    }
  });

  faqItem.appendChild(questionEl);
  faqItem.appendChild(answerEl);
  
  return faqItem;
}

// Open FAQ item if URL contains a hash
function applyURLHash() {
  const hash = location.hash.replace("#", "");
  if (!hash) return;

  const questionEl = document.getElementById(hash);
  if (questionEl && questionEl.classList.contains("faq-question")) {
    const parent = questionEl.parentElement;
    parent.classList.add("open");
    parent.setAttribute("aria-expanded", "true");
    parent.querySelector(".faq-answer").classList.add("visible");
    questionEl.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}
