chrome.runtime.onMessage.addListener((_request, _sender, sendResponse) => {
  chrome.cookies.get(
    {
      name: "auth-token",
      url: "https://www.twitch.tv",
    },
    (cookie) => sendResponse(cookie.value)
  );
  return true;
});
