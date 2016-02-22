jQuery(function() {
  jQuery('.site .menu .item').tab();
  jQuery('form[role="configuration"] [type=checkbox]').checkbox();
  jQuery('form[role="configuration"] [role=popup]').popup({
    hoverable: true,
    position: 'right center'
  });
  jQuery('.ui.sidebar').sidebar('toggle');
  jQuery('.ui.dropdown').dropdown();

  ensureNoCheckboxConflicts({
    use_modal_prompt: ['prompt_auto_register', 'notifyButton_enable'],
    prompt_auto_register: ['use_modal_prompt'],
    notifyButton_enable: ['use_modal_prompt']
  });

  ensureFeaturesVisible({
    'notifyButton_customize_enable': '.nb-text-feature',
    'notifyButton_customize_colors_enable': '.nb-color-feature',
    'notifyButton_customize_offset_enable': '.nb-position-feature',
    'notifyButton_enable': '.nb-feature',
    'prompt_customize_enable': '.prompt-customize-feature',
    'send_welcome_notification': '.welcome-notification-feature',
    'is_site_https': '.modal-prompt-feature, .auto-register-feature'
  });

  httpSiteCheck();

  setupModalPopupSwitcharoo();

  $('.ui.form')
    .form({
      fields: {
        subdomain: {
          identifier: 'subdomain',
          rules: [
            {
              type   : 'empty',
              prompt : 'Because your site is HTTP, you must enter a subdomain. Use the same one you entered on our OneSignal dashboard.'
            },
            {
              type   : 'minLength[4]',
              prompt : 'Your subdomain must be at least 4 characters long. Use the same one you entered on our OneSignal dashboard.'
            }
          ]
        }
      }
    });
});

function httpSiteCheck() {
  var key = 'is_site_https';
  function runCheck() {
    var protocol = location.protocol;
    var hostname = location.hostname;
    var isHttp = (protocol === 'http:' && hostname !== 'localhost');
    //protocol = 'https:';
    var isSelfChecked = isChecked(selectByName(key));
    var isFirstTimeCheck = jQuery(selectByName(key)).attr('data-unset');
    if (isFirstTimeCheck) {
      jQuery(selectByName(key)).removeAttr('data-unset');
      // Determine by URL
      if (!isHttp) {
        // HTTPS protocol, check this (does not fire callbacks)
        jQuery(selectByName(key)).parent().checkbox('set checked');
        // Allow them to change this state
        jQuery(selectByName(key)).parent().checkbox('set enabled');
        // Re-evaluate the isHttp variable since we just set it to checked
        isSelfChecked = isChecked(selectByName(key));
      }
    }
    if (isHttp) {
      // HTTP protocol, uncheck this (does not fire callbacks thanks to Semantic UI)
      jQuery(selectByName(key)).parent().checkbox('set unchecked');
      // Do not allow them to check this again
      jQuery(selectByName(key)).change(function(event) {
        jQuery(selectByName(key)).parent().checkbox('set unchecked');
        jQuery('.subdomain-http.nag').nag('clear');
        jQuery('.subdomain-http.nag').nag('show');
      });
    }
    if (isSelfChecked) {
      // Clear subdomain
      // Only if HTTP
      if (!isHttp) {
        jQuery(selectByName('subdomain')).val('');
        jQuery(selectByName('subdomain')).attr('disabled', 'disabled');
        jQuery('.subdomain-feature').hide();
      }
    } else {
      jQuery('.subdomain-feature').show();
      jQuery(selectByName('subdomain')).removeAttr('disabled');
    }
  }
  jQuery(selectByName(key)).parent().checkbox({
    onChange: function() {
      runCheck();
    }
  });

  // Run initial check
  runCheck();
}

/*
  // Only run this function once to prevent duplicate event handlers
  // (e.g. If use_modal_prompt has just been toggled, ensure prompt_auto_register is not toggled)
  map: {
    'use_modal_prompt': ['prompt_auto_register'],
    'prompt_auto_register': ['use_modal_prompt', 'notifyButton_enable'],
    'notifyButton_enable': ['prompt_auto_register']
  }
 */

var selectByName = function(name) { return '[name=' + name + ']' };
window.selectByName = selectByName;

var isChecked = function(selector) { return jQuery(selector).is(':checked'); }

function ensureNoCheckboxConflicts(map) {
  // e.g. key is 'prompt_auto_register'
  for (var key in map) {
    if (map.hasOwnProperty(key)) {
      jQuery(selectByName(key)).change(key, function(event) {
        var key = event.data;
        var isSelfChecked = isChecked(selectByName(key));
        // Anytime the 'prompt_auto_register' checkbox is checked
        if (isSelfChecked) {
          // antiMap is ['use_modal_prompt', 'notifyButton_enable']
          var antiMap = map[key];
          antiMap.forEach(function (antiKey) {
            var isAntiSelfChecked = isChecked(selectByName(antiKey));
            // If 'prompt_auto_register's antiMap checkboxes are checked as well
            if (isAntiSelfChecked) {
              // Uncheck them
              jQuery(selectByName(antiKey)).click();
            }
          });
        }
      });
    }
  }
}

/*
 // Only run this function once to prevent duplicate event handlers
 // (e.g. If notifyButton_enable is enabled, show all elements with the specified selector; otherwise if disabled, hide all such elements)
 map: {
 'notifyButton_enable': '.nb-feature',
 'notifyButton_customize_enable': '.nb-text-feature',
 }
 */
function ensureFeaturesVisible(map) {
  function doHideShow(key, inverted) {
    var isSelfChecked = isChecked(selectByName(key));
    if (inverted) {
      isSelfChecked = !isSelfChecked;
      key = '!' + key;
    }
    var featureSelector = map[key];

    // Anytime the 'prompt_auto_register' checkbox is checked
    if (isSelfChecked) {
      // featureClass is '.nb-feature'
      jQuery(featureSelector).show();
      // If any of the elements we just showed also have their own ensureFeaturesVisible hook, make sure we take care of side effects properly
      var childElements = jQuery(featureSelector).toArray();
      childElements.forEach(function(element) {
        // Get all children elements
        // We may have just hidden a <div class='nb-feature'><div class='what-we-really-care-about'></div></div> where the nested element might have its own ensureFeaturesVisible trigger
        var grandchildElements = jQuery(element).find('*').toArray();
        grandchildElements.forEach(function (grandchildElement) {
          // If this HTML element has the property name that matches one of those in our map
          if (map.hasOwnProperty(grandchildElement.name)) {
            // Trigger this ensureFeaturesVisible hook as well
            doHideShow(grandchildElement.name);
          }
        });
      });
    } else {
      jQuery(featureSelector).hide();
    }
  }

  // e.g. key is 'prompt_auto_register'
  for (var key in map) {
    if (map.hasOwnProperty(key)) {
      if (key.charAt(0) === '!') {
        key = key.slice(1);
        var inverted = true;
      } else {
        var inverted = false;
      }
      jQuery(selectByName(key)).change({key: key, inverted: inverted}, function(event) {
        var key = event.data.key;
        var inverted = event.data.inverted;
        doHideShow(key, inverted);
      });

      // Also do an initial check
      doHideShow(key, inverted);
    }
  }
}

function setupModalPopupSwitcharoo() {
  function getIsSiteHttp() { return !isChecked(selectByName('is_site_https')); }
  function getModalPromptEnabled() { return isChecked(selectByName('use_modal_prompt')); }
  jQuery(selectByName('use_modal_prompt')).change(function(event) {
    var isModalPromptEnabled = getModalPromptEnabled();
    var isSiteHttp = getIsSiteHttp();
    updateModalPopupIfNecessary(isModalPromptEnabled, isSiteHttp);
  });
  jQuery(selectByName('is_site_https')).change(function(event) {
    var isModalPromptEnabled = getModalPromptEnabled();
    var isSiteHttp = getIsSiteHttp();
    updateModalPopupIfNecessary(isModalPromptEnabled, isSiteHttp);
  });
}

function updateModalPopupIfNecessary(isSiteHttp, isModalPromptEnabled) {
  function setModalPopupVisible(isVisible) {
    if (isVisible)
      jQuery('.popup-modal-settings').show();
    else
      jQuery('.popup-modal-settings').hide();
  }
  if (!isSiteHttp) {
    // HTTPS site
    if (isModalPromptEnabled) {
      setModalPopupVisible(true);
    } else {
      setModalPopupVisible(false);
    }
  } else {
    // HTTP sites must show the popup; always show the popup configuration
    setModalPopupVisible(true);
  }
}

function activateSetupTab(tab) {
  jQuery('.menu .item').tab('change tab', tab);
  jQuery('html,body').scrollTop(0);
}

function showSupportMessage(type) {
  var message = "";
  if (type === "not_sure_protocol") {
    message = "Hello, I'm trying to set up the WordPress plugin. I need to enter a Site URL into my platform config, but I'm not sure whether I should use HTTP or HTTPS?";
  } else if (type == 'chrome-push-settings') {
    message = "Hello, I'm having some trouble configuring Chrome push settings from the WordPress plugin guide.";
  } else if (type == 'safari-push-settings') {
    message = "Hello, I'm having some trouble configuring Safari push settings from the WordPress plugin guide.";
  }
  Intercom('showNewMessage', message);
}


function showHttpPopup() {
  var subdomain = jQuery('[name=subdomain]').val();
  var message_localization_opts = {
    actionMessage: jQuery('[name=prompt_action_message]').val(),
    exampleNotificationTitleDesktop: jQuery('[name=prompt_example_notification_title_desktop]').val(),
    exampleNotificationMessageDesktop: jQuery('[name=prompt_example_notification_message_desktop]').val(),
    exampleNotificationTitleMobile: jQuery('[name=prompt_example_notification_title_mobile]').val(),
    exampleNotificationMessageMobile: jQuery('[name=prompt_example_notification_message_mobile]').val(),
    exampleNotificationCaption: jQuery('[name=prompt_example_notification_caption]').val(),
    acceptButtonText: jQuery('[name=prompt_accept_button_text]').val(),
    cancelButtonText: jQuery('[name=prompt_cancel_button_text]').val(),
    showCredit: jQuery('[name=prompt_showcredit]').is(':checked'),
  };
  var message_localization_opts_str = '';
  if (message_localization_opts) {
    var message_localization_params = ['actionMessage',
      'exampleNotificationTitleDesktop',
      'exampleNotificationMessageDesktop',
      'exampleNotificationTitleMobile',
      'exampleNotificationMessageMobile',
      'exampleNotificationCaption',
      'acceptButtonText',
      'cancelButtonText',
      'showCredit'];
    for (var i = 0; i < message_localization_params.length; i++) {
      var key = message_localization_params[i];
      var value = message_localization_opts[key];
      var encoded_value = encodeURIComponent(value);
      if (value || value === false) {
        message_localization_opts_str += '&' + key + '=' + encoded_value;
      }
    }
  }

  if (subdomain.length == 0)
    subdomain = 's-onesignalexample';

  var domainPrefix = 'https://' + subdomain + '.onesignal.com/sdks/initOneSignalHttp';
  if (window.popupPreviewWindow) {
    window.popupPreviewWindow.close();
  }

  window.popupPreviewWindow = window.open(domainPrefix + "?" + message_localization_opts_str, "_blank", 'scrollbars=yes, width=' + 550 + ', height=' + 480 + ', top=' + 0 + ', left=' + 0);

  if (popupPreviewWindow)
    popupPreviewWindow.focus();
}