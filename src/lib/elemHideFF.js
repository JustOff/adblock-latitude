/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

let {Services} = Cu.import("resource://gre/modules/Services.jsm", {});

let {port} = require("messaging");
let {ElemHide} = require("elemHide");
let {FilterNotifier} = require("filterNotifier");
let {FilterStorage} = require("filterStorage");
let {Prefs} = require("prefs");
let {Policy} = require("contentPolicy");
let {Utils} = require("utils");

let isDirty = false;
FilterNotifier.on("elemhideupdate", () =>
{
  // Notify content process asynchronously, only one message per update batch.
  if (!isDirty)
  {
    isDirty = true;
    Utils.runAsync(() => {
      isDirty = false;
      port.emit("elemhideupdate")
    });
  }
});

port.on("getUnconditionalSelectors", () =>
{
  return [
    ElemHide.getUnconditionalSelectors(),
    ElemHide.getUnconditionalFilterKeys()
  ];
});

port.on("getSelectorsForDomain", ([domain, specificOnly]) =>
{
  let type = specificOnly ? ElemHide.SPECIFIC_ONLY : ElemHide.NO_UNCONDITIONAL;
  return ElemHide.getSelectorsForDomain(domain, type, true);
});

port.on("elemhideEnabled", ({frames, isPrivate}) =>
{
  if (!Prefs.enabled || !Policy.isBlockableScheme(frames[0].location))
    return {enabled: false};

  let hit = Policy.isFrameWhitelisted(frames, true);
  if (hit)
  {
    let [frameIndex, contentType, docDomain, thirdParty, location, filter] = hit;
    if (!isPrivate)
      FilterStorage.increaseHitCount(filter);
    return {
      enabled: contentType == "GENERICHIDE",
      contentType, docDomain, thirdParty, location,
      filter: filter.text, filterType: filter.type
    };
  }

  return {enabled: true};
});

port.on("registerElemHideHit", ({key, frames, isPrivate}) =>
{
  let filter = ElemHide.getFilterByKey(key);
  if (!filter)
    return null;

  if (!isPrivate)
    FilterStorage.increaseHitCount(filter);

  let docDomain;
  try
  {
    docDomain = Utils.unwrapURL(frames[0].location).host;
  }
  catch(e)
  {
    docDomain = null;
  }

  return {
    contentType: "ELEMHIDE",
    docDomain,
    thirdParty: false,
    location: filter.text.replace(/^.*?#/, '#'),
    filter: filter.text,
    filterType: filter.type
  };
});
