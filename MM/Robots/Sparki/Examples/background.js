
// This file is only used when building as a Chrome App / Extension.
// It is referenced by "manifest.json" in top level folder.

chrome.app.runtime.onLaunched.addListener(function() {
  chrome.app.window.create('MM/Robots/Sparki/Examples/Sparki.html', {
    'bounds': {
      'width': 650,
      'height': 550
    }
  });
});


