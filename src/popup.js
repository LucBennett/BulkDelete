/**
 * BulkDelete Popup Script
 * Provides custom logging, email parsing, and message deletion functions.
 */

/*---------------------------*
 *      Utility Logging      *
 *---------------------------*/

/**
 * Logs messages to the console with a custom prefix.
 * @param {...any} args - The arguments to log.
 */
function console_log(...args) {
  console.log('[BulkDelete][popup.js]', ...args);
}

/**
 * Logs error messages to the console with a custom prefix.
 * @param {...any} args - The error arguments to log.
 */
function console_error(...args) {
  console.error('[BulkDelete][popup.js]', ...args);
}

/**
 * Appends a line break and text to a DOM element.
 * @param {HTMLElement} element - The element to update.
 * @param {string} text - The text to append.
 */
function appendButtonText(element, text) {
  element.appendChild(document.createElement('br'));
  element.appendChild(document.createTextNode(text));
}

/*---------------------------*
 *        Main Setup         *
 *---------------------------*/

document.addEventListener('DOMContentLoaded', async () => {
  // Get the active tab and displayed message.
  const [tab] = await messenger.tabs.query({
    active: true,
    currentWindow: true,
  });
  const message = await messenger.messageDisplay.getDisplayedMessage(tab.id);
  console_log('Message', message.id);

  // Cache DOM element references.
  const statusText = document.getElementById('statusText');
  const deleteOneButton = document.getElementById('deleteOneButton');
  const deleteAllNameAddrButton = document.getElementById(
    'deleteAllNameAddrButton'
  );
  const deleteAllAddrButton = document.getElementById('deleteAllAddrButton');
  const deleteAllDomainButton = document.getElementById(
    'deleteAllDomainButton'
  );

  // Parse the message author to extract name, sender, and domain.
  const author = message.author;
  console_log('Author:', author);

  let name, sender, domain;
  const addressRegex = new RegExp(
    '^("?([^"]+)"?\\s+)?<?([\\w._%+-]+)@([\\w.-]+\\.[a-zA-Z]{2,})>?$'
  );
  const match = author.match(addressRegex);
  if (match) {
    name = match[2] || '';
    sender = match[3];
    domain = match[4];
    console_log(`Parsed: Name: ${name}, Sender: ${sender}, Domain: ${domain}`);
  } else {
    console_error(`Invalid email format: ${author}`);
  }

  // Update button texts with author details.
  if (author) {
    appendButtonText(deleteAllNameAddrButton, author);
  }
  if (sender && domain) {
    appendButtonText(deleteAllAddrButton, `${sender}@${domain}`);
  }
  if (domain) {
    appendButtonText(deleteAllDomainButton, domain);
  }

  // Register event listeners for delete operations.
  deleteOneButton.addEventListener(
    'click',
    getDeleteFunc(message, statusText, 'deleteOneButton', name, sender, domain)
  );
  deleteAllNameAddrButton.addEventListener(
    'click',
    getDeleteFunc(
      message,
      statusText,
      'deleteAllNameAddrButton',
      name,
      sender,
      domain
    )
  );
  deleteAllAddrButton.addEventListener(
    'click',
    getDeleteFunc(
      message,
      statusText,
      'deleteAllAddrButton',
      name,
      sender,
      domain
    )
  );
  deleteAllDomainButton.addEventListener(
    'click',
    getDeleteFunc(
      message,
      statusText,
      'deleteAllDomainButton',
      name,
      sender,
      domain
    )
  );
});

/*---------------------------*
 *    Delete Functionality   *
 *---------------------------*/

/**
 * Generates a function to handle deletion based on input parameters.
 * @param {Object} message - The current message object.
 * @param {HTMLElement} statusText - The status element to update.
 * @param {string} type - The type of delete operation.
 * @param {string} name - Extracted name (if available).
 * @param {string} sender - Extracted sender email (if available).
 * @param {string} domain - Extracted domain (if available).
 * @returns {Function} Function to execute the delete operation.
 */
function getDeleteFunc(message, statusText, type, name, sender, domain) {
  return async () => {
    try {
      // Build the deletion criteria object.
      const message_obj = { messageId: message.id, delete: true };

      switch (type) {
        case 'deleteAllNameAddrButton':
          message_obj.name = name;
        // fall through to include sender and domain
        case 'deleteAllAddrButton':
          message_obj.sender = sender;
        // fall through to include domain
        case 'deleteAllDomainButton':
          message_obj.domain = domain;
          break;
        case 'deleteOneButton':
          // No extra criteria for a single message.
          break;
        default:
          break;
      }

      statusText.textContent = messenger.i18n.getMessage('statusTextDeleting');
      const r = await handleDelete(message_obj);

      if (r.response === 'Deleted') {
        statusText.textContent = r.count
          ? `${r.count} ${messenger.i18n.getMessage('statusTextDeleteSuccess')}`
          : messenger.i18n.getMessage('statusTextDeleteSuccess');
        setTimeout(() => window.close(), 500);
      } else {
        statusText.textContent = messenger.i18n.getMessage(
          'statusTextDeleteError'
        );
      }
    } catch (error) {
      console_error('Error deleting messages:', error);
      statusText.textContent = messenger.i18n.getMessage(
        'statusTextDeleteError'
      );
    }
  };
}

/**
 * Handles the deletion of messages based on provided criteria.
 * @param {object} messageFromPopup - The deletion criteria.
 * @returns {Promise<object>} Response indicating deletion result.
 */
async function handleDelete(messageFromPopup) {
  console_log('Deletion criteria:', messageFromPopup);
  try {
    const messageIds = await collectMessageIdsToDelete(messageFromPopup);

    if (messageIds.length) {
      console_log('Deleting selected messages.');
      await messenger.messages.delete(messageIds, false);
      return { response: 'Deleted', count: messageIds.length };
    }

    console_log('No messages found to delete.');
    return { response: 'No Messages Found' };
  } catch (error) {
    console_error('Error processing deletion request:', error);
    return { response: 'Error', error: error.message };
  }
}

/**
 * Collects message IDs to delete based on provided criteria.
 * @param {object} messageFromPopup - The deletion criteria.
 * @returns {Promise<Array<number>>} Array of message IDs.
 */
async function collectMessageIdsToDelete(messageFromPopup) {
  const messageIds = [];
  const { name, sender, domain, messageId } = messageFromPopup;

  if (name && sender && domain) {
    // Delete all messages matching full name and email.
    const formattedName = name.trim().toLowerCase();
    const formattedSender = sender.trim().toLowerCase();
    const formattedDomain = domain.trim().toLowerCase();
    console_log(
      'Selecting messages for:',
      `${formattedName} <${formattedSender}@${formattedDomain}>`
    );
    const messages = getMessages(
      messenger.messages.query({
        author: `${formattedName} <${formattedSender}@${formattedDomain}>`,
      })
    );
    for await (let message of messages) {
      messageIds.push(message.id);
    }
  } else if (sender && domain) {
    // Delete all messages from the sender.
    const formattedSender = sender.trim().toLowerCase();
    const formattedDomain = domain.trim().toLowerCase();
    console_log(
      'Selecting messages from sender:',
      `${formattedSender}@${formattedDomain}`
    );
    const messages = getMessages(
      messenger.messages.query({
        author: `${formattedSender}@${formattedDomain}`,
      })
    );
    for await (let message of messages) {
      messageIds.push(message.id);
    }
  } else if (domain) {
    // Delete all messages from the domain.
    const formattedDomain = domain.trim().toLowerCase();
    const atDomain = '@' + formattedDomain;
    console_log('Selecting messages from domain:', formattedDomain);
    const messages = getAllMessages();
    for await (let message of messages) {
      if (message.author.trim().toLowerCase().includes(atDomain)) {
        messageIds.push(message.id);
      }
    }
  } else if (messageId) {
    // Delete a specific message.
    console_log('Selecting message with ID:', messageId);
    messageIds.push(messageId);
  }

  return messageIds;
}

/*---------------------------*
 *       Message Fetching    *
 *---------------------------*/

/**
 * Async generator to yield messages from a paginated list.
 * @param {Promise<object>} list - A paginated list of messages.
 * @returns {AsyncGenerator<object>} Yields message objects.
 */
async function* getMessages(list) {
  let page = await list;
  for (let message of page.messages) {
    yield message;
  }
  while (page.id) {
    page = await messenger.messages.continueList(page.id);
    for (let message of page.messages) {
      yield message;
    }
  }
}

/**
 * Async generator to yield messages from all folders across accounts.
 * @returns {AsyncGenerator<object>} Yields messages from all folders.
 */
async function* getAllMessages() {
  const accounts = await messenger.accounts.list();
  for (let account of accounts) {
    const folders = await messenger.folders.getSubFolders(account);
    for (let inbox of folders) {
      yield* getMessages(messenger.messages.list(inbox));
    }
  }
}
