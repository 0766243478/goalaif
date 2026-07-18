// ============================================================================
// SIREEN — License Manager
// ============================================================================
// 14-day trial + license key validation for first paying customers.

import * as vscode from 'vscode';
import * as crypto from 'crypto';

const TRIAL_DAYS = 14;
const LICENSE_KEY_PREFIX = 'SIR-';

export interface LicenseState {
  type: 'trial' | 'licensed' | 'expired';
  trialEndsAt?: number;
  licenseKey?: string;
  licenseExpiresAt?: number;
  features: string[];
}

/**
 * Check if the extension is properly licensed.
 * Returns license state with trial/license info.
 */
export async function checkLicense(context: vscode.ExtensionContext): Promise<LicenseState> {
  // Check for existing license
  const storedLicense = context.globalState.get<{ key: string; expiresAt: number }>('sireen.license');
  
  if (storedLicense) {
    const now = Date.now();
    if (storedLicense.expiresAt > now) {
      return {
        type: 'licensed',
        licenseKey: storedLicense.key,
        licenseExpiresAt: storedLicense.expiresAt,
        features: ['pipeline', 'war-room', 'reports', 'export', 'demo'],
      };
    }
    // License expired
    await context.globalState.update('sireen.license', undefined);
  }

  // Check trial
  const trialStart = context.globalState.get<number>('sireen.trialStart');
  const now = Date.now();
  
  if (!trialStart) {
    // First run - start trial
    await context.globalState.update('sireen.trialStart', now);
    return {
      type: 'trial',
      trialEndsAt: now + TRIAL_DAYS * 24 * 60 * 60 * 1000,
      features: ['pipeline', 'war-room', 'reports', 'export', 'demo'],
    };
  }

  const trialEndsAt = trialStart + TRIAL_DAYS * 24 * 60 * 60 * 1000;
  
  if (now < trialEndsAt) {
    return {
      type: 'trial',
      trialEndsAt,
      features: ['pipeline', 'war-room', 'reports', 'export', 'demo'],
    };
  }

  // Trial expired
  return {
    type: 'expired',
    trialEndsAt,
    features: ['demo'], // Only demo mode after trial
  };
}

/**
 * Activate a license key.
 * Returns true if valid, false if invalid.
 */
export async function activateLicense(
  context: vscode.ExtensionContext,
  licenseKey: string
): Promise<{ valid: boolean; error?: string; expiresAt?: number }> {
  // Validate format
  if (!licenseKey.startsWith(LICENSE_KEY_PREFIX)) {
    return { valid: false, error: 'Invalid license key format' };
  }

  // Parse license key (simple format: SIR-YYYYMMDD-HASH)
  // In production, use proper cryptographic verification
  const parts = licenseKey.split('-');
  if (parts.length !== 3) {
    return { valid: false, error: 'Invalid license key format' };
  }

  const expiresAtStr = parts[1];
  const expiresAt = parseInt(expiresAtStr, 10);
  
  if (isNaN(expiresAt) || expiresAt < Date.now()) {
    return { valid: false, error: 'License has expired' };
  }

  // Verify checksum (last part)
  const expectedHash = crypto
    .createHash('sha256')
    .update(`sireen-license-${expiresAt}`)
    .digest('hex')
    .slice(0, 8);
  
  if (parts[2].toLowerCase() !== expectedHash) {
    return { valid: false, error: 'Invalid license key' };
  }

  // Valid license - store it
  await context.globalState.update('sireen.license', {
    key: licenseKey,
    expiresAt,
  });

  return { valid: true, expiresAt };
}

/**
 * Get remaining trial days.
 */
export function getTrialDaysRemaining(state: LicenseState): number {
  if (state.type !== 'trial' || !state.trialEndsAt) return 0;
  const remaining = Math.ceil((state.trialEndsAt - Date.now()) / (24 * 60 * 60 * 1000));
  return Math.max(0, remaining);
}

/**
 * Check if a feature is available.
 */
export function hasFeature(state: LicenseState, feature: string): boolean {
  return state.features.includes(feature);
}

/**
 * Get display message for license state.
 */
export function getLicenseMessage(state: LicenseState): string {
  switch (state.type) {
    case 'licensed':
      if (state.licenseExpiresAt) {
        const days = Math.ceil((state.licenseExpiresAt - Date.now()) / (24 * 60 * 60 * 1000));
        return `Licensed — ${days} days remaining`;
      }
      return 'Licensed';
    case 'trial':
      const days = getTrialDaysRemaining(state);
      return `Trial — ${days} day${days !== 1 ? 's' : ''} remaining`;
    case 'expired':
      return 'Trial expired — Enter license key to continue';
    default:
      return 'Unknown license state';
  }
}

/**
 * Generate a license key for a customer (admin use).
 * Format: SIR-<expiry_timestamp>-<sha256_hash_prefix>
 */
export function generateLicenseKey(expiresAt: number): string {
  const hash = crypto
    .createHash('sha256')
    .update(`sireen-license-${expiresAt}`)
    .digest('hex')
    .slice(0, 8);
  return `SIR-${expiresAt}-${hash}`;
}

/**
 * Show license activation UI.
 */
export async function showLicenseActivation(context: vscode.ExtensionContext): Promise<void> {
  const key = await vscode.window.showInputBox({
    prompt: 'Enter your Sireen license key',
    placeHolder: 'SIR-1234567890-abcdef12',
    ignoreFocusOut: true,
    validateInput: (value) => {
      if (!value) return 'License key is required';
      if (!value.startsWith('SIR-')) return 'License key must start with SIR-';
      return undefined;
    },
  });

  if (!key) return;

  const result = await activateLicense(context, key);
  
  if (result.valid) {
    vscode.window.showInformationMessage(
      `License activated! Valid until ${new Date(result.expiresAt!).toLocaleDateString()}`
    );
    // Refresh the extension state
    vscode.commands.executeCommand('sireen.refresh');
  } else {
    vscode.window.showErrorMessage(`License activation failed: ${result.error}`);
  }
}

/**
 * Show trial status or license info in status bar.
 */
export function createLicenseStatusBarItem(context: vscode.ExtensionContext): vscode.StatusBarItem {
  const item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  item.command = 'sireen.license';
  item.tooltip = 'Click to view/manage license';
  return item;
}

/**
 * Update status bar with current license state.
 */
export async function updateLicenseStatusBar(
  item: vscode.StatusBarItem,
  context: vscode.ExtensionContext
): Promise<void> {
  const state = await checkLicense(context);
  const msg = getLicenseMessage(state);
  
  item.text = `$(shield) Sireen: ${msg}`;
  item.show();
}