// ============ PENSIÓN SEÑORA MYRIAM · JS ============

// Año en el footer
document.getElementById("year").textContent = new Date().getFullYear();

// Cerrar el menú móvil de Bootstrap al hacer clic en un link
const navMain = document.getElementById("navMain");
if (navMain) {
  navMain.querySelectorAll(".nav-link").forEach((link) => {
    link.addEventListener("click", () => {
      const collapse = bootstrap.Collapse.getOrCreateInstance(navMain);
      if (navMain.classList.contains("show")) collapse.hide();
    });
  });
}

// Animación reveal on scroll (IntersectionObserver)
const revealEls = document.querySelectorAll(".reveal, .reveal-x");
const io = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add("in");
        io.unobserve(e.target);
      }
    });
  },
  { threshold: 0.15 }
);
revealEls.forEach((el) => io.observe(el));
