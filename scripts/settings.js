var settings = {
  nextcloudurl: "",
  nextclouduser: "",
  nextcloudpassword: "",
  theme: "light",
};

function loadSettings() {
  _getData("news_settings", function (result) {
    settings = JSON.parse(result);
    document.dispatchEvent(new Event("settings_loaded"));
  });
}

function saveSettings(callback) {
  _setData("news_settings", JSON.stringify(settings), callback);
}

function getSettings() {
  return settings;
}

function _setData(key, value, callback) {
  var obj = {};
  obj[key] = value;
  chrome.storage.local.set(obj, callback);
}

function _getData(key, callback) {
  return chrome.storage.local.get([key], function (result) {
    callback(result[key]);
  });
}

loadSettings();
