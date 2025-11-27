/* ======================================================= */
/*              SCROLL ANIMATIONS HANDLER                  */
/* ======================================================= */

document.addEventListener('DOMContentLoaded', function() {
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
  };

  const observer = new IntersectionObserver(function(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
        entry.target.classList.add('in-view');
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  // Observe mission & vision section
  const missionVisionSection = document.getElementById('mission-vision-statement');
  if (missionVisionSection) {
    missionVisionSection.classList.add('scroll-animate');
    observer.observe(missionVisionSection);
  }

  // Observe all mission vision groups for staggered animation
  const missionVisionGroups = document.querySelectorAll('.mission-vision-group');
  missionVisionGroups.forEach((group, index) => {
    group.classList.add('scroll-item');
    group.style.transitionDelay = `${index * 0.15}s`;
    observer.observe(group);
  });

  // Observe mission statements for bite-size text animations
  const missionStatements = document.querySelectorAll('.mission-statement, .vision-statement');
  missionStatements.forEach((stmt, index) => {
    stmt.classList.add('scroll-text');
    stmt.style.transitionDelay = `${index * 0.1}s`;
    observer.observe(stmt);
  });

  // Observe headers for pop-in animation
  const headers = document.querySelectorAll('#mission-header, #vision-header');
  headers.forEach((header, index) => {
    header.classList.add('scroll-header');
    header.style.transitionDelay = `${index * 0.15}s`;
    observer.observe(header);
  });

  // Observe images for zoom animation
  const images = document.querySelectorAll('.mission-vision-img img, .side-img');
  images.forEach((img, index) => {
    img.classList.add('scroll-image');
    img.style.transitionDelay = `${index * 0.1}s`;
    observer.observe(img);
  });

  // Observe paragraphs for fade animation
  const paragraphs = document.querySelectorAll('#mission-paragraph, #vision-paragraph');
  paragraphs.forEach((para, index) => {
    para.classList.add('scroll-fade');
    para.style.transitionDelay = `${index * 0.1}s`;
    observer.observe(para);
  });

  // Observe footer
  const footer = document.querySelector('footer');
  if (footer) {
    footer.classList.add('scroll-fade');
    observer.observe(footer);
  }

  // Bit-size scroll event for continuous feedback
  window.addEventListener('scroll', function() {
    // Add subtle parallax or continuous scroll feedback if needed
    const scrollProgress = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight);
    document.documentElement.style.setProperty('--scroll-progress', scrollProgress);
  }, { passive: true });
});

//back to top btn
    document.getElementById("backToTopBtn").onclick = function () {
        window.scrollTo({ top: 0, behavior: "smooth" });
    };


