/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

let {port} = require("messaging");
let {Filter} = require("filterClasses");
let {FilterStorage} = require("filterStorage");

port.on("addHits", filters =>
{
  for (let text of filters)
    FilterStorage.increaseHitCount(Filter.fromText(text));
});
