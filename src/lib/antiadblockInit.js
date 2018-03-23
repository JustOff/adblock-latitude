/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

Cu.import("resource://gre/modules/Services.jsm");

let {Utils} = require("utils");
let {Prefs} = require("prefs");
let {ActiveFilter} = require("filterClasses");
let {FilterStorage} = require("filterStorage");
let {FilterNotifier} = require("filterNotifier");
let {Subscription} = require("subscriptionClasses");
let {Notification} = require("notification");

exports.initAntiAdblockNotification = function initAntiAdblockNotification()
{
  let notification = {
    id: "antiadblock",
    type: "question",
    title: Utils.getString("notification_antiadblock_title"),
    message: Utils.getString("notification_antiadblock_message"),
    urlFilters: []
  };

  function notificationListener(approved)
  {
    let subscription = Subscription.fromURL(Prefs.subscriptions_antiadblockurl);
    if (subscription.url in FilterStorage.knownSubscriptions)
      subscription.disabled = !approved;
  }

  function addAntiAdblockNotification(subscription)
  {
    let urlFilters = [];
    for (let filter of subscription.filters)
    {
      if (filter instanceof ActiveFilter)
      {
        for (let domain in filter.domains)
        {
          let urlFilter = "||" + domain + "^$document";
          if (domain && filter.domains[domain] && urlFilters.indexOf(urlFilter) == -1)
            urlFilters.push(urlFilter);
        }
      }
    }
    notification.urlFilters = urlFilters;
    Notification.addNotification(notification);
    Notification.addQuestionListener(notification.id, notificationListener);
  }

  function removeAntiAdblockNotification()
  {
    Notification.removeNotification(notification);
    Notification.removeQuestionListener(notification.id, notificationListener);
  }

  let subscription = Subscription.fromURL(Prefs.subscriptions_antiadblockurl);
  if (subscription.lastDownload && subscription.disabled)
    addAntiAdblockNotification(subscription);

  function onSubscriptionChange(subscription)
  {
    let url = Prefs.subscriptions_antiadblockurl;
    if (url != subscription.url)
      return;

    if (url in FilterStorage.knownSubscriptions && !subscription.disabled)
      addAntiAdblockNotification(subscription);
    else
      removeAntiAdblockNotification();
  }

  FilterNotifier.on("subscription.updated", onSubscriptionChange);
  FilterNotifier.on("subscription.removed", onSubscriptionChange);
  FilterNotifier.on("subscription.disabled", onSubscriptionChange);
}
