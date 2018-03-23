/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

let {Services} = Cu.import("resource://gre/modules/Services.jsm", {});
let {XPCOMUtils} = Cu.import("resource://gre/modules/XPCOMUtils.jsm", {});

let {Utils} = require("utils");
let {RequestNotifier} = require("child/requestNotifier");
let {storeNodes} = require("child/contentPolicy");

/**
 * Determines the context menu entries to be shown for a contextmenu event.
 * @param {Event} event
 * @return {Array}
 */
function getContextInfo(event)
{
  let items = [];
  let target = event.target;
  if (target.localName == "menupopup" && target.triggerNode)
  {
    // SeaMonkey gives us the context menu's popupshowing event
    target = target.triggerNode;
  }
  if (target instanceof Ci.nsIDOMHTMLMapElement || target instanceof Ci.nsIDOMHTMLAreaElement)
  {
    // HTML image maps will usually receive events when the mouse pointer is
    // over a different element, get the real event target.
    let rect = target.getClientRects()[0];
    target = target.ownerDocument.elementFromPoint(Math.max(rect.left, 0), Math.max(rect.top, 0));
  }

  if (!target)
    return items;

  let addMenuItem = function([node, nodeData])
  {
    let nodeID = null;
    if (node && node.nodeType == Ci.nsIDOMNode.ELEMENT_NODE)
      nodeID = storeNodes([node]);
    items.push([nodeID, nodeData]);
  }.bind(this);

  // Look up data that we have for the node
  let data = RequestNotifier.getDataForNode(target);
  let hadImage = false;
  if (data && !data[1].filter)
  {
    addMenuItem(data);
    hadImage = (data[1].type == "IMAGE");
  }

  // Look for frame data
  let wnd = Utils.getWindow(target);
  if (wnd.frameElement)
  {
    let data = RequestNotifier.getDataForNode(wnd.frameElement, true);
    if (data && !data[1].filter)
      addMenuItem(data);
  }

  // Look for a background image
  if (!hadImage)
  {
    let extractImageURL = function(computedStyle, property)
    {
      let value = computedStyle.getPropertyCSSValue(property);
      // CSSValueList
      if ("length" in value && value.length >= 1)
        value = value[0];
      // CSSValuePrimitiveType
      if ("primitiveType" in value && value.primitiveType == value.CSS_URI)
        return Utils.unwrapURL(value.getStringValue()).spec;

      return null;
    };

    let node = target;
    while (node)
    {
      if (node.nodeType == Ci.nsIDOMNode.ELEMENT_NODE)
      {
        let style = wnd.getComputedStyle(node, "");
        let bgImage = extractImageURL(style, "background-image") || extractImageURL(style, "list-style-image");
        if (bgImage)
        {
          let data = RequestNotifier.getDataForNode(wnd.document, true, "IMAGE", bgImage);
          if (data && !data[1].filter)
          {
            addMenuItem(data);
            break;
          }
        }
      }

      node = node.parentNode;
    }
  }

  return items;
};

let ContextMenuObserver =
{
  observe: function(subject, topic, data)
  {
    if (subject.wrappedJSObject)
      subject = subject.wrappedJSObject;

    if (subject.addonInfo)
      subject.addonInfo.adblockplus = getContextInfo(subject.event);
  },
  QueryInterface: XPCOMUtils.generateQI([Ci.nsISupportsWeakReference, Ci.nsIObserver])
};

Services.obs.addObserver(ContextMenuObserver, "content-contextmenu", true);
Services.obs.addObserver(ContextMenuObserver, "AdblockPlus:content-contextmenu", true);
onShutdown.add(() => {
  Services.obs.removeObserver(ContextMenuObserver, "content-contextmenu");
  Services.obs.removeObserver(ContextMenuObserver, "AdblockPlus:content-contextmenu");
});
