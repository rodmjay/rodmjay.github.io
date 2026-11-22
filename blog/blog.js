// Blog pages: the language menu (same as the home page) and the Copy buttons on code. Nothing here sends data anywhere.
(function () {
  var sel = document.getElementById("lang");
  if (sel) sel.addEventListener("change", function () {
    try { localStorage.setItem("ds-lang", sel.value); } catch (e) {}
    location.assign(sel.dataset.other);
  });
  if (window.DSProse) DSProse.wireCodeBlocks(document);
})();
