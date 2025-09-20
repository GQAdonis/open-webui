// Utility function to create HTML templates for sandpack artifacts
// This is separated to avoid PostCSS processing issues in Svelte components

export function createSvelteHtmlTemplate(title: string, cssContent?: string): string {
  const htmlParts = [
    '<!doctype html>',
    '<html>',
    '  <head>',
    '    <meta charset="utf-8"/>',
    '    <meta name="viewport" content="width=device-width,initial-scale=1"/>',
    '    <title>' + title + '</title>'
  ];

  if (cssContent) {
    htmlParts.push('    <style>' + cssContent + '</style>');
  }

  htmlParts.push(
    '  </head>',
    '  <body><div id="app"></div></body>',
    '</html>'
  );

  return htmlParts.join('\n');
}

export function createReactHtmlTemplate(title: string, cssContent?: string): string {
  const htmlParts = [
    '<!doctype html>',
    '<html>',
    '  <head>',
    '    <meta charset="utf-8"/>',
    '    <meta name="viewport" content="width=device-width,initial-scale=1"/>',
    '    <title>' + title + '</title>'
  ];

  if (cssContent) {
    htmlParts.push('    <style>' + cssContent + '</style>');
  }

  htmlParts.push(
    '  </head>',
    '  <body><div id="root"></div></body>',
    '</html>'
  );

  return htmlParts.join('\n');
}
