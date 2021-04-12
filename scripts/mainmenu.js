document.addEventListener("DOMContentLoaded", function () {
  chrome.tabs.query({ title: "Nextcloud news" }, function (d) {
    if (d.length > 0) {
      try {
        chrome.windows.update(d[0].windowId, { focused: true });
      } catch (c) {
        console.log("Failed to focus the window!");
      }
      if (a == undefined) {
        chrome.tabs.update(d[0].id, { active: true });
      } else {
        chrome.tabs.update(d[0].id, { active: true, url: a });
      }
    } else {
      chrome.tabs.create({ url: chrome.runtime.getURL("news.html") }, function (e) {
        console.log("openTab: " + a);
      });
    }
  });
});
