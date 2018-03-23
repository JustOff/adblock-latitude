/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

let {XPCOMUtils} = Cu.import("resource://gre/modules/XPCOMUtils.jsm", null);
let {Services} = Cu.import("resource://gre/modules/Services.jsm", null);

let {_EventTarget: EventTarget} = require("ext_common");
let {port} = require("messaging");

exports.onMessage = new EventTarget(port);

function Page(windowID)
{
  this._windowID = windowID;
}
Page.prototype = {
  sendMessage: function(payload)
  {
    port.emit("ext_message", {targetID: this._windowID, payload});
  }
};
exports.Page = Page;

function PageMap()
{
  this._map = new Map();

  port.on("ext_disconnect", windowID => this._map.delete(windowID));
}
PageMap.prototype = {
  keys: function()
  {
    let result = [];
    for (let windowID of this._map.keys())
      result.push(new Page(windowID));
    return result;
  },

  get: function(page)
  {
    return this._map.get(page._windowID);
  },

  set: function(page, value)
  {
    this._map.set(page._windowID, value);
  },

  has: function(page)
  {
    return this._map.has(page._windowID);
  },

  delete: function(page)
  {
    return this._map.delete(page._windowID);
  }
};
exports.PageMap = PageMap;

exports.showOptions = function()
{
  require("ui").UI.openFiltersDialog();
};
