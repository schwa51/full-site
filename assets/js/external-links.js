// /assets/js/external-links.js
document.addEventListener("DOMContentLoaded", () => {
  const origin = window.location.origin;

  document.querySelectorAll("a[href]").forEach(link => {
    const href = link.getAttribute("href");

    // skip anchors, mailto, tel, etc.
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
      return;
    }

    // absolute external links
    if (href.startsWith("http") && !href.startsWith(origin)) {
      link.target = "_blank";
      link.rel = "noopener noreferrer";
    }
  });
});
