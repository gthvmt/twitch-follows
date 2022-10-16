const SELECTED_CLASS = "bvruMV";
const UNSELECTED_CLASS = "gcMVlg";
const ACTIVE_TAB_INDICATOR = "ACTIVE_TAB_INDICATOR";
const DATA_TEST_SELECTOR = "data-test-selector";
const ACTIVE_TAB_INDICATOR_CLASSES = "ScActiveIndicator-sc-i1y2af-1 iaTrsR";
const TAB_CONTENT_CLASS = "home__lower-content";

let _userCardHtml = null;

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
  const tabDiv = tabList.children[1].cloneNode(true);
  tabDiv.id = "follows-tab";
  unselectTab(tabDiv);
  tabDiv.querySelector("p").innerText = "Follows";
  tabDiv.setAttribute("data-index", "5");
  // tab.firstChild.removeAttribute("href");
  tabDiv.firstChild.href = "/gthvmt/follows";
  tabDiv.onclick = async (e) => await onFollowsTabClick(e, tabDiv);
  tabList.appendChild(tabDiv);
  console.log("follows tab added.");
};

const onFollowsTabClick = async (e, followsTab) => {
  e.preventDefault();
  selectTab(followsTab);
  await addFollowsTabContent(document);
};

const unselectTab = (tabDiv) => {
  const textContainer = tabDiv.firstChild.firstChild;
  if (textContainer.classList.contains(SELECTED_CLASS)) {
    textContainer.classList.remove(SELECTED_CLASS);
    textContainer.classList.add(UNSELECTED_CLASS);
    const layoutDiv = textContainer.children[1];
    layoutDiv.removeChild(layoutDiv.firstChild);
  }
};

const selectTab = (tabDiv) => {
  //TODO
  const tabList = tabDiv.parentElement;
  const selectedTab = Array.from(tabList.children).find((e) =>
    e.firstChild.firstChild.classList.contains(SELECTED_CLASS)
  );
  if (selectedTab) {
    unselectTab(selectedTab);
  }
  const textContainer = tabDiv.firstChild.firstChild;
  textContainer.classList.remove(UNSELECTED_CLASS);
  textContainer.classList.add(SELECTED_CLASS);
  const layoutDiv = textContainer.children[1];
  const activeTabIndicator = document.createElement("div");
  activeTabIndicator.setAttribute(DATA_TEST_SELECTOR, ACTIVE_TAB_INDICATOR);
  activeTabIndicator.className = ACTIVE_TAB_INDICATOR_CLASSES;
  layoutDiv.appendChild(activeTabIndicator);
};

const addFollowsTabContent = async (parent) => {
  const contentDiv = parent.querySelector("." + TAB_CONTENT_CLASS);
  const user = location.href.split(".tv/")[1].trimEnd("/");
  const follows = await getFollows(user);
  const container = document.createElement("div");
  container.className = "ScTower-sc-1dei8tr-0 eVnpOe tw-tower";
  follows.forEach(async (follow) => {
    container.appendChild(await createUserCard(follow.node));
  });
  contentDiv.innerHTML = "";
  contentDiv.appendChild(container);
};

const createUserCard = async (channel) => {
  console.log("channel is", channel);
  const html = (await getUserCardHtml())
    .replaceAll(
      "##banner##",
      channel.bannerImageURL ??
        "https://static.twitchcdn.net/assets/bg_glitch_pattern-47a314b8795e4a70661d.png"
    )
    .replaceAll("##avatar##", channel.profileImageURL)
    .replaceAll("##displayName##", channel.displayName)
    .replaceAll("##login##", channel.login);

  const div = document.createElement("div");
  div.innerHTML = html.trim();
  console.log("content is", div.firstChild);
  return div.firstChild;
};

const append = (div, child) => {
  div.appendChild(child);
  return div;
};

const getUserCardHtml = async () => {
  return (_userCardHtml ??= await (await fetch(chrome.runtime.getURL("src/usercard.html"))).text());
};
