// Language menu: remembers the choice and moves to the other language's page. Nothing here sends data anywhere.
(function () {
  var sel = document.getElementById("lang");
  if (sel) sel.addEventListener("change", function () {
    try { localStorage.setItem("ds-lang", sel.value); } catch (e) {}
    var u = new URL(location.href);
    u.searchParams.delete("lang");
    location.assign(new URL(sel.dataset.other, location.href).pathname + u.search + u.hash);
  });
})();
