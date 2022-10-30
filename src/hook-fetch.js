function hookFetch() {
  const { fetch: origFetch } = window;
  window.fetch = async (url, ...args) => {
    console.log("fetch called on", url);
    const response = await origFetch(url, ...args);
    if (url.includes("/integrity")) {
      response
        .clone()
        .json()
        .then((body) => {
          window.dispatchEvent(new CustomEvent("clientIntegrityEstablished", { detail: body }));
        })
        .catch((err) => console.error(err));
    }
    /* the original response can be resolved unmodified: */
    return response;
  };
}

hookFetch();
