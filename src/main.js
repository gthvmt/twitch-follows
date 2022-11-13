const SELECTED_CLASS = "bvruMV";
const TAB_CONTENT_CLASS = "home__lower-content";
const APP_BAR_CONTAINER_CLASS = "dHrscT";
const CARD_CONTAINER_ID = "follow-cards-container";
const MASSFOLLOW_PROGRESS_CONTAINER_ID = "massfollow-progress-container";
const MASSFOLLOW_PROGRESS_ID = "massfollow-progress";
const MASSFOLLOW_PROGRESS_TEXT_ID = "massfollow-progress-text";
const PROGRESS_INTERVAL = 100;
const FOLLOW_RATELIMIT_MS = 60000;
const FOLLOW_RATELIMIT_FOLLOWS = 15;

let _userCardHtml = null;
let _tabHtml = null;
let _followButtonHtml = null;
let _unfollowButtonHtml = null;
let _massfollowButtonHtml = null;

const ownFollows = [];
const channelFollows = [];

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
  tabList.insertBefore(tabElement, tabList.children[tabList.children.length - 1]);
};

const onFollowsTabClick = async (e, followsTab) => {
  e.preventDefault();
  selectTab(followsTab);
  history.pushState("follows", "", "/" + getUserFromUrl() + "/follows");
  await addFollowsTabContent(document);
  // await addMassUnfollowButton();
  await addMassFollowButton();
};

const addMassUnfollowButton = async () => {
  const container = document.querySelector("." + APP_BAR_CONTAINER_CLASS);
  const button = textToElement(await getMassfollowButtonHtml());
  button.id = "mass-unfollow-button";
  if (document.getElementById(button.id)) {
    //button already added
    return;
  }

  button.querySelector(".dWdTjI").innerText = "Mass unfollow";
  button.firstChild.onclick = async () => {
    const currentFollows = await getAllFollows(await getCurrentUser());
    const channelsToUnfollow = channelFollows.filter((channelFollow) =>
      currentFollows.some((ownFollow) => channelFollow.node.id == ownFollow.node.id)
    );
    if (confirm(`Really unfollow ${channelsToUnfollow.length} channels?`)) {
      const unfollows = await massUnfollow(channelsToUnfollow.map((c) => c.node.id));
      if (!unfollows) {
        throw "Something went wrong while trying to mass unfollow";
      }
      //update card buttons
      const cards = document.getElementById(CARD_CONTAINER_ID).children;
      for (const card of cards) {
        await setFollowToggleButton(
          card,
          currentFollows
            .map((f) => f.node.id)
            .filter((f) => !unfollows.includes(f))
            .includes(card.id)
        );
      }
    }
  };
  container.appendChild(button);
};

const addMassFollowButton = async () => {
  const container = document.querySelector("." + APP_BAR_CONTAINER_CLASS);
  const button = textToElement(await getMassfollowButtonHtml());

  if (document.getElementById(button.id)) {
    //button already added
    return;
  }

  button.firstChild.onclick = async () => {
    if (button.hasAttribute("disabled")) {
      return;
    }
    const currentFollows = await getAllFollows(await getCurrentUser());
    let channelsToFollow = channelFollows.filter(
      (channelFollow) =>
        !currentFollows.some((ownFollow) => channelFollow.node.id == ownFollow.node.id)
    );
    if (confirm(`Really follow ${channelsToFollow.length} channels?`)) {
      const cursor = button.firstChild.style.cursor;
      button.firstChild.style.cursor = "progress";
      button.setAttribute("disabled", "");

      const progressContainer = document.createElement("div");
      progressContainer.id = MASSFOLLOW_PROGRESS_CONTAINER_ID;
      const progress = document.createElement("div");
      progress.id = MASSFOLLOW_PROGRESS_ID;
      progress.style.width = "0%";
      const progressText = document.createElement("span");
      progressText.id = MASSFOLLOW_PROGRESS_TEXT_ID;
      progressContainer.appendChild(progress).appendChild(progressText);
      button.appendChild(progressContainer);

      let currentProgress = 0;
      let maxProgress = channelsToFollow.length * PROGRESS_INTERVAL;

      let channelsToFollowIds = channelsToFollow.map((c) => c.node.id);
      let currentFollowIds = currentFollows.map((f) => f.node.id);

      while (channelsToFollowIds.length > 0) {
        let chunk = channelsToFollowIds.slice(0, 20);
        let newFollowIds = await massFollow(chunk);
        if (!newFollowIds) {
          throw "Something went wrong while trying to mass follow";
        }

        //update card buttons
        currentFollowIds = currentFollowIds.concat(newFollowIds);
        await updateCardButtons(currentFollowIds);
        channelsToFollowIds = channelsToFollowIds.filter((f) => !newFollowIds.includes(f));

        //set progress
        let followed = channelsToFollow
          .map((f) => f.node.id)
          .filter((f) => currentFollowIds.includes(f));
        currentProgress = followed.length * PROGRESS_INTERVAL;
        progress.style.width = (currentProgress / maxProgress) * 100 + "%";
        progressText.innerText = `${followed.length}/${channelsToFollow.length}`;

        if (chunk.some((f) => !newFollowIds.includes(f))) {
          console.log("Waiting a minute because we are being ratelimited");

          await new Promise((resolve) => {
            let timeWaited = 0;
            const progressInterval = setInterval(() => {
              if (timeWaited >= FOLLOW_RATELIMIT_MS) {
                resolve();
                clearInterval(progressInterval);
              }

              //this is just an estimate, if the user follows someone during the ratelimit wait time,
              //the progress will overshoot and will be slightly reset on the next request
              const nextChunk = channelsToFollowIds.slice(0, FOLLOW_RATELIMIT_FOLLOWS);
              currentProgress +=
                (nextChunk.length / (FOLLOW_RATELIMIT_MS / PROGRESS_INTERVAL)) * PROGRESS_INTERVAL;
              progress.style.width = (currentProgress / maxProgress) * 100 + "%";
              timeWaited += PROGRESS_INTERVAL;
            }, PROGRESS_INTERVAL);
          });
        }
      }
      console.log("Massfollow done");
      button.removeAttribute("disabled");
      button.firstChild.style.cursor = cursor;

      setTimeout(() => {
        progressContainer.remove();
      }, 3000);
    }
  };
  container.appendChild(button);
};

const updateCardButtons = async (followIds) => {
  const cards = document.getElementById(CARD_CONTAINER_ID).children;
  for (const card of cards) {
    await setFollowToggleButton(card, followIds.includes(card.id));
  }
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
  container.id = CARD_CONTAINER_ID;
  contentDiv.innerHTML = "";
  contentDiv.style.paddingTop = "15px";
  contentDiv.appendChild(container);

  ownFollows.length = 0;
  let cursor = null;

  const currentUser = await getCurrentUser();
  ownFollows.push(...(await getAllFollows(currentUser)));

  channelFollows.length = 0;
  cursor = null;
  do {
    const follows = await getFollows(user, cursor, 50);
    if (follows) {
      channelFollows.push(...follows);
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
  return (_userCardHtml ??= await (
    await fetch(chrome.runtime.getURL("html/usercard.html"))
  ).text());
};

const getTabHtml = async () => {
  return (_tabHtml ??= await (await fetch(chrome.runtime.getURL("html/tab.html"))).text());
};

const getFollowButtonHtml = async () => {
  return (_followButtonHtml ??= await (
    await fetch(chrome.runtime.getURL("html/follow-button.html"))
  ).text());
};

const getUnfollowButtonHtml = async () => {
  return (_unfollowButtonHtml ??= await (
    await fetch(chrome.runtime.getURL("html/unfollow-button.html"))
  ).text());
};
const getMassfollowButtonHtml = async () => {
  return (_massfollowButtonHtml ??= await (
    await fetch(chrome.runtime.getURL("html/massfollow-button.html"))
  ).text());
};

const getUserFromUrl = () => {
  return location.href.split(".tv/")[1].split("/")[0];
};
