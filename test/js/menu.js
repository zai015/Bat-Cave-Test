// menu.js
document.addEventListener("DOMContentLoaded", () => {
  const buttons = document.querySelectorAll(".filter");
  const yearSpan = document.getElementById("year");
  const menuWrap = document.querySelector(".menu-wrap");

  if (yearSpan) yearSpan.textContent = new Date().getFullYear();

  buttons.forEach(btn => {
    btn.addEventListener("click", () => {

      // Toggle active states
      buttons.forEach(b => {
        b.classList.remove("active");
        b.setAttribute("aria-pressed", "false");
      });
      btn.classList.add("active");
      btn.setAttribute("aria-pressed", "true");

      const cat = btn.dataset.cat;

      // ⬇⬇ IMPORTANT — get cards fresh every click
      const cards = Array.from(document.querySelectorAll(".menu-card"));

      // Visible & hidden lists
      const showCards = cards.filter(c =>
        cat === "all" || c.dataset.category === cat
      );
      const hideCards = cards.filter(c =>
        !(cat === "all" || c.dataset.category === cat)
      );

      // Reorder DOM — append visible first
      showCards.forEach(c => {
        c.style.display = "flex";
        menuWrap.appendChild(c);
      });

      hideCards.forEach(c => {
        c.style.display = "none";
        menuWrap.appendChild(c);
      });
    });
  });
});
