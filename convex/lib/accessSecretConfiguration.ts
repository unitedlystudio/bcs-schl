import { ConvexError } from 'convex/values';

type SecretFields = {
  secretManager?: string;
  secretReference?: string;
};

function configuredPair(fields: SecretFields): fields is Required<SecretFields> {
  return (
    typeof fields.secretManager === 'string' &&
    fields.secretManager.trim().length > 0 &&
    typeof fields.secretReference === 'string' &&
    fields.secretReference.trim().length > 0
  );
}

function hasEitherField(fields: SecretFields) {
  return fields.secretManager !== undefined || fields.secretReference !== undefined;
}

/** Apply this at every access-record create/update boundary. */
export function validateSecretConfigurationWrite(fields: SecretFields): SecretFields {
  if (!hasEitherField(fields)) return {};
  if (!configuredPair(fields)) throw new ConvexError('SECRET_CONFIGURATION_PAIR_REQUIRED');
  return { secretManager: fields.secretManager, secretReference: fields.secretReference };
}

/** Fail closed if stored data ever violates pair parity; never fabricate a reference. */
export function normalizeSecretConfiguration(fields: SecretFields) {
  if (!hasEitherField(fields)) {
    return { secretConfigured: false as const, secretManager: null, secretReference: null };
  }
  if (!configuredPair(fields)) throw new ConvexError('INVALID_STORED_SECRET_CONFIGURATION');
  return {
    secretConfigured: true as const,
    secretManager: fields.secretManager,
    secretReference: fields.secretReference
  };
}
