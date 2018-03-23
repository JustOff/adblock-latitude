/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * @fileOverview Starts up Adblock Plus
 */

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");

bootstrapChildProcesses();
registerPublicAPI();
require("filterListener");
require("contentPolicy");
require("synchronizer");
require("notification");
require("sync");
require("messageResponder");
require("ui");
require("objectTabs");
require("elemHideFF");
require("cssProperties");

function bootstrapChildProcesses()
{
  let info = require("info");

  let processScript = info.addonRoot + "lib/child/bootstrap.js?" +
      Math.random() + "&info=" + encodeURIComponent(JSON.stringify(info));
  let messageManager = Cc["@mozilla.org/parentprocessmessagemanager;1"]
                         .getService(Ci.nsIProcessScriptLoader)
                         .QueryInterface(Ci.nsIMessageBroadcaster);
  messageManager.loadProcessScript(processScript, true);

  onShutdown.add(() => {
    messageManager.broadcastAsyncMessage("AdblockPlus:Shutdown", processScript);
    messageManager.removeDelayedProcessScript(processScript);
  });
}

function registerPublicAPI()
{
  let {addonRoot} = require("info");

  let uri = Services.io.newURI(addonRoot + "lib/Public.jsm", null, null);
  if (uri instanceof Ci.nsIMutable)
    uri.mutable = false;

  let classID = Components.ID("5e447bce-1dd2-11b2-b151-ec21c2b6a135");
  let contractID = "@adblockplus.org/abp/public;1";
  let factory =
  {
    createInstance: function(outer, iid)
    {
      if (outer)
        throw Cr.NS_ERROR_NO_AGGREGATION;
      return uri.QueryInterface(iid);
    },
    QueryInterface: XPCOMUtils.generateQI([Ci.nsIFactory])
  };

  let registrar = Components.manager.QueryInterface(Ci.nsIComponentRegistrar);
  registrar.registerFactory(classID, "Adblock Plus public API URL", contractID, factory);

  onShutdown.add(function()
  {
    registrar.unregisterFactory(classID, factory);
    Cu.unload(uri.spec);
  });
}
