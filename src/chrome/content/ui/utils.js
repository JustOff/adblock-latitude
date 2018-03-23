/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;
const Cu = Components.utils;

Cu.import("resource://gre/modules/Services.jsm");

/**
 * Imports a module from Adblock Plus core.
 */
function require(/**String*/ module)
{
  var result = {};
  result.wrappedJSObject = result;
  Services.obs.notifyObservers(result, "adblockplus-require", module);
  return result.exports;
}

var {Policy} = require("contentPolicy");
var {Filter, InvalidFilter, CommentFilter, ActiveFilter, RegExpFilter,
     BlockingFilter, WhitelistFilter, ElemHideBase, ElemHideFilter,
     ElemHideException, CSSPropertyFilter} = require("filterClasses");
var {FilterNotifier} = require("filterNotifier");
var {FilterStorage} = require("filterStorage");
var {IO} = require("io");
var {defaultMatcher, Matcher, CombinedMatcher} = require("matcher");
var {Prefs} = require("prefs");
var {RequestNotifier} = require("requestNotifier");
var {Subscription, SpecialSubscription, RegularSubscription,
     ExternalSubscription, DownloadableSubscription} = require("subscriptionClasses");
var {Synchronizer} = require("synchronizer");
var {UI} = require("ui");
var {Utils} = require("utils");

/**
 * Shortcut for document.getElementById(id)
 */
function E(id)
{
  return document.getElementById(id);
}

/**
 * Determines subscription's title as it should be displayed in the UI.
 * @return {String}
 *   subscription's title or an appropriate default title if none present
 */
function getSubscriptionTitle(/**Subscription*/ subscription)
{
  if (subscription.title)
    return subscription.title;

  if (subscription instanceof DownloadableSubscription)
    return subscription.url;

  if (subscription instanceof SpecialSubscription && subscription.defaults)
    return Utils.getString(subscription.defaults + "Group_title");

  return Utils.getString("newGroup_title");
}

/**
 * Split up all labels into the label and access key portions.
 */
document.addEventListener("DOMContentLoaded", function splitAllLabelsHandler()
{
  document.removeEventListener("DOMContentLoaded", splitAllLabelsHandler, false);
  Utils.splitAllLabels(document);
}, false);
