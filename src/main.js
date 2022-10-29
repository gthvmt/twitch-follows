const SELECTED_CLASS = "bvruMV";
const SELECTED_CLASS_CHILD = "eKkyLe";
const UNSELECTED_CLASS = "gcMVlg";
const UNSELECTED_CLASS_CHILD = "kfuKtQ";
const ACTIVE_TAB_INDICATOR = "ACTIVE_TAB_INDICATOR";
const DATA_TEST_SELECTOR = "data-test-selector";
const ACTIVE_TAB_INDICATOR_CLASSES = "ScActiveIndicator-sc-i1y2af-1 iaTrsR";
const TAB_CONTENT_CLASS = "home__lower-content";

let _userCardHtml = null;
let _tabHtml = null;

(async () => {
  const channelRoot = document.querySelector(".channel-root");
  if (channelRoot) {
    new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "childList") {
          for (const node of mutation.addedNodes) {
            if (node.classList && node.classList.contains("home-header-sticky")) {
              addFollowsTab(node);
            }
          }
        }
      }
    }).observe(channelRoot, {
      subtree: true,
      childList: true,
    });
    console.log("attached");
  }
})();

const addFollowsTab = (parent) => {
  const tabList = parent.querySelector('[role="tablist"]');
  const tabElement = tabList.children[1].cloneNode(true);
  tabElement.id = "follows-tab";
  unselectTab(tabElement);
  tabElement.querySelector("p").innerText = "Follows";
  tabElement.setAttribute("data-index", "5");
  // tab.firstChild.removeAttribute("href");
  tabElement.firstChild.href = "/gthvmt/follows";
  tabElement.onclick = async (e) => await onFollowsTabClick(e, tabElement);
  tabList.appendChild(tabElement);
  console.log("follows tab added.");
};

const onFollowsTabClick = async (e, followsTab) => {
  e.preventDefault();
  // history.pushState("follows", "", "/" + getUserFromUrl() + "/follows");
  selectTab(followsTab);
  // await addFollowsTabContent(document);
};

const unselectTab = (tabElement) => {
  const textContainer = tabElement.firstChild.firstChild;
  if (textContainer.classList.contains(SELECTED_CLASS)) {
    tabElement.firstChild.setAttribute("aria-selected", "false");
    tabElement.firstChild.setAttribute("tabindex", -1);
    textContainer.classList.remove(SELECTED_CLASS);
    textContainer.firstChild.classList.remove(SELECTED_CLASS_CHILD);
    textContainer.classList.add(UNSELECTED_CLASS);
    textContainer.firstChild.classList.add(UNSELECTED_CLASS_CHILD);
    const layoutDiv = textContainer.children[1];
    layoutDiv.removeChild(layoutDiv.firstChild);
  }
};

const selectTab = (tabElement) => {
  const tabList = tabElement.parentElement;
  const selectedTab = Array.from(tabList.children).find((e) =>
    e.firstChild.firstChild.classList.contains(SELECTED_CLASS)
  );
  if (selectedTab) {
    unselectTab(selectedTab);
  }
  tabElement.firstChild.setAttribute("aria-selected", "true");
  tabElement.firstChild.setAttribute("tabindex", 0);
  const textContainer = tabElement.firstChild.firstChild;
  textContainer.classList.remove(UNSELECTED_CLASS);
  textContainer.firstChild.classList.remove(UNSELECTED_CLASS_CHILD);
  textContainer.classList.add(SELECTED_CLASS);
  textContainer.firstChild.classList.add(SELECTED_CLASS_CHILD);
  const layoutDiv = textContainer.children[1];
  const activeTabIndicator = document.createElement("div");
  activeTabIndicator.setAttribute(DATA_TEST_SELECTOR, ACTIVE_TAB_INDICATOR);
  activeTabIndicator.className = ACTIVE_TAB_INDICATOR_CLASSES;
  layoutDiv.appendChild(activeTabIndicator);
};

const addFollowsTabContent = async (parent) => {
  const contentDiv = parent.querySelector("." + TAB_CONTENT_CLASS);
  const user = getUserFromUrl();

  const container = document.createElement("div");
  container.className = "ScTower-sc-1dei8tr-0 eVnpOe tw-tower";
  contentDiv.innerHTML = "";
  contentDiv.appendChild(container);

  let cursor = null;
  do {
    const follows = await getFollows(user, cursor, 50);
    if (follows) {
      follows.forEach(async (follow) => {
        container.appendChild(await createUserCard(follow.node));
      });
      cursor = follows.length > 0 ? follows[follows.length - 1].cursor : null;
    } else {
      console.log("follows couldn't be loaded :( refresh the page and try again");
    }
  } while (cursor);
};

const createUserCard = async (channel) => {
  const html = (await getUserCardHtml())
    .replaceAll(
      "{{banner}}",
      channel.bannerImageURL ??
        "https://static.twitchcdn.net/assets/bg_glitch_pattern-47a314b8795e4a70661d.png"
    )
    .replaceAll("{{avatar}}", channel.profileImageURL)
    .replaceAll("{{displayName}}", channel.displayName)
    .replaceAll("{{login}}", channel.login);

  return textToElement(html);
};

const createTab = async (tabName) => {
  const html = (await getTabHtml())
    .replaceAll("{{login}}", getUserFromUrl())
    .replaceAll("{{tabName}}", tabName);
  return textToElement(html);
};

const textToElement = (text) => {
  const div = document.createElement("div");
  div.innerHTML = text.trim();
  return div.firstChild;
};

const append = (div, child) => {
  div.appendChild(child);
  return div;
};

const getUserCardHtml = async () => {
  return (_userCardHtml ??= await (await fetch(chrome.runtime.getURL("src/usercard.html"))).text());
};

const getTabHtml = async () => {
  return (_tabHtml ??= await (await fetch(chrome.runtime.getURL("src/tab.html"))).text());
};

const getUserFromUrl = () => {
  return location.href.split(".tv/")[1].split("/")[0];
};
