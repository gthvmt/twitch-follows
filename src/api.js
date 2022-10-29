let _authToken = null;

const getAuthToken = async () => {
  return (_authToken ??= await new Promise((resolve) => {
    chrome.runtime.sendMessage(null, (response) => {
      resolve(response);
    });
  }));
};

const getFollows = async (user, cursor = "", count = 90) => {
  const request = await fetch("https://gql.twitch.tv/gql", {
    method: "post",
    headers: {
      Authorization: "OAuth " + (await getAuthToken()),
    },
    body: JSON.stringify({
      query: `
        query GetFollows($login: String!, $count: Int!, $cursor: Cursor) {
          user(login: $login) {
            follows(first: $count, after: $cursor) {
              totalCount
              edges {
                cursor
                followedAt
                node {
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
