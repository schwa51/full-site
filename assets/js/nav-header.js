// add classes for mobile navigation toggling
var CSbody = document.querySelector("body");
const CSnavbarMenu = document.querySelector("#cs-navigation");
const CShamburgerMenu = document.querySelector("#cs-navigation .cs-toggle");
const desktopMediaQuery = window.matchMedia("(min-width: 64rem)");
const darkModeToggle = document.querySelector("#dark-mode-toggle");
const darkModePreferenceKey = "site-dark-mode";

function readDarkModePreference() {
    try {
        const storedPreference = localStorage.getItem(darkModePreferenceKey);
        if (storedPreference !== null) return storedPreference === "true";
    } catch (error) {
        // Storage may be unavailable in privacy-restricted browsers.
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyDarkMode(isDark) {
    CSbody.classList.toggle("dark-mode", isDark);
    if (!darkModeToggle) return;
    darkModeToggle.setAttribute("aria-pressed", String(isDark));
    darkModeToggle.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
    darkModeToggle.title = isDark ? "Switch to light mode" : "Switch to dark mode";
}

applyDarkMode(readDarkModePreference());

if (darkModeToggle) {
    darkModeToggle.addEventListener("click", () => {
        const isDark = !CSbody.classList.contains("dark-mode");
        applyDarkMode(isDark);
        try {
            localStorage.setItem(darkModePreferenceKey, String(isDark));
        } catch (error) {
            // The toggle still works for this page when storage is unavailable.
        }
    });
}

if (CShamburgerMenu && CSnavbarMenu) {
    CShamburgerMenu.addEventListener("click", () => {
        const expanded = CSnavbarMenu.classList.toggle("cs-active");
        CShamburgerMenu.classList.toggle("cs-active", expanded);
        CSbody.classList.toggle("cs-open", expanded);
        CShamburgerMenu.setAttribute("aria-expanded", String(expanded));
    });
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
    if (submenu) submenu.style.removeProperty("--nested-drop-top");
    if (!submenu || !desktopMediaQuery.matches) {
        dropdownItem.classList.remove("cs-open-left", "cs-open-down");
        return;
    }

    dropdownItem.classList.remove("cs-open-left", "cs-open-down");

    const isNested = submenu.classList.contains("cs-drop-ul-nested");
    const containingMenu = dropdownItem.parentElement;
    const parentDropdown = containingMenu && containingMenu.closest(".cs-dropdown");
    const isDeepNested = isNested && containingMenu && containingMenu.classList.contains("cs-drop-ul-nested");
    const wouldReverseIntoParentMenus = isDeepNested && parentDropdown && !parentDropdown.classList.contains("cs-open-left");

    const parentRect = dropdownItem.getBoundingClientRect();
    const submenuWidth = Math.max(submenu.offsetWidth, submenu.scrollWidth, 220);
    const submenuHeight = Math.max(submenu.scrollHeight, submenu.offsetHeight, 0);
    const childFlyoutWidth = isNested
        ? Array.from(submenu.children).reduce((widest, child) => {
            if (!child.classList || !child.classList.contains("cs-dropdown")) return widest;
            const childSubmenu = getDirectSubmenu(child);
            if (!childSubmenu) return widest;
            return Math.max(widest, childSubmenu.offsetWidth, childSubmenu.scrollWidth, 220);
        }, 0)
        : 0;
    const cascadeWidth = submenuWidth + childFlyoutWidth;

    const viewportPadding = 12;
    const fitsRight = isNested
        ? parentRect.right + cascadeWidth + viewportPadding <= window.innerWidth
        : parentRect.left + submenuWidth + viewportPadding <= window.innerWidth;
    const fitsLeft = isNested
        ? parentRect.left - cascadeWidth - viewportPadding >= 0
        : parentRect.right - submenuWidth - viewportPadding >= 0;
    const fitsBelow = parentRect.bottom + submenuHeight + viewportPadding <= window.innerHeight;

    const openDown = () => {
        if (isDeepNested) {
            const belowParentOffset = Math.max(
                dropdownItem.offsetHeight,
                containingMenu.scrollHeight - dropdownItem.offsetTop
            );
            submenu.style.setProperty("--nested-drop-top", `${belowParentOffset}px`);
        }
        dropdownItem.classList.add("cs-open-down");
    };

    const parentOpensLeft = isDeepNested && parentDropdown && parentDropdown.classList.contains("cs-open-left");

    if (parentOpensLeft && fitsLeft) {
        dropdownItem.classList.add("cs-open-left");
    } else if (!fitsRight) {
        if (wouldReverseIntoParentMenus) {
            openDown();
        } else if (fitsLeft) {
            dropdownItem.classList.add("cs-open-left");
        } else {
            openDown();
        }
    } else if (!fitsBelow && !isNested) {
        openDown();
    }
}

function positionAllSubmenus(dropDowns) {
    dropDowns.forEach((item) => setSubmenuDirection(item));
}

function getDisclosureButton(dropdownItem) {
    return dropdownItem.querySelector(":scope > .cs-nav-group, :scope > .cs-submenu-toggle");
}

function setDropdownExpanded(dropdownItem, expanded) {
    dropdownItem.classList.toggle("cs-active", expanded);
    getDisclosureButton(dropdownItem)?.setAttribute("aria-expanded", String(expanded));
}

function closeSiblingDropdowns(dropdownItem) {
    const parentList = dropdownItem.parentElement;
    if (!parentList) return;
    const siblings = Array.from(parentList.children).filter(
        (sibling) => sibling !== dropdownItem && sibling.classList && sibling.classList.contains("cs-dropdown")
    );
    siblings.forEach((sibling) => setDropdownExpanded(sibling, false));
}

const dropDowns = Array.from(document.querySelectorAll("#cs-navigation .cs-dropdown"));
for (const item of dropDowns) {
    const button = getDisclosureButton(item);
    const isGroup = item.classList.contains("cs-group-dropdown");

    button?.addEventListener("click", () => {
        const expanded = !item.classList.contains("cs-active");
        if (expanded) closeSiblingDropdowns(item);
        setDropdownExpanded(item, expanded);
        setSubmenuDirection(item);
    });
    item.addEventListener("mouseenter", () => {
        if (desktopMediaQuery.matches && isGroup) setDropdownExpanded(item, true);
        setSubmenuDirection(item);
    });
    item.addEventListener("focusin", () => setSubmenuDirection(item));

    if (isGroup) {
        item.addEventListener("mouseleave", () => {
            if (desktopMediaQuery.matches && !item.contains(document.activeElement)) setDropdownExpanded(item, false);
        });
        item.addEventListener("focusout", (event) => {
            if (desktopMediaQuery.matches && !item.contains(event.relatedTarget) && !item.matches(":hover")) {
                setDropdownExpanded(item, false);
            }
        });
    }
    item.addEventListener("keydown", (event) => {
        if (event.key !== "Escape" || !item.classList.contains("cs-active")) return;
        event.stopPropagation();
        setDropdownExpanded(item, false);
        button?.focus();
    });
}

window.addEventListener("resize", () => positionAllSubmenus(dropDowns));
desktopMediaQuery.addEventListener("change", () => {
    dropDowns.forEach((item) => setDropdownExpanded(item, false));
    positionAllSubmenus(dropDowns);
});
positionAllSubmenus(dropDowns);
                                
