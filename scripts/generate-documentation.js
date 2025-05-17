const jsdoc2md = require('jsdoc-to-markdown')
const path = require('path')
const fs = require('fs')

const filename = path.join(process.cwd(), 'lib', 'index.js')

/**
 * Generate API documentation
 */
async function buildMarkdown() {
  try {
    // Generate markdown using jsdoc-to-markdown
    const markdown = await jsdoc2md.render({
      files: [filename],
      configure: path.join(process.cwd(), 'jsdoc.json')
    });

    // Write the output to API.md
    fs.writeFileSync(path.join(process.cwd(), 'API.md'), markdown);
    console.log('API documentation successfully generated.');
    process.exit(0);
  } catch (error) {
    console.error('Error generating documentation:', error);
    process.exit(1);
  }
}

/**
 * Run the generator
 */
buildMarkdown().catch((e) => console.error(e));