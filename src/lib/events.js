/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/**
 * Registers and emits named events.
 *
 * @constructor
 */
exports.EventEmitter = function()
{
  this._listeners = Object.create(null);
};

exports.EventEmitter.prototype = {
  /**
   * Adds a listener for the specified event name.
   *
   * @param {string}   name
   * @param {function} listener
   */
  on: function(name, listener)
  {
    if (name in this._listeners)
      this._listeners[name].push(listener);
    else
      this._listeners[name] = [listener];
  },

  /**
   * Removes a listener for the specified event name.
   *
   * @param {string}   name
   * @param {function} listener
   */
  off: function(name, listener)
  {
    let listeners = this._listeners[name];
    if (listeners)
    {
      let idx = listeners.indexOf(listener);
      if (idx != -1)
        listeners.splice(idx, 1);
    }
  },

  /**
   * Adds a one time listener and returns a promise that
   * is resolved the next time the specified event is emitted.
   *
   * @return {Promise}
   */
  once: function(name)
  {
    return new Promise(resolve =>
    {
      let listener = () =>
      {
        this.off(name, listener);
        resolve();
      };

      this.on(name, listener);
    });
  },

  /**
   * Returns a copy of the array of listeners for the specified event.
   *
   * @param {string} name
   * @return {function[]}
   */
  listeners: function(name)
  {
    let listeners = this._listeners[name];
    return listeners ? listeners.slice() : [];
  },

  /**
   * Calls all previously added listeners for the given event name.
   *
   * @param {string} name
   * @param {...*}   [arg]
   */
  emit: function(name)
  {
    let args = [];
    for (let i = 1; i < arguments.length; i++)
      args.push(arguments[i]);

    let listeners = this.listeners(name);
    for (let listener of listeners)
      listener.apply(null, args);
  }
};
