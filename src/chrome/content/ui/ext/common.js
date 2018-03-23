/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

(function(global)
{
  if (!global.ext)
    global.ext = {};

  var wrapperSymbol = Symbol("ext-wrapper");

  function wrapFrames(frames)
  {
    if (!frames.length)
      return null;

    // We have frames as an array, non-Firefox code expects url and parent
    // properties however.
    Object.defineProperty(frames, "url", {
      enumerable: true,
      get: () => new URL(frames[0].location)
    });

    Object.defineProperty(frames, "parent", {
      enumerable: true,
      get: () => wrapFrames(frames.slice(1))
    });

    return frames;
  }

  var EventTarget = global.ext._EventTarget = function(port, windowID)
  {
    this._port = port;
    this._windowID = windowID;
  };
  EventTarget.prototype = {
    addListener: function(listener)
    {
      var wrapper = (message, sender) =>
      {
        if (this._windowID && this._windowID != message.targetID)
          return undefined;

        return new Promise((resolve, reject) =>
        {
          var sender = {};
          if (message.senderID)
          {
            // We will only get here on the background side so we can access
            // the Page object.
            const Page = require("ext_background").Page;
            sender.page = new Page(message.senderID);
          }
          if (message.frames)
            sender.frame = wrapFrames(message.frames);
          if (!listener(message.payload, sender, resolve))
            resolve(undefined);
        });
      };
      listener[wrapperSymbol] = wrapper;
      this._port.on("ext_message", wrapper);
    },

    removeListener: function(listener)
    {
      if (listener[wrapperSymbol])
        this._port.off("ext_message", listener[wrapperSymbol]);
    }
  };

  if (typeof exports == "object")
    exports = global.ext;
})(this);
