/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

let {port} = require("messaging");

// Only initialize after receiving a "response" to a dummy message - this makes
// sure that on update the old version has enough time to receive and process
// the shutdown message.
port.emitWithResponse("ping").then(() =>
{
  require("child/elemHide");
  require("child/contentPolicy");
  require("child/contextMenu");
  require("child/dataCollector");
  require("child/cssProperties");
  require("child/subscribeLinks");
}).catch(e => Cu.reportError(e));
