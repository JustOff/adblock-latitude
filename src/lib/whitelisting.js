/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * @fileOverview This is a dummy to provide a function needed by message
 * responder.
 */

"use strict";

let {Policy} = require("contentPolicy");
let {RegExpFilter} = require("filterClasses");

// NOTE: The function interface is supposed to be compatible with
// checkWhitelisted in adblockpluschrome. That's why there is a typeMask
// parameter here. However, this parameter is only used to decide whether
// elemhide whitelisting should be considered, so only supported values for this
// parameter are RegExpFilter.typeMap.DOCUMENT and
// RegExpFilter.typeMap.DOCUMENT | RegExpFilter.typeMap.ELEMHIDE.
exports.checkWhitelisted = function(page, frames, typeMask)
{
  let match =
      Policy.isFrameWhitelisted(frames, typeMask & RegExpFilter.typeMap.ELEMHIDE);
  if (match)
  {
    let [frameIndex, matchType, docDomain, thirdParty, location, filter] = match;
    if (matchType == "DOCUMENT" || matchType == "ELEMHIDE")
      return filter;
  }

  return null;
};
