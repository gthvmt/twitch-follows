chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  chrome.cookies.get(
    {
      name: request,
      url: "https://www.twitch.tv",
    },
    (cookie) => sendResponse(cookie.value)
  );
  return true;
});
