/**
 * Prompts Utility
 * 
 * Interactive prompts for CLI using Inquirer.
 */

import inquirer from 'inquirer';

/**
 * Ask a text input question
 */
export async function promptText(question, options = {}) {
  const { default: defaultValue, validate, message: errorMsg } = options;
  
  const result = await inquirer.prompt([
    {
      type: 'input',
      name: 'value',
      message: question,
      default: defaultValue,
      validate: validate ? (input) => {
        if (validate(input)) return true;
        return errorMsg || 'Invalid input';
      } : true,
    },
  ]);
  
  return result.value;
}

/**
 * Ask a password question (hidden input)
 */
export async function promptPassword(question, options = {}) {
  const { validate, mask = '*' } = options;
  
  const result = await inquirer.prompt([
    {
      type: 'password',
      name: 'value',
      message: question,
      mask,
      validate: validate || ((input) => {
        if (input && input.length >= 8) return true;
        return 'Password must be at least 8 characters';
      }),
    },
  ]);
  
  return result.value;
}

/**
 * Ask a single-choice selection question
 */
export async function promptSelect(question, choices, options = {}) {
  const { default: defaultValue } = options;
  
  const result = await inquirer.prompt([
    {
      type: 'list',
      name: 'value',
      message: question,
      choices,
      default: defaultValue,
    },
  ]);
  
  return result.value;
}

/**
 * Ask a multi-selection question
 */
export async function promptCheckbox(question, choices, options = {}) {
  const { default: defaultValue, validate } = options;
  
  const result = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'value',
      message: question,
      choices,
      default: defaultValue,
      validate: validate || ((input) => {
        if (input.length > 0) return true;
        return 'Please select at least one option';
      }),
    },
  ]);
  
  return result.value;
}

/**
 * Ask a confirm (yes/no) question
 */
export async function promptConfirm(question, options = {}) {
  const { default: defaultValue = false } = options;
  
  const result = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'value',
      message: question,
      default: defaultValue,
    },
  ]);
  
  return result.value;
}

/**
 * Ask for a number input
 */
export async function promptNumber(question, options = {}) {
  const { min, max, default: defaultValue, validate } = options;
  
  const result = await inquirer.prompt([
    {
      type: 'number',
      name: 'value',
      message: question,
      default: defaultValue,
      validate: validate || ((input) => {
        const num = Number(input);
        if (isNaN(num)) return 'Please enter a valid number';
        if (min !== undefined && num < min) return `Value must be at least ${min}`;
        if (max !== undefined && num > max) return `Value must be at most ${max}`;
        return true;
      }),
    },
  ]);
  
  return result.value;
}

/**
 * Ask for an editor input (opens system editor)
 */
export async function promptEditor(question, options = {}) {
  const { default: defaultValue } = options;
  
  const result = await inquirer.prompt([
    {
      type: 'editor',
      name: 'value',
      message: question,
      default: defaultValue,
    },
  ]);
  
  return result.value;
}

/**
 * Run a sequence of prompts (wizard style)
 */
export async function promptSequence(questions) {
  const result = await inquirer.prompt(questions);
  return result;
}

/**
 * Create a progress spinner using Ora
 */
export async function withSpinner(message, action) {
  const ora = (await import('ora')).default;
  const spinner = ora(message).start();
  
  try {
    const result = await action(spinner);
    spinner.succeed();
    return result;
  } catch (error) {
    spinner.fail(error.message || 'Operation failed');
    throw error;
  }
}

export default {
  promptText,
  promptPassword,
  promptSelect,
  promptCheckbox,
  promptConfirm,
  promptNumber,
  promptEditor,
  promptSequence,
  withSpinner,
};
