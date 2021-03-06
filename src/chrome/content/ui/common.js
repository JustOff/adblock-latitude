/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

(function(global)
{
  global.E = function E(id)
  {
    return document.getElementById(id);
  }

  global.getDocLink = function(link, callback)
  {
    ext.backgroundPage.sendMessage({
      type: "app.get",
      what: "doclink",
      link: link
    }, callback);
  }

  global.checkShareResource = function(url, callback)
  {
    ext.backgroundPage.sendMessage(
    {
      type: "filters.blocked",
      url: url,
      requestType: "SCRIPT",
      docDomain: "adblockplus.org",
      thirdParty: true
    }, callback);
  }

  global.openSharePopup = function(url)
  {
    var glassPane = E("glass-pane");
    if (!glassPane)
    {
      glassPane = document.createElement("div");
      glassPane.setAttribute("id", "glass-pane");
      document.body.appendChild(glassPane);
    }

    var iframe = E("share-popup");
    if (!iframe)
    {
      iframe = document.createElement("iframe");
      iframe.setAttribute("id", "share-popup");
      iframe.setAttribute("scrolling", "no");
      glassPane.appendChild(iframe);
    }

    // Firefox 38+ no longer allows messaging using postMessage so we need
    // to have a fake top level frame to avoid problems with scripts that try to
    // communicate with the first-run page
    var isGecko = ("Components" in window);
    if (isGecko)
    {
      try
      {
        var Ci = Components.interfaces;
        var docShell = iframe.contentWindow
          .QueryInterface(Ci.nsIInterfaceRequestor)
          .getInterface(Ci.nsIDocShell);

        if (typeof docShell.frameType != "undefined")
        {
          // Gecko 47+
          docShell.frameType = docShell.FRAME_TYPE_BROWSER;
        }
        else
        {
          // Legacy branch
          docShell.setIsBrowserInsideApp(Ci.nsIScriptSecurityManager.UNKNOWN_APP_ID);
        }
      }
      catch(ex)
      {
        console.error(ex);
      }
    }

    var popupMessageReceived = false;
    function resizePopup(width, height)
    {
      iframe.width = width;
      iframe.height = height;
      iframe.style.marginTop = -height / 2 + "px";
      iframe.style.marginLeft = -width / 2 + "px";
      popupMessageReceived = true;
      window.removeEventListener("message", popupMessageListener);
    }

    var popupMessageListener = function(event)
    {
      if (!/[.\/]adblockplus\.org$/.test(event.origin)
        || !("width" in event.data)
        || !("height" in event.data))
        return;

      resizePopup(event.data.width, event.data.height);
    };
    // Firefox requires last parameter to be true to be triggered by
    // unprivileged pages
    window.addEventListener("message", popupMessageListener, false, true);

    var popupLoadListener = function()
    {
      if (!popupMessageReceived && isGecko)
      {
        var rootElement = iframe.contentDocument.documentElement;
        var width = rootElement.dataset.width;
        var height = rootElement.dataset.height;
        if (width && height)
          resizePopup(width, height);
      }

      if (popupMessageReceived)
      {
        iframe.className = "visible";

        var popupCloseListener = function()
        {
          iframe.className = glassPane.className = "";
          document.removeEventListener("click", popupCloseListener);
        };
        document.addEventListener("click", popupCloseListener, false);
      }
      else
      {
        glassPane.className = "";
        window.removeEventListener("message", popupMessageListener);
      }

      iframe.removeEventListener("load", popupLoadListener);
    };
    iframe.addEventListener("load", popupLoadListener, false);

    iframe.src = url;
    glassPane.className = "visible";
  }
})(this);
