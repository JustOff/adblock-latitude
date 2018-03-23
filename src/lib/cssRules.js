/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * @fileOverview CSS property filtering implementation.
 */

let {ElemHide} = require("elemHide");
let {Filter} =  require("filterClasses");

var filters = Object.create(null);

/**
 * CSS rules component
 * @class
 */
let CSSRules = exports.CSSRules =
{
  /**
   * Removes all known filters
   */
  clear: function()
  {
    filters = Object.create(null);
  },

  /**
   * Add a new CSS property filter
   * @param {CSSPropertyFilter} filter
   */
  add: function(filter)
  {
    filters[filter.text] = true;
  },

  /**
   * Removes a CSS property filter
   * @param {CSSPropertyFilter} filter
   */
  remove: function(filter)
  {
    delete filters[filter.text];
  },

  /**
   * Returns a list of all rules active on a particular domain
   * @param {String} domain
   * @return {CSSPropertyFilter[]}
   */
  getRulesForDomain: function(domain)
  {
    let result = [];
    let keys = Object.getOwnPropertyNames(filters);
    for (let key of keys)
    {
      let filter = Filter.fromText(key);
      if (filter.isActiveOnDomain(domain) && !ElemHide.getException(filter, domain))
        result.push(filter);
    }
    return result;
  }
};
