document.addEventListener("settings_loaded", function () {
  $("#nextcloud_url").val(getSettings().nextcloudurl);
  $("#nextcloud_user").val(getSettings().nextclouduser);
  $("#nextcloud_password").val(getSettings().nextcloudpassword);
  if (getSettings().theme == "dark") {
    $("#dark").prop("checked", true);
  } else {
    $("#light").prop("checked", true);
  }

  if (getSettings().readibility == "Yes") {
    $("#yes").prop("checked", true);
  } else {
    $("#no").prop("checked", true);
  }

  $("#save_btn").click(save);
});

function save(e) {
  getSettings().nextcloudurl = $("#nextcloud_url").val();
  getSettings().nextclouduser = $("#nextcloud_user").val();
  getSettings().nextcloudpassword = $("#nextcloud_password").val();
  getSettings().theme = $("#dark").prop("checked") ? "dark" : "light";
  getSettings().readibility = $("#yes").prop("checked") ? "Yes" : "No";
  saveSettings(function (result) {
    iqwerty.toast.toast("Settings saved");
  });
}
