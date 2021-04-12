var feedsInFolders = {};
var feedsById = {};

document.addEventListener("settings_loaded", function () {
  loadFolders();
  $("#toggle_folders_tree").click(function () {
    $("#folders_tree").toggle();
  });
  $("#expand_folders_tree").click(function () {
    $(".listree-submenu-items").show();
  });
  $("#collapse_folders_tree").click(function () {
    $(".listree-submenu-items").hide();
  });
  $("#all-items").click(function () {
    loadItems();
  });
  if (getSettings().theme == "dark") {
    $("body").addClass("dark");
  }
});

document.addEventListener("folders_loaded", function () {
  loadItems();
});

function loadFolders() {
  var foldersUrl =
    getSettings().nextcloudurl + "/index.php/apps/news/api/v1-2/folders";
  var foldersById = {};
  $.ajax({
    url: foldersUrl,
    headers: {
      Authorization:
        "Basic " +
        btoa(
          getSettings().nextclouduser + ":" + getSettings().nextcloudpassword
        ),
    },
  }).done(function (folders) {
    for (var i in folders["folders"]) {
      var folder = folders["folders"][i];
      foldersById[folder["id"]] = folder["name"];
    }

    var feedsUrl =
      getSettings().nextcloudurl + "/index.php/apps/news/api/v1-2/feeds";

    $.ajax({
      url: feedsUrl,
      headers: {
        Authorization:
          "Basic " +
          btoa(
            getSettings().nextclouduser + ":" + getSettings().nextcloudpassword
          ),
      },
    }).done(function (feeds) {
      var tree = "";
      feedsInFolders = {};
      feedsById = {};
      for (var i in feeds["feeds"]) {
        var feed = feeds["feeds"][i];
        if (!(feed["folderId"] in feedsInFolders)) {
          feedsInFolders[feed["folderId"]] = {
            name: foldersById[feed["folderId"]],
            unread: 0,
            children: [],
          };
        }
        var newFeed = {
          id: feed["id"],
          url: feed["url"],
          name: feed["title"],
          unread: feed["unreadCount"],
          feedUrl: feed["link"],
          favicon: feed["faviconLink"],
        };
        feedsById[feed["id"]] = newFeed;
        feedsInFolders[feed["folderId"]]["children"].push(newFeed);
        feedsInFolders[feed["folderId"]]["unread"] += feed["unreadCount"];
      }
      tree += '<ul class="listree">';
      Object.keys(feedsInFolders).forEach(function (key, index) {
        var folder = feedsInFolders[key];
        tree +=
          '<li>\
                <div class="listree-submenu-heading"><div class="tree-title" id="'+key+'">' +
          folder["name"] +
          '</div><div class="tree-unread">' +
          folder["unread"] +
          '</div></div>\
                <ul class="listree-submenu-items">';
        for (var i in folder["children"]) {
          feed = folder["children"][i];
          tree +=
            '<li>\
            <div class="feed_name" id="' +
            feed["id"] +
            '"><img src="' +
            getFavicon(feed["favicon"], feed["feedUrl"]) +
            '"/><div class="tree-title">' +
            feed["name"] +
            '</div><div class="tree-unread">' +
            feed["unread"] +
            "</div></div></li>";
        }
        tree += "</ul>";
      });

      $("#folders_tree").html(tree);
      $(".feed_name").click(function (e) {
        var target = e.target;
        while (target != null && target.id == "") {
          target = target.parentNode;
        }
        loadItems(0, target.id, 0);
      });

      $(".tree-title").click(function(e) {
        var target = e.target;
        if (target.id != "") {
          loadItems(0, target.id, 1);
        }
      })

      listree();
      document.dispatchEvent(new Event("folders_loaded"));
    });
  });
}

function loadItems(offset = 0, id = 0, type = 3) {
  var feedsUrl =
    getSettings().nextcloudurl + "/index.php/apps/news/api/v1-2/items";
  $.ajax({
    url: feedsUrl,
    data: {
      batchSize: 50,
      offset: offset,
      id: id,
      type: type,
    },
    headers: {
      Authorization:
        "Basic " +
        btoa(
          getSettings().nextclouduser + ":" + getSettings().nextcloudpassword
        ),
    },
  }).done(function (items) {
    var itemList = "";
    for (i in items["items"]) {
      var item = items["items"][i];
      itemList +=
        '<div class="item ' +
        (item["unread"] ? "unread" : "") +
        ' activetitle" id="' +
        item["id"] +
        '" content_url="' +
        item["url"] +
        '">\
        <div class="item-img-container">\
            <img src="' +
        getItemImage(item) +
        '" class="item-img">\
         </div>\
         <div class="flex-item-title-author-container">\
            <div class="item-title-author-container"><div>\
            <div class="item-title">' +
        item["title"] +
        '</div>\
        </div>\
        <div>\
            <div class="item-author-date-container">\
                <div class="item-author"><img src="' +
        getFavicon(
          feedsById[item["feedId"]]["favicon"],
          feedsById[item["feedId"]]["feedUrl"],
          item["url"]
        ) +
        '" class="titlesfavicon">' +
        feedsById[item["feedId"]]["name"] +
        '</div>\
                    <div class="item-date">11:45</div>\
                </div>\
            </div>\
        </div></div></div>';
    }

    $("#feeds_list").html(itemList);
    $(".item").click(function (e) {
      var target = e.target;
      while (target != null && target.getAttribute("content_url") == null) {
        target = target.parentNode;
      }
      if (target != null && target.getAttribute("content_url") != null) {
        $("#feed_content").attr("src", target.getAttribute("content_url"));
        markItemAsRead(target.id);
      }
    });
  });
}

function markItemAsRead(itemId) {
  var readUrl =
    getSettings().nextcloudurl +
    "/index.php/apps/news/api/v1-2/items/" +
    itemId +
    "/read";
  $.ajax({
    url: readUrl,
    method: "PUT",
    headers: {
      Authorization:
        "Basic " +
        btoa(
          getSettings().nextclouduser + ":" + getSettings().nextcloudpassword
        ),
    },
  }).done(function () {
    $(".item").removeClass("focus");
    $("#" + itemId).removeClass("unread");
    $("#" + itemId).addClass("focus");
  });
}

function getFavicon(faviconUrl, feedUrl, linkUrl) {
  finalFaviconUrl = faviconUrl;
  if (finalFaviconUrl == "") {
    var domainName = getDomainName(feedUrl);
    if (domainName == "www.example.com") {
      domainName = getDomainName(linkUrl);
    }

    finalFaviconUrl = "https://icons.duckduckgo.com/ip3/" + domainName + ".ico";
  }
  return finalFaviconUrl;
}

function getDomainName(url) {
  try {
    urlDomainName = new URL(url);
    if (urlDomainName.searchParams.get("url") != null) {
      domainName = new URL(urlDomainName.searchParams.get("url")).hostname;
    } else {
      domainName = urlDomainName.hostname;
    }
  } catch (c) {
    domainName = "www.example.com";
  }

  return domainName;
}

function getItemImage(item) {
  var REX = /<img[^>]+src="([^">]+)"/g;
  var image = item["enclosureLink"];
  if (image == "" || image == null) {
    image = item["mediaThumbnail"];
    if (image == "" || image == null) {
      m = REX.exec(item["body"]);
      if (m) {
        image = m[1];
      }
    } else {
      image = "/images/document.png";
    }
  }

  return image;
}
