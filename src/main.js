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
let _followButtonHtml = null;
let _unfollowButtonHtml = null;

document.addEventListener("DOMContentLoaded", async (event) => {
  // const channelRoot = document.querySelector(".channel-root");

  if (document) {
    new MutationObserver(async (mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "childList") {
          for (const node of mutation.addedNodes) {
            if (node.classList && node.classList.contains("home-header-sticky")) {
              await addFollowsTab(node);
            }
          }
        }
      }
    }).observe(document, {
      subtree: true,
      childList: true,
    });
    console.log("attached");
  }
});

const addFollowsTab = async (parent) => {
  const tabList = parent.querySelector('[role="tablist"]');

  for (const tabElement of tabList.children) {
    tabElement.addEventListener("mousedown", (event) => {
      selectTab(tabElement);
    });
  }

  const tabElement = await createTab("Follows");
  tabElement.id = "follows-tab";
  tabElement.onclick = async (e) => await onFollowsTabClick(e, tabElement);
  unselectTab(tabElement);
  tabList.appendChild(tabElement);
};

const onFollowsTabClick = async (e, followsTab) => {
  e.preventDefault();
  selectTab(followsTab);
  history.pushState("follows", "", "/" + getUserFromUrl() + "/follows");
  await addFollowsTabContent(document);
};

const unselectTab = (tabElement) => {
  tabElement.classList.remove("selected");
  tabElement.classList.add("unselected");
};

const selectTab = (tabElement) => {
  const tabList = tabElement.parentElement;
  if (!tabList) {
    return;
  }
  const selectedTabs = Array.from(tabList.children).filter(
    (e) =>
      e.classList.contains("selected") ||
      e.firstChild?.firstChild?.classList?.contains(SELECTED_CLASS)
  );
  selectedTabs.forEach((tab) => {
    unselectTab(tab);
  });

  tabElement.classList.remove("unselected");
  tabElement.classList.add("selected");
};

const addFollowsTabContent = async (parent) => {
  const contentDiv = parent.querySelector("." + TAB_CONTENT_CLASS);
  const user = getUserFromUrl();

  const container = document.createElement("div");
  container.className = "ScTower-sc-1dei8tr-0 eVnpOe tw-tower";
  contentDiv.innerHTML = "";
  contentDiv.style.paddingTop = "30px";
  contentDiv.appendChild(container);

  let cursor = null;

  const ownFollows = [];
  const currentUser = await getCurrentUser();
  do {
    const follows = await getFollows(currentUser, cursor, 100);
    ownFollows.push(...follows);
    cursor = follows.length > 0 ? follows[follows.length - 1].cursor : null;
  } while (cursor);

  cursor = null;
  do {
    const follows = await getFollows(user, cursor, 50);
    if (follows) {
      follows.forEach(async (follow) => {
        container.appendChild(
          await createUserCard(
            follow.node,
            ownFollows.some((f) => f.node.id == follow.node.id)
          )
        );
      });
      cursor = follows.length > 0 ? follows[follows.length - 1].cursor : null;
    } else {
      console.log("follows couldn't be loaded :( refresh the page and try again");
    }
  } while (cursor);
};

const createUserCard = async (channel, isFollowing) => {
  const html = (await getUserCardHtml())
    .replaceAll(
      "{{banner}}",
      channel.bannerImageURL ??
        "https://static.twitchcdn.net/assets/bg_glitch_pattern-47a314b8795e4a70661d.png"
    )
    .replaceAll("{{id}}", channel.id)
    .replaceAll("{{avatar}}", channel.profileImageURL)
    .replaceAll("{{displayName}}", channel.displayName)
    .replaceAll("{{login}}", channel.login);

  const card = textToElement(html);
  return setFollowToggleButton(card, isFollowing);
};

const setFollowToggleButton = async (card, isFollowing) => {
  const unfollowButtonHtml = await getUnfollowButtonHtml();
  const followButtonHtml = await getFollowButtonHtml();

  const button = textToElement(isFollowing ? unfollowButtonHtml : followButtonHtml);
  button.onclick = async () => {
    const cursor = button.style.cursor;
    button.disabled = true;
    button.style.cursor = "progress";
    const success = isFollowing ? await unfollow(card.id) : await follow(card.id, false);
    if (success) {
      setFollowToggleButton(card, !isFollowing);
    }
    button.disabled = false;
    button.style.cursor = cursor;
  };
  const buttonContainer = card.querySelector("div.user-card__buttons-container");
  buttonContainer.innerHTML = "";
  buttonContainer.appendChild(button);
  return card;
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

const getFollowButtonHtml = async () => {
  return (_followButtonHtml ??= await (
    await fetch(chrome.runtime.getURL("src/follow-button.html"))
  ).text());
};

const getUnfollowButtonHtml = async () => {
  return (_unfollowButtonHtml ??= await (
    await fetch(chrome.runtime.getURL("src/unfollow-button.html"))
  ).text());
};

const getUserFromUrl = () => {
  return location.href.split(".tv/")[1].split("/")[0];
};
