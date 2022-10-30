let _authToken = null;
let _currentUser = null;

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
}

const getFollows = async (user, cursor = "", count = 100, ascending = false) => {
  const request = await fetch("https://gql.twitch.tv/gql", {
    method: "post",
    headers: {
      Authorization: "OAuth " + (await getAuthToken()),
    },
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
