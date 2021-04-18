var feedsInFolders = {};
var feedsById = {};
var currentFolderOrFeedId = 0;
var selectedType = 3; //all items
var withUnreadItems = true;
const NB_ITEMS_TO_LOAD = 10;

document.addEventListener("settings_loaded", function () {
  //initialize page
  $("#toggle_folders_tree").click(function () {
    $("#feeds").toggle();
    $("#expand_folders_tree").toggle();
    $("#collapse_folders_tree").toggle();
    settings.feedstreeopened = !settings.feedstreeopened;
    saveSettings();
  });
  $("#expand_folders_tree").click(function () {
    $(".listree-submenu-items").show();
    $(".listree-submenu-heading").addClass("expanded");
  });
  $("#collapse_folders_tree").click(function () {
    $(".listree-submenu-items").hide();
    $(".listree-submenu-heading").removeClass("expanded");
  });

  //action buttons
  $(".action-button").click(function (e) {
    $(".action-button").removeClass("action-selected");
    var target = e.target;
    while (target != null && !target.id) {
      target = target.parentNode;
    }
    if (target.id == "all-items") {
      $(".item-selected").removeClass("item-selected");
      $("#feeds_list_header").html("All items");
      selectedType = 3;
      currentFolderOrFeedId = 0;
    } else if (target.id == "favorites") {
      selectedType = 2;
    } else {
      withUnreadItems = false;
    }
    $("#" + target.id).addClass("action-selected");
    loadItems(0, currentFolderOrFeedId, selectedType);
  });

  if (getSettings().theme == "dark") {
    $("body").addClass("dark");
  }

  $("#feeds_list").scroll(function () {
    if (
      !itemLoading &&
      $(this).scrollTop() + $(this).innerHeight() >=
        $(this)[0].scrollHeight - 50
    ) {
      itemLoading = true;
      loadItems($(".item:last")[0].id, currentFolderOrFeedId, selectedType);
    }
  });

  if (!settings.feedstreeopened) {
    $("#feeds").hide();
    $("#expand_folders_tree").hide();
    $("#collapse_folders_tree").hide();
  }
  loadFolders();
});

document.addEventListener("folders_loaded", function () {
  $("#feeds_list_header").html("All items");
  loadItems(0, 0, 3);
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
                <div class="listree-submenu-heading"><div class="tree-title folder_name" id="' +
          key +
          '">' +
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
        $("#feeds_list_header").html(target.textContent);
        while (target != null && target.id == "") {
          target = target.parentNode;
        }
        $(".item-selected").removeClass("item-selected");
        $(target).addClass("item-selected");

        $("#feeds_list").scrollTop(0);
        loadItems(0, target.id, 0);
      });

      $(".folder_name").click(function (e) {
        var target = e.target;
        $("#feeds_list_header").html(target.textContent);
        while (target != null && !target.id) {
          target = target.parentNode;
        }
        if (target.id) {
          $("#feeds_list").scrollTop(0);
          $(".item-selected").removeClass("item-selected");
          $(e.target).addClass("item-selected");
          loadItems(0, target.id, 1);
        }
      });

      listree();
      document.dispatchEvent(new Event("folders_loaded"));
    });
  });
}

/**
 * Load items
 * @param {*} offset only return older (lower than equal that id) items than the one with id 30
 * @param {*} id the id of the folder or feed, Use 0 for Starred and All
 * @param {*} type the type of the query (Feed: 0, Folder: 1, Starred: 2, All: 3)
 */
function loadItems(offset, id, type) {
  selectedType = type;
  console.log(
    "Loaditems offset: %s id:%s type:%s read:%s",
    offset.toString(),
    id.toString(),
    type.toString(),
    withUnreadItems.toString()
  );
  currentFolderOrFeedId = id;
  var feedsUrl =
    getSettings().nextcloudurl + "/index.php/apps/news/api/v1-2/items";
  $.ajax({
    url: feedsUrl,
    data: {
      batchSize: NB_ITEMS_TO_LOAD,
      offset: offset,
      id: id,
      type: type == null && id != 0 ? 1 : type,
      getRead: withUnreadItems,
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
      var itemImage = getItemImage(item);
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
        itemImage +
        '" class="item-img' +
        (itemImage == "/images/document.png" ? "-none" : "") +
        '">\
         </div>\
         <div class="flex-item-title-author-container">\
            <div class="item-title-author-container">\
            <div class="item-title-fav">\
            <div class="item-title">' +
        item["title"] +
        '</div>\
        <div id="star-' +
        item["feedId"] +
        "-" +
        item["guidHash"] +
        '" class="star ' +
        (item["starred"] ? "" : "non-") +
        'favorite"/></div>\
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
                    <div class="item-date">' +
        timeSince(item["pubDate"]) +
        "</div>\
                </div>\
            </div>\
        </div></div></div>";
    }
    if (offset == 0) {
      $("#feeds_list").html(itemList);
    } else {
      //$("#feeds_list").innerHTML += itemList;
      $("#feeds_list").append(itemList);
    }

    $(".item").click(function (e) {
      openItem(e);
    });

    $(".star").click(function (e) {
      toggleStarItem(e);
    });
    itemLoading = false;
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
  if (finalFaviconUrl == "" || finalFaviconUrl == null) {
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
      image = "/images/document.png";
      m = REX.exec(item["body"]);
      if (m) {
        image = m[1];
      }
    }
  }

  return image;
}

function openItem(e) {
  var target = e.target;
  while (target != null && target.getAttribute("content_url") == null) {
    target = target.parentNode;
  }
  if (target != null && target.getAttribute("content_url") != null) {
    var url = target.getAttribute("content_url");
    if (
      !settings.readibility ||
      url.indexOf("?url=") > -1 ||
      url.indexOf("&url=") > -1
    ) {
      $("#item_content_div").hide();
      $("#item_content_iframe").show();
      $("#item_content_iframe").attr("src", url);
      $("#item_content_iframe").on("load", function (e) {
        e.target.contentWindow.focus();
      });
    } else {
      $("#item_content_iframe").hide();
      $("#item_content_div").show();
      $.ajax({
        url: url,
      }).done(function (htmlString) {
        const parser = new DOMParser();
        var doc = parser.parseFromString(htmlString, "text/html");
        var article = new Readability(doc).parse();
        $("#item_content_div").html(article.content);
        $("#item_content_div").focus();
        $("#item_content_div").scrollTop(0);
      });
    }

    markItemAsRead(target.id);
  }
}

function toggleStarItem(e) {
  var REX = /star-(\d+)-(.*)/g;
  var m = REX.exec(e.target.id);
  if (m && m.length == 3) {
    var action;
    var n = $(e.target);
    if (n.hasClass("favorite")) {
      n.removeClass("favorite");
      n.addClass("non-favorite");
      action = "unstar";
    } else {
      n.addClass("favorite");
      n.removeClass("non-favorite");
      action = "star";
    }

    var feedId = m[1];
    var guidHash = m[2];

    var toggleStarItemUrl =
      getSettings().nextcloudurl +
      "/index.php/apps/news/api/v1-2/items/" +
      feedId +
      "/" +
      guidHash +
      "/" +
      action;

    $.ajax({
      url: toggleStarItemUrl,
      method: "PUT",
      headers: {
        Authorization:
          "Basic " +
          btoa(
            getSettings().nextclouduser + ":" + getSettings().nextcloudpassword
          ),
      },
    }).done(function (folders) {});
  }

  e.stopPropagation();
}
