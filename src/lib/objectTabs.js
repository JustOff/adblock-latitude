/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * @fileOverview Code responsible for showing and hiding object tabs.
 */

let {Prefs} = require("prefs");
let {Utils} = require("utils");
let {port} = require("messaging");

/**
 * Random element class, to be used for object tabs displayed on top of the
 * plugin content.
 * @type string
 */
let classVisibleTop = null;

/**
 * Random element class, to be used for object tabs displayed at the bottom of
 * the plugin content.
 * @type string
 */
let classVisibleBottom = null;

/**
 * Random element class, to be used for object tabs that are hidden.
 * @type string
 */
let classHidden = null;

port.on("getObjectTabsStatus", function(message, sender)
{
  let {UI} = require("ui");

  return !!(Prefs.enabled && Prefs.frameobjects && UI.overlay && classHidden);
});

port.on("getObjectTabsTexts", function(message, sender)
{
  let {UI} = require("ui");

  return {
    label: UI.overlay.attributes.objtabtext,
    tooltip: UI.overlay.attributes.objtabtooltip,
    classVisibleTop, classVisibleBottom, classHidden
  };
});

port.on("blockItem", function({request, nodesID}, sender)
{
  let {UI} = require("ui");
  UI.blockItem(UI.currentWindow, nodesID, request);
});

function init()
{
  function processCSSData(event)
  {
    if (onShutdown.done)
      return;

    let data = event.target.responseText;

    let rnd = [];
    let offset = "a".charCodeAt(0);
    for (let i = 0; i < 60; i++)
      rnd.push(offset + Math.random() * 26);

    classVisibleTop = String.fromCharCode.apply(String, rnd.slice(0, 20));
    classVisibleBottom = String.fromCharCode.apply(String, rnd.slice(20, 40));
    classHidden = String.fromCharCode.apply(String, rnd.slice(40, 60));

    let url = Utils.makeURI("data:text/css," + encodeURIComponent(data.replace(/%%CLASSVISIBLETOP%%/g, classVisibleTop)
                                                                      .replace(/%%CLASSVISIBLEBOTTOM%%/g, classVisibleBottom)
                                                                      .replace(/%%CLASSHIDDEN%%/g, classHidden)));
    Utils.styleService.loadAndRegisterSheet(url, Ci.nsIStyleSheetService.USER_SHEET);
    onShutdown.add(function()
    {
      Utils.styleService.unregisterSheet(url, Ci.nsIStyleSheetService.USER_SHEET);
    });
  }

  // Load CSS asynchronously
  try
  {
    let request = new XMLHttpRequest();
    request.mozBackgroundRequest = true;
    request.open("GET", "chrome://adblockplus/content/objtabs.css");
    request.overrideMimeType("text/plain");
    request.addEventListener("load", processCSSData, false);
    request.send(null);
  }
  catch (e)
  {
    Cu.reportError(e);
  }
}
init();
