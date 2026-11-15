(function (root) {
  function toast(message, type) {
    var ui = root.EsUI;
    if (ui && typeof ui.toast === "function") ui.toast(String(message || ""), type || "success", 3200);
  }

  function githubTransition(previous, status) {
    if (!status || typeof status.connected !== "boolean") return null;
    if (status.reason === "token_expired" && (!previous || previous.connected !== true)) {
      var expiredLogin = String(status.previousLogin || "GitHub").trim() || "GitHub";
      return { message: "GitHub connection expired for " + expiredLogin, type: "error" };
    }
    if (!previous || typeof previous.connected !== "boolean") return null;
    var wasConnected = previous.connected;
    var isConnected = status.connected;
    var oldLogin = String(previous.login || status.previousLogin || "GitHub").trim() || "GitHub";
    var newLogin = String(status.login || "").trim();
    if (!wasConnected && isConnected) {
      return newLogin ? { message: "Connected to " + newLogin, type: "success" } : null;
    }
    if (wasConnected && !isConnected) {
      if (status.reason === "token_expired") return { message: "GitHub connection expired for " + oldLogin, type: "error" };
      return { message: "Disconnected from " + oldLogin, type: "success" };
    }
    if (wasConnected && isConnected && previous.login && newLogin && String(previous.login).toLowerCase() !== newLogin.toLowerCase()) {
      return { message: "Connected to " + newLogin, type: "success" };
    }
    return null;
  }

  root.CodingNotifications = Object.freeze({ toast: toast, githubTransition: githubTransition });
})(window);
