/* ======================================================= */
/*              CAROUSEL FUNCTIONALITY                     */
/* ======================================================= */

document.addEventListener('DOMContentLoaded', function() {
  const carouselItems = document.querySelectorAll('.carousel-item');
  const dots = document.querySelectorAll('.dot');
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');
  
  let currentIndex = 0;

  // Update carousel display
  function updateCarousel(index) {
    // Validate index
    if (index >= carouselItems.length) {
      currentIndex = 0;
    } else if (index < 0) {
      currentIndex = carouselItems.length - 1;
    } else {
      currentIndex = index;
    }

    // Remove active class from all items and dots
    carouselItems.forEach((item, i) => {
      item.classList.remove('active');
      if (i === currentIndex) {
        item.classList.add('active');
      }
    });

    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === currentIndex);
    });

    console.log('Current carousel index:', currentIndex);
  }

  // Next slide
  function nextSlide() {
    updateCarousel(currentIndex + 1);
  }

  // Previous slide
  function prevSlide() {
    updateCarousel(currentIndex - 1);
  }

  // Event listeners
  prevBtn.addEventListener('click', prevSlide);
  nextBtn.addEventListener('click', nextSlide);

  // Dot navigation
  dots.forEach(dot => {
    dot.addEventListener('click', (e) => {
      const index = parseInt(e.target.dataset.index);
      updateCarousel(index);
    });
  });

  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') prevSlide();
    if (e.key === 'ArrowRight') nextSlide();
  });

  // Initialize carousel
  updateCarousel(0);
});
