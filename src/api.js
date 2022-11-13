//@TODO: @CLEANUP: export headers to single method
let _authToken = null;
let _currentUser = null;
let _deviceId = null;
const graphQLUrl = "https://gql.twitch.tv/gql";

let integrity = null;

window.addEventListener("clientIntegrityEstablished", (e) => {
  integrity = e.detail;
});

const getAuthToken = async () => {
  return (_authToken ??= await new Promise((resolve) => {
    chrome.runtime.sendMessage("auth-token", (response) => {
      resolve(response);
    });
  }));
};

const getCurrentUser = async () => {
  return (_currentUser ??= await new Promise((resolve) => {
    chrome.runtime.sendMessage("login", (response) => {
      resolve(response);
    });
  }));
};

const getDeviceId = async () => {
  return (_deviceId ??= await new Promise((resolve) => {
    chrome.runtime.sendMessage("unique_id", (response) => {
      resolve(response);
    });
  }));
};

const getFollows = async (user, cursor = "", count = 100, ascending = false) => {
  const request = await fetch(graphQLUrl, {
    method: "post",
    headers: await getHeaders(false),
    body: JSON.stringify({
      query: `
        query GetFollows($login: String!, $count: Int!, $order: SortOrder, $cursor: Cursor) {
          user(login: $login) {
            follows(first: $count, after: $cursor, order: $order) {
              totalCount
              edges {
                cursor
                followedAt
                node {
                  id
                  login
                  displayName
                  profileImageURL(width: 70)
                  bannerImageURL
                }
              }
            }
          }
        }
        `,
      variables: {
        login: user,
        count: count,
        order: ascending ? "ASC" : "DESC",
        cursor: cursor,
      },
    }),
  });
  const json = await request.json();
  if (json.data?.user?.follows) {
    return json.data.user.follows.edges;
  }
  return null;
};

const getAllFollows = async (user, ascending = false) => {
  const allFollows = [];
  let cursor = null;
  do {
    const follows = await getFollows(user, cursor, 100, ascending);
    allFollows.push(...follows);
    cursor = follows.length > 0 ? follows[follows.length - 1].cursor : null;
  } while (cursor);
  return allFollows;
};

const follow = async (userId, notifications = false) => {
  const request = await fetch(graphQLUrl, {
    method: "post",
    headers: await getHeaders(true),
    body: JSON.stringify({
      query: `
        mutation Follow($id: ID!, $disableNotifications: Boolean!) {
          followUser(input: { disableNotifications: $disableNotifications, targetID: $id }) {
            follow {
              user {
                id
                login
                displayName
              }
            }
          }
        }
        `,
      variables: {
        id: userId,
        disableNotifications: !notifications,
      },
    }),
  });
  const json = await request.json();

  if (json.data) {
    console.log(json.data);
    return json.data.followUser?.follow?.user != null;
  }
  return false;
};

const unfollow = async (userId) => {
  const request = await fetch(graphQLUrl, {
    method: "post",
    headers: await getHeaders(true),
    body: JSON.stringify({
      query: `
        mutation Unfollow($id: ID!) {
          unfollowUser(input: { targetID: $id }) {
            follow {
              user {
                id
              }
            }
          }
        }
        `,
      variables: {
        id: userId,
      },
    }),
  });
  const json = await request.json();

  if (json.data) {
    return true;
  }
  return false;
};

//TODO: seems to get ratelimited after 15 follows
const massFollow = async (userIds, notifications = false) => {
  let query = "mutation Follow($disableNotifications: Boolean!) {";
  for (let index = 0; index < userIds.length; index++) {
    const userId = userIds[index];
    query += `
    _${index}: followUser(input: { disableNotifications: $disableNotifications, targetID: ${userId} }) {
      follow {
        user {
          id
        }
      }
    }`;
  }
  query += "}";

  const request = await fetch(graphQLUrl, {
    method: "post",
    headers: await getHeaders(true),
    body: JSON.stringify({
      query: query,
      variables: {
        disableNotifications: !notifications,
      },
    }),
  });
  const json = await request.json();
  if (json.data) {
    return Object.values(json.data)
      .map((entry) => entry?.follow?.user?.id)
      .filter((e) => e);
  }
  return null;
};

const massUnfollow = async (userIds) => {
  let query = "mutation Unfollow() {";
  for (let index = 0; index < userIds.length; index++) {
    const userId = userIds[index];
    query += `
    _${index}: unfollowUser(input: { targetID: ${userId} }) {
      follow {
        user {
          id
        }
      }
    }`;
  }
  query += "}";

  const request = await fetch(graphQLUrl, {
    method: "post",
    headers: await getHeaders(true),
    body: JSON.stringify({
      query: query,
      variables: {},
    }),
  });
  const json = await request.json();
  if (json.data) {
    return Object.values(json.data)
      .map((entry) => entry?.follow?.user?.id)
      .filter((e) => e);
  }
  return null;
};

const getHeaders = async (withIntegrity = false) => {
  if (withIntegrity && !integrity) {
    console.error("integrity does not seem to be established yet");
    withIntegrity = false;
  }
  const defaultHeaders = {
    Authorization: "OAuth " + (await getAuthToken()),
  };

  return withIntegrity
    ? {
        ...defaultHeaders,
        "Client-Integrity": integrity.token,
        "Client-Id": "kimne78kx3ncx6brgo4mv6wki5h1ko",
        "X-Device-Id": await getDeviceId(),
      }
    : defaultHeaders;
};

const appendHook = () => {
  const script = document.createElement("script");
  script.src = chrome.runtime.getURL("hook-fetch.js");
  (document.body || document.head || document.documentElement).appendChild(script);
};

appendHook();
