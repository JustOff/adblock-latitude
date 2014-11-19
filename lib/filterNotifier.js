/*
 * This file is part of Adblock Latitude,
 * Copyright (C) 2014 Binary Outcast.
 *
 * The Original Code is AdBlock Plus
 * The Initial Developer of the Original Code is
 * Eyeo GmbH
 *
 * Portions created by the Initial Developer are 
 * Copyright (C) 2006-2013 the Initial Developer. All Rights Reserved.
 *
 * Contributors:
 *
 *
 * Adblock Latitude is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3 as
 * published by the Free Software Foundation.
 *
 * Adblock Latitude is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Adblock Latitude.  If not, see <http://www.gnu.org/licenses/>.
 */

/**
 * @fileOverview This component manages listeners and calls them to distributes
 * messages about filter changes.
 */

/**
 * List of registered listeners
 * @type Array of function(action, item, newValue, oldValue)
 */
let listeners = [];

/**
 * This class allows registering and triggering listeners for filter events.
 * @class
 */
let FilterNotifier = exports.FilterNotifier =
{
  /**
   * Adds a listener
   */
  addListener: function(/**function(action, item, newValue, oldValue)*/ listener)
  {
    if (listeners.indexOf(listener) >= 0)
      return;

    listeners.push(listener);
  },

  /**
   * Removes a listener that was previosly added via addListener
   */
  removeListener: function(/**function(action, item, newValue, oldValue)*/ listener)
  {
    let index = listeners.indexOf(listener);
    if (index >= 0)
      listeners.splice(index, 1);
  },

  /**
   * Notifies listeners about an event
   * @param {String} action event code ("load", "save", "elemhideupdate",
   *                 "subscription.added", "subscription.removed",
   *                 "subscription.disabled", "subscription.title",
   *                 "subscription.lastDownload", "subscription.downloadStatus",
   *                 "subscription.homepage", "subscription.updated",
   *                 "filter.added", "filter.removed", "filter.moved",
   *                 "filter.disabled", "filter.hitCount", "filter.lastHit")
   * @param {Subscription|Filter} item item that the change applies to
   */
  triggerListeners: function(action, item, param1, param2, param3)
  {
    for each (let listener in listeners)
      listener(action, item, param1, param2, param3);
  }
};
