// add classes for mobile navigation toggling
var CSbody = document.querySelector("body");
const CSnavbarMenu = document.querySelector("#cs-navigation");
const CShamburgerMenu = document.querySelector("#cs-navigation .cs-toggle");
const desktopMediaQuery = window.matchMedia("(min-width: 64rem)");

if (CShamburgerMenu && CSnavbarMenu) {
    CShamburgerMenu.addEventListener("click", function() {
        CShamburgerMenu.classList.toggle("cs-active");
        CSnavbarMenu.classList.toggle("cs-active");
        CSbody.classList.toggle("cs-open");
        // run the function to check the aria-expanded value
        ariaExpanded();
    });
}

// checks the value of aria expanded on the cs-ul and changes it accordingly whether it is expanded or not
function ariaExpanded() {
    const csUL = document.querySelector("#cs-expanded");
    if (!csUL) return;
    const csExpanded = csUL.getAttribute("aria-expanded");

    if (csExpanded === "false") {
        csUL.setAttribute("aria-expanded", "true");
    } else {
        csUL.setAttribute("aria-expanded", "false");
    }
}

// This script adds a class to the body after scrolling 100px
// and we used these body.scroll styles to create some on scroll
// animations with the navbar
document.addEventListener("scroll", () => {
    const scroll = document.documentElement.scrollTop;
    if (scroll >= 100) {
        document.querySelector("body").classList.add("scroll");
    } else {
        document.querySelector("body").classList.remove("scroll");
    }
});

// Pick the direct child submenu for a dropdown list item
function getDirectSubmenu(dropdownItem) {
    return Array.from(dropdownItem.children).find((child) => child.classList && child.classList.contains("cs-drop-ul"));
}

function setSubmenuDirection(dropdownItem) {
    const submenu = getDirectSubmenu(dropdownItem);
    if (!submenu || !desktopMediaQuery.matches) {
        dropdownItem.classList.remove("cs-open-left", "cs-open-down");
        return;
    }

    dropdownItem.classList.remove("cs-open-left", "cs-open-down");

    const isNested = submenu.classList.contains("cs-drop-ul-nested");

    const parentRect = dropdownItem.getBoundingClientRect();
    const submenuWidth = Math.max(submenu.offsetWidth, submenu.scrollWidth, 220);
    const submenuHeight = Math.max(submenu.scrollHeight, submenu.offsetHeight, 0);

    const viewportPadding = 12;
    const fitsRight = isNested
        ? parentRect.right + submenuWidth + viewportPadding <= window.innerWidth
        : parentRect.left + submenuWidth + viewportPadding <= window.innerWidth;
    const fitsLeft = isNested
        ? parentRect.left - submenuWidth - viewportPadding >= 0
        : parentRect.right - submenuWidth - viewportPadding >= 0;
    const fitsBelow = parentRect.bottom + submenuHeight + viewportPadding <= window.innerHeight;

    if (!fitsRight) {
        if (fitsLeft) {
            dropdownItem.classList.add("cs-open-left");
        } else {
            dropdownItem.classList.add("cs-open-down");
        }
    } else if (!fitsBelow) {
        dropdownItem.classList.add("cs-open-down");
    }
}

function positionAllSubmenus(dropDowns) {
    dropDowns.forEach((item) => setSubmenuDirection(item));
}

function getDirectTriggerLink(dropdownItem) {
    return Array.from(dropdownItem.children).find((child) => child.tagName === "A");
}

function closeSiblingDropdowns(dropdownItem) {
    const parentList = dropdownItem.parentElement;
    if (!parentList) return;
    const siblings = Array.from(parentList.children).filter(
        (sibling) => sibling !== dropdownItem && sibling.classList && sibling.classList.contains("cs-dropdown")
    );
    siblings.forEach((sibling) => sibling.classList.remove("cs-active"));
}

// mobile nav toggle code
const dropDowns = Array.from(document.querySelectorAll("#cs-navigation .cs-dropdown"));
for (const item of dropDowns) {
    const triggerLink = getDirectTriggerLink(item);

    if (triggerLink) {
        triggerLink.addEventListener("click", (event) => {
            if (desktopMediaQuery.matches) return;

            const submenu = getDirectSubmenu(item);
            if (!submenu) return;

            // On mobile, any item with children acts as an accordion toggle only.
            event.preventDefault();
            event.stopPropagation();
            if (!item.classList.contains("cs-active")) {
                closeSiblingDropdowns(item);
            }
            item.classList.toggle("cs-active");
            setSubmenuDirection(item);
        });
    }

    const onClick = (event) => {
        if (event.target.closest("a")) return;
        event.stopPropagation();
        if (!item.classList.contains("cs-active")) {
            closeSiblingDropdowns(item);
        }
        item.classList.toggle("cs-active");
        setSubmenuDirection(item);
    };
    item.addEventListener("click", onClick);
    item.addEventListener("mouseenter", () => setSubmenuDirection(item));
    item.addEventListener("focusin", () => setSubmenuDirection(item));
}

window.addEventListener("resize", () => positionAllSubmenus(dropDowns));
desktopMediaQuery.addEventListener("change", () => positionAllSubmenus(dropDowns));
positionAllSubmenus(dropDowns);
                                
