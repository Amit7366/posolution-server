import { TErrorSources, TGenericErrorResponse } from '../interface/error';

/**
 * MongoDB E11000 duplicate key — parse index name and dup key for a clear message.
 * Old logic took the first quoted string in the message (often tenantId), which misled users.
 */
const handleDuplicateError = (err: any): TGenericErrorResponse => {
  const msg = String(err?.message ?? '');

  const indexMatch = msg.match(/index:\s*([^\s]+)/);
  const indexName = indexMatch?.[1] ?? '';

  const dupKeyMatch = msg.match(/dup key:\s*\{([^}]*)\}/i);
  const dupKey = dupKeyMatch?.[1] ?? '';

  let message = 'This value already exists. Please use a different one.';
  const errorSources: TErrorSources = [];

  const isCodeIndex =
    indexName.includes('code') ||
    /\bcode\s*:/.test(dupKey);
  const isSlugIndex =
    indexName.includes('slug') ||
    (indexName.includes('categoryId') && indexName.includes('slug')) ||
    /\bslug\s*:/.test(dupKey);

  if (isCodeIndex) {
    const codeMatch = dupKey.match(/code:\s*"([^"]*)"/);
    const code = codeMatch?.[1] ?? '';
    message = code
      ? `Sub-category code "${code}" already exists for your account. Use a different code.`
      : 'Sub-category code already exists. Use a different code.';
    errorSources.push({ path: 'code', message });
  } else if (isSlugIndex) {
    const slugMatch = dupKey.match(/slug:\s*"([^"]*)"/);
    const slug = slugMatch?.[1] ?? '';
    message = slug
      ? `Sub-category slug "${slug}" already exists for this category. Use a different slug.`
      : 'Sub-category slug already exists for this category. Use a different slug.';
    errorSources.push({ path: 'slug', message });
  } else {
    errorSources.push({
      path: '',
      message,
    });
  }

  return {
    statusCode: 400,
    message,
    errorSources,
  };
};

export default handleDuplicateError;
