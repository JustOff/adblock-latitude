/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

let {Services} = Cu.import("resource://gre/modules/Services.jsm", {});

let {port} = require("messaging");

Services.obs.addObserver(onContentWindow, "content-document-global-created",
    false);
onShutdown.add(() =>
{
  Services.obs.removeObserver(onContentWindow,
      "content-document-global-created");
});

function onContentWindow(subject, topic, data)
{
  if (subject instanceof Ci.nsIDOMWindow && subject.top == subject)
  {
    let eventTarget = subject.QueryInterface(Ci.nsIInterfaceRequestor)
                             .getInterface(Ci.nsIWebNavigation)
                             .QueryInterface(Ci.nsIDocShell)
                             .chromeEventHandler;
    if (eventTarget)
      eventTarget.addEventListener("click", onClick, true);
  }
}

function onClick(event)
{
  if (onShutdown.done)
    return;

  // Ignore right-clicks
  if (event.button == 2)
    return;

  // Search the link associated with the click
  let link = event.target;
  while (!(link instanceof Ci.nsIDOMHTMLAnchorElement))
  {
    link = link.parentNode;

    if (!link)
      return;
  }

  let queryString = null;
  if (link.protocol == "http:" || link.protocol == "https:")
  {
    if (link.host == "subscribe.adblockplus.org" && link.pathname == "/")
      queryString = link.search.substr(1);
  }
  else
  {
    // Firefox doesn't populate the "search" property for links with
    // non-standard URL schemes so we need to extract the query string
    // manually
    let match = /^abp:\/*subscribe\/*\?(.*)/i.exec(link.href);
    if (match)
      queryString = match[1];
  }

  if (!queryString)
    return;

  // This is our link - make sure the browser doesn't handle it
  event.preventDefault();
  event.stopPropagation();

  // Decode URL parameters
  let title = null;
  let url = null;
  let mainSubscriptionTitle = null;
  let mainSubscriptionURL = null;
  for (let param of queryString.split("&"))
  {
    let parts = param.split("=", 2);
    if (parts.length != 2 || !/\S/.test(parts[1]))
      continue;
    switch (parts[0])
    {
      case "title":
        title = decodeURIComponent(parts[1]);
        break;
      case "location":
        url = decodeURIComponent(parts[1]);
        break;
      case "requiresTitle":
        mainSubscriptionTitle = decodeURIComponent(parts[1]);
        break;
      case "requiresLocation":
        mainSubscriptionURL = decodeURIComponent(parts[1]);
        break;
    }
  }

  port.emit("subscribeLinkClick", {
    title: title,
    url: url,
    mainSubscriptionTitle: mainSubscriptionTitle,
    mainSubscriptionURL: mainSubscriptionURL
  });
}
