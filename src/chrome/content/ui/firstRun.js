/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

(function()
{
  function onDOMLoaded()
  {
    // Set up logo image
    var logo = E("logo");
    logo.src = "skin/abp-icon-big.png";
    var errorCallback = function()
    {
      logo.removeEventListener("error", errorCallback, false);
      // We are probably in Chrome/Opera/Safari, the image has a different path.
      logo.src = "icons/detailed/abp-128.png";
    };
    logo.addEventListener("error", errorCallback, false);

    // Set up URLs
    getDocLink("donate", function(link)
    {
      E("donate").href = link;
    });

    getDocLink("contributors", function(link)
    {
      E("contributors").href = link;
    });

    getDocLink("acceptable_ads_criteria", function(link)
    {
      setLinks("acceptable-ads-explanation", link, openFilters);
    });

    getDocLink("contribute", function(link)
    {
      setLinks("share-headline", link);
    });

    ext.backgroundPage.sendMessage({
      type: "app.get",
      what: "issues"
    }, function(issues)
    {
      // Show warning if filterlists settings were reinitialized
      if (issues.filterlistsReinitialized)
      {
        E("filterlistsReinitializedWarning").removeAttribute("hidden");
        setLinks("filterlistsReinitializedWarning", openFilters);
      }

      if (issues.legacySafariVersion)
        E("legacySafariWarning").removeAttribute("hidden");
    });

    updateSocialLinks();

    ext.onMessage.addListener(function(message)
    {
      if (message.type == "subscriptions.respond")
      {
        updateSocialLinks();
      }
    });
    ext.backgroundPage.sendMessage({
      type: "subscriptions.listen",
      filter: ["added", "removed", "updated", "disabled"]
    });
  }

  function updateSocialLinks()
  {
    var networks = ["twitter", "facebook", "gplus"];
    networks.forEach(function(network)
    {
      var link = E("share-" + network);
      checkShareResource(link.getAttribute("data-script"), function(isBlocked)
      {
        // Don't open the share page if the sharing script would be blocked
        if (isBlocked)
          link.removeEventListener("click", onSocialLinkClick, false);
        else
          link.addEventListener("click", onSocialLinkClick, false);
      });
    });
  }

  function onSocialLinkClick(event)
  {
    if (window.matchMedia("(max-width: 970px)").matches)
      return;

    event.preventDefault();

    getDocLink(event.target.id, function(link)
    {
      openSharePopup(link);
    });
  }

  function setLinks(id)
  {
    var element = E(id);
    if (!element)
    {
      return;
    }

    var links = element.getElementsByTagName("a");

    for (var i = 0; i < links.length; i++)
    {
      if (typeof arguments[i + 1] == "string")
      {
        links[i].href = arguments[i + 1];
        links[i].setAttribute("target", "_blank");
      }
      else if (typeof arguments[i + 1] == "function")
      {
        links[i].href = "javascript:void(0);";
        links[i].addEventListener("click", arguments[i + 1], false);
      }
    }
  }

  function openFilters()
  {
    ext.backgroundPage.sendMessage({type: "app.open", what: "options"});
  }

  document.addEventListener("DOMContentLoaded", onDOMLoaded, false);
})();
