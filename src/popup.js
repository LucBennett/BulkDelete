// @ts-check
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

document.addEventListener('DOMContentLoaded', async () => {
  // Get the active tab and displayed message.
  const [tab] = await messenger.tabs.query({
    active: true,
    currentWindow: true,
  });
  const message = await messenger.messageDisplay.getDisplayedMessage(tab.id);
  console_log('Message', message.id);

  // Cache DOM element references.
  const statusText = /** @type {HTMLElement} */ (
    document.getElementById('statusText')
  );
  const deleteOneButton = /** @type {HTMLElement} */ (
    document.getElementById('deleteOneButton')
  );
  const deleteAllNameAddrButton = /** @type {HTMLElement} */ (
    document.getElementById('deleteAllNameAddrButton')
  );
  const deleteAllAddrButton = /** @type {HTMLElement} */ (
    document.getElementById('deleteAllAddrButton')
  );
  const deleteAllDomainButton = /** @type {HTMLElement} */ (
    document.getElementById('deleteAllDomainButton')
  );

  // Parse the message author to extract name, sender, and domain.
  const author = message.author;
  console_log('Author:', author);

  /** @type {string} */
  let name = '';
  /** @type {string} */
  let sender = '';
  /** @type {string} */
  let domain = '';

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

const SCOPE_CURRENT_FOLDER = 'currentFolder';
const SCOPE_CURRENT_ACCOUNT = 'currentAccount';
const SCOPE_ALL_FOLDERS = 'allFolders';

/**
 * Determines the selected scope from radio inputs and whether to include Trash/Spam.
 * @returns {{selectedScope: string, includeTrash: boolean, includeSpam: boolean}} The selected scope and option flag.
 */
function getSelectedScope() {
  // Determine which radio is checked
  const scopeOptions = /** @type {NodeListOf<HTMLInputElement>} */ (
    document.getElementsByName('scope')
  );
  let selectedScope = '';

  scopeOptions.forEach((option) => {
    if (option.checked) {
      selectedScope = option.value;
    }
  });

  // Select the checkboxes for including Trash & Spam options
  const includeTrashAccountCheckbox = /** @type {HTMLInputElement} */ (
    document.getElementById('includeTrashAccount')
  );
  const includeTrashAllCheckbox = /** @type {HTMLInputElement} */ (
    document.getElementById('includeTrashAll')
  );
  const includeSpamAccountCheckbox = /** @type {HTMLInputElement} */ (
    document.getElementById('includeSpamAccount')
  );
  const includeSpamAllCheckbox = /** @type {HTMLInputElement} */ (
    document.getElementById('includeSpamAll')
  );

  // Based on the selected scope, check if Trash & Spam should be included
  let includeTrash = false;
  let includeSpam = false;

  if (selectedScope === SCOPE_CURRENT_ACCOUNT) {
    includeTrash = includeTrashAccountCheckbox.checked;
    includeSpam = includeSpamAccountCheckbox.checked;
  } else if (selectedScope === SCOPE_ALL_FOLDERS) {
    includeTrash = includeTrashAllCheckbox.checked;
    includeSpam = includeSpamAllCheckbox.checked;
  }

  return { selectedScope, includeTrash, includeSpam };
}

/**
 * @param {messenger.folders.MailFolder []} folders
 * @param {boolean} includeTrash
 * @param {boolean} includeSpam
 * @returns {messenger.folders.MailFolder []}
 */
function filterFolders(folders, includeTrash, includeSpam) {
  return folders.filter(
    (folder) =>
      (includeTrash || folder.type !== 'trash') &&
      (includeSpam || folder.type !== 'junk')
  );
}

/**
 * Gets the selected folders based on the current scope.
 * @param {messenger.messages.MessageHeader} message - The message object.
 * @returns {Promise<string[]>} A promise that resolves to an array of folder IDs.
 */
async function getSelectedFolders(message) {
  const { selectedScope, includeTrash, includeSpam } = getSelectedScope();

  console_log('Selected Scope', selectedScope);
  console_log('Include Trash & Spam', includeTrash);
  console_log('Include Trash & Spam', includeSpam);

  /** @type {string[]} */
  let selectedFolders = [];

  if (selectedScope === SCOPE_CURRENT_FOLDER) {
    selectedFolders.push(message.folder.id);
  } else if (selectedScope === SCOPE_CURRENT_ACCOUNT) {
    const identity = await getIdentityForMessage(message);
    const account = await messenger.accounts.get(identity.accountId);
    const folders = await messenger.folders.getSubFolders(account);
    selectedFolders.push(
      ...filterFolders(folders, includeTrash, includeSpam).map((f) => f.id)
    );
  } else if (selectedScope === SCOPE_ALL_FOLDERS) {
    const accounts = await messenger.accounts.list();
    for (const account of accounts) {
      const folders = await messenger.folders.getSubFolders(account);
      selectedFolders.push(
        ...filterFolders(folders, includeTrash, includeSpam).map((f) => f.id)
      );
    }
  } else {
    throw new Error(
      `[BulkDelete][popup.js] Invalid scope selected: ${selectedScope}`
    );
  }

  return selectedFolders;
}

/**
 * Retrieves the MailIdentity associated with the given message's folder.
 * This function iterates over accounts to match identities based on the folder's account ID.
 * @param {messenger.messages.MessageHeader} messageHeader - The MessageHeader associated with the message.
 * @returns {Promise<MailIdentity|null>} The MailIdentity if found, otherwise null.
 */
async function getIdentityForMessage(messageHeader) {
  if (messageHeader.folder) {
    const folder = messageHeader.folder;
    const accounts = await messenger.accounts.list();

    for (const account of accounts) {
      for (const identity of account.identities) {
        if (folder.accountId === account.id) {
          return identity;
        }
      }
    }
  }
  return null; // No matching identity found
}

/**
 * Generates a function to handle deletion based on input parameters.
 * @param {messenger.messages.MessageHeader} message - The current message object.
 * @param {HTMLElement} statusText - The status element to update.
 * @param {string} type - The type of delete operation.
 * @param {string} name - Extracted name (if available).
 * @param {string} sender - Extracted sender email (if available).
 * @param {string} domain - Extracted domain (if available).
 * @returns {() => Promise<void>} Function to execute the delete operation.
 */
function getDeleteFunc(message, statusText, type, name, sender, domain) {
  return async () => {
    try {
      // Build the deletion criteria object.
      /** @type {DeleteCriteria} */
      const message_obj = { messageId: message.id };

      // Note: getSelectedFolders returns a Promise so we assign the promise itself.
      message_obj.folders = await getSelectedFolders(message);

      if (type === 'deleteAllNameAddrButton') {
        message_obj.name = name;
        message_obj.sender = sender;
        message_obj.domain = domain;
      } else if (type === 'deleteAllAddrButton') {
        message_obj.sender = sender;
        message_obj.domain = domain;
      } else if (type === 'deleteAllDomainButton') {
        message_obj.domain = domain;
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
 * @param {DeleteCriteria} messageFromPopup - The deletion criteria.
 * @returns {Promise<{response: string, count?: number, error?: string}>} Response indicating deletion result.
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
 * @param {DeleteCriteria} messageFromPopup - The deletion criteria.
 * @returns {Promise<messenger.messages.MessageId[]>} Array of message IDs.
 */
async function collectMessageIdsToDelete(messageFromPopup) {
  /** @type {number[]} */
  const messageIds = [];
  const { name, sender, domain, messageId, folders } = messageFromPopup;

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
      if (folders.includes(message.folder.id)) {
        messageIds.push(message.id);
      }
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
      if (folders.includes(message.folder.id)) {
        messageIds.push(message.id);
      }
    }
  } else if (domain) {
    // Delete all messages from the domain.
    const formattedDomain = domain.trim().toLowerCase();
    const atDomain = '@' + formattedDomain;
    console_log('Selecting messages from domain:', formattedDomain);
    const messages = getAllMessages(folders);
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
 * @param {Promise<messenger.messages.MessageList>} list - A paginated list of messages.
 * @returns {AsyncGenerator<messenger.messages.MessageHeader>} Yields message objects.
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
 * Async generator to yield messages from all folders indicated.
 * @param {messenger.folders.MailFolderId[]} folderIds - Array of folder IDs.
 * @returns {AsyncGenerator<messenger.messages.MessageHeader>} Yields messages from all folders.
 */
async function* getAllMessages(folderIds) {
  for (let folderId of folderIds) {
    yield* getMessages(messenger.messages.list(folderId));
  }
}

/**
 * @typedef {Object} DeleteCriteria
 * @property {number} messageId - The ID of the message.
 * @property {messenger.folders.MailFolderId[]} [folders] - An array of folder IDs.
 * @property {string} [name] - The name associated with the message.
 * @property {string} [sender] - The sender's email address.
 * @property {string} [domain] - The domain extracted from the sender's email.
 */
